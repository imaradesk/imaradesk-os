from enum import Enum
from typing import Dict, List


class IntegrationStatus(Enum):
    AVAILABLE = "available"
    CONNECTED = "connected" 
    COMING_SOON = "coming-soon"


class IntegrationType(Enum):
    COMMUNICATION = "communication"
    PRODUCTIVITY = "productivity"
    DEVELOPMENT = "development" 
    CRM = "crm"
    AUTOMATION = "automation"
    CALENDAR = "calendar"
    ENTERPRISE = "enterprise"


class Integration:
    def __init__(self, name: str, icon: str, description: str, status: IntegrationStatus, 
                 color: str, integration_type: IntegrationType, webhook_url: str = None):
        self.name = name
        self.icon = icon
        self.description = description
        self.status = status
        self.color = color
        self.integration_type = integration_type
        self.webhook_url = webhook_url
    
    def to_dict(self) -> Dict:
        return {
            'name': self.name,
            'icon': self.icon,
            'description': self.description,
            'status': self.status.value,
            'color': self.color,
            'type': self.integration_type.value,
            'webhook_url': self.webhook_url
        }


class IntegrationsRegistry:
    """Registry of all available integrations"""
    
    # Lucide React icon names - these map directly to lucide-react components
    INTEGRATIONS = [
        Integration(
            name="Slack",
            icon="MessageSquare",
            description="Send ticket notifications and updates to Slack channels",
            status=IntegrationStatus.AVAILABLE,
            color="#4A154B",
            integration_type=IntegrationType.COMMUNICATION
        ),
        Integration(
            name="Email Providers",
            icon="Mail",
            description="Connect your email account from different providers to create tickets from emails",
            status=IntegrationStatus.AVAILABLE,
            color="#1976D2",
            integration_type=IntegrationType.COMMUNICATION
        ),
        Integration(
            name="Microsoft Teams",
            icon="Users",
            description="Receive notifications and manage tickets in Teams",
            status=IntegrationStatus.AVAILABLE,
            color="#5B2C6F",
            integration_type=IntegrationType.COMMUNICATION
        ),
        Integration(
            name="Telegram",
            icon="Send",
            description="Send ticket notifications and updates via Telegram bot",
            status=IntegrationStatus.AVAILABLE,
            color="#0088CC",
            integration_type=IntegrationType.COMMUNICATION
        ),
        Integration(
            name="WhatsApp",
            icon="MessageCircle",
            description="Connect WhatsApp Business to receive and respond to tickets",
            status=IntegrationStatus.AVAILABLE,
            color="#25D366",
            integration_type=IntegrationType.COMMUNICATION
        ),
        Integration(
            name="Webhooks",
            icon="Webhook",
            description="Send real-time ticket events to your custom endpoints",
            status=IntegrationStatus.COMING_SOON,
            color="#28A745",
            integration_type=IntegrationType.AUTOMATION
        ),
        Integration(
            name="Google Calendar",
            icon="Calendar",
            description="Sync SLA deadlines and scheduled tasks with your calendar",
            status=IntegrationStatus.COMING_SOON,
            color="#4285F4",
            integration_type=IntegrationType.CALENDAR
        ),
        Integration(
            name="Jira",
            icon="SquareKanban",
            description="Sync tickets bidirectionally with Jira issues",
            status=IntegrationStatus.COMING_SOON,
            color="#0052CC",
            integration_type=IntegrationType.DEVELOPMENT
        ),
        Integration(
            name="GitHub",
            icon="Github",
            description="Link tickets to GitHub issues and pull requests",
            status=IntegrationStatus.COMING_SOON,
            color="#24292E",
            integration_type=IntegrationType.DEVELOPMENT
        ),
        
        Integration(
            name="Trello",
            icon="LayoutList",
            description="Create and sync Trello cards with support tickets",
            status=IntegrationStatus.COMING_SOON,
            color="#0079BF",
            integration_type=IntegrationType.PRODUCTIVITY
        )
        
    ]
    
    @classmethod
    def get_all_integrations(cls) -> List[Dict]:
        """Get all integrations as dictionaries"""
        return [integration.to_dict() for integration in cls.INTEGRATIONS]
    
    @classmethod
    def get_by_status(cls, status: IntegrationStatus) -> List[Dict]:
        """Get integrations filtered by status"""
        return [
            integration.to_dict() 
            for integration in cls.INTEGRATIONS 
            if integration.status == status
        ]
    
    @classmethod
    def get_by_type(cls, integration_type: IntegrationType) -> List[Dict]:
        """Get integrations filtered by type"""
        return [
            integration.to_dict() 
            for integration in cls.INTEGRATIONS 
            if integration.integration_type == integration_type
        ]
    
    @classmethod
    def get_by_name(cls, name: str) -> Dict:
        """Get specific integration by name"""
        for integration in cls.INTEGRATIONS:
            if integration.name.lower() == name.lower():
                return integration.to_dict()
        return None
