"""
Tasks views - Task management functionality
"""
import json
from datetime import datetime

from shared.utilities.organization import site_url
from django.shortcuts import redirect
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils import timezone
from django.core.paginator import Paginator
from inertia import inertia

from shared.decorators import require_app
from modules.tasks import services
from modules.tasks.models import Task, TaskType, TaskComment, TaskAttachment, TaskActivityStream
from modules.users.models import Group

import logging
logger = logging.getLogger(__name__)


def _agent_display_name(user):
    """Return the agent's real name, falling back to username (never email)."""
    profile = getattr(user, 'profile', None)
    full_name = (getattr(profile, 'full_name', '') or '').strip()
    if full_name:
        return full_name
    name = f"{user.first_name or ''} {user.last_name or ''}".strip()
    return name or user.username


def _wants_json(request):
    """XHR/JSON request that is not an Inertia visit."""
    if request.headers.get('X-Inertia'):
        return False
    return (
        request.headers.get('X-Requested-With') == 'XMLHttpRequest'
        or 'application/json' in request.META.get('HTTP_ACCEPT', '')
    )


def _task_ticket_links(task):
    """Ticket/work-item records linked to a task, in the shape the UI expects."""
    return {
        'related_ticket': services.serialize_ticket_summary(task.related_ticket),
        'converted_from_ticket': services.serialize_ticket_summary(task.converted_from_ticket),
        'converted_to_ticket': services.serialize_ticket_summary(task.converted_to_ticket),
        'converted_to_work_item': services.serialize_work_item_summary(task.converted_to_work_item),
    }


@require_app('tasks-projects')
@login_required
@inertia('Tasks')
def tasks(request):
    """Tasks listing page (list, card and board views)."""
    # Load active views from database first to determine default
    from modules.settings.models import SettingsView
    active_views = SettingsView.objects.filter(type='TASK', is_active=True).order_by('order')

    # Get default view: first check is_default, then fallback to first view
    default_view = active_views.filter(is_default=True).first()
    if not default_view:
        default_view = active_views.first()
    default_view_id = default_view.view_id if default_view else 'all'

    view = request.GET.get('view', default_view_id)
    page_number = request.GET.get('page', 1)

    tasks_qs = services.apply_task_view(
        services.task_queryset().prefetch_related('watchers'), view, request.user
    )
    tasks_qs = services.filter_tasks(tasks_qs, request.GET, request.user)
    tasks_qs, sort = services.sort_tasks(tasks_qs, request.GET.get('sort', 'created'))

    page_obj, pagination = services.paginate(
        tasks_qs, page_number, request.GET.get('per_page', services.DEFAULT_PER_PAGE)
    )
    tasks_data = [services.serialize_task_row(task) for task in page_obj]

    counters = services.task_counts(request.user)
    workspace = services.workspace_sidebar(request.user, counts=counters)

    views_list = [
        {
            'id': saved['id'],
            'label': saved['label'],
            'count': saved['count'] or 0,
            'is_default': saved['is_default'],
            'active': view == saved['id'],
        }
        for saved in workspace['saved_views']
    ]

    filters = {
        key: request.GET.get(key, '')
        for key in ('search', 'taskNumber', 'status', 'priority', 'type', 'assignee', 'project', 'due', 'dateFrom', 'dateTo')
    }

    return {
        'sidebar': {
            'views': views_list,
        },
        'workspace': workspace,
        'tasks': tasks_data,
        'counters': counters,
        'currentView': view,
        'draftsCount': counters['drafts'],
        'filters': filters,
        'sort': sort,
        'projects': services.project_options(),
        'users': [services.serialize_user(u) for u in User.objects.filter(is_active=True).order_by('first_name', 'last_name')],
        'pagination': pagination,
    }


@require_app('tasks-projects')
@login_required
def bulk_mark_draft(request):
    """Bulk mark tasks as draft."""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        task_ids = data.get('task_ids', [])
        
        if not task_ids:
            return JsonResponse({'error': 'No tasks selected'}, status=400)
        
        # Update tasks to draft status
        updated_count = Task.objects.filter(id__in=task_ids).update(status='draft')
        
        return JsonResponse({
            'success': True,
            'message': f'{updated_count} task(s) marked as draft',
            'updated_count': updated_count
        })
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        logger.exception('Request failed')
        return JsonResponse({'error': 'Something went wrong. Please try again.'}, status=500)


