"""
Project & workspace views for the Tasks module.

Pages are Inertia responses; mutations are JSON endpoints called with the
shared axios client. Business rules live in services.py, authorization in
policies.py.
"""
import json

from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.db.models import Count
from django.http import JsonResponse
from django.shortcuts import redirect
from django.views.decorators.http import require_POST
from inertia import inertia

from shared.decorators import require_app
from modules.tasks import policies, services
from modules.tasks.models import Project, Task

User = get_user_model()

BOARD_TASK_LIMIT = 300


def _json_body(request):
    if request.content_type == 'application/json':
        try:
            return json.loads(request.body or '{}'), None
        except json.JSONDecodeError:
            return None, JsonResponse({'error': 'Invalid JSON'}, status=400)
    return request.POST, None


def _get_project(uuid):
    return services.project_queryset().filter(uuid=uuid).first()


def _members():
    return [
        services.serialize_user(u)
        for u in User.objects.filter(is_active=True).order_by('first_name', 'last_name', 'username')
    ]


def _board_columns():
    """Board columns follow the statuses already configured for the task board."""
    from modules.settings.models import BoardColumn

    BoardColumn.seed_default_task_columns()
    return [
        {'id': c.column_id, 'label': c.label, 'color': c.color, 'wip_limit': c.wip_limit}
        for c in BoardColumn.get_task_columns()
        if c.column_id in Task.Status.values
    ]


# ─────────────────────────────────────────────
# Workspace overview
# ─────────────────────────────────────────────

@require_app('tasks-projects')
@login_required
@inertia('TasksOverview')
def tasks_overview(request):
    user = request.user
    counts = services.task_counts(user)
    base = services.task_queryset().exclude(status=Task.Status.DRAFT)

    my_open = base.filter(assignee=user, status__in=services.OPEN_STATUSES)
    overdue = my_open.filter(services.overdue_q()).order_by('due_date')[:8]
    due_soon = my_open.filter(services.due_soon_q()).order_by('due_date')[:8]
    in_progress = my_open.filter(status=Task.Status.IN_PROGRESS).order_by('-updated_at')[:8]

    active_projects = services.project_queryset().filter(
        is_archived=False, status=Project.Status.ACTIVE
    ).order_by('target_date', 'name')[:6]

    return {
        'workspace': services.workspace_sidebar(user, counts=counts),
        'overdue': [services.serialize_task_row(t) for t in overdue],
        'dueSoon': [services.serialize_task_row(t) for t in due_soon],
        'inProgress': [services.serialize_task_row(t) for t in in_progress],
        'activeProjects': [services.serialize_project(p, include_description=False) for p in active_projects],
    }


# ─────────────────────────────────────────────
# Projects index
# ─────────────────────────────────────────────

@require_app('tasks-projects')
@login_required
@inertia('Projects')
def projects(request):
    queryset, sort = services.filter_projects(services.project_queryset(), request.GET, request.user)
    page_obj, pagination = services.paginate(queryset, request.GET.get('page', 1), request.GET.get('per_page', 25))

    return {
        'workspace': services.workspace_sidebar(request.user),
        'projects': [services.serialize_project(p, request.user, include_description=False) for p in page_obj],
        'pagination': pagination,
        'filters': {
            'search': request.GET.get('search', ''),
            'status': request.GET.get('status', ''),
            'owner': request.GET.get('owner', ''),
            'archived': request.GET.get('archived') in ('1', 'true'),
        },
        'sort': sort,
        'members': _members(),
        'statuses': [{'id': value, 'name': label} for value, label in Project.Status.choices],
        'canCreate': policies.can_create_project(request.user),
    }


@require_app('tasks-projects')
@login_required
@require_POST
def project_create(request):
    if not policies.can_create_project(request.user):
        return JsonResponse({'error': 'You do not have permission to create projects.'}, status=403)
    data, error = _json_body(request)
    if error:
        return error
    project, errors = services.create_project(request.user, data)
    if errors:
        return JsonResponse({'error': 'Please fix the highlighted fields.', 'errors': errors}, status=400)
    project = _get_project(project.uuid)
    return JsonResponse({'success': True, 'project': services.serialize_project(project, request.user)}, status=201)


# ─────────────────────────────────────────────
# Project detail
# ─────────────────────────────────────────────

PROJECT_TABS = ('overview', 'tasks')


