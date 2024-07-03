import os
import django
from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
from django.urls import re_path

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

django_asgi_app = get_asgi_application()

from game.consumers import GameConsumer
from user.consumers import MemberConsumer

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AuthMiddlewareStack(
            URLRouter(
                [
                    re_path(
                        r"^ws/play/(?P<mode>\w+)/(?P<room_name>[^/]+)/(?P<nickname>[^/]+)/$",
                        GameConsumer.as_asgi(),
                    ),
                    re_path(
                        r"^ws/member/login_room/$",
                        MemberConsumer.as_asgi(),
                    ),
                ]
            )
        ),
    }
)
