"""
Tasks views - Task management functionality
"""
import json
from datetime import datetime

from django.shortcuts import redirect
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils import timezone
from django.core.paginator import Paginator
from inertia import inertia

from shared.decorators import require_app
from modules.tasks.models import Task, TaskComment, TaskAttachment, TaskActivityStream
from modules.users.models import Group


@require_app('tasks-projects')
@login_required
@inertia('Tasks')
def tasks(request):
    """Tasks listing page."""
    # Load active views from database first to determine default
    from modules.settings.models import SettingsView
    active_views = SettingsView.objects.filter(type='TASK', is_active=True).order_by('order')
    
    # Get default view: first check is_default, then fallback to first view
    default_view = active_views.filter(is_default=True).first()
    if not default_view:
        default_view = active_views.first()
    default_view_id = default_view.view_id if default_view else 'all'
    
    # Get filter parameter, fallback to default view
    view = request.GET.get('view', default_view_id)
    page_number = request.GET.get('page', 1)
    per_page = 15

    # Base queryset (exclude drafts by default)
    tasks_qs = Task.objects.select_related('created_by', 'assignee', 'group').prefetch_related('watchers').exclude(status='draft')
    
    # Count drafts separately (for the Drafts view in sidebar)
    drafts_count = Task.objects.filter(status='draft').count()

    # Apply filters based on view
    if view == 'drafts':
        # For drafts view, show only draft tasks
        tasks_qs = Task.objects.select_related('created_by', 'assignee', 'group').prefetch_related('watchers').filter(status='draft')
    elif view == 'my_tasks':
        tasks_qs = tasks_qs.filter(assignee=request.user)
    elif view == 'created_by_me':
        tasks_qs = tasks_qs.filter(created_by=request.user)
    elif view == 'watching':
        tasks_qs = tasks_qs.filter(watchers=request.user)
    elif view == 'todo':
        tasks_qs = tasks_qs.filter(status=Task.Status.TODO)
    elif view == 'in_progress':
        tasks_qs = tasks_qs.filter(status=Task.Status.IN_PROGRESS)
    elif view == 'review':
        tasks_qs = tasks_qs.filter(status=Task.Status.REVIEW)
    elif view == 'done':
        tasks_qs = tasks_qs.filter(status=Task.Status.DONE)
    elif view == 'high_priority':
        tasks_qs = tasks_qs.filter(priority__in=[Task.Priority.HIGH, Task.Priority.URGENT])
    elif view == 'overdue':
        tasks_qs = tasks_qs.filter(due_date__lt=timezone.now().date(), status__in=[Task.Status.TODO, Task.Status.IN_PROGRESS])

    # Apply additional filters from URL parameters
    task_number = request.GET.get('taskNumber', '').strip()
    status_filter = request.GET.get('status', '').strip()
    priority_filter = request.GET.get('priority', '').strip()
    assignee_filter = request.GET.get('assignee', '').strip()
    date_from = request.GET.get('dateFrom', '').strip()
    date_to = request.GET.get('dateTo', '').strip()

    if task_number:
        tasks_qs = tasks_qs.filter(id__icontains=task_number)
    
    if status_filter:
        tasks_qs = tasks_qs.filter(status=status_filter)
    
    if priority_filter:
        tasks_qs = tasks_qs.filter(priority=priority_filter)
    
    if assignee_filter:
        if assignee_filter == 'unassigned':
            tasks_qs = tasks_qs.filter(assignee__isnull=True)
        elif assignee_filter == 'me':
            tasks_qs = tasks_qs.filter(assignee=request.user)
    
    if date_from:
        tasks_qs = tasks_qs.filter(created_at__date__gte=date_from)
    
    if date_to:
        tasks_qs = tasks_qs.filter(created_at__date__lte=date_to)

    tasks_qs = tasks_qs.order_by('-created_at')

    # Paginate tasks
    paginator = Paginator(tasks_qs, per_page)
    page_obj = paginator.get_page(page_number)

    # Serialize tasks
    tasks_data = [
        {
            'id': task.id,
            'uuid': str(task.uuid),
            'title': task.title,
            'description': task.description[:200] + '...' if len(task.description) > 200 else task.description,
            'status': task.status,
            'status_display': task.get_status_display(),
            'priority': task.priority,
            'priority_display': task.get_priority_display(),
            'created_by': {
                'id': task.created_by.id,
                'name': f"{task.created_by.first_name} {task.created_by.last_name}".strip() or task.created_by.username,
            } if task.created_by else None,
            'assignee': {
                'id': task.assignee.id,
                'name': f"{task.assignee.first_name} {task.assignee.last_name}".strip() or task.assignee.username,
            } if task.assignee else None,
            'group': {
                'id': task.group.id,
                'name': task.group.name,
            } if task.group else None,
            'tags': task.tags,
            'due_date': task.due_date.strftime('%Y-%m-%d') if task.due_date else None,
            'created_at': task.created_at.strftime('%Y-%m-%d %H:%M'),
            'updated_at': task.updated_at.strftime('%Y-%m-%d %H:%M'),
        }
        for task in page_obj
    ]

    # Calculate counters (exclude drafts)
    all_tasks = Task.objects.exclude(status='draft')
    counters = {
        'all': all_tasks.count(),
        'my_tasks': all_tasks.filter(assignee=request.user).count(),
        'created_by_me': all_tasks.filter(created_by=request.user).count(),
        'watching': all_tasks.filter(watchers=request.user).count(),
        'todo': all_tasks.filter(status=Task.Status.TODO).count(),
        'in_progress': all_tasks.filter(status=Task.Status.IN_PROGRESS).count(),
        'review': all_tasks.filter(status=Task.Status.REVIEW).count(),
        'done': all_tasks.filter(status=Task.Status.DONE).count(),
        'high_priority': all_tasks.filter(priority__in=[Task.Priority.HIGH, Task.Priority.URGENT]).count(),
    }

    # Calculate overdue tasks count
    overdue_count = all_tasks.filter(
        due_date__lt=timezone.now().date(),
        status__in=[Task.Status.TODO, Task.Status.IN_PROGRESS]
    ).count()

    # Build views list with counts
    views_list = []
    for task_view in active_views:
        count = 0
        if task_view.view_id == 'all':
            count = counters['all']
        elif task_view.view_id == 'my_tasks':
            count = counters['my_tasks']
        elif task_view.view_id == 'created_by_me':
            count = counters['created_by_me']
        elif task_view.view_id == 'watching':
            count = counters['watching']
        elif task_view.view_id == 'todo':
            count = counters['todo']
        elif task_view.view_id == 'in_progress':
            count = counters['in_progress']
        elif task_view.view_id == 'review':
            count = counters['review']
        elif task_view.view_id == 'done':
            count = counters['done']
        elif task_view.view_id == 'high_priority':
            count = counters['high_priority']
        elif task_view.view_id == 'overdue':
            count = overdue_count

        views_list.append({
            'id': task_view.view_id,
            'label': task_view.label,
            'count': count,
            'is_default': task_view.is_default,
            'active': view == task_view.view_id,
        })

    return {
        'sidebar': {
            'views': views_list,
        },
        'tasks': tasks_data,
        'counters': counters,
        'currentView': view,
        'draftsCount': drafts_count,
        'pagination': {
            'current_page': page_obj.number,
            'total_pages': paginator.num_pages,
            'per_page': per_page,
            'total_count': paginator.count,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous(),
        }
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
        return JsonResponse({'error': str(e)}, status=500)


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
        return JsonResponse({'error': str(e)}, status=500)


@require_app('tasks-projects')
@login_required
@inertia('AddTask')
def add_task(request):
    """Add task form page."""
    if request.method == 'POST':
        if request.content_type == 'application/json':
            data = json.loads(request.body)
        else:
            data = request.POST

        title = data.get('title')
        description = data.get('description')
        assignee_id = data.get('assignee')
        priority = data.get('priority', 'normal')
        group_id = data.get('group')
        tags_data = data.get('tags', '[]')
        due_date_str = data.get('due_date')
        watcher_ids = data.get('watchers', '[]')
        status = data.get('status', 'todo')  # Default to 'todo' if not provided

        # Parse due_date string to date object
        due_date = datetime.strptime(due_date_str, '%Y-%m-%d').date() if due_date_str else None

        # Validation
        if not title or not description:
            return JsonResponse({'error': 'Title and Description are required'}, status=400)

        # Parse tags
        try:
            tags = json.loads(tags_data) if isinstance(tags_data, str) else tags_data
        except json.JSONDecodeError:
            tags = []

        # Parse watchers
        try:
            watchers = json.loads(watcher_ids) if isinstance(watcher_ids, str) else watcher_ids
        except json.JSONDecodeError:
            watchers = []

        # Create task
        task = Task.objects.create(
            title=title,
            description=description,
            created_by=request.user,
            assignee=User.objects.get(id=assignee_id) if assignee_id else None,
            priority=priority,
            group=Group.objects.get(id=group_id) if group_id else None,
            tags=tags,
            due_date=due_date if due_date else None,
            status=status,
        )

        # Add watchers
        if watchers:
            task.watchers.set(User.objects.filter(id__in=watchers))

        return redirect('task_view', uuid=task.uuid)

    # GET request - show form
    groups = Group.objects.all()
    users = User.objects.all().order_by('first_name', 'last_name')

    return {
        'groups': [{'id': g.id, 'name': g.name} for g in groups],
        'users': [
            {
                'id': u.id,
                'name': f"{u.first_name} {u.last_name}".strip() or u.username
            }
            for u in users
        ],
    }


@require_app('tasks-projects')
@login_required
@inertia('TaskView')
def task_view(request, uuid):
    """Single task view with comments, attachments, and activity stream."""
    try:
        task = Task.objects.select_related(
            'created_by', 'assignee', 'group', 'related_ticket', 'converted_from_ticket'
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
        'related_ticket': {
            'id': task.related_ticket.id,
            'title': task.related_ticket.title,
        } if task.related_ticket else None,
        'converted_from_ticket': {
            'id': task.converted_from_ticket.id,
            'title': task.converted_from_ticket.title,
        } if task.converted_from_ticket else None,
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
    })


