"""
Task & project services.

Business logic shared by the task and project views: validation, creation,
filtering, sorting, aggregate counts and serialization. Views stay thin and
call into this module so the same rules apply on every screen.
"""
import json
import uuid as uuid_lib
from datetime import datetime, timedelta

from django.contrib.auth import get_user_model
from django.core.paginator import Paginator
from django.db import transaction
from django.db.models import Case, Count, F, IntegerField, Q, When
from django.utils import timezone

from modules.tasks import policies
from modules.tasks.models import Project, ProjectActivity, Task, TaskActivityStream, TaskType, TASK_TYPE_ICONS, TASK_TYPE_COLORS

User = get_user_model()

OPEN_STATUSES = (Task.Status.TODO, Task.Status.IN_PROGRESS, Task.Status.REVIEW)
# Progress = done / (open + done). Drafts and cancelled tasks are excluded.
PROGRESS_STATUSES = OPEN_STATUSES + (Task.Status.DONE,)
DUE_SOON_DAYS = 7
MAX_PER_PAGE = 100
DEFAULT_PER_PAGE = 15


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def today():
    return timezone.localdate()


def display_name(user):
    if not user:
        return None
    return f"{user.first_name} {user.last_name}".strip() or user.username


def serialize_user(user):
    if not user:
        return None
    return {'id': user.id, 'name': display_name(user)}


def parse_date(value):
    """Parse YYYY-MM-DD. Returns (date|None, error|None)."""
    if value in (None, ''):
        return None, None
    try:
        return datetime.strptime(str(value), '%Y-%m-%d').date(), None
    except (TypeError, ValueError):
        return None, 'Enter a valid date (YYYY-MM-DD).'


def parse_json_list(value):
    if value in (None, ''):
        return []
    if isinstance(value, list):
        return value
    try:
        parsed = json.loads(value)
    except (TypeError, ValueError):
        return []
    return parsed if isinstance(parsed, list) else []


def parse_uuid(value):
    try:
        return uuid_lib.UUID(str(value))
    except (TypeError, ValueError, AttributeError):
        return None


def parse_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def overdue_q():
    return Q(due_date__lt=today(), status__in=OPEN_STATUSES)


def due_soon_q():
    t = today()
    return Q(due_date__gte=t, due_date__lte=t + timedelta(days=DUE_SOON_DAYS), status__in=OPEN_STATUSES)


def paginate(queryset, page_number, per_page=DEFAULT_PER_PAGE):
    per_page = parse_int(per_page) or DEFAULT_PER_PAGE
    per_page = max(5, min(per_page, MAX_PER_PAGE))
    paginator = Paginator(queryset, per_page)
    page_obj = paginator.get_page(page_number)
    meta = {
        'current_page': page_obj.number,
        'total_pages': paginator.num_pages,
        'per_page': per_page,
        'total_count': paginator.count,
        'has_next': page_obj.has_next(),
        'has_previous': page_obj.has_previous(),
    }
    return page_obj, meta


# ─────────────────────────────────────────────
# Projects
# ─────────────────────────────────────────────

def project_queryset():
    """Projects annotated with task counts in a single query (no N+1)."""
    t = today()
    return Project.objects.select_related('owner', 'created_by').annotate(
        task_total=Count('tasks', filter=Q(tasks__status__in=PROGRESS_STATUSES), distinct=True),
        task_done=Count('tasks', filter=Q(tasks__status=Task.Status.DONE), distinct=True),
        task_open=Count('tasks', filter=Q(tasks__status__in=OPEN_STATUSES), distinct=True),
        task_overdue=Count(
            'tasks',
            filter=Q(tasks__status__in=OPEN_STATUSES, tasks__due_date__lt=t),
            distinct=True,
        ),
    )


def compute_progress(done, total):
    if not total:
        return 0
    return round(done * 100 / total)