@require_app('tasks-projects')
@login_required
def bulk_remove_draft(request):
    """Bulk remove tasks from draft (set to 'todo' status)."""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        task_ids = data.get('task_ids', [])
        
        if not task_ids:
            return JsonResponse({'error': 'No tasks selected'}, status=400)
        
        # Update draft tasks to 'todo' status
        updated_count = Task.objects.filter(id__in=task_ids, status='draft').update(status='todo')
        
        return JsonResponse({
            'success': True,
            'message': f'{updated_count} task(s) removed from drafts',
            'updated_count': updated_count
        })
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        logger.exception('Request failed')
        return JsonResponse({'error': 'Something went wrong. Please try again.'}, status=500)


@require_app('tasks-projects')
@login_required
def task_types(request):
    """GET lists the workspace's task types; POST creates one (used by the "Add type" dialog)."""
    if request.method == 'GET':
        return JsonResponse({'types': services.task_type_options()})
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    try:
        data = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    task_type, errors = services.create_task_type(data)
    if errors:
        return JsonResponse({'error': next(iter(errors.values())), 'errors': errors}, status=400)
    return JsonResponse({'success': True, 'type': services.serialize_task_type(task_type)}, status=201)


@require_app('tasks-projects')
@login_required
@inertia('AddTask')
def add_task(request):
    """Add task form page. POST creates the task through the shared service."""
    if request.method == 'POST':
        if request.content_type == 'application/json':
            try:
                data = json.loads(request.body or '{}')
            except json.JSONDecodeError:
                return JsonResponse({'error': 'Invalid JSON'}, status=400)
        else:
            data = request.POST

        task, errors = services.create_task(request.user, data)
        if errors:
            return JsonResponse({'error': next(iter(errors.values())), 'errors': errors}, status=400)

        # XHR callers (quick add, board column, project tasks tab) get JSON;
        # the Inertia form keeps its redirect to the task page.
        if _wants_json(request):
            return JsonResponse({'success': True, 'task': services.serialize_task_row(task)}, status=201)
        return redirect('task_view', uuid=task.uuid)

    # GET request - show form
    groups = Group.objects.all()
    users = User.objects.filter(is_active=True).order_by('first_name', 'last_name')

    return {
        'groups': [{'id': g.id, 'name': g.name} for g in groups],
        'users': [services.serialize_user(u) for u in users],
        'projects': services.project_options(),
        'defaultProject': request.GET.get('project', ''),
    }


