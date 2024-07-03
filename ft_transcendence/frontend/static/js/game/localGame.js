import * as THREE from 'https://cdn.jsdelivr.net/npm/three/build/three.module.js';
import { addBlurBackground } from '../utility/blurBackGround.js';

export const localGame = {
  async init() {
    addBlurBackground();
    const root = document.getElementById('app');
    while (root.childNodes.length > 0) {
      root.removeChild(root.firstChild);
    }

    let container, renderer, camera, mainLight, scene, ball, paddle1, paddle2, field, running;
    let VIEW_ANGLE_INCREMENT = 5;
    let score = {
      player1: 0,
      player2: 0,
    };

    function setScore() {
      const $div = document.createElement('div');
      $div.id = 'scoreBoard';

      const player1Container = document.createElement('div');
      const player1Label = document.createElement('div');
      player1Label.innerText = 'Player 1';
      player1Label.style.whiteSpace = 'nowrap';
      const player1Score = document.createElement('div');
      player1Score.id = 'player1Score';
      player1Score.style.display = 'inline';
      player1Container.appendChild(player1Label);
      player1Container.appendChild(player1Score);

      const player2Container = document.createElement('div');
      const player2Label = document.createElement('div');
      player2Label.innerText = 'Player 2';
      player2Label.style.whiteSpace = 'nowrap';
      const player2Score = document.createElement('div');
      player2Score.id = 'player2Score';
      player2Score.style.display = 'inline';
      player2Container.appendChild(player2Label);
      player2Container.appendChild(player2Score);

      $div.appendChild(player2Container);
      $div.appendChild(player1Container);

      root.appendChild($div);

      $div.style.position = 'absolute';
    }

    function updateDimensions() {
      const WIDTH = root.offsetWidth / 2;
      const HEIGHT = root.offsetHeight / 1.2;
      const VIEW_ANGLE = 115;
      const ASPECT = WIDTH / HEIGHT;
      const NEAR = 0.1;
      const FAR = 10000;
      const FIELD_WIDTH = WIDTH * 2;
      const FIELD_LENGTH = HEIGHT * 3;
      const BALL_RADIUS = HEIGHT / 15;
      const PADDLE_WIDTH = WIDTH / 2;
      const PADDLE_HEIGHT = HEIGHT / 3;

      return {
        WIDTH,
        HEIGHT,
        VIEW_ANGLE,
        ASPECT,
        NEAR,
        FAR,
        FIELD_WIDTH,
        FIELD_LENGTH,
        BALL_RADIUS,
        PADDLE_WIDTH,
        PADDLE_HEIGHT,
      };
    }

    let dimensions = updateDimensions();

    function startBallMovement() {
      let direction = Math.random() > 0.5 ? -1 : 1;
      ball.$velocity = {
        x: 0,
        z: direction * 25,
      };
      ball.$stopped = false;
    }

    function processBallMovement() {
      if (!ball.$velocity) {
        startBallMovement();
      }

      if (ball.$stopped) {
        return;
      }

      updateBallPosition();

      if (isSideCollision()) {
        ball.$velocity.x *= -1;
        ball.position.x =
          ball.position.x < 0
            ? -dimensions.FIELD_WIDTH / 2 + dimensions.BALL_RADIUS
            : dimensions.FIELD_WIDTH / 2 - dimensions.BALL_RADIUS;
      }

      if (isPaddle1Collision()) {
        hitBallBack(paddle1);
        ball.position.z = paddle1.position.z - dimensions.BALL_RADIUS - 1;
      }

      if (isPaddle2Collision()) {
        hitBallBack(paddle2);
        ball.position.z = paddle2.position.z + dimensions.BALL_RADIUS + 1;
      }

      if (isPastPaddle1()) {
        scoreBy('player2');
      }

      if (isPastPaddle2()) {
        scoreBy('player1');
      }
    }

    function isPastPaddle1() {
      return ball.position.z > paddle1.position.z + 100;
    }

    function isPastPaddle2() {
      return ball.position.z < paddle2.position.z - 100;
    }

    function updateBallPosition() {
      let ballPos = ball.position;

      ballPos.x += ball.$velocity.x;
      ballPos.z += ball.$velocity.z;

      let maxHeight = dimensions.HEIGHT / 3;
      ballPos.y = -(((ballPos.z - 1) * (ballPos.z - 1)) / 8000) + maxHeight;
    }

    function isSideCollision() {
      let ballX = ball.position.x,
        halfFieldWidth = dimensions.FIELD_WIDTH / 2;
      return ballX - dimensions.BALL_RADIUS < -halfFieldWidth || ballX + dimensions.BALL_RADIUS > halfFieldWidth;
    }

    function hitBallBack(paddle) {
      ball.$velocity.x = (ball.position.x - paddle.position.x) / 5;
      ball.$velocity.z *= -1;
    }

    function isPaddle2Collision() {
      return ball.position.z - dimensions.BALL_RADIUS <= paddle2.position.z && isBallAlignedWithPaddle(paddle2);
    }

    function isPaddle1Collision() {
      return ball.position.z + dimensions.BALL_RADIUS >= paddle1.position.z && isBallAlignedWithPaddle(paddle1);
    }

    function isBallAlignedWithPaddle(paddle) {
      let halfPaddleWidth = dimensions.PADDLE_WIDTH / 2,
        paddleX = paddle.position.x,
        ballX = ball.position.x;
      return ballX > paddleX - halfPaddleWidth && ballX < paddleX + halfPaddleWidth;
    }

    function scoreBy(playerName) {
      addPoint(playerName);
      updateScoreBoard();
      stopBall();
      setTimeout(reset, 2000);
    }

    function updateScoreBoard() {
      document.getElementById('player1Score').innerText = score.player1;
      document.getElementById('player2Score').innerText = score.player2;
    }

    function stopBall() {
      ball.$stopped = true;
    }

    function addPoint(playerName) {
      score[playerName]++;
    }

    function startRender() {
      running = true;
      render();
    }

    function stopRender() {
      running = false;
    }
    let paddle1LeftPressed = false;
    let paddle1RightPressed = false;
    let paddle2LeftPressed = false;
    let paddle2RightPressed = false;

    function adjustViewAngle(amount) {
      dimensions.VIEW_ANGLE += amount;
      camera.fov = dimensions.VIEW_ANGLE;
      camera.updateProjectionMatrix();
    }

    function containerKeyDown(e) {
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        paddle1LeftPressed = true;
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        paddle1RightPressed = true;
      } else if (e.code === 'KeyA') {
        e.preventDefault();
        paddle2LeftPressed = true;
      } else if (e.code === 'KeyD') {
        e.preventDefault();
        paddle2RightPressed = true;
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        adjustViewAngle(VIEW_ANGLE_INCREMENT);
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        adjustViewAngle(-VIEW_ANGLE_INCREMENT);
      }
    }

    function containerKeyUp(e) {
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        paddle1LeftPressed = false;
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        paddle1RightPressed = false;
      } else if (e.code === 'KeyA') {
        e.preventDefault();
        paddle2LeftPressed = false;
      } else if (e.code === 'KeyD') {
        e.preventDefault();
        paddle2RightPressed = false;
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
      }
    }

    function updatePaddlePosition() {
      if (paddle1LeftPressed) {
        paddle1.position.x -= 30;
      }
      if (paddle1RightPressed) {
        paddle1.position.x += 30;
      }

      if (paddle2LeftPressed) {
        paddle2.position.x -= 30;
      }
      if (paddle2RightPressed) {
        paddle2.position.x += 30;
      }
      const halfFieldWidth = dimensions.FIELD_WIDTH / 2;
      const halfPaddleWidth = dimensions.PADDLE_WIDTH / 2;
      if (paddle1.position.x - halfPaddleWidth < -halfFieldWidth) {
        paddle1.position.x = -halfFieldWidth + halfPaddleWidth;
      }
      if (paddle1.position.x + halfPaddleWidth > halfFieldWidth) {
        paddle1.position.x = halfFieldWidth - halfPaddleWidth;
      }

      if (paddle2.position.x - halfPaddleWidth < -halfFieldWidth) {
        paddle2.position.x = -halfFieldWidth + halfPaddleWidth;
      }
      if (paddle2.position.x + halfPaddleWidth > halfFieldWidth) {
        paddle2.position.x = halfFieldWidth - halfPaddleWidth;
      }
    }

    function gameEnd(player) {
      const $win = document.createElement('div');
      $win.classList.add('win');
      $win.innerHTML = `${player} wins!!!`;

      const $score = document.createElement('div');
      $score.classList.add('win');
      $score.innerHTML = `${score.player1} : ${score.player2}`;

      const againButton = document.createElement('button');
      againButton.classList.add('gameButton');
      againButton.innerHTML = 'Play Again';
      againButton.setAttribute('tabindex', '0');
      const mainButton = document.createElement('button');
      mainButton.classList.add('gameButton');
      mainButton.innerHTML = 'Main';
      mainButton.setAttribute('tabindex', '0');
      const buttonContainer = document.createElement('div');
      buttonContainer.classList.add('local_buttonContainer');
      document.getElementById('app').appendChild(buttonContainer);
      buttonContainer.appendChild($score);
      buttonContainer.appendChild($win);
      buttonContainer.appendChild(againButton);
      buttonContainer.appendChild(mainButton);
      againButton.addEventListener('click', () => {
        localGame.init();
      });
      againButton.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          localGame.init();
        }
      });
      mainButton.addEventListener('click', () => {
        window.location.href = '/';
      });
      mainButton.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          window.location.href = '/';
        }
      });
    }

    function render() {
      if (running) {
        if (score.player1 === 7 || score.player2 === 7) {
          stopRender();
          document.removeEventListener('keydown', containerKeyDown);
          document.removeEventListener('keyup', containerKeyUp);
          if (score.player1 === 7) {
            gameEnd('Player 1');
          } else {
            gameEnd('Player 2');
          }
          renderer.domElement.style.cursor = 'auto';
        }
        renderer.render(scene, camera);
        requestAnimationFrame(render);
        processBallMovement();
        updatePaddlePosition();
      } else {
        renderer.render(scene, camera);
      }
    }

    function reset() {
      ball.position.set(0, dimensions.BALL_RADIUS, 0);
      ball.$velocity = null;
      paddle1.position.set(0, 0, dimensions.FIELD_LENGTH / 2);
      paddle2.position.set(0, 0, -dimensions.FIELD_LENGTH / 2);
    }

    function addPaddle() {
      let paddleGeometry = new THREE.BoxGeometry(dimensions.PADDLE_WIDTH, dimensions.PADDLE_HEIGHT, 10, 1, 1, 1),
        paddleMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff }),
        paddle = new THREE.Mesh(paddleGeometry, paddleMaterial);
      scene.add(paddle);
      return paddle;
    }

    let edge;
    async function setRender() {
      container = document.getElementById('app');
      renderer = new THREE.WebGLRenderer();
      renderer.setSize(dimensions.WIDTH, dimensions.HEIGHT);
      renderer.setClearColor(0x000000, 1);
      container.appendChild(renderer.domElement);

      camera = new THREE.PerspectiveCamera(dimensions.VIEW_ANGLE, dimensions.ASPECT, dimensions.NEAR, dimensions.FAR);
      camera.position.set(0, 1000, dimensions.FIELD_LENGTH / 2 + 500);
      scene = new THREE.Scene();
      scene.add(camera);

      let fieldGeometry = new THREE.BoxGeometry(dimensions.FIELD_WIDTH, 5, dimensions.FIELD_LENGTH, 1, 1, 1);
      let fieldMaterial = new THREE.MeshLambertMaterial({ color: 0x0000ff });
      field = new THREE.Mesh(fieldGeometry, fieldMaterial);
      field.position.set(0, -50, 0);
      scene.add(field);

      paddle1 = addPaddle();
      paddle1.position.z = dimensions.FIELD_LENGTH / 2;
      paddle2 = addPaddle();
      paddle2.position.z = -dimensions.FIELD_LENGTH / 2;

      let ballGeometry = new THREE.SphereGeometry(dimensions.BALL_RADIUS, 16, 16);
      let ballMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
      ball = new THREE.Mesh(ballGeometry, ballMaterial);
      ball.position.y = dimensions.BALL_RADIUS;
      scene.add(ball);

      let edgeGeometry = new THREE.EdgesGeometry(fieldGeometry);
      let edgeMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
      edge = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      field.add(edge);

      camera.lookAt(ball.position);
      mainLight = new THREE.HemisphereLight(0xffffff, 0x003300);
      scene.add(mainLight);

      updateScoreBoard();
      startRender();
      document.addEventListener('keydown', containerKeyDown);
      document.addEventListener('keyup', containerKeyUp);
      renderer.domElement.style.cursor = 'none';
    }

    function onWindowResize() {
      dimensions = updateDimensions();

      camera.aspect = dimensions.ASPECT;
      camera.fov = dimensions.VIEW_ANGLE;
      camera.updateProjectionMatrix();

      renderer.setSize(dimensions.WIDTH, dimensions.HEIGHT);

      field.geometry = new THREE.BoxGeometry(dimensions.FIELD_WIDTH, 5, dimensions.FIELD_LENGTH, 1, 1, 1);
      paddle1.scale.set(
        dimensions.PADDLE_WIDTH / paddle1.geometry.parameters.width,
        dimensions.PADDLE_HEIGHT / paddle1.geometry.parameters.height,
        1,
      );
      paddle2.scale.set(
        dimensions.PADDLE_WIDTH / paddle2.geometry.parameters.width,
        dimensions.PADDLE_HEIGHT / paddle2.geometry.parameters.height,
        1,
      );
      ball.geometry = new THREE.SphereGeometry(dimensions.BALL_RADIUS, 16, 16);
      paddle1.position.z = dimensions.FIELD_LENGTH / 2;
      paddle2.position.z = -dimensions.FIELD_LENGTH / 2;
      camera.position.set(0, 1000, dimensions.FIELD_LENGTH / 2 + 500);
      let newEdgeGeometry = new THREE.EdgesGeometry(field.geometry);
      edge.geometry.dispose();
      edge.geometry = newEdgeGeometry;
      updateScoreBoard();
      renderer.render(scene, camera);
    }

    function updateScoreBoardPosition() {
      const canvasRect = renderer.domElement.getBoundingClientRect();
      const scoreBoard = document.getElementById('scoreBoard');
      scoreBoard.style.top = `${canvasRect.top}px`;
      scoreBoard.style.left = `${canvasRect.right + 20}px`;
      scoreBoard.style.height = `${canvasRect.height}px`;
    }

    setScore();
    setRender().then(() => {
      window.addEventListener('resize', onWindowResize, false);
      updateScoreBoardPosition();
      window.addEventListener('resize', updateScoreBoardPosition, false);
    });
  },
};