def serialize_project(project, user=None, include_description=True):
    total = getattr(project, 'task_total', None)
    done = getattr(project, 'task_done', None)
    data = {
        'id': project.id,
        'uuid': str(project.uuid),
        'name': project.name,
        'status': project.status,
        'status_display': project.get_status_display(),
        'owner': serialize_user(project.owner),
        'created_by': serialize_user(project.created_by),
        'start_date': project.start_date.isoformat() if project.start_date else None,
        'target_date': project.target_date.isoformat() if project.target_date else None,
        'is_archived': project.is_archived,
        'archived_at': project.archived_at.isoformat() if project.archived_at else None,
        'created_at': project.created_at.isoformat(),
        'updated_at': project.updated_at.isoformat(),
        'counts': {
            'total': total or 0,
            'done': done or 0,
            'open': getattr(project, 'task_open', 0) or 0,
            'overdue': getattr(project, 'task_overdue', 0) or 0,
        },
        'progress': compute_progress(done or 0, total or 0),
        'is_late': bool(
            project.target_date
            and project.target_date < today()
            and project.status not in (Project.Status.COMPLETED, Project.Status.CANCELED)
        ),
    }
    if include_description:
        data['description'] = project.description
    if user is not None:
        data['permissions'] = policies.project_permissions(user, project)
    return data


def validate_project_data(data, instance=None):
    """
    Validate client input for create (instance=None) or partial update.
    Returns (cleaned_dict, errors_dict).
    """
    cleaned, errors = {}, {}
    creating = instance is None

    if creating or 'name' in data:
        name = (data.get('name') or '').strip()
        if not name:
            errors['name'] = 'Project name is required.'
        elif len(name) > 200:
            errors['name'] = 'Project name must be 200 characters or fewer.'
        else:
            cleaned['name'] = name

    if 'description' in data:
        description = data.get('description') or ''
        if not isinstance(description, str):
            errors['description'] = 'Description must be text.'
        elif len(description) > 20000:
            errors['description'] = 'Description is too long.'
        else:
            cleaned['description'] = description.strip()

    if 'status' in data or creating:
        status = data.get('status') or Project.Status.PLANNED
        if status not in Project.Status.values:
            errors['status'] = 'Choose a valid status.'
        else:
            cleaned['status'] = status

    if 'owner' in data:
        owner_id = data.get('owner')
        if owner_id in (None, ''):
            cleaned['owner'] = None
        else:
            owner = User.objects.filter(pk=parse_int(owner_id), is_active=True).first()
            if owner is None:
                errors['owner'] = 'Owner must be an active member of this workspace.'
            else:
                cleaned['owner'] = owner

    for field in ('start_date', 'target_date'):
        if field in data:
            value, error = parse_date(data.get(field))
            if error:
                errors[field] = error
            else:
                cleaned[field] = value

    start = cleaned.get('start_date', instance.start_date if instance else None)
    target = cleaned.get('target_date', instance.target_date if instance else None)
    if start and target and target < start and 'target_date' not in errors:
        errors['target_date'] = 'Target date cannot be before the start date.'

    return cleaned, errors


def _log_project(project, activity_type, actor, description, metadata=None):
    ProjectActivity.objects.create(
        project=project,
        activity_type=activity_type,
        actor=actor,
        description=description,
        metadata=metadata or {},
    )


@transaction.atomic
def create_project(user, data):
    cleaned, errors = validate_project_data(data)
    if errors:
        return None, errors
    cleaned.setdefault('owner', user)
    project = Project.objects.create(created_by=user, **cleaned)
    _log_project(
        project,
        ProjectActivity.ActivityType.PROJECT_CREATED,
        user,
        f"Project created by {display_name(user)}",
        {'status': project.status},
    )
    return project, {}


@transaction.atomic
def update_project(project, user, data):
    cleaned, errors = validate_project_data(data, instance=project)
    if errors:
        return project, errors

    changed = []
    old_status, old_owner = project.status, project.owner
    for field, value in cleaned.items():
        if getattr(project, field) != value:
            setattr(project, field, value)
            changed.append(field)

    if not changed:
        return project, {}

    project.save()

    if 'status' in changed:
        _log_project(
            project,
            ProjectActivity.ActivityType.STATUS_CHANGED,
            user,
            f"Status changed from {Project.Status(old_status).label} to {project.get_status_display()}",
            {'old_value': old_status, 'new_value': project.status},
        )
    if 'owner' in changed:
        _log_project(
            project,
            ProjectActivity.ActivityType.OWNER_CHANGED,
            user,
            f"Owner changed to {display_name(project.owner) or 'nobody'}",
            {'old_value': old_owner.id if old_owner else None,
             'new_value': project.owner_id},
        )
    other = [f for f in changed if f not in ('status', 'owner')]
    if other:
        labels = ', '.join(f.replace('_', ' ') for f in other)
        _log_project(
            project,
            ProjectActivity.ActivityType.PROJECT_UPDATED,
            user,
            f"Updated {labels}",
            {'fields': other},
        )
    return project, {}