@require_app('tasks-projects')
@login_required
@inertia('TaskView')
def task_view(request, uuid):
    """Single task view with comments, attachments, and activity stream."""
    try:
        task = Task.objects.select_related(
            'created_by', 'assignee', 'group', 'related_ticket', 'converted_from_ticket',
            'converted_to_ticket', 'converted_to_work_item__ticket', 'project', 'task_type',
        ).prefetch_related('watchers', 'comments__author', 'attachments', 'activities__actor').get(uuid=uuid)
    except Task.DoesNotExist:
        return redirect('tasks')

    # Serialize task data
    task_data = {
        'id': task.id,
        'uuid': str(task.uuid),
        'title': task.title,
        'description': task.description,
        'status': task.status,
        'status_display': task.get_status_display(),
        'priority': task.priority,
        'priority_display': task.get_priority_display(),
        'task_type': services.serialize_task_type(task.task_type),
        'tags': task.tags,
        'created_by': {
            'id': task.created_by.id,
            'name': f"{task.created_by.first_name} {task.created_by.last_name}".strip() or task.created_by.username,
            'email': task.created_by.email,
        } if task.created_by else None,
        'assignee': {
            'id': task.assignee.id,
            'name': f"{task.assignee.first_name} {task.assignee.last_name}".strip() or task.assignee.username,
        } if task.assignee else None,
        'group': {
            'id': task.group.id,
            'name': task.group.name,
        } if task.group else None,
        'watchers': [{
            'id': w.id,
            'name': f"{w.first_name} {w.last_name}".strip() or w.username
        } for w in task.watchers.all()],
        'due_date': task.due_date.strftime('%Y-%m-%d') if task.due_date else None,
        'completed_at': task.completed_at.strftime('%Y-%m-%d %H:%M') if task.completed_at else None,
        'created_at': task.created_at.strftime('%Y-%m-%d %H:%M'),
        'updated_at': task.updated_at.strftime('%Y-%m-%d %H:%M'),
        **_task_ticket_links(task),
        'project': {
            'uuid': str(task.project.uuid),
            'name': task.project.name,
            'status': task.project.status,
            'is_archived': task.project.is_archived,
        } if task.project_id else None,
    }

    # Serialize comments with nested replies
    def serialize_comment(comment):
        return {
            'id': comment.id,
            'author': {
                'id': comment.author.id,
                'name': f"{comment.author.first_name} {comment.author.last_name}".strip() or comment.author.username,
            } if comment.author else None,
            'message': comment.message,
            'attachments': comment.attachments,
            'is_internal': comment.is_internal,
            'created_at': comment.created_at.strftime('%Y-%m-%d %H:%M'),
            'updated_at': comment.updated_at.strftime('%Y-%m-%d %H:%M'),
            'replies': [serialize_comment(reply) for reply in comment.replies.all()]
        }

    # Get only top-level comments
    top_level_comments = task.comments.filter(parent_comment__isnull=True)
    comments = [serialize_comment(comment) for comment in top_level_comments]

    # Serialize attachments
    attachments = [{
        'id': att.id,
        'file_url': att.file_url,
        'file_name': att.file_name,
        'file_size': att.file_size,
        'file_type': att.file_type,
        'uploaded_by': {
            'id': att.uploaded_by.id,
            'name': f"{att.uploaded_by.first_name} {att.uploaded_by.last_name}".strip() or att.uploaded_by.username,
        } if att.uploaded_by else None,
        'uploaded_at': att.uploaded_at.strftime('%Y-%m-%d %H:%M'),
    } for att in task.attachments.all()]

    # Serialize activities
    activities = [{
        'id': act.id,
        'activity_type': act.activity_type,
        'activity_display': act.get_activity_type_display(),
        'actor': {
            'id': act.actor.id,
            'name': f"{act.actor.first_name} {act.actor.last_name}".strip() or act.actor.username,
        } if act.actor else None,
        'description': act.description,
        'metadata': act.metadata,
        'created_at': act.created_at.strftime('%Y-%m-%d %H:%M'),
    } for act in task.activities.all()]

    # Get available users for assignment
    users = User.objects.all().order_by('first_name', 'last_name')
    users_data = [{
        'id': u.id,
        'name': f"{u.first_name} {u.last_name}".strip() or u.username
    } for u in users]

    # Get groups
    groups = Group.objects.all().order_by('name')
    groups_data = [{'id': g.id, 'name': g.name} for g in groups]

    return {
        'task': task_data,
        'comments': comments,
        'attachments': attachments,
        'activities': activities,
        'users': users_data,
        'groups': groups_data,
        'projects': services.project_options(),
        'related_tasks': services.related_tasks(task),
    }


@require_app('tasks-projects')
@login_required
def task_form_data(request):
    """API endpoint to get users and groups for task forms."""
    groups = Group.objects.all()
    users = User.objects.all().order_by('first_name', 'last_name')
    
    return JsonResponse({
        'groups': [{'id': g.id, 'name': g.name} for g in groups],
        'users': [
            {
                'id': u.id,
                'name': f"{u.first_name} {u.last_name}".strip() or u.username
            }
            for u in users
        ],
        'projects': services.project_options(),
    })


