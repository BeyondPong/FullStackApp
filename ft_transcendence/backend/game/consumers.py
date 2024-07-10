import asyncio
import json
import logging
import jwt

from channels.db import database_sync_to_async
from django.core.cache import cache

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.db.models import Q, F

from game.models import Game
from .utils import generate_room_name, manage_participants
from login.authentication import JWTAuthentication, decode_jwt
from django.contrib.auth.models import AnonymousUser

from user.models import Member

logger = logging.getLogger(__name__)

grid = 15
paddle_width = grid * 6
ball_speed = 12
paddle_speed = 12


class GameConsumer(AsyncWebsocketConsumer):
    # global_data in class
    running = {}
    is_final = {}

    """
    ** constructor
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # connect
        self.mode = None
        self.nickname = None
        self.room_name = None
        self.room_group_name = None

        # receive
        self.game_width = None
        self.game_height = None
        self.ball_position = None
        self.ball_velocity = None
        self.paddle_width = None
        self.paddle_height = None
        self.max_paddle_x = None
        self.running_user = False
        self.paddles = {}
        self.scores = {}

    """
    connect & disconnect method
    """

    async def connect(self):
        # JWT 토큰 확인 및 사용자 인증
        token_key = self.scope["query_string"].decode().split("=")[1]
        self.scope["user"] = await self.get_user_from_jwt(token_key)

        if not self.scope["user"].is_authenticated:
            logger.debug("User is not authenticated")
            return

        self.mode = self.scope["url_route"]["kwargs"]["mode"]
        self.nickname = self.scope["url_route"]["kwargs"]["nickname"]
        self.room_name = await sync_to_async(generate_room_name)(self.mode)
        self.room_group_name = f"game_room_{self.room_name}"

        current_participants = cache.get(
            f"{self.room_name}_participants", {"players": [], "spectators": []}
        )

        # remote: append in current_participants (tournament: append in check_nickname)
        if self.mode == "REMOTE":
            current_participants["players"].append(self.nickname)

        # debugging
        logger.debug(f"current_participants: {current_participants}")

        # dictionary setting for variables(running, is_final)
        GameConsumer.running[self.room_name] = False
        GameConsumer.is_final[self.room_name] = False
        if self.mode == "REMOTE":
            GameConsumer.is_final[self.room_name] = True

        cache.set(f"{self.room_name}_participants", current_participants)

        await sync_to_async(manage_participants)(self.room_name, increase=True)

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        if self.mode == "REMOTE" and len(current_participants["players"]) == 2:
            # 현재 방의 상태를 in_game = True로 변경
            await self.set_room_in_game()
            await self.send_start_game(self.nickname)

    async def disconnect(self, close_code):
        users = cache.get(f"{self.room_name}_participants", None)
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

        # check if room game started
        rooms = cache.get("rooms", {})
        rooms_details = rooms.get(self.room_name, {})
        if rooms_details.get("in_game"):
            await self.remove_participant_from_cache()
            await self.check_end_game(users)
        else:  # tournament not started
            await self.remove_participant_before_start()

        # if last-participants, remove room
        await sync_to_async(manage_participants)(self.room_name, decrease=True)

        if self.mode == "TOURNAMENT":
            await self.remove_nickname_from_cache()
            if not rooms_details.get("in_game"):
                current_nicknames = cache.get(f"{self.room_name}_nicknames", [])
                await self.send_nickname_validation(current_nicknames)

        participants = cache.get(f"{self.room_name}_participants", None)
        if (
            participants
            and len(participants["players"]) == 0
            and len(participants["spectators"]) == 0
        ):
            del GameConsumer.running[self.room_name]

    async def check_end_game(self, users):
        if (not users or len(users["players"]) == 0) or (len(users["players"]) == 1):
            return

        if self.nickname in users["players"]:  # players가 나간 경우
            opponent = next(p for p in users["players"] if p != self.nickname)
            self.scores[opponent] = 7
            if GameConsumer.running[self.room_name]:
                await self.end_game(opponent, self.nickname)
            GameConsumer.running[self.room_name] = False

        elif len(users["spectators"]) == 2:  # spectators가 1명 나간 경우
            # 남은 spectators가 winner (남은 spectators가 나가더라도 winner는 이미 여기서 정해짐)
            winner = next(
                (
                    spectator
                    for spectator in users["spectators"]
                    if spectator != self.nickname
                )
            )
            # update winner, loser in cache
            winners = cache.get(f"{self.room_name}_winners", [])
            losers = cache.get(f"{self.room_name}_losers", [])
            winners.append(winner)
            losers.append(self.nickname)
            cache.set(f"{self.room_name}_winners", winners)
            cache.set(f"{self.room_name}_losers", losers)

    async def remove_nickname_from_cache(self):
        logger.debug(
            f"==============remove_nickname_from_cache: {self.nickname}=============="
        )
        current_nicknames = cache.get(f"{self.room_name}_nicknames", [])
        logger.debug(f"before remove current_NICK: {current_nicknames}")
        nickname = self.scope["user"].nickname
        current_nicknames = [n for n in current_nicknames if n[1] != nickname]
        cache.set(f"{self.room_name}_nicknames", current_nicknames)
        logger.debug(f"after remove current_NICK: {current_nicknames}")

    async def remove_participant_from_cache(self):
        logger.debug(
            f"==============remove_participant_from_cache: {self.nickname}=============="
        )
        current_participants = cache.get(f"{self.room_name}_participants", None)
        if not current_participants:
            return

        logger.debug(f"before remove current_participants: {current_participants}")

        # players 또는 spectators에서 self.nickname 삭제
        current_participants["players"] = [
            p for p in current_participants["players"] if p != self.nickname
        ]
        current_participants["spectators"] = [
            p for p in current_participants["spectators"] if p != self.nickname
        ]

        cache.set(f"{self.room_name}_participants", current_participants)

        logger.debug(
            f"Updated participants in {self.room_name}: {current_participants}"
        )

    async def remove_participant_before_start(self):
        logger.debug(
            f"==============remove_participant_from_cache: {self.nickname}=============="
        )
        current_participants = cache.get(f"{self.room_name}_participants", None)
        if not current_participants:
            return

        logger.debug(f"before remove current_participants: {current_participants}")

        # 플레이어 목록에서 self.nickname을 삭제 후 spectators에 있다면 옮기기
        if self.nickname in current_participants["players"]:
            current_participants["players"].remove(self.nickname)
            # 플레이어가 나간 후 관전자 중 첫 번째를 플레이어로 승격시키기
            if current_participants["spectators"]:
                first_spectator = current_participants["spectators"].pop(0)
                current_participants["players"].append(first_spectator)
                logger.debug(f"{first_spectator} moved from spectators to players.")

        # 관전자 목록에서 self.nickname 삭제
        elif self.nickname in current_participants["spectators"]:
            current_participants["spectators"].remove(self.nickname)

        cache.set(f"{self.room_name}_participants", current_participants)

        logger.debug(
            f"Updated participants in {self.room_name}: {current_participants}"
        )

    """
    ** receive method (from frontend-action)
    """

    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data["type"]

        if action == "check_nickname":
            if self.mode == "TOURNAMENT":
                tournament_nickname = data["nickname"]
                await self.check_nickname(tournament_nickname, self.nickname)

        elif action == "set_board":
            # 창 크기 정보 캐시에서 가져오거나 초기화
            windows = cache.get(
                f"{self.room_name}_windows", {"width": [], "height": []}
            )
            game_width = data["width"]
            game_height = data["height"]
            # 현재 게임 창 크기 추가
            windows["width"].append(game_width)
            windows["height"].append(game_height)
            cache.set(f"{self.room_name}_windows", windows)

        elif action == "start_game" or action == "resend":
            windows = cache.get(f"{self.room_name}_windows")
            game_width = min(windows["width"])
            game_height = min(windows["height"])
            self_send = False
            if action == "resend":
                self_send = True
            await self.game_settings(game_width, game_height, self_send)
            if self.running_user:
                asyncio.create_task(self.start_ball_movement())

        elif action == "move_paddle":
            if not GameConsumer.running[self.room_name]:
                return
            paddle_owner = data["paddle"]
            direction = data["direction"]
            await self.move_paddle(paddle_owner, direction)
            await self.send_paddle_position()

    """
    ** action method
    """

    async def check_nickname(self, tournament_nickname, nickname):
        current_participants = cache.get(
            f"{self.room_name}_participants", {"players": [], "spectators": []}
        )
        current_nicknames = cache.get(f"{self.room_name}_nicknames", [])

        logger.debug("==============CHECK NICKNAME==============")
        logger.debug(f"accepted tournament-nickname: {tournament_nickname}")
        logger.debug(f"before append -> current_nicknames: {current_nicknames}")
        logger.debug(f"before change -> current_participants: {current_participants}")

        if any(nick == tournament_nickname for nick, _ in current_nicknames):
            logger.debug(f"{tournament_nickname} is in nicknames!! request again!!")
            await self.send(text_data=json.dumps({"valid": False}))
            return

        # in tournament, self.nickname = tournament_nickname
        self.nickname = tournament_nickname

        # append in current_participants
        player_count = len(current_participants["players"])
        if player_count < 2:
            current_participants["players"].append(self.nickname)
        else:
            current_participants["spectators"].append(self.nickname)
        cache.set(f"{self.room_name}_participants", current_participants)
        logger.debug(f"update current_participants : {current_participants}")

        # append in current_nicknames(nickname = intra-nickname)
        current_nicknames.append((tournament_nickname, nickname))
        cache.set(f"{self.room_name}_nicknames", current_nicknames)
        logger.debug(f"current_nicknames: {current_nicknames}")

        await self.send_nickname_validation(current_nicknames)

        if len(current_nicknames) == 4:
            logger.debug("4명이 다 들어왔습니다!")
            GameConsumer.is_final[self.room_name] = False
            # 현재 방의 상태를 in_game = True로 변경
            await self.set_room_in_game()
            await self.send_start_game(current_participants["players"][0])

        logger.debug("--------------after update--------------")
        current_participants = cache.get(
            f"{self.room_name}_participants", {"players": [], "spectators": []}
        )
        current_nicknames = cache.get(f"{self.room_name}_nicknames", [])
        logger.debug(f"accepted tournament-nickname: {tournament_nickname}")
        logger.debug(f"after append -> current_nicknames: {current_nicknames}")
        logger.debug(f"after change -> current_participants: {current_participants}")
        logger.debug("==========================================")

    async def game_settings(self, game_width, game_height, self_send):
        self.game_width = game_width
        self.game_height = game_height
        self.paddle_width = paddle_width
        self.paddle_height = grid
        self.max_paddle_x = self.game_width - grid - self.paddle_width

        current_participants = cache.get(f"{self.room_name}_participants")
        winners = cache.get(f"{self.room_name}_winners", [])

        # player lefts room before start game
        if len(winners) == 2 and len(current_participants["players"]) < 2:
            # only in tournament-final-round
            await self.handle_pre_final_game_player_exit(
                current_participants["players"], winners
            )
            return
        elif len(current_participants["players"]) < 2:
            # another round will be stopped game
            await self.send_pre_game_player_exit(current_participants["players"])
            return

        # init and send game_data
        await self.init_data()
        self.scores = {nickname: 0 for nickname in current_participants["players"]}
        if self.running_user:
            GameConsumer.running[self.room_name] = True
            await self.send_game_data("game_start")
        elif self_send:
            await self.send_game_data("game_start", True)

    async def update_ball_position(self):
        ball = self.ball_position
        ball_velocity = self.ball_velocity
        # 현재 속도에 따른 공 위치 업데이트
        ball["x"] += ball_velocity["x"]
        ball["y"] += ball_velocity["y"]

        if ball["x"] < grid:
            ball["x"] = grid
            ball_velocity["x"] *= -1
        elif ball["x"] + grid > self.game_width - grid:
            ball["x"] = self.game_width - grid * 2
            ball_velocity["x"] *= -1

        current_participants = cache.get(f"{self.room_name}_participants")
        if (
            current_participants
            and len(current_participants["players"]) == 2
            and current_participants["players"][0] in self.paddles
            and current_participants["players"][1] in self.paddles
        ):
            bottom_paddle_mid = self.paddles[current_participants["players"][0]][
                "y"
            ] + (self.paddles[current_participants["players"][0]]["height"] / 2 + 10)
            top_paddle_mid = self.paddles[current_participants["players"][1]]["y"] - (
                self.paddles[current_participants["players"][1]]["height"] / 2 + 10
            )
            if ball["y"] < top_paddle_mid:
                await self.update_game_score(
                    current_participants["players"][0],
                    current_participants["players"][1],
                )
            elif ball["y"] > bottom_paddle_mid:
                await self.update_game_score(
                    current_participants["players"][1],
                    current_participants["players"][0],
                )
            # current_participants에 없는 경우에 대해 paddle_position 보내지 못하도록 if문 안에 넣음
            await self.check_paddle_collision()

    async def move_paddle(self, paddle_owner, direction):
        if direction == "left":
            self.paddles[paddle_owner]["x"] = max(
                grid, self.paddles[paddle_owner]["x"] - paddle_speed
            )
        elif direction == "right":
            self.paddles[paddle_owner]["x"] = min(
                self.max_paddle_x, self.paddles[paddle_owner]["x"] + paddle_speed
            )

    async def check_paddle_collision(self):
        ball = self.ball_position
        ball_velocity = self.ball_velocity

        current_participants = cache.get(f"{self.room_name}_participants")
        if len(current_participants["players"]) < 2:
            return
        if current_participants["players"][1] in self.paddles:
            top_paddle = self.paddles[current_participants["players"][1]]
        else:
            top_paddle = None

        if current_participants["players"][0] in self.paddles:
            bottom_paddle = self.paddles[current_participants["players"][0]]
        else:
            bottom_paddle = None

        if top_paddle and (
            ball["y"] <= top_paddle["y"] + top_paddle["height"]
            and ball["x"] + grid > top_paddle["x"]
            and ball["x"] < top_paddle["x"] + top_paddle["width"]
        ):
            ball_velocity["y"] *= -1
            hit_pos = (ball["x"] - top_paddle["x"]) / top_paddle["width"]
            ball_velocity["x"] = (hit_pos - 0.5) * 2 * ball_speed

        if bottom_paddle and (
            ball["y"] + grid >= bottom_paddle["y"]
            and ball["x"] + grid > bottom_paddle["x"]
            and ball["x"] < bottom_paddle["x"] + bottom_paddle["width"]
        ):
            ball_velocity["y"] *= -1
            hit_pos = (ball["x"] - bottom_paddle["x"]) / bottom_paddle["width"]
            ball_velocity["x"] = (hit_pos - 0.5) * 2 * ball_speed

    async def update_game_score(self, winner, loser):
        GameConsumer.running[self.room_name] = False
        self.scores[winner] += 1

        # call end_game! and game stopped
        if self.scores[winner] >= 7:
            await self.end_game(winner, loser)
            return

        # send score
        await self.send_game_score()

        current_participants = cache.get(f"{self.room_name}_participants")
        if winner == self.paddles[current_participants["players"][0]]["nickname"]:
            self.ball_velocity = {"x": 0, "y": 10}
        else:
            self.ball_velocity = {"x": 0, "y": -10}

        # sleep and restart_game(send restart game_data)
        for _ in range(4):
            await asyncio.sleep(0.5)
            updated_participants = cache.get(f"{self.room_name}_participants")
            if len(updated_participants["players"]) == 1:
                winner = updated_participants["players"][0]
                loser = None
                for player in current_participants["players"]:
                    if player not in updated_participants["players"]:
                        loser = player
                        break
                self.scores[winner] = 7
                await self.end_game(winner, loser)
                return

        await self.init_data(flag=True)
        await self.send_game_data("game_restart")
        GameConsumer.running[self.room_name] = True

    async def end_game(self, winner, loser):
        GameConsumer.running[self.room_name] = False
        self.running_user = False
        await self.send_end_game_data(winner, loser)

        # prepare for only next_round
        if self.mode == "TOURNAMENT" and not GameConsumer.is_final[self.room_name]:
            await self.prepare_next_tournament(winner, loser)

    """
    ** util method
    """

    @database_sync_to_async
    def get_user_from_jwt(self, token_key):
        try:
            payload = decode_jwt(token_key)
            if not payload:
                return AnonymousUser()
            user = Member.objects.get(nickname=payload["nickname"])
            logger.debug(f"JWT user: {user}")
            return user
        except (jwt.ExpiredSignatureError, jwt.DecodeError, Member.DoesNotExist):
            return AnonymousUser()

    async def serialize_nicknames(self, current_nicknames):
        serialized_nicknames = []
        for nick, real in current_nicknames:
            user = await database_sync_to_async(Member.objects.get)(nickname=real)
            win_cnt = await database_sync_to_async(
                Game.objects.filter(
                    (Q(user1=user) & Q(user1_score__gt=F("user2_score")))
                    | (Q(user2=user) & Q(user2_score__gt=F("user1_score")))
                ).count
            )()
            lose_cnt = await database_sync_to_async(
                Game.objects.filter(
                    (Q(user1=user) & Q(user1_score__lt=F("user2_score")))
                    | (Q(user2=user) & Q(user2_score__lt=F("user1_score")))
                ).count
            )()
            serialized_nicknames.append(
                {
                    "nickname": nick,
                    "win_cnt": win_cnt,
                    "lose_cnt": lose_cnt,
                    "profile_img": user.profile_img,
                }
            )
        return serialized_nicknames

    async def init_data(self, flag=False, winner_setting=False):
        current_participants = cache.get(
            f"{self.room_name}_participants", {"players": [], "spectators": []}
        )
        self.ball_position = {"x": self.game_width / 2, "y": self.game_height / 2}
        if flag is False:
            self.ball_velocity = {"x": 0, "y": 10}
        if winner_setting is True:
            current_participants["players"] = cache.get(f"{self.room_name}_winners")
        if len(current_participants["players"]) < 2:
            return
        self.paddles[current_participants["players"][0]] = {
            "nickname": current_participants["players"][0],
            "x": self.game_width / 2 - self.paddle_width / 2,
            "y": self.game_height - grid * 3,
            "width": self.paddle_width,
            "height": grid,
        }
        self.paddles[current_participants["players"][1]] = {
            "nickname": current_participants["players"][1],
            "x": self.game_width / 2 - self.paddle_width / 2,
            "y": grid * 2,
            "width": self.paddle_width,
            "height": grid,
        }

    async def prepare_next_tournament(self, winner, loser):
        self.running_user = False
        current_participants = cache.get(
            f"{self.room_name}_participants", {"players": [], "spectators": []}
        )

        # update winner, loser in cache
        winners = cache.get(f"{self.room_name}_winners", [])
        losers = cache.get(f"{self.room_name}_losers", [])
        winners.append(winner)
        losers.append(loser)
        cache.set(f"{self.room_name}_winners", winners)
        cache.set(f"{self.room_name}_losers", losers)

        # round_type for next_round or final_round
        round_type = "next_round"

        if len(current_participants["spectators"]) == 2:  # 4강 2경기
            new_players = current_participants["spectators"]
            current_participants["players"] = new_players
            current_participants["spectators"] = []

            cache.set(f"{self.room_name}_participants", current_participants)

        elif len(winners) == 2:  # 파이널
            GameConsumer.is_final[self.room_name] = True
            round_type = "final_round"

            # setting for left-spectator in winner(first round)
            current_nicknames = cache.get(f"{self.room_name}_nicknames", [])
            if len(current_participants["spectators"]) == 0 and not any(
                nick == winners[0] for nick, _ in current_nicknames
            ):
                current_participants["players"] = []
                current_participants["players"].append(winner)
            else:
                current_participants["players"] = winners
            cache.set(f"{self.room_name}_participants", current_participants)

        # running_user 권한 부여 후 group_send
        new_running_user = current_participants["players"][0]
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "broadcast_for_start",
                "event_type": round_type,
                "data": {},
                "running_user_nickname": new_running_user,
            },
        )

    async def handle_pre_final_game_player_exit(self, players, winners):
        self.running_user = False
        await self.init_data(winner_setting=True)
        self.scores = {nickname: 0 for nickname in winners}
        GameConsumer.running[self.room_name] = False
        await self.send_game_data("game_start")

        # sleep 1sec and end_game
        await asyncio.sleep(0.5)
        winner = None
        loser = None
        # current participant will be winner
        for participant in winners:
            if participant in players:
                self.scores[participant] = 7
                winner = participant
            else:
                self.scores[participant] = 0
                loser = participant
        await self.end_game(winner, loser)

    async def set_room_in_game(self):
        rooms = cache.get("rooms", {})
        logger.debug(f"Rooms: {rooms}")
        rooms_details = rooms.get(self.room_name, {})
        rooms_details["in_game"] = True
        rooms[self.room_name] = rooms_details
        cache.set("rooms", rooms)

    """
    ** send to group method
    """

    async def send_start_game(self, new_running_user):
        serialized_nicknames = []
        if self.mode == "TOURNAMENT":
            current_nicknames = cache.get(f"{self.room_name}_nicknames", [])
            serialized_nicknames = await self.serialize_nicknames(current_nicknames)
            logger.debug(f"serialized_nicknames: {serialized_nicknames}")

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "broadcast_for_start",
                "event_type": "start_game",
                "data": {
                    "nicknames": serialized_nicknames,
                },
                "running_user_nickname": new_running_user,
            },
        )

    async def send_nickname_validation(self, current_nicknames):
        serialized_nicknames = await self.serialize_nicknames(current_nicknames)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "broadcast_nickname_validation",
                "event_type": "nickname_valid",
                "data": {
                    "valid": True,
                    "nicknames": serialized_nicknames,
                },
            },
        )

    async def send_pre_game_player_exit(self, current_players):
        game_data = {"players": current_players}
        if self.mode == "TOURNAMENT":
            current_nicknames = cache.get(f"{self.room_name}_nicknames", [])
            if self.nickname != current_nicknames[0][0]:
                return
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "broadcast_event",
                "event_type": "game_start",
                "data": game_data,
            },
        )

    async def send_game_data(self, event_type, self_send=False):
        logger.debug(f"**is_final: {GameConsumer.is_final[self.room_name]}")
        # player left room before only for tournament-fianl-game (another games will be checked in FE)
        current_participants = cache.get(f"{self.room_name}_participants")
        players = current_participants["players"]
        if (
            self.mode == "TOURNAMENT"
            and GameConsumer.is_final[self.room_name]
            and len(players) < 2
        ):
            players = cache.get(f"{self.room_name}_winners", [])
        game_data = {
            "is_final": GameConsumer.is_final[self.room_name],
            "game_width": self.game_width,
            "game_height": self.game_height,
            "ball_position": self.ball_position,
            "ball_velocity": self.ball_velocity,
            "paddles": [paddle for paddle in self.paddles.values()],
            "players": players,
            "scores": self.scores,
        }
        if self_send:
            await self.send(
                text_data=json.dumps({"type": event_type, "data": game_data})
            )
        else:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "broadcast_game_data",
                    "event_type": event_type,
                    "data": game_data,
                },
            )

    async def send_ball_position(self):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "broadcast_event",
                "event_type": "ball_position",
                "data": self.ball_position,
            },
        )

    async def send_paddle_position(self):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "broadcast_paddle_position",
                "event_type": "paddle_position",
                "data": [paddle for paddle in self.paddles.values()],
            },
        )

    async def send_game_score(self):
        game_score = {
            "scores": self.scores,
            "ball_position": self.ball_position,
        }
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "broadcast_event",
                "event_type": "update_score",
                "data": game_score,
            },
        )

    async def send_end_game_data(self, winner, loser):
        end_game_data = {
            "is_final": GameConsumer.is_final[self.room_name],
            "winner": winner,
            "loser": loser,
            "scores": self.scores,
        }

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "broadcast_event",
                "event_type": "end_game",
                "data": end_game_data,
            },
        )

    """
    ** custom broadcast method (default: broadcast_event)
    """

    async def broadcast_event(self, event):
        await self.send(
            text_data=json.dumps({"type": event["event_type"], "data": event["data"]})
        )

    async def broadcast_nickname_validation(self, event):
        current_nicknames = cache.get(f"{self.room_name}_nicknames", [])
        if not any(nick == self.nickname for nick, _ in current_nicknames):
            return
        await self.send(
            text_data=json.dumps({"type": event["event_type"], "data": event["data"]})
        )

    async def broadcast_paddle_position(self, event):
        paddles = event["data"]
        # update
        for paddle in paddles:
            self.paddles[paddle["nickname"]] = paddle
        # send
        await self.send(
            text_data=json.dumps({"type": event["event_type"], "data": event["data"]})
        )

    async def broadcast_game_data(self, event):
        data = event["data"]
        # update
        self.ball_position = data["ball_position"]
        self.ball_velocity = data["ball_velocity"]
        self.paddles = {paddle["nickname"]: paddle for paddle in data["paddles"]}
        self.scores = data["scores"]
        # send
        await self.send(
            text_data=json.dumps({"type": event["event_type"], "data": event["data"]})
        )

    async def broadcast_for_start(self, event):
        running_user_nickname = event["running_user_nickname"]
        if self.nickname == running_user_nickname:
            self.running_user = True
        else:
            self.running_user = False
        await self.send(
            text_data=json.dumps({"type": event["event_type"], "data": event["data"]})
        )

    """
    ** coroutine method
    """

    async def start_ball_movement(self):
        while GameConsumer.running.get(self.room_name, False):
            await self.update_ball_position()
            await self.send_ball_position()
            await asyncio.sleep(0.01667)  # 60 FPS