@require_app('tasks-projects')
@login_required
def task_api(request, uuid):
    """API endpoint for fetching task data as JSON (for modal view)."""
    try:
        task = Task.objects.select_related(
            'created_by', 'assignee', 'group', 'related_ticket', 'converted_from_ticket'
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
        'related_ticket': {
            'id': task.related_ticket.id,
            'title': task.related_ticket.title,
        } if task.related_ticket else None,
        'converted_from_ticket': {
            'id': task.converted_from_ticket.id,
            'title': task.converted_from_ticket.title,
        } if task.converted_from_ticket else None,
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
        data = json.loads(request.body)
    else:
        data = request.POST

    # Update fields if provided
    if 'assignee' in data:
        assignee_id = data.get('assignee')
        task.assignee = User.objects.get(id=assignee_id) if assignee_id else None

    if 'status' in data:
        task.status = data.get('status')

    if 'priority' in data:
        task.priority = data.get('priority')

    if 'group' in data:
        group_id = data.get('group')
        task.group = Group.objects.get(id=group_id) if group_id else None

    if 'due_date' in data:
        due_date_value = data.get('due_date')
        if due_date_value:
            new_due_date = datetime.strptime(due_date_value, '%Y-%m-%d').date()
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

    return JsonResponse({'success': True})


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
    else:
        message = request.POST.get('message', '').strip()
        is_internal = request.POST.get('is_internal') == 'true'
        attachments_json = request.POST.get('attachments', '[]')
        parent_id = request.POST.get('parent_id')

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
    TaskComment.objects.create(
        task=task,
        author=request.user,
        message=message,
        is_internal=is_internal,
        attachments=attachments_data,
        parent_comment=parent_comment
    )

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
def convert_ticket_to_task(request, ticket_uuid):
    """Convert a ticket to a task."""
    from modules.ticket.models import Ticket

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
        tags=ticket.tags,
        converted_from_ticket=ticket,
    )

    # Add watchers
    task.watchers.set(ticket.watchers.all())

    # Update ticket to reference the task
    ticket.converted_to_task = task
    ticket.save()

    return JsonResponse({'success': True, 'task_id': task.id})


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