@require_app('tasks-projects')
@login_required
def task_api(request, uuid):
    """API endpoint for fetching task data as JSON (for modal view)."""
    try:
        task = Task.objects.select_related(
            'created_by', 'assignee', 'group', 'related_ticket', 'converted_from_ticket',
            'converted_to_ticket', 'converted_to_work_item__ticket', 'project', 'task_type',
        ).prefetch_related('watchers', 'comments__author', 'attachments', 'activities__actor').get(uuid=uuid)
    except Task.DoesNotExist:
        return JsonResponse({'error': 'Task not found'}, status=404)

    # Serialize task data
    task_data = {
        'id': task.id,
        'uuid': str(task.uuid),
        'title': task.title,
        'description': task.description,
        'status': task.status,
        'status_display': task.get_status_display(),
        'priority': task.priority,
        'priority_display': task.get_priority_display(),
        'task_type': services.serialize_task_type(task.task_type),
        'tags': task.tags,
        'created_by': {
            'id': task.created_by.id,
            'name': f"{task.created_by.first_name} {task.created_by.last_name}".strip() or task.created_by.username,
            'email': task.created_by.email,
        } if task.created_by else None,
        'assignee': {
            'id': task.assignee.id,
            'name': f"{task.assignee.first_name} {task.assignee.last_name}".strip() or task.assignee.username,
        } if task.assignee else None,
        'group': {
            'id': task.group.id,
            'name': task.group.name,
        } if task.group else None,
        'watchers': [{
            'id': w.id,
            'name': f"{w.first_name} {w.last_name}".strip() or w.username
        } for w in task.watchers.all()],
        'due_date': task.due_date.strftime('%Y-%m-%d') if task.due_date else None,
        'completed_at': task.completed_at.strftime('%Y-%m-%d %H:%M') if task.completed_at else None,
        'created_at': task.created_at.strftime('%Y-%m-%d %H:%M'),
        'updated_at': task.updated_at.strftime('%Y-%m-%d %H:%M'),
        **_task_ticket_links(task),
        'project': {
            'uuid': str(task.project.uuid),
            'name': task.project.name,
            'status': task.project.status,
            'is_archived': task.project.is_archived,
        } if task.project_id else None,
    }

    # Serialize comments with nested replies
    def serialize_comment(comment):
        return {
            'id': comment.id,
            'author': {
                'id': comment.author.id,
                'name': f"{comment.author.first_name} {comment.author.last_name}".strip() or comment.author.username,
            } if comment.author else None,
            'message': comment.message,
            'attachments': comment.attachments,
            'is_internal': comment.is_internal,
            'created_at': comment.created_at.strftime('%Y-%m-%d %H:%M'),
            'updated_at': comment.updated_at.strftime('%Y-%m-%d %H:%M'),
            'replies': [serialize_comment(reply) for reply in comment.replies.all()]
        }

    # Get only top-level comments
    top_level_comments = task.comments.filter(parent_comment__isnull=True)
    comments = [serialize_comment(comment) for comment in top_level_comments]

    # Serialize attachments
    attachments = [{
        'id': att.id,
        'file_url': att.file_url,
        'file_name': att.file_name,
        'file_size': att.file_size,
        'file_type': att.file_type,
        'uploaded_by': {
            'id': att.uploaded_by.id,
            'name': f"{att.uploaded_by.first_name} {att.uploaded_by.last_name}".strip() or att.uploaded_by.username,
        } if att.uploaded_by else None,
        'uploaded_at': att.uploaded_at.strftime('%Y-%m-%d %H:%M'),
    } for att in task.attachments.all()]

    # Serialize activities
    activities = [{
        'id': act.id,
        'activity_type': act.activity_type,
        'activity_display': act.get_activity_type_display(),
        'actor': {
            'id': act.actor.id,
            'name': f"{act.actor.first_name} {act.actor.last_name}".strip() or act.actor.username,
        } if act.actor else None,
        'description': act.description,
        'metadata': act.metadata,
        'created_at': act.created_at.strftime('%Y-%m-%d %H:%M'),
    } for act in task.activities.all()]

    # Get available users for assignment
    users = User.objects.all().order_by('first_name', 'last_name')
    users_data = [{
        'id': u.id,
        'name': f"{u.first_name} {u.last_name}".strip() or u.username
    } for u in users]

    # Get groups
    groups = Group.objects.all().order_by('name')
    groups_data = [{'id': g.id, 'name': g.name} for g in groups]

    return JsonResponse({
        'task': task_data,
        'comments': comments,
        'attachments': attachments,
        'activities': activities,
        'users': users_data,
        'groups': groups_data,
        'projects': services.project_options(),
    })