@transaction.atomic
def set_project_archived(project, user, archived):
    if project.is_archived == archived:
        return project
    project.is_archived = archived
    project.archived_at = timezone.now() if archived else None
    project.save(update_fields=['is_archived', 'archived_at', 'updated_at'])
    _log_project(
        project,
        ProjectActivity.ActivityType.ARCHIVED if archived else ProjectActivity.ActivityType.UNARCHIVED,
        user,
        f"Project {'archived' if archived else 'restored'} by {display_name(user)}",
    )
    return project


def resolve_project_for_task(value, current_project_id=None):
    """
    Resolve a client-supplied project reference (uuid or id) for a task.
    Returns (project|None, error|None). Archived projects are rejected unless
    the task already belongs to that project.
    """
    if value in (None, '', 'none'):
        return None, None
    project_uuid = parse_uuid(value)
    if project_uuid:
        project = Project.objects.filter(uuid=project_uuid).first()
    else:
        pk = parse_int(value)
        project = Project.objects.filter(pk=pk).first() if pk else None
    if project is None:
        return None, 'Project not found.'
    if project.is_archived and project.id != current_project_id:
        return None, 'Archived projects cannot receive new tasks.'
    return project, None


def project_options():
    """Lightweight list for project pickers (non-archived only)."""
    return [
        {'uuid': str(p.uuid), 'name': p.name, 'status': p.status}
        for p in Project.objects.filter(is_archived=False).only('uuid', 'name', 'status').order_by('name')
    ]


PROJECT_SORTS = {
    'updated': ('-updated_at',),
    'name': ('name',),
    'target_date': (F('target_date').asc(nulls_last=True), 'name'),
    'created': ('-created_at',),
    'progress': None,  # handled in Python (derived value)
}


def filter_projects(queryset, params, user):
    search = (params.get('search') or '').strip()
    status = params.get('status') or ''
    owner = params.get('owner') or ''
    archived = params.get('archived') in ('1', 'true')

    queryset = queryset.filter(is_archived=archived)
    if search:
        queryset = queryset.filter(Q(name__icontains=search) | Q(description__icontains=search))
    if status in Project.Status.values:
        queryset = queryset.filter(status=status)
    if owner == 'me':
        queryset = queryset.filter(owner=user)
    elif owner == 'none':
        queryset = queryset.filter(owner__isnull=True)
    elif parse_int(owner):
        queryset = queryset.filter(owner_id=parse_int(owner))

    sort = params.get('sort') if params.get('sort') in PROJECT_SORTS else 'updated'
    if sort == 'progress':
        return sorted(queryset, key=lambda p: compute_progress(p.task_done, p.task_total), reverse=True), sort
    return queryset.order_by(*PROJECT_SORTS[sort]), sort


def project_counts():
    return Project.objects.aggregate(
        all=Count('id', filter=Q(is_archived=False)),
        planned=Count('id', filter=Q(is_archived=False, status=Project.Status.PLANNED)),
        active=Count('id', filter=Q(is_archived=False, status=Project.Status.ACTIVE)),
        on_hold=Count('id', filter=Q(is_archived=False, status=Project.Status.ON_HOLD)),
        completed=Count('id', filter=Q(is_archived=False, status=Project.Status.COMPLETED)),
        canceled=Count('id', filter=Q(is_archived=False, status=Project.Status.CANCELED)),
        archived=Count('id', filter=Q(is_archived=True)),
    )


def project_activity(project, limit=20):
    """Merge project events with activity on the project's tasks, newest first."""
    from modules.tasks.models import TaskActivityStream

    project_events = [
        {
            'id': f"p{a.id}",
            'kind': 'project',
            'activity_type': a.activity_type,
            'description': a.description,
            'actor': serialize_user(a.actor),
            'task': None,
            'created_at': a.created_at,
        }
        for a in project.activities.select_related('actor')[:limit]
    ]
    task_events = [
        {
            'id': f"t{a.id}",
            'kind': 'task',
            'activity_type': a.activity_type,
            'description': a.description,
            'actor': serialize_user(a.actor),
            'task': {'id': a.task_id, 'uuid': str(a.task.uuid), 'title': a.task.title},
            'created_at': a.created_at,
        }
        for a in TaskActivityStream.objects.filter(task__project=project)
        .exclude(activity_type=TaskActivityStream.ActivityType.PROJECT_CHANGED)
        .select_related('actor', 'task')
        .order_by('-created_at')[:limit]
    ]
    merged = sorted(project_events + task_events, key=lambda e: e['created_at'], reverse=True)[:limit]
    for event in merged:
        event['created_at'] = event['created_at'].isoformat()
    return merged


