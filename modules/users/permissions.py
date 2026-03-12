"""Permission definitions for the application."""


class Permission:
    """Permission enum-like class."""
    
    # User Management
    VIEW_USERS = "view_users"
    CREATE_USERS = "create_users"
    EDIT_USERS = "edit_users"
    DELETE_USERS = "delete_users"
    
    # Ticket Management
    VIEW_TICKETS = "view_tickets"
    CREATE_TICKETS = "create_tickets"
    EDIT_TICKETS = "edit_tickets"
    DELETE_TICKETS = "delete_tickets"
    ASSIGN_TICKETS = "assign_tickets"
    
    # Organization Management
    VIEW_ORGANIZATIONS = "view_organizations"
    CREATE_ORGANIZATIONS = "create_organizations"
    EDIT_ORGANIZATIONS = "edit_organizations"
    DELETE_ORGANIZATIONS = "delete_organizations"
    
    # Role Management
    VIEW_ROLES = "view_roles"
    CREATE_ROLES = "create_roles"
    EDIT_ROLES = "edit_roles"
    DELETE_ROLES = "delete_roles"
    ASSIGN_ROLES = "assign_roles"
    
    # Settings
    VIEW_SETTINGS = "view_settings"
    EDIT_SETTINGS = "edit_settings"
    
    # Reports
    VIEW_REPORTS = "view_reports"
    EXPORT_REPORTS = "export_reports"
    
    # Knowledge Base
    VIEW_KNOWLEDGE_BASE = "view_knowledge_base"
    CREATE_KNOWLEDGE_BASE = "create_knowledge_base"
    EDIT_KNOWLEDGE_BASE = "edit_knowledge_base"
    DELETE_KNOWLEDGE_BASE = "delete_knowledge_base"
    
    @classmethod
    def get_all(cls):
        """Get all permissions as a list of tuples (code, label)."""
        return [
            # User Management
            (cls.VIEW_USERS, "View Users"),
            (cls.CREATE_USERS, "Create Users"),
            (cls.EDIT_USERS, "Edit Users"),
            (cls.DELETE_USERS, "Delete Users"),
            
            # Ticket Management
            (cls.VIEW_TICKETS, "View Tickets"),
            (cls.CREATE_TICKETS, "Create Tickets"),
            (cls.EDIT_TICKETS, "Edit Tickets"),
            (cls.DELETE_TICKETS, "Delete Tickets"),
            (cls.ASSIGN_TICKETS, "Assign Tickets"),
            
            # Organization Management
            (cls.VIEW_ORGANIZATIONS, "View Organizations"),
            (cls.CREATE_ORGANIZATIONS, "Create Organizations"),
            (cls.EDIT_ORGANIZATIONS, "Edit Organizations"),
            (cls.DELETE_ORGANIZATIONS, "Delete Organizations"),
            
            # Role Management
            (cls.VIEW_ROLES, "View Roles"),
            (cls.CREATE_ROLES, "Create Roles"),
            (cls.EDIT_ROLES, "Edit Roles"),
            (cls.DELETE_ROLES, "Delete Roles"),
            (cls.ASSIGN_ROLES, "Assign Roles"),
            
            # Settings
            (cls.VIEW_SETTINGS, "View Settings"),
            (cls.EDIT_SETTINGS, "Edit Settings"),
            
            # Reports
            (cls.VIEW_REPORTS, "View Reports"),
            (cls.EXPORT_REPORTS, "Export Reports"),
            
            # Knowledge Base
            (cls.VIEW_KNOWLEDGE_BASE, "View Knowledge Base"),
            (cls.CREATE_KNOWLEDGE_BASE, "Create Knowledge Base"),
            (cls.EDIT_KNOWLEDGE_BASE, "Edit Knowledge Base"),
            (cls.DELETE_KNOWLEDGE_BASE, "Delete Knowledge Base"),
        ]
    
    @classmethod
    def get_grouped(cls):
        """Get permissions grouped by category."""
        return {
            "User Management": [
                (cls.VIEW_USERS, "View Users"),
                (cls.CREATE_USERS, "Create Users"),
                (cls.EDIT_USERS, "Edit Users"),
                (cls.DELETE_USERS, "Delete Users"),
            ],
            "Ticket Management": [
                (cls.VIEW_TICKETS, "View Tickets"),
                (cls.CREATE_TICKETS, "Create Tickets"),
                (cls.EDIT_TICKETS, "Edit Tickets"),
                (cls.DELETE_TICKETS, "Delete Tickets"),
                (cls.ASSIGN_TICKETS, "Assign Tickets"),
            ],
            "Organization Management": [
                (cls.VIEW_ORGANIZATIONS, "View Organizations"),
                (cls.CREATE_ORGANIZATIONS, "Create Organizations"),
                (cls.EDIT_ORGANIZATIONS, "Edit Organizations"),
                (cls.DELETE_ORGANIZATIONS, "Delete Organizations"),
            ],
            "Role Management": [
                (cls.VIEW_ROLES, "View Roles"),
                (cls.CREATE_ROLES, "Create Roles"),
                (cls.EDIT_ROLES, "Edit Roles"),
                (cls.DELETE_ROLES, "Delete Roles"),
                (cls.ASSIGN_ROLES, "Assign Roles"),
            ],
            "Settings": [
                (cls.VIEW_SETTINGS, "View Settings"),
                (cls.EDIT_SETTINGS, "Edit Settings"),
            ],
            "Reports": [
                (cls.VIEW_REPORTS, "View Reports"),
                (cls.EXPORT_REPORTS, "Export Reports"),
            ],
            "Knowledge Base": [
                (cls.VIEW_KNOWLEDGE_BASE, "View Knowledge Base"),
                (cls.CREATE_KNOWLEDGE_BASE, "Create Knowledge Base"),
                (cls.EDIT_KNOWLEDGE_BASE, "Edit Knowledge Base"),
                (cls.DELETE_KNOWLEDGE_BASE, "Delete Knowledge Base"),
            ],
        }