@require_app('tasks-projects')
@login_required
def task_update_fields(request, uuid):
    """Update task fields."""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        task = Task.objects.get(uuid=uuid)
    except Task.DoesNotExist:
        return JsonResponse({'error': 'Task not found'}, status=404)

    if request.content_type == 'application/json':
        try:
            data = json.loads(request.body or '{}')
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
    else:
        data = request.POST

    # Update fields if provided
    if 'assignee' in data:
        assignee_id = data.get('assignee')
        if assignee_id:
            assignee = User.objects.filter(id=services.parse_int(assignee_id), is_active=True).first()
            if assignee is None:
                return JsonResponse({'error': 'Assignee must be an active member of this workspace.'}, status=400)
            task.assignee = assignee
        else:
            task.assignee = None

    if 'status' in data:
        if data.get('status') not in Task.Status.values:
            return JsonResponse({'error': 'Invalid status'}, status=400)
        task.status = data.get('status')

    if 'priority' in data:
        if data.get('priority') not in Task.Priority.values:
            return JsonResponse({'error': 'Invalid priority'}, status=400)
        task.priority = data.get('priority')

    if 'task_type' in data:
        task_type = TaskType.objects.filter(pk=services.parse_int(data.get('task_type')), is_active=True).first()
        if task_type is None:
            return JsonResponse({'error': 'Invalid type'}, status=400)
        task.task_type = task_type

    if 'project' in data:
        project, project_error = services.resolve_project_for_task(
            data.get('project'), current_project_id=task.project_id
        )
        if project_error:
            return JsonResponse({'error': project_error}, status=400)
        task.project = project

    if 'title' in data:
        title = (data.get('title') or '').strip()
        if not title or len(title) > 255:
            return JsonResponse({'error': 'Title is required (max 255 characters).'}, status=400)
        task.title = title

    if 'description' in data:
        description = data.get('description') or ''
        if not isinstance(description, str) or not description.strip():
            return JsonResponse({'error': 'Description is required.'}, status=400)
        if len(description) > 100000:
            return JsonResponse({'error': 'Description is too long.'}, status=400)
        task.description = description

    if 'group' in data:
        group_id = data.get('group')
        task.group = Group.objects.get(id=group_id) if group_id else None

    if 'due_date' in data:
        due_date_value = data.get('due_date')
        if due_date_value:
            new_due_date, due_error = services.parse_date(due_date_value)
            if due_error:
                return JsonResponse({'error': due_error}, status=400)
            if new_due_date != task.due_date:
                task.due_soon_notification_sent = False
                task.overdue_notification_sent = False
            task.due_date = new_due_date
        else:
            task.due_date = None
            task.due_soon_notification_sent = False
            task.overdue_notification_sent = False

    if 'tags' in data:
        tags = data.get('tags')
        task.tags = json.loads(tags) if isinstance(tags, str) else tags

    if 'watchers' in data:
        watchers = data.get('watchers')
        watcher_ids = json.loads(watchers) if isinstance(watchers, str) else watchers
        task.watchers.set(User.objects.filter(id__in=watcher_ids))

    task.save()

    task = services.task_queryset().get(pk=task.pk)
    return JsonResponse({'success': True, 'task': services.serialize_task_row(task)})