# ─────────────────────────────────────────────
# Tasks
# ─────────────────────────────────────────────

def task_queryset():
    return Task.objects.select_related('created_by', 'assignee', 'group', 'project', 'task_type')


PRIORITY_RANK = Case(
    When(priority=Task.Priority.URGENT, then=0),
    When(priority=Task.Priority.HIGH, then=1),
    When(priority=Task.Priority.NORMAL, then=2),
    When(priority=Task.Priority.LOW, then=3),
    default=4,
    output_field=IntegerField(),
)

STATUS_RANK = Case(
    When(status=Task.Status.TODO, then=0),
    When(status=Task.Status.IN_PROGRESS, then=1),
    When(status=Task.Status.REVIEW, then=2),
    When(status=Task.Status.DONE, then=3),
    When(status=Task.Status.CANCELLED, then=4),
    default=5,
    output_field=IntegerField(),
)

TASK_SORTS = {
    'created': ('-created_at',),
    'oldest': ('created_at',),
    'updated': ('-updated_at',),
    'due_date': (F('due_date').asc(nulls_last=True), '-created_at'),
    'priority': ('priority_rank', '-created_at'),
    'status': ('status_rank', '-created_at'),
    'title': ('title',),
}


def sort_tasks(queryset, sort):
    sort = sort if sort in TASK_SORTS else 'created'
    if sort == 'priority':
        queryset = queryset.annotate(priority_rank=PRIORITY_RANK)
    elif sort == 'status':
        queryset = queryset.annotate(status_rank=STATUS_RANK)
    return queryset.order_by(*TASK_SORTS[sort]), sort


def filter_tasks(queryset, params, user):
    """Apply list filters from request query params. Invalid values are ignored."""
    search = (params.get('search') or '').strip()
    if search:
        q = Q(title__icontains=search)
        number = search.lstrip('#')
        if number.isdigit():
            q |= Q(id=int(number))
        queryset = queryset.filter(q)

    task_number = (params.get('taskNumber') or '').strip()
    if task_number:
        queryset = queryset.filter(id__icontains=task_number)

    status = params.get('status') or ''
    if status in Task.Status.values:
        queryset = queryset.filter(status=status)

    priority = params.get('priority') or ''
    if priority in Task.Priority.values:
        queryset = queryset.filter(priority=priority)

    task_type_id = parse_int(params.get('type'))
    if task_type_id:
        queryset = queryset.filter(task_type_id=task_type_id)

    assignee = params.get('assignee') or ''
    if assignee == 'unassigned':
        queryset = queryset.filter(assignee__isnull=True)
    elif assignee == 'me':
        queryset = queryset.filter(assignee=user)
    elif parse_int(assignee):
        queryset = queryset.filter(assignee_id=parse_int(assignee))

    project = params.get('project') or ''
    if project == 'none':
        queryset = queryset.filter(project__isnull=True)
    elif project:
        project_uuid = parse_uuid(project)
        queryset = queryset.filter(project__uuid=project_uuid) if project_uuid else queryset.none()

    due = params.get('due') or ''
    if due == 'overdue':
        queryset = queryset.filter(overdue_q())
    elif due == 'due_soon':
        queryset = queryset.filter(due_soon_q())
    elif due == 'no_date':
        queryset = queryset.filter(due_date__isnull=True)

    date_from, _ = parse_date(params.get('dateFrom'))
    if date_from:
        queryset = queryset.filter(created_at__date__gte=date_from)
    date_to, _ = parse_date(params.get('dateTo'))
    if date_to:
        queryset = queryset.filter(created_at__date__lte=date_to)

    return queryset


def apply_task_view(queryset, view, user):
    """Built-in task views used by the sidebar and saved views."""
    if view == 'drafts':
        return queryset.filter(status=Task.Status.DRAFT)
    queryset = queryset.exclude(status=Task.Status.DRAFT)
    view_filters = {
        'my_tasks': Q(assignee=user),
        'created_by_me': Q(created_by=user),
        'watching': Q(watchers=user),
        'todo': Q(status=Task.Status.TODO),
        'in_progress': Q(status=Task.Status.IN_PROGRESS),
        'review': Q(status=Task.Status.REVIEW),
        'done': Q(status=Task.Status.DONE),
        'high_priority': Q(priority__in=[Task.Priority.HIGH, Task.Priority.URGENT]),
        'overdue': overdue_q(),
        'due_soon': due_soon_q(),
    }
    if view in view_filters:
        queryset = queryset.filter(view_filters[view])
        if view == 'watching':
            queryset = queryset.distinct()
    return queryset