@require_app('tasks-projects')
@login_required
@inertia('ProjectView')
def project_view(request, uuid, tab='overview'):
    project = _get_project(uuid)
    if project is None or not policies.can_view_project(request.user, project):
        return redirect('projects')
    if tab not in PROJECT_TABS:
        return redirect('project_view', uuid=uuid)

    props = {
        'workspace': services.workspace_sidebar(request.user),
        'project': services.serialize_project(project, request.user),
        'tab': tab,
        'members': _members(),
        'statuses': [{'id': value, 'name': label} for value, label in Project.Status.choices],
    }

    project_tasks = services.task_queryset().filter(project=project).exclude(status=Task.Status.DRAFT)

    if tab == 'overview':
        upcoming = project_tasks.filter(
            status__in=services.OPEN_STATUSES, due_date__isnull=False
        ).order_by('due_date')[:6]
        props['upcoming'] = [services.serialize_task_row(t) for t in upcoming]
        props['activity'] = services.project_activity(project)
        by_status = dict(
            project_tasks.order_by().values_list('status').annotate(n=Count('id'))
        )
        props['statusBreakdown'] = [
            {'status': value, 'label': label, 'count': by_status.get(value, 0)}
            for value, label in Task.Status.choices
            if value != Task.Status.DRAFT
        ]

    elif tab == 'tasks':
        layout = request.GET.get('layout', 'list')
        layout = layout if layout in ('list', 'board') else 'list'
        filtered = services.filter_tasks(project_tasks, request.GET, request.user)
        filtered, sort = services.sort_tasks(filtered, request.GET.get('sort', 'created'))

        if layout == 'board':
            rows = list(filtered[:BOARD_TASK_LIMIT])
            props['tasks'] = [services.serialize_task_row(t) for t in rows]
            props['truncated'] = filtered.count() > BOARD_TASK_LIMIT
            props['pagination'] = None
        else:
            page_obj, pagination = services.paginate(filtered, request.GET.get('page', 1), request.GET.get('per_page', 25))
            props['tasks'] = [services.serialize_task_row(t) for t in page_obj]
            props['pagination'] = pagination
            props['truncated'] = False

        props['layout'] = layout
        props['sort'] = sort
        props['filters'] = {
            key: request.GET.get(key, '')
            for key in ('search', 'status', 'priority', 'type', 'assignee', 'due')
        }
        props['boardColumns'] = _board_columns()
        props['groups'] = [{'id': g.id, 'name': g.name} for g in _groups()]

    return props


def _groups():
    from modules.users.models import Group
    return Group.objects.all().order_by('name')


@require_app('tasks-projects')
@login_required
@require_POST
def project_update(request, uuid):
    project = Project.objects.filter(uuid=uuid).first()
    if project is None:
        return JsonResponse({'error': 'Project not found.'}, status=404)
    if not policies.can_edit_project(request.user, project):
        return JsonResponse({'error': 'You do not have permission to edit this project.'}, status=403)
    data, error = _json_body(request)
    if error:
        return error
    project, errors = services.update_project(project, request.user, data)
    if errors:
        return JsonResponse({'error': 'Please fix the highlighted fields.', 'errors': errors}, status=400)
    project = _get_project(uuid)
    return JsonResponse({'success': True, 'project': services.serialize_project(project, request.user)})


def _set_archived(request, uuid, archived):
    project = Project.objects.filter(uuid=uuid).first()
    if project is None:
        return JsonResponse({'error': 'Project not found.'}, status=404)
    if not policies.can_archive_project(request.user, project):
        return JsonResponse({'error': 'You do not have permission to archive this project.'}, status=403)
    services.set_project_archived(project, request.user, archived)
    project = _get_project(uuid)
    return JsonResponse({'success': True, 'project': services.serialize_project(project, request.user)})


@require_app('tasks-projects')
@login_required
@require_POST
def project_archive(request, uuid):
    return _set_archived(request, uuid, True)


@require_app('tasks-projects')
@login_required
@require_POST
def project_unarchive(request, uuid):
    return _set_archived(request, uuid, False)


@require_app('tasks-projects')
@login_required
@require_POST
def project_add_tasks(request, uuid):
    """Link existing tasks to a project."""
    project = Project.objects.filter(uuid=uuid).first()
    if project is None:
        return JsonResponse({'error': 'Project not found.'}, status=404)
    if not policies.can_add_tasks_to_project(request.user, project):
        return JsonResponse({'error': 'Tasks cannot be added to an archived project.'}, status=400)
    data, error = _json_body(request)
    if error:
        return error
    task_uuids = [services.parse_uuid(u) for u in services.parse_json_list(data.get('task_uuids'))]
    task_uuids = [u for u in task_uuids if u]
    if not task_uuids:
        return JsonResponse({'error': 'Select at least one task.'}, status=400)

    moved = 0
    # Save one by one so the activity stream records every move.
    for task in Task.objects.filter(uuid__in=task_uuids).exclude(project=project):
        task.project = project
        task.save()
        moved += 1
    return JsonResponse({'success': True, 'moved': moved})


@require_app('tasks-projects')
@login_required
def project_task_candidates(request, uuid):
    """Search tasks that are not yet in this project (for the 'Add existing tasks' picker)."""
    project = Project.objects.filter(uuid=uuid).first()
    if project is None:
        return JsonResponse({'error': 'Project not found.'}, status=404)
    queryset = services.task_queryset().exclude(project=project).exclude(status=Task.Status.DRAFT)
    queryset = services.filter_tasks(queryset, {'search': request.GET.get('search', '')}, request.user)
    rows = queryset.order_by('-updated_at')[:20]
    return JsonResponse({'tasks': [services.serialize_task_row(t) for t in rows]})


@require_app('tasks-projects')
@login_required
def project_options(request):
    return JsonResponse({'projects': services.project_options()})