def _process_task_comment_mentions(comment, task, mention_ids, author):
    """Store mentioned users on a task comment and email them."""
    import logging
    from django.conf import settings
    from django.utils.html import strip_tags
    from modules.settings.models import EmailTemplate, NotificationSettings
    from shared.utilities.Mailer import Mailer

    logger = logging.getLogger(__name__)
    try:
        ids = [int(i) for i in mention_ids]
    except (TypeError, ValueError):
        return

    # Don't notify the author about their own mention
    mentioned = User.objects.filter(id__in=ids, is_active=True).exclude(id=author.id)
    if not mentioned.exists():
        return
    comment.mentions.set(mentioned)

    try:
        if not NotificationSettings.get_settings().notify_ticket_mentioned:
            return
    except Exception:
        pass

    try:
        template = EmailTemplate.objects.get(template_type='user_mentioned', status='active')
    except EmailTemplate.DoesNotExist:
        return

    base_url = site_url()
    author_name = _agent_display_name(author)
    preview = strip_tags(comment.message or '').replace('&nbsp;', ' ').strip()
    mailer = Mailer()

    for user in mentioned:
        if not user.email:
            continue
        try:
            subject, html, text = template.render({
                'user_name': _agent_display_name(user),
                'mentioned_by': author_name,
                'ticket_number': f"Task {task.title}",
                'ticket_subject': task.title,
                'comment_preview': preview[:200] + ('...' if len(preview) > 200 else ''),
                'ticket_url': f"{base_url}/tasks/{task.uuid}",
                'company_name': 'Support',
            })
            mailer.send_raw_email(
                to_email=user.email,
                subject=subject or f'You were mentioned in task {task.title}',
                html_content=html or '',
                text_content=text or '',
            )
        except Exception as e:
            logger.error(f"Failed to send mention notification to {user.email}: {e}")


@require_app('tasks-projects')
@login_required
def task_add_comment(request, uuid):
    """Add a comment to a task."""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        task = Task.objects.get(uuid=uuid)
    except Task.DoesNotExist:
        return JsonResponse({'error': 'Task not found'}, status=404)

    # Handle JSON data from Inertia
    if request.content_type == 'application/json':
        data = json.loads(request.body)
        message = data.get('message', '').strip()
        is_internal = data.get('is_internal', False)
        attachments_json = data.get('attachments', '[]')
        parent_id = data.get('parent_id')
        mention_ids = data.get('mentions', [])
    else:
        message = request.POST.get('message', '').strip()
        is_internal = request.POST.get('is_internal') == 'true'
        attachments_json = request.POST.get('attachments', '[]')
        parent_id = request.POST.get('parent_id')
        try:
            mention_ids = json.loads(request.POST.get('mentions', '[]'))
        except json.JSONDecodeError:
            mention_ids = []

    if not message:
        return JsonResponse({'error': 'Message is required'}, status=400)

    # Parse attachments
    try:
        attachments_data = json.loads(attachments_json) if isinstance(attachments_json, str) else attachments_json
    except json.JSONDecodeError:
        attachments_data = []

    # Get parent comment if this is a reply
    parent_comment = None
    if parent_id:
        try:
            parent_comment = TaskComment.objects.get(id=parent_id, task=task)
        except TaskComment.DoesNotExist:
            pass

    # Create comment
    comment = TaskComment.objects.create(
        task=task,
        author=request.user,
        message=message,
        is_internal=is_internal,
        attachments=attachments_data,
        parent_comment=parent_comment
    )

    if mention_ids:
        _process_task_comment_mentions(comment, task, mention_ids, request.user)

    # Create activity stream entry
    TaskActivityStream.objects.create(
        task=task,
        activity_type=TaskActivityStream.ActivityType.COMMENT_ADDED,
        actor=request.user,
        description=f"Comment added by {request.user.get_full_name() or request.user.username}",
        metadata={'is_internal': is_internal}
    )

    return JsonResponse({'success': True})


@require_app('tasks-projects')
@login_required
def task_comment_detail(request, uuid, comment_id):
    """Toggle visibility (PATCH) or delete (DELETE) a task comment."""
    try:
        comment = TaskComment.objects.get(id=comment_id, task__uuid=uuid)
    except TaskComment.DoesNotExist:
        return JsonResponse({'error': 'Comment not found'}, status=404)

    if request.method == 'DELETE':
        comment.delete()
        return JsonResponse({'success': True})
    if request.method == 'PATCH':
        data = json.loads(request.body or '{}')
        if 'is_internal' in data:
            comment.is_internal = bool(data['is_internal'])
            comment.save(update_fields=['is_internal'])
            comment.replies.update(is_internal=comment.is_internal)
        return JsonResponse({'success': True})
    return JsonResponse({'error': 'Method not allowed'}, status=405)