def task_counts(user):
    """All sidebar task counters in one aggregate query (drafts excluded)."""
    base = Task.objects.exclude(status=Task.Status.DRAFT)
    counts = base.aggregate(
        all=Count('id', distinct=True),
        my_tasks=Count('id', filter=Q(assignee=user), distinct=True),
        my_open=Count('id', filter=Q(assignee=user, status__in=OPEN_STATUSES), distinct=True),
        created_by_me=Count('id', filter=Q(created_by=user), distinct=True),
        todo=Count('id', filter=Q(status=Task.Status.TODO), distinct=True),
        in_progress=Count('id', filter=Q(status=Task.Status.IN_PROGRESS), distinct=True),
        review=Count('id', filter=Q(status=Task.Status.REVIEW), distinct=True),
        done=Count('id', filter=Q(status=Task.Status.DONE), distinct=True),
        high_priority=Count('id', filter=Q(priority__in=[Task.Priority.HIGH, Task.Priority.URGENT]), distinct=True),
        overdue=Count('id', filter=overdue_q(), distinct=True),
        due_soon=Count('id', filter=due_soon_q(), distinct=True),
    )
    # Watching needs the M2M join; keep it separate so it doesn't fan out the rest.
    counts['watching'] = base.filter(watchers=user).distinct().count()
    counts['drafts'] = Task.objects.filter(status=Task.Status.DRAFT).count()
    return counts


def is_task_overdue(task):
    return bool(task.due_date and task.due_date < today() and task.status in OPEN_STATUSES)


def serialize_task_type(task_type):
    if task_type is None:
        return None
    return {
        'id': task_type.id,
        'name': task_type.name,
        'description': task_type.description,
        'icon': task_type.icon,
        'color': task_type.color,
    }


def task_type_options():
    return [serialize_task_type(t) for t in TaskType.objects.filter(is_active=True)]


def create_task_type(data):
    """Create a workspace task type. Returns (type, errors)."""
    name = (data.get('name') or '').strip()
    description = (data.get('description') or '').strip()
    icon = data.get('icon') or 'check-square'
    errors = {}
    if not name:
        errors['name'] = 'Name is required.'
    elif len(name) > 60:
        errors['name'] = 'Name must be 60 characters or fewer.'
    elif TaskType.objects.filter(name__iexact=name).exists():
        errors['name'] = 'A type with this name already exists.'
    if len(description) > 255:
        errors['description'] = 'Description must be 255 characters or fewer.'
    if icon not in TASK_TYPE_ICONS:
        errors['icon'] = 'Choose an icon from the list.'
    if errors:
        return None, errors

    count = TaskType.objects.count()
    task_type = TaskType.objects.create(
        name=name,
        description=description,
        icon=icon,
        color=TASK_TYPE_COLORS[count % len(TASK_TYPE_COLORS)],
        position=count,
    )
    return task_type, {}


def serialize_task_row(task):
    description = task.description or ''
    return {
        'id': task.id,
        'uuid': str(task.uuid),
        'title': task.title,
        'description': description[:200] + '...' if len(description) > 200 else description,
        'status': task.status,
        'status_display': task.get_status_display(),
        'priority': task.priority,
        'priority_display': task.get_priority_display(),
        'task_type': serialize_task_type(task.task_type),
        'created_by': serialize_user(task.created_by),
        'assignee': serialize_user(task.assignee),
        'group': {'id': task.group.id, 'name': task.group.name} if task.group else None,
        'project': {
            'uuid': str(task.project.uuid),
            'name': task.project.name,
            'status': task.project.status,
            'is_archived': task.project.is_archived,
        } if task.project_id else None,
        'tags': task.tags,
        'due_date': task.due_date.strftime('%Y-%m-%d') if task.due_date else None,
        'is_overdue': is_task_overdue(task),
        'created_at': task.created_at.strftime('%Y-%m-%d %H:%M'),
        'updated_at': task.updated_at.strftime('%Y-%m-%d %H:%M'),
    }


RELATED_REASONS = {
    'project': 'Same project',
    'ticket': 'Same ticket',
    'tags': 'Shared tags',
}


