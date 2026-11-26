from enum import Enum
from typing import Dict, List


class ViewType(Enum):
    TICKET = "TICKET"
    TASK = "TASK"
    KB = "KB"


class DefaultView:
    def __init__(self, view_type: ViewType, view_id: str, label: str, description: str,
                 order: int, is_default: bool = False):
        self.view_type = view_type
        self.view_id = view_id
        self.label = label
        self.description = description
        self.order = order
        self.is_default = is_default

    def to_dict(self) -> Dict:
        data = {
            'type': self.view_type.value,
            'view_id': self.view_id,
            'label': self.label,
            'description': self.description,
            'order': self.order,
        }
        if self.is_default:
            data['is_default'] = True
        return data


class ViewsRegistry:
    """Registry of default views for tickets, tasks, and KB - single source of truth"""

    VIEWS = [
        # Ticket views
        DefaultView(ViewType.TICKET, "all_tickets", "All Tickets", "View all tickets", 10),
        DefaultView(ViewType.TICKET, "unsolved", "Your unsolved tickets", "Tickets assigned to or requested by you that are not solved", 20, is_default=True),
        DefaultView(ViewType.TICKET, "response_overdue", "All Response Overdue", "Tickets with overdue SLA response time", 30),
        DefaultView(ViewType.TICKET, "resolution_due_today", "All Resolution Due Today", "Tickets with resolution due today", 40),
        DefaultView(ViewType.TICKET, "my_resolution_overdue", "My Resolution Overdue", "Your tickets with overdue resolution time", 50),
        DefaultView(ViewType.TICKET, "requested_by_me", "Requested By Me", "Tickets you have requested", 60),
        DefaultView(ViewType.TICKET, "watching", "Tickets I'm Watching", "Tickets you are watching", 70),
        DefaultView(ViewType.TICKET, "unassigned", "Unassigned tickets", "Unsolved tickets not assigned to anyone", 80),
        DefaultView(ViewType.TICKET, "all_unsolved", "All unsolved tickets", "All unsolved tickets in the system", 90),
        DefaultView(ViewType.TICKET, "recently_updated", "Recently updated tickets", "Tickets updated in the last 7 days", 100),
        DefaultView(ViewType.TICKET, "new_in_groups", "New tickets in your groups", "New tickets assigned to your groups", 110),
        DefaultView(ViewType.TICKET, "pending", "Pending tickets", "Tickets in pending status", 120),
        DefaultView(ViewType.TICKET, "recently_solved", "Recently solved tickets", "Tickets solved in the last 7 days", 130),
        DefaultView(ViewType.TICKET, "unsolved_in_groups", "Unsolved tickets in your groups", "Unsolved tickets assigned to your groups", 140),
        # Task views
        DefaultView(ViewType.TASK, "all", "All Tasks", "View all tasks", 10, is_default=True),
        DefaultView(ViewType.TASK, "my_tasks", "My Tasks", "Tasks assigned to you", 20),
        DefaultView(ViewType.TASK, "created_by_me", "Created by Me", "Tasks you have created", 30),
        DefaultView(ViewType.TASK, "watching", "Watching", "Tasks you are watching", 40),
        DefaultView(ViewType.TASK, "todo", "To Do", "Tasks in to-do status", 50),
        DefaultView(ViewType.TASK, "in_progress", "In Progress", "Tasks currently in progress", 60),
        DefaultView(ViewType.TASK, "review", "In Review", "Tasks under review", 70),
        DefaultView(ViewType.TASK, "done", "Done", "Completed tasks", 80),
        DefaultView(ViewType.TASK, "high_priority", "High Priority", "High and urgent priority tasks", 90),
        # KB views
        DefaultView(ViewType.KB, "all", "All Articles", "View all KB articles", 10, is_default=True),
        DefaultView(ViewType.KB, "published", "Published", "Published KB articles", 20),
        DefaultView(ViewType.KB, "draft", "Drafts", "Draft KB articles", 30),
        DefaultView(ViewType.KB, "archived", "Archived", "Archived KB articles", 40),
    ]

    @classmethod
    def get_all_views(cls) -> List[Dict]:
        return [v.to_dict() for v in cls.VIEWS]

    @classmethod
    def get_by_type(cls, view_type: ViewType) -> List[Dict]:
        return [v.to_dict() for v in cls.VIEWS if v.view_type == view_type]

    @classmethod
    def get_ticket_views(cls) -> List[Dict]:
        return cls.get_by_type(ViewType.TICKET)

    @classmethod
    def get_task_views(cls) -> List[Dict]:
        return cls.get_by_type(ViewType.TASK)

    @classmethod
    def get_kb_views(cls) -> List[Dict]:
        return cls.get_by_type(ViewType.KB)
