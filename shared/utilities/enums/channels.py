from enum import Enum
from typing import Dict, List


class ChannelStatus(Enum):
    ACTIVE = "active"
    COMING_SOON = "coming_soon"


class DefaultChannel:
    def __init__(self, channel_id: str, name: str, description: str, icon: str,
                 icon_bg: str, icon_color: str, is_activated: bool, status: ChannelStatus,
                 order: int):
        self.channel_id = channel_id
        self.name = name
        self.description = description
        self.icon = icon
        self.icon_bg = icon_bg
        self.icon_color = icon_color
        self.is_activated = is_activated
        self.status = status
        self.order = order

    def to_dict(self) -> Dict:
        return {
            'channel_id': self.channel_id,
            'name': self.name,
            'description': self.description,
            'icon': self.icon,
            'icon_bg': self.icon_bg,
            'icon_color': self.icon_color,
            'is_activated': self.is_activated,
            'status': self.status.value,
            'order': self.order,
        }


class ChannelsRegistry:
    """Registry of default channels - single source of truth for seeding"""

    CHANNELS = [
        DefaultChannel(
            channel_id="web",
            name="Web",
            description="Customer portals, logged-in agent interfaces, and web-based support access.",
            icon="GlobalOutlined",
            icon_bg="#ede9fe",
            icon_color="#4a154b",
            is_activated=True,
            status=ChannelStatus.ACTIVE,
            order=1,
        ),
        DefaultChannel(
            channel_id="email",
            name="Email",
            description="Receive and respond to customer emails directly from your dashboard.",
            icon="MailOutlined",
            icon_bg="#e0f2fe",
            icon_color="#0284c7",
            is_activated=False,
            status=ChannelStatus.ACTIVE,
            order=2,
        ),
    ]

    @classmethod
    def get_all_channels(cls) -> List[Dict]:
        return [ch.to_dict() for ch in cls.CHANNELS]

    @classmethod
    def get_all_channel_ids(cls) -> set:
        return {ch.channel_id for ch in cls.CHANNELS}

    @classmethod
    def get_by_channel_id(cls, channel_id: str) -> Dict:
        for ch in cls.CHANNELS:
            if ch.channel_id == channel_id:
                return ch.to_dict()
        return None