def related_tasks(task, limit=8):
    """
    Tasks related to `task`, closest first: same project, then same linked
    ticket, then shared tags. There is no explicit task-link model, so these
    are derived from existing fields.
    """
    rows = []
    seen = {task.pk}

    def collect(queryset, reason):
        remaining = limit - len(rows)
        if remaining <= 0:
            return
        queryset = queryset.exclude(pk__in=seen).exclude(status=Task.Status.DRAFT)
        # Open work first, then most recently updated
        queryset = queryset.annotate(
            is_closed=Case(
                When(status__in=[Task.Status.DONE, Task.Status.CANCELLED], then=1),
                default=0,
                output_field=IntegerField(),
            )
        ).order_by('is_closed', '-updated_at')
        for related in queryset[:remaining]:
            seen.add(related.pk)
            row = serialize_task_row(related)
            row['relation'] = reason
            row['relation_display'] = RELATED_REASONS[reason]
            rows.append(row)

    if task.project_id:
        collect(task_queryset().filter(project_id=task.project_id), 'project')
    if task.related_ticket_id:
        collect(task_queryset().filter(related_ticket_id=task.related_ticket_id), 'ticket')
    tags = [t for t in (task.tags or []) if isinstance(t, str) and t]
    if tags:
        tag_q = Q()
        for tag in tags[:10]:
            tag_q |= Q(tags__contains=[tag])
        collect(task_queryset().filter(tag_q), 'tags')
    return rows


@transaction.atomic
def create_task(user, data):
    """
    Single entry point for creating tasks (full form, quick add, board column,
    project tasks tab). Returns (task|None, errors).
    """
    from modules.users.models import Group

    errors = {}
    title = (data.get('title') or '').strip()
    description = data.get('description') or ''
    if not title:
        errors['title'] = 'Title is required.'
    elif len(title) > 255:
        errors['title'] = 'Title must be 255 characters or fewer.'
    if not str(description).strip():
        errors['description'] = 'Description is required.'

    priority = data.get('priority') or Task.Priority.NORMAL
    if priority not in Task.Priority.values:
        errors['priority'] = 'Choose a valid priority.'

    task_type = None
    if data.get('task_type') not in (None, ''):
        task_type = TaskType.objects.filter(pk=parse_int(data.get('task_type')), is_active=True).first()
        if task_type is None:
            errors['task_type'] = 'Choose a valid type.'
    else:
        task_type = TaskType.default()

    status = data.get('status') or Task.Status.TODO
    if status not in Task.Status.values:
        errors['status'] = 'Choose a valid status.'

    due_date, due_error = parse_date(data.get('due_date'))
    if due_error:
        errors['due_date'] = due_error

    assignee = None
    if data.get('assignee') not in (None, ''):
        assignee = User.objects.filter(pk=parse_int(data.get('assignee')), is_active=True).first()
        if assignee is None:
            errors['assignee'] = 'Assignee must be an active member of this workspace.'

    group = None
    if data.get('group') not in (None, ''):
        group = Group.objects.filter(pk=parse_int(data.get('group'))).first()
        if group is None:
            errors['group'] = 'Group not found.'

    project, project_error = resolve_project_for_task(data.get('project'))
    if project_error:
        errors['project'] = project_error

    if errors:
        return None, errors

    task = Task.objects.create(
        title=title,
        description=description,
        created_by=user,
        assignee=assignee,
        priority=priority,
        task_type=task_type,
        group=group,
        tags=parse_json_list(data.get('tags')),
        due_date=due_date,
        status=status,
        project=project,
    )
    watcher_ids = [parse_int(w) for w in parse_json_list(data.get('watchers'))]
    watcher_ids = [w for w in watcher_ids if w]
    if watcher_ids:
        task.watchers.set(User.objects.filter(id__in=watcher_ids))
    return task, {}


# ─────────────────────────────────────────────
# Task conversions (task → ticket / ticket work item)
# ─────────────────────────────────────────────

def serialize_ticket_summary(ticket):
    if not ticket:
        return None
    return {
        'id': ticket.id,
        'uuid': str(ticket.uuid),
        'ticket_number': ticket.ticket_number or f'#{ticket.id}',
        'title': ticket.title,
        'status': ticket.status,
        'status_display': ticket.get_status_display(),
        'priority': ticket.priority,
    }


