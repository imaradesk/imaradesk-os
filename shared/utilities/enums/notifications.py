from enum import Enum
from typing import Dict, List


class NotificationCategory(Enum):
    TICKETS = "tickets"
    TASKS = "tasks"
    KB = "kb"
    ASSETS = "assets"
    SURVEYS = "surveys"
    SLA = "sla"
    GENERAL = "general"


class NotificationItem:
    def __init__(self, field: str, title: str, description: str, category: NotificationCategory):
        self.field = field
        self.title = title
        self.description = description
        self.category = category

    def to_dict(self) -> Dict:
        return {
            'field': self.field,
            'title': self.title,
            'description': self.description,
            'category': self.category.value,
        }


class NotificationModule:
    def __init__(self, id: str, name: str, category: NotificationCategory, always_visible: bool = False):
        self.id = id
        self.name = name
        self.category = category
        self.always_visible = always_visible

    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'name': self.name,
            'alwaysVisible': self.always_visible,
        }


class NotificationsRegistry:
    """Registry of all notification modules and their items"""

    MODULES = [
        NotificationModule("tickets", "Tickets", NotificationCategory.TICKETS, always_visible=True),
        NotificationModule("tasks", "Tasks", NotificationCategory.TASKS),
        NotificationModule("kb", "Knowledge Base", NotificationCategory.KB),
        NotificationModule("assets", "Assets", NotificationCategory.ASSETS),
        NotificationModule("surveys", "Surveys", NotificationCategory.SURVEYS),
        NotificationModule("sla", "SLA", NotificationCategory.SLA, always_visible=True),
        NotificationModule("general", "General", NotificationCategory.GENERAL, always_visible=True),
    ]

    ITEMS = [
        # Ticket notifications
        NotificationItem("notify_new_ticket_created", "New ticket created", "When a new ticket is submitted", NotificationCategory.TICKETS),
        NotificationItem("notify_ticket_assigned", "Ticket assigned to me", "When a ticket is assigned or reassigned to you, or assigned to your group", NotificationCategory.TICKETS),
        NotificationItem("notify_ticket_status_changed", "Status changed", "When ticket status is updated", NotificationCategory.TICKETS),
        NotificationItem("notify_ticket_priority_changed", "Priority changed", "When ticket priority is updated", NotificationCategory.TICKETS),
        NotificationItem("notify_new_comment", "New comment", "When someone comments on your ticket", NotificationCategory.TICKETS),
        NotificationItem("notify_ticket_merged", "Ticket merged", "When tickets are merged", NotificationCategory.TICKETS),
        # Task notifications
        NotificationItem("notify_task_assigned", "Task assigned", "When a task is assigned to you", NotificationCategory.TASKS),
        NotificationItem("notify_task_status_changed", "Status changed", "When task status is updated", NotificationCategory.TASKS),
        NotificationItem("notify_task_comment", "New comment", "When someone comments on your task", NotificationCategory.TASKS),
        NotificationItem("notify_task_due_soon", "Due soon reminder", "24 hours before task is due", NotificationCategory.TASKS),
        NotificationItem("notify_task_overdue", "Task overdue", "When a task passes its due date", NotificationCategory.TASKS),
        # KB notifications
        NotificationItem("notify_kb_article_updated", "Article updated", "When an article you follow is updated", NotificationCategory.KB),
        NotificationItem("notify_kb_article_approved", "Article approved", "When your draft article is approved", NotificationCategory.KB),
        # Asset notifications
        NotificationItem("notify_asset_assigned", "Asset assigned", "When an asset is assigned to you", NotificationCategory.ASSETS),
        NotificationItem("notify_asset_status_changed", "Status changed", "When asset status is updated", NotificationCategory.ASSETS),
        NotificationItem("notify_asset_maintenance_due", "Maintenance due", "When asset maintenance is scheduled", NotificationCategory.ASSETS),
        NotificationItem("notify_asset_warranty_expiring", "Warranty expiring", "30 days before warranty expires", NotificationCategory.ASSETS),
        # Survey notifications
        NotificationItem("notify_survey_response", "New response", "When someone responds to your survey", NotificationCategory.SURVEYS),
        NotificationItem("notify_survey_completed", "Survey completed", "When a survey reaches 100% completion", NotificationCategory.SURVEYS),
        NotificationItem("notify_survey_reminder", "Pending reminders", "Remind about incomplete survey responses", NotificationCategory.SURVEYS),
        # SLA notifications
        NotificationItem("notify_sla_resolution_warning", "Resolution almost breaching", "When SLA resolution time is about to breach", NotificationCategory.SLA),
        NotificationItem("notify_sla_resolution_breached", "Resolution breached", "When SLA resolution time has been breached", NotificationCategory.SLA),
        # General notifications
        NotificationItem("notify_ticket_mentioned", "Mentioned", "When you're @mentioned in a ticket or task", NotificationCategory.GENERAL),
    ]

    @classmethod
    def get_all_modules(cls) -> List[Dict]:
        return [m.to_dict() for m in cls.MODULES]

    @classmethod
    def get_all_items(cls) -> List[Dict]:
        return [item.to_dict() for item in cls.ITEMS]

    @classmethod
    def get_items_by_category(cls, category: NotificationCategory) -> List[Dict]:
        return [item.to_dict() for item in cls.ITEMS if item.category == category]

    @classmethod
    def get_modules_with_items(cls) -> List[Dict]:
        """Get modules with their items grouped together"""
        result = []
        for module in cls.MODULES:
            module_dict = module.to_dict()
            module_dict['items'] = cls.get_items_by_category(module.category)
            result.append(module_dict)
        return result

    @classmethod
    def get_all_fields(cls) -> List[str]:
        """Get all notification field names"""
        return [item.field for item in cls.ITEMS]