@require_app('tasks-projects')
@login_required
def task_upload_attachment(request, uuid):
    """Upload an attachment to a task."""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        task = Task.objects.get(uuid=uuid)
    except Task.DoesNotExist:
        return JsonResponse({'error': 'Task not found'}, status=404)

    file_url = request.POST.get('file_url')
    file_name = request.POST.get('file_name')
    file_size = request.POST.get('file_size', 0)
    file_type = request.POST.get('file_type', '')

    if not file_url or not file_name:
        return JsonResponse({'error': 'File URL and name are required'}, status=400)

    attachment = TaskAttachment.objects.create(
        task=task,
        file_url=file_url,
        file_name=file_name,
        file_size=int(file_size) if file_size else None,
        file_type=file_type,
        uploaded_by=request.user
    )

    # Create activity stream entry
    TaskActivityStream.objects.create(
        task=task,
        activity_type=TaskActivityStream.ActivityType.ATTACHMENT_ADDED,
        actor=request.user,
        description=f"Attachment '{file_name}' added",
        metadata={'file_name': file_name, 'file_size': attachment.file_size}
    )

    return JsonResponse({
        'id': attachment.id,
        'file_url': attachment.file_url,
        'file_name': attachment.file_name,
        'file_size': attachment.file_size,
        'file_type': attachment.file_type,
        'uploaded_at': attachment.uploaded_at.strftime('%Y-%m-%d %H:%M'),
    })


@require_app('tasks-projects')
@login_required
def task_convert_to_ticket(request, uuid):
    """Create a ticket from a task and link the two records."""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        task = Task.objects.select_related('created_by', 'group').get(uuid=uuid)
    except Task.DoesNotExist:
        return JsonResponse({'error': 'Task not found'}, status=404)

    if request.content_type == 'application/json':
        try:
            data = json.loads(request.body or '{}')
        except (TypeError, ValueError):
            return JsonResponse({'error': 'Invalid JSON body'}, status=400)
    else:
        data = request.POST

    ticket, errors = services.convert_task_to_ticket(task, request.user, data)
    if errors:
        return JsonResponse({'errors': errors}, status=400)

    return JsonResponse({
        'success': True,
        'ticket': services.serialize_ticket_summary(ticket),
    }, status=201)


@require_app('tasks-projects')
@login_required
def task_convert_to_work_item(request, uuid):
    """Create a ticket work item from a task and link the two records."""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        task = Task.objects.select_related(
            'created_by', 'related_ticket', 'converted_from_ticket', 'converted_to_ticket',
        ).get(uuid=uuid)
    except Task.DoesNotExist:
        return JsonResponse({'error': 'Task not found'}, status=404)

    if request.content_type == 'application/json':
        try:
            data = json.loads(request.body or '{}')
        except (TypeError, ValueError):
            return JsonResponse({'error': 'Invalid JSON body'}, status=400)
    else:
        data = request.POST

    work_item, errors = services.convert_task_to_work_item(task, request.user, data)
    if errors:
        return JsonResponse({'errors': errors}, status=400)

    return JsonResponse({
        'success': True,
        'work_item': services.serialize_work_item_summary(work_item),
    }, status=201)


@require_app('tasks-projects')
@login_required
def convert_ticket_to_task(request, ticket_uuid):
    """Convert a ticket to a task."""
    from modules.ticket.models import ActivityStream, Ticket

    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        ticket = Ticket.objects.get(uuid=ticket_uuid)
    except Ticket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)

    # Create task from ticket
    task = Task.objects.create(
        title=ticket.title,
        description=ticket.description,
        created_by=request.user,
        assignee=ticket.assignee,
        priority=ticket.priority,
        task_type=TaskType.default(),
        tags=ticket.tags,
        converted_from_ticket=ticket,
    )

    # Add watchers
    task.watchers.set(ticket.watchers.all())

    ActivityStream.objects.create(
        ticket=ticket,
        activity_type=ActivityStream.ActivityType.TICKET_UPDATED,
        actor=request.user,
        description=f"Converted to task TASK-{task.id} \"{task.title}\"",
        metadata={'task_id': task.id, 'task_uuid': str(task.uuid)},
    )

    return JsonResponse({
        'success': True,
        'task_id': task.id,
        'task_uuid': str(task.uuid),
        'task_title': task.title,
    })