def serialize_work_item_summary(work_item):
    if not work_item:
        return None
    return {
        'id': work_item.id,
        'title': work_item.title,
        'status': work_item.status,
        'status_display': work_item.get_status_display(),
        'priority': work_item.priority,
        'ticket': serialize_ticket_summary(work_item.ticket),
    }


def _truthy(value):
    return value in (True, 1, '1', 'true', 'True', 'on', 'yes')


def _apply_task_completion(task, data):
    """Optionally mark the source task done as part of a conversion."""
    if _truthy(data.get('complete_task')) and task.status != Task.Status.DONE:
        task.status = Task.Status.DONE


def _resolve_conversion_assignee(data, errors):
    if data.get('assignee') in (None, ''):
        return None
    assignee = User.objects.filter(pk=parse_int(data.get('assignee')), is_active=True).first()
    if assignee is None:
        errors['assignee'] = 'Assignee must be an active member of this workspace.'
    return assignee


def _conversion_watchers(task):
    return list(task.watchers.all())


@transaction.atomic
def convert_task_to_ticket(task, actor, data):
    """Create a new internal ticket from a task and link both records."""
    from modules.ticket.models import ActivityStream, Ticket
    from modules.users.models import Group

    errors = {}
    if task.converted_to_ticket_id:
        errors['task'] = 'This task has already been converted to a ticket.'

    title = (data.get('title') or task.title or '').strip()
    if not title:
        errors['title'] = 'Title is required.'
    elif len(title) > 255:
        errors['title'] = 'Title must be 255 characters or fewer.'

    description = data.get('description')
    if description is None:
        description = task.description or ''

    priority = data.get('priority') or task.priority or Ticket.Priority.NORMAL
    if priority not in Ticket.Priority.values:
        errors['priority'] = 'Choose a valid priority.'

    ticket_type = data.get('type') or Ticket.Type.TASK
    if ticket_type not in Ticket.Type.values:
        errors['type'] = 'Choose a valid ticket type.'

    status = data.get('status') or Ticket.Status.NEW
    if status not in Ticket.Status.values:
        errors['status'] = 'Choose a valid status.'

    if 'requester' in data:
        requester = None
        if data.get('requester') not in (None, ''):
            requester = User.objects.filter(pk=parse_int(data.get('requester'))).first()
            if requester is None:
                errors['requester'] = 'Choose a valid requester.'
    else:
        requester = task.created_by or actor

    assignee = _resolve_conversion_assignee(data, errors) if 'assignee' in data else task.assignee

    if 'group' in data:
        group = None
        if data.get('group') not in (None, ''):
            group = Group.objects.filter(pk=parse_int(data.get('group'))).first()
            if group is None:
                errors['group'] = 'Group not found.'
    else:
        group = task.group

    tags = parse_json_list(data['tags']) if 'tags' in data else list(task.tags or [])

    if errors:
        return None, errors

    ticket = Ticket.objects.create(
        title=title,
        description=description,
        requester=requester,
        assignee=assignee,
        group=group,
        status=status,
        priority=priority,
        type=ticket_type,
        source='internal',
        tags=tags,
    )
    watchers = _conversion_watchers(task)
    if watchers:
        ticket.watchers.set(watchers)

    task.converted_to_ticket = ticket
    _apply_task_completion(task, data)
    task.save()

    TaskActivityStream.objects.create(
        task=task,
        activity_type=TaskActivityStream.ActivityType.CONVERTED_TO_TICKET,
        actor=actor,
        description=f"Converted to ticket {ticket.ticket_number or f'#{ticket.id}'} \"{ticket.title}\"",
        metadata={'ticket_id': ticket.id, 'ticket_uuid': str(ticket.uuid), 'ticket_number': ticket.ticket_number},
    )
    ActivityStream.objects.create(
        ticket=ticket,
        activity_type=ActivityStream.ActivityType.TICKET_UPDATED,
        actor=actor,
        description=f"Created from task TASK-{task.id} \"{task.title}\"",
        metadata={'task_id': task.id, 'task_uuid': str(task.uuid)},
    )
    return ticket, {}


