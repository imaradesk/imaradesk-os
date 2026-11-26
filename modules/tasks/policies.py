"""
Authorization rules for projects.

These policies only decide what a signed-in member of the current workspace may do.

- Any workspace member can view projects and create them, matching how tasks
  already work.
- Editing, changing status and archiving is limited to the project owner, the
  project creator, workspace administrators, and roles granted the
  ``manage_projects`` permission.
"""
from modules.users.permissions import Permission


def is_workspace_admin(user):
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    profile = getattr(user, 'profile', None)
    if profile is None:
        return False
    if profile.role and profile.role.name == 'Administrator':
        return True
    return profile.has_permission(Permission.MANAGE_PROJECTS)


def can_view_project(user, project):
    return bool(user and user.is_authenticated)


def can_create_project(user):
    return bool(user and user.is_authenticated)


def can_edit_project(user, project):
    if not user or not user.is_authenticated:
        return False
    if is_workspace_admin(user):
        return True
    return user.id in (project.owner_id, project.created_by_id)


def can_archive_project(user, project):
    return can_edit_project(user, project)


def can_add_tasks_to_project(user, project):
    """Archived projects are read-only for task membership."""
    return can_view_project(user, project) and not project.is_archived


def project_permissions(user, project):
    return {
        'can_edit': can_edit_project(user, project),
        'can_archive': can_archive_project(user, project),
        'can_add_tasks': can_add_tasks_to_project(user, project),
    }