@require_app('tasks-projects')
@login_required
def create_task_from_ticket(request, ticket_uuid):
    """Create a related task based on a ticket."""
    from modules.ticket.models import Ticket

    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        ticket = Ticket.objects.get(uuid=ticket_uuid)
    except Ticket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)

    if request.content_type == 'application/json':
        data = json.loads(request.body)
    else:
        data = request.POST

    title = data.get('title', f"Task for ticket #{ticket.id}")
    description = data.get('description', ticket.description)

    # Create related task
    task = Task.objects.create(
        title=title,
        description=description,
        created_by=request.user,
        assignee=ticket.assignee,
        priority=ticket.priority,
        task_type=TaskType.default(),
        tags=ticket.tags,
        related_ticket=ticket,
    )

    return JsonResponse({'success': True, 'task_id': task.id})


# ─────────────────────────────────────────────
# Board Column APIs
# ─────────────────────────────────────────────

@require_app('tasks-projects')
@login_required
def board_columns(request):
    """Get all board columns for task board."""
    from modules.settings.models import BoardColumn
    
    if request.method == 'GET':
        # Auto-seed default columns if none exist
        BoardColumn.seed_default_task_columns()
        
        # Check if requesting hidden columns
        include_hidden = request.GET.get('include_hidden') == 'true'
        
        if include_hidden:
            columns = BoardColumn.objects.filter(
                board_type=BoardColumn.BoardType.TASK
            ).order_by('position')
        else:
            columns = BoardColumn.get_task_columns()
        
        columns_data = [
            {
                'id': col.column_id,
                'label': col.label,
                'color': col.color,
                'description': col.description or '',
                'position': col.position,
                'is_visible': col.is_visible,
                'wip_limit': col.wip_limit,
            }
            for col in columns
        ]
        return JsonResponse({'columns': columns_data})
    
    return JsonResponse({'error': 'Method not allowed'}, status=405)


@require_app('tasks-projects')
@login_required
def board_column_update(request, column_id):
    """Update a board column's settings."""
    from modules.settings.models import BoardColumn
    
    if request.method not in ['PUT', 'PATCH', 'POST']:
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        column = BoardColumn.objects.get(
            board_type=BoardColumn.BoardType.TASK,
            column_id=column_id
        )
    except BoardColumn.DoesNotExist:
        return JsonResponse({'error': 'Column not found'}, status=404)
    
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    
    # Update allowed fields
    if 'label' in data:
        column.label = data['label']
    if 'color' in data:
        column.color = data['color']
    if 'description' in data:
        column.description = data['description']
    if 'is_visible' in data:
        column.is_visible = data['is_visible']
    if 'wip_limit' in data:
        column.wip_limit = data['wip_limit'] if data['wip_limit'] else None
    
    column.save()
    
    return JsonResponse({
        'success': True,
        'column': {
            'id': column.column_id,
            'label': column.label,
            'color': column.color,
            'description': column.description or '',
            'position': column.position,
            'is_visible': column.is_visible,
            'wip_limit': column.wip_limit,
        }
    })


@require_app('tasks-projects')
@login_required
def board_column_reorder(request):
    """Reorder board columns."""
    from modules.settings.models import BoardColumn
    
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    
    column_order = data.get('order', [])  # List of column_ids in new order
    
    if not column_order:
        return JsonResponse({'error': 'Order list is required'}, status=400)
    
    # Update positions
    for position, column_id in enumerate(column_order):
        BoardColumn.objects.filter(
            board_type=BoardColumn.BoardType.TASK,
            column_id=column_id
        ).update(position=position)
    
    return JsonResponse({'success': True})