@transaction.atomic
def convert_task_to_work_item(task, actor, data):
    """Create a work item on a ticket from a task and link both records."""
    from modules.ticket.models import ActivityStream, Ticket, WorkItem

    errors = {}
    if task.converted_to_work_item_id:
        errors['task'] = 'This task has already been converted to a work item.'

    ticket = None
    if data.get('ticket_uuid') not in (None, ''):
        ticket = Ticket.objects.filter(uuid=parse_uuid(data.get('ticket_uuid'))).first()
        if ticket is None:
            errors['ticket_uuid'] = 'Ticket not found.'
    else:
        ticket = task.related_ticket or task.converted_from_ticket or task.converted_to_ticket
        if ticket is None:
            errors['ticket_uuid'] = 'Choose a ticket for this work item.'
    if ticket is not None and ticket.is_merged:
        errors['ticket_uuid'] = 'This ticket has been merged. Choose another ticket.'

    title = (data.get('title') or task.title or '').strip()
    if not title:
        errors['title'] = 'Title is required.'
    elif len(title) > 255:
        errors['title'] = 'Title must be 255 characters or fewer.'

    description = data.get('description')
    if description is None:
        description = task.description or ''

    priority = data.get('priority') or task.priority or WorkItem.Priority.NORMAL
    if priority not in WorkItem.Priority.values:
        errors['priority'] = 'Choose a valid priority.'

    status = data.get('status') or {
        Task.Status.IN_PROGRESS: WorkItem.Status.IN_PROGRESS,
        Task.Status.REVIEW: WorkItem.Status.IN_PROGRESS,
        Task.Status.DONE: WorkItem.Status.DONE,
        Task.Status.CANCELLED: WorkItem.Status.CANCELLED,
    }.get(task.status, WorkItem.Status.TODO)
    if status not in WorkItem.Status.values:
        errors['status'] = 'Choose a valid status.'

    due_date = task.due_date
    if 'due_date' in data:
        due_date, due_error = parse_date(data.get('due_date'))
        if due_error:
            errors['due_date'] = due_error

    assignee = _resolve_conversion_assignee(data, errors) if 'assignee' in data else task.assignee
    work_notes = data.get('work_notes') or ''

    if errors:
        return None, errors

    work_item = WorkItem.objects.create(
        ticket=ticket,
        title=title,
        description=description,
        created_by=actor,
        assignee=assignee,
        status=status,
        priority=priority,
        due_date=due_date,
        work_notes=work_notes,
    )

    task.converted_to_work_item = work_item
    _apply_task_completion(task, data)
    task.save()

    TaskActivityStream.objects.create(
        task=task,
        activity_type=TaskActivityStream.ActivityType.CONVERTED_TO_WORK_ITEM,
        actor=actor,
        description=f"Converted to work item \"{work_item.title}\" on ticket {ticket.ticket_number or f'#{ticket.id}'}",
        metadata={
            'work_item_id': work_item.id,
            'ticket_id': ticket.id,
            'ticket_uuid': str(ticket.uuid),
            'ticket_number': ticket.ticket_number,
        },
    )
    ActivityStream.objects.create(
        ticket=ticket,
        activity_type=ActivityStream.ActivityType.TICKET_UPDATED,
        actor=actor,
        description=f"Work item \"{work_item.title}\" created from task TASK-{task.id}",
        metadata={'work_item_id': work_item.id, 'task_id': task.id, 'task_uuid': str(task.uuid)},
    )
    return work_item, {}


# ─────────────────────────────────────────────
# Workspace sidebar
# ─────────────────────────────────────────────

SAVED_VIEW_COUNT_KEYS = {
    'all', 'my_tasks', 'created_by_me', 'watching', 'todo', 'in_progress',
    'review', 'done', 'high_priority', 'overdue', 'due_soon',
}


def workspace_sidebar(user, counts=None):
    """Data for the Tasks workspace sidebar, shared by every tasks/projects page."""
    from modules.settings.models import SettingsView

    counts = counts or task_counts(user)
    saved_views = [
        {
            'id': v.view_id,
            'label': v.label,
            'count': counts.get(v.view_id, 0) if v.view_id in SAVED_VIEW_COUNT_KEYS else None,
            'is_default': v.is_default,
        }
        for v in SettingsView.objects.filter(type='TASK', is_active=True).order_by('order')
    ]
    recent_projects = [
        {'uuid': str(p.uuid), 'name': p.name, 'status': p.status}
        for p in Project.objects.filter(
            is_archived=False,
            status__in=[Project.Status.ACTIVE, Project.Status.PLANNED, Project.Status.ON_HOLD],
        ).only('uuid', 'name', 'status').order_by('-updated_at')[:8]
    ]
    return {
        'task_counts': counts,
        'project_counts': project_counts(),
        'saved_views': saved_views,
        'recent_projects': recent_projects,
        'can_manage_projects': policies.is_workspace_admin(user),
    }
