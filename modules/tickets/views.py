"""
Tickets views - Ticket management functionality
"""
import json
from datetime import datetime, timedelta, date

from django.shortcuts import redirect
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils import timezone
from django.db.models import Q
from django.core.paginator import Paginator
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.core.cache import cache
from django.conf import settings
from django.db import connection
from inertia import inertia, render as inertia_render

from modules.ticket.models import Ticket, TicketComment, TicketAttachment, ActivityStream, Department, WorkItem
from modules.users.models import Group


def get_cached_views(tenant_schema):
    """Get cached ticket views for a tenant."""
    cache_key = f'ticket_views_{tenant_schema}'
    cached_views = cache.get(cache_key)
    
    if cached_views is None:
        from modules.settings.models import SettingsView
        active_views = list(SettingsView.objects.filter(type='TICKET', is_active=True).order_by('order').values(
            'view_id', 'label', 'is_default', 'order'
        ))
        cache.set(cache_key, active_views, getattr(settings, 'VIEWS_CACHE_TIMEOUT', 300))
        return active_views
    
    return cached_views


def invalidate_views_cache(tenant_schema):
    """Invalidate the views cache for a tenant."""
    cache_key = f'ticket_views_{tenant_schema}'
    cache.delete(cache_key)


@login_required
@inertia('Tickets')
def tickets(request):
    """Tickets list page with real data from database."""
    # Use static schema name for single-tenant cache key
    tenant_schema = 'default'
    
    # Load cached views
    cached_views = get_cached_views(tenant_schema)
    
    # Get default view: first check is_default, then fallback to first view (topmost in list)
    default_view = next((v for v in cached_views if v.get('is_default')), None)
    if not default_view and cached_views:
        default_view = cached_views[0]
    default_view_id = default_view['view_id'] if default_view else 'all_tickets'
    
    # Get the requested view from query params, fallback to default view
    view_id = request.GET.get('view', default_view_id)
    page_number = request.GET.get('page', 1)
    per_page = 15

    # Get all tickets (exclude drafts by default)
    all_tickets = Ticket.objects.select_related('requester', 'assignee', 'sla').exclude(status='draft')
    
    # Count drafts separately (for the Drafts view in sidebar)
    drafts_count = Ticket.objects.filter(status='draft').count()

    # Calculate counts for different views
    unsolved_statuses = ['new', 'open', 'in_progress', 'pending']
    your_unsolved = all_tickets.filter(
        Q(assignee=request.user) | Q(requester=request.user),
        status__in=unsolved_statuses
    ).count()

    unassigned = all_tickets.filter(assignee__isnull=True, status__in=unsolved_statuses).count()
    all_unsolved = all_tickets.filter(status__in=unsolved_statuses).count()
    all_tickets_count = all_tickets.count()

    recently_updated_time = datetime.now() - timedelta(days=7)
    recently_updated = all_tickets.filter(
        updated_at__gte=recently_updated_time,
        status__in=unsolved_statuses
    ).count()

    pending = all_tickets.filter(status='pending').count()
    recently_solved = all_tickets.filter(status='resolved', updated_at__gte=recently_updated_time).count()

    # New view counts
    now = timezone.now()
    today = date.today()

    # Response overdue - tickets where response_due_at is in the past
    response_overdue_count = all_tickets.filter(
        sla__response_due_at__lt=now,
        status__in=unsolved_statuses
    ).count()

    # Resolution due today
    resolution_due_today_count = all_tickets.filter(
        sla__resolution_due_at__date=today,
        status__in=unsolved_statuses
    ).count()

    # My resolution overdue - assigned to me and resolution_due_at is in the past
    my_resolution_overdue_count = all_tickets.filter(
        assignee=request.user,
        sla__resolution_due_at__lt=now,
        status__in=unsolved_statuses
    ).count()

    # Requested by me
    requested_by_me_count = all_tickets.filter(requester=request.user).count()

    # Tickets I'm watching - using watchers field if exists
    watching_count = all_tickets.filter(watchers=request.user).count() if hasattr(Ticket, 'watchers') else 0

    # Get tickets based on selected view
    if view_id == 'drafts':
        # For drafts view, show only draft tickets
        tickets_list = Ticket.objects.select_related('requester', 'assignee', 'sla').filter(status='draft')
    elif view_id == 'all_tickets':
        tickets_list = all_tickets
    elif view_id == 'response_overdue':
        tickets_list = all_tickets.filter(sla__response_due_at__lt=now, status__in=unsolved_statuses)
    elif view_id == 'resolution_due_today':
        tickets_list = all_tickets.filter(sla__resolution_due_at__date=today, status__in=unsolved_statuses)
    elif view_id == 'my_resolution_overdue':
        tickets_list = all_tickets.filter(assignee=request.user, sla__resolution_due_at__lt=now, status__in=unsolved_statuses)
    elif view_id == 'requested_by_me':
        tickets_list = all_tickets.filter(requester=request.user)
    elif view_id == 'watching':
        tickets_list = all_tickets.filter(watchers=request.user) if hasattr(Ticket, 'watchers') else all_tickets.none()
    elif view_id == 'unassigned':
        tickets_list = all_tickets.filter(assignee__isnull=True, status__in=unsolved_statuses)
    elif view_id == 'all_unsolved':
        tickets_list = all_tickets.filter(status__in=unsolved_statuses)
    elif view_id == 'recently_updated':
        tickets_list = all_tickets.filter(updated_at__gte=recently_updated_time, status__in=unsolved_statuses)
    elif view_id == 'pending':
        tickets_list = all_tickets.filter(status='pending')
    elif view_id == 'recently_solved':
        tickets_list = all_tickets.filter(status='resolved', updated_at__gte=recently_updated_time)
    elif view_id == 'unsolved_in_groups':
        tickets_list = all_tickets.filter(status__in=unsolved_statuses)
    else:  # unsolved (default)
        tickets_list = all_tickets.filter(
            Q(assignee=request.user) | Q(requester=request.user),
            status__in=unsolved_statuses
        )

    tickets_list = tickets_list.order_by('-updated_at')

    # Paginate tickets
    paginator = Paginator(tickets_list, per_page)
    page_obj = paginator.get_page(page_number)

    # Serialize tickets
    tickets_data = []
    for t in page_obj:
        # Check SLA breach status
        sla_breached = False
        response_breached = False
        resolution_breached = False
        
        if hasattr(t, 'sla') and t.sla:
            response_breached = t.sla.response_breached
            resolution_breached = t.sla.resolution_breached
            sla_breached = response_breached or resolution_breached
        
        tickets_data.append({
            'id': t.id,
            'source': t.source,
            'ticket_number': t.ticket_number or f"#{t.id}",
            'status': t.get_status_display(),
            'subject': t.title,
            'requester': (
                f"{t.requester.first_name} {t.requester.last_name}".strip() or t.requester.username
                if t.requester 
                else (f"{t.guest_name} (Guest)" if getattr(t, 'is_guest_ticket', False) and getattr(t, 'guest_name', None) else 'Unknown')
            ),
            'requested': t.created_at.strftime('%b %d, %H:%M'),
            'type': t.get_type_display(),
            'priority': t.get_priority_display(),
            'sla_breached': sla_breached,
            'response_breached': response_breached,
            'resolution_breached': resolution_breached,
        })

    # Build views list with counts (using cached_views loaded at top)
    views_list = []
    for view in cached_views:
        # Calculate count for each view
        count = 0
        view_id_check = view['view_id']
        if view_id_check == 'all_tickets':
            count = all_tickets_count
        elif view_id_check == 'unsolved':
            count = your_unsolved
        elif view_id_check == 'response_overdue':
            count = response_overdue_count
        elif view_id_check == 'resolution_due_today':
            count = resolution_due_today_count
        elif view_id_check == 'my_resolution_overdue':
            count = my_resolution_overdue_count
        elif view_id_check == 'requested_by_me':
            count = requested_by_me_count
        elif view_id_check == 'watching':
            count = watching_count
        elif view_id_check == 'unassigned':
            count = unassigned
        elif view_id_check == 'all_unsolved':
            count = all_unsolved
        elif view_id_check == 'recently_updated':
            count = recently_updated
        elif view_id_check == 'new_in_groups':
            count = 0  # TODO: Implement groups count
        elif view_id_check == 'pending':
            count = pending
        elif view_id_check == 'recently_solved':
            count = recently_solved
        elif view_id_check == 'unsolved_in_groups':
            count = all_unsolved  # TODO: Implement groups count

        views_list.append({
            'id': view['view_id'],
            'label': view['label'],
            'count': count,
            'is_default': view['is_default'],
            'active': view_id == view['view_id'],
            'href': '/tickets/' if view['view_id'] == 'all_tickets' else f'/tickets/?view={view["view_id"]}',
        })

    return {
        'sidebar': {
            'views': views_list,
        },
        'tickets': tickets_data,
        'currentView': view_id,
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


@login_required
def bulk_mark_draft(request):
    """Bulk mark tickets as draft."""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        ticket_ids = data.get('ticket_ids', [])
        
        if not ticket_ids:
            return JsonResponse({'error': 'No tickets selected'}, status=400)
        
        # Update tickets to draft status
        updated_count = Ticket.objects.filter(id__in=ticket_ids).update(status='draft')
        
        return JsonResponse({
            'success': True,
            'message': f'{updated_count} ticket(s) marked as draft',
            'updated_count': updated_count
        })
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
def upload_file(request):
    """Upload a file and return its URL."""
    import os

    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    if 'file' not in request.FILES:
        return JsonResponse({'error': 'No file provided'}, status=400)

    file = request.FILES['file']

    # Generate unique filename
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"{timestamp}_{file.name}"

    # Save file
    file_path = os.path.join('uploads', filename)
    path = default_storage.save(file_path, ContentFile(file.read()))
    file_url = default_storage.url(path)

    return JsonResponse({
        'file_url': file_url,
        'file_name': file.name,
        'file_size': file.size,
        'file_type': file.content_type,
    })


@login_required
@inertia('AddTicket')
def add_ticket(request):
    """Add ticket form page."""
    if request.method == 'POST':
        # Inertia sends data as JSON, so check both request.POST and JSON body
        if request.content_type == 'application/json':
            data = json.loads(request.body)
            title = data.get('title')
            description = data.get('description')
            requester_id = data.get('requester')
            assignee_id = data.get('assignee')
            type_ = data.get('type')
            priority = data.get('priority')
            group_id = data.get('group')
            status = data.get('status', 'new')
            tags = data.get('tags', '[]')
            watchers = data.get('watchers', '[]')
            attachments = data.get('attachments', '[]')
            # Guest ticket fields
            is_guest_ticket = data.get('is_guest_ticket', False)
            guest_name = data.get('guest_name', '').strip()
            guest_email = data.get('guest_email', '').strip()
            guest_phone = data.get('guest_phone', '').strip()
        else:
            title = request.POST.get('title')
            description = request.POST.get('description')
            requester_id = request.POST.get('requester')
            assignee_id = request.POST.get('assignee')
            type_ = request.POST.get('type')
            priority = request.POST.get('priority')
            group_id = request.POST.get('group')
            status = request.POST.get('status', 'new')
            tags = request.POST.get('tags', '[]')
            watchers = request.POST.get('watchers', '[]')
            attachments = request.POST.get('attachments', '[]')
            # Guest ticket fields
            is_guest_ticket = request.POST.get('is_guest_ticket', '').lower() in ('true', '1', 'yes')
            guest_name = request.POST.get('guest_name', '').strip()
            guest_email = request.POST.get('guest_email', '').strip()
            guest_phone = request.POST.get('guest_phone', '').strip()

        errors = {}
        if not title:
            errors['title'] = 'Title is required'
        if not description:
            errors['description'] = 'Description is required'
        
        # Validate requester or guest info based on is_guest_ticket
        if is_guest_ticket:
            if not guest_name:
                errors['guest_name'] = 'Guest name is required'
            if not guest_email:
                errors['guest_email'] = 'Guest email is required'
            # Basic email validation
            elif '@' not in guest_email or '.' not in guest_email:
                errors['guest_email'] = 'Please enter a valid email address'
        else:
            if not requester_id:
                errors['requester'] = 'Requester is required'
        
        if not type_:
            errors['type'] = 'Type is required'
        if not priority:
            errors['priority'] = 'Priority is required'

        if errors:
            users = User.objects.all().order_by('first_name', 'last_name')
            departments = Department.objects.all().order_by('name')
            groups = Group.objects.all().order_by('name')

            return inertia_render(request, 'AddTicket', {
                'errors': errors,
                'users': [{'id': u.id, 'name': f"{u.first_name} {u.last_name}".strip() or u.username, 'email': u.email} for u in users],
                'departments': [{'id': d.id, 'name': d.name} for d in departments],
                'groups': [{'id': g.id, 'name': g.name, 'description': g.description} for g in groups],
                'old': {
                    'title': title,
                    'description': description,
                    'requester': requester_id,
                    'assignee': assignee_id,
                    'type': type_,
                    'priority': priority,
                    'group': group_id,
                    'status': status,
                    'tags': tags,
                    'is_guest_ticket': is_guest_ticket,
                    'guest_name': guest_name,
                    'guest_email': guest_email,
                    'guest_phone': guest_phone,
                }
            })

        # Create ticket - handle guest vs regular tickets
        requester = None
        if not is_guest_ticket:
            try:
                requester = User.objects.get(id=requester_id)
            except User.DoesNotExist:
                errors['requester'] = 'Invalid requester'
                return inertia_render(request, 'AddTicket', {'errors': errors})

        ticket = Ticket.objects.create(
            title=title,
            description=description,
            requester=requester,
            assignee=User.objects.get(id=assignee_id) if assignee_id else None,
            type=type_,
            priority=priority,
            status=status,
            group=Group.objects.get(id=group_id) if group_id else None,
            tags=json.loads(tags) if tags else [],
            # Guest ticket fields
            is_guest_ticket=is_guest_ticket,
            guest_name=guest_name if is_guest_ticket else None,
            guest_email=guest_email if is_guest_ticket else None,
            guest_phone=guest_phone if is_guest_ticket else None,
        )

        # Add watchers
        if watchers:
            watcher_ids = json.loads(watchers) if isinstance(watchers, str) else watchers
            ticket.watchers.set(User.objects.filter(id__in=watcher_ids))

        # Add attachments
        if attachments:
            attachment_list = json.loads(attachments) if isinstance(attachments, str) else attachments
            for att in attachment_list:
                TicketAttachment.objects.create(
                    ticket=ticket,
                    file_url=att['file_url'],
                    file_name=att['file_name'],
                    file_size=att.get('file_size'),
                    file_type=att.get('file_type', ''),
                    uploaded_by=request.user
                )

        return redirect('tickets')

    # GET request - fetch users, departments, and groups for form
    users = User.objects.all().order_by('first_name', 'last_name')
    departments = Department.objects.all().order_by('name')
    groups = Group.objects.all().order_by('name')

    # Current user info
    current_user = request.user
    current_user_data = {
        'id': current_user.id,
        'name': f"{current_user.first_name} {current_user.last_name}".strip() or current_user.username,
        'email': current_user.email
    }

    return {
        'errors': {},
        'users': [{'id': u.id, 'name': f"{u.first_name} {u.last_name}".strip() or u.username, 'email': u.email} for u in users],
        'departments': [{'id': d.id, 'name': d.name} for d in departments],
        'groups': [{'id': g.id, 'name': g.name, 'description': g.description} for g in groups],
        'currentUser': current_user_data,
    }


@login_required
@inertia('TicketView')
def ticket_view(request, id: int):
    """Single ticket view with comments, attachments, and activity stream."""
    try:
        ticket_obj = Ticket.objects.select_related(
            'requester', 'assignee', 'department', 'group'
        ).prefetch_related('watchers', 'comments__author', 'attachments', 'activities__actor').get(id=id)
    except Ticket.DoesNotExist:
        return redirect('tickets')

    # Serialize ticket data
    ticket_data = {
        'id': ticket_obj.id,
        'ticket_number': ticket_obj.ticket_number or f"#{ticket_obj.id}",
        'title': ticket_obj.title,
        'description': ticket_obj.description,
        'status': ticket_obj.status,
        'status_display': ticket_obj.get_status_display(),
        'priority': ticket_obj.priority,
        'priority_display': ticket_obj.get_priority_display(),
        'type': ticket_obj.type,
        'type_display': ticket_obj.get_type_display(),
        'tags': ticket_obj.tags,
        'is_guest_ticket': getattr(ticket_obj, 'is_guest_ticket', False),
        'guest_name': getattr(ticket_obj, 'guest_name', None),
        'guest_email': getattr(ticket_obj, 'guest_email', None),
        'guest_phone': getattr(ticket_obj, 'guest_phone', None),
        'requester': {
            'id': ticket_obj.requester.id,
            'name': f"{ticket_obj.requester.first_name} {ticket_obj.requester.last_name}".strip() or ticket_obj.requester.username,
            'email': ticket_obj.requester.email,
        } if ticket_obj.requester else (
            # For guest tickets, create a requester-like object from guest info
            {
                'id': None,
                'name': ticket_obj.guest_name or 'Guest',
                'email': ticket_obj.guest_email,
                'is_guest': True,
            } if getattr(ticket_obj, 'is_guest_ticket', False) else None
        ),
        'assignee': {
            'id': ticket_obj.assignee.id,
            'name': f"{ticket_obj.assignee.first_name} {ticket_obj.assignee.last_name}".strip() or ticket_obj.assignee.username,
        } if ticket_obj.assignee else None,
        'department': ticket_obj.department.name if ticket_obj.department else None,
        'group': {
            'id': ticket_obj.group.id,
            'name': ticket_obj.group.name,
        } if ticket_obj.group else None,
        'watchers': [{
            'id': w.id,
            'name': f"{w.first_name} {w.last_name}".strip() or w.username
        } for w in ticket_obj.watchers.all()],
        'created_at': ticket_obj.created_at.strftime('%Y-%m-%d %H:%M'),
        'updated_at': ticket_obj.updated_at.strftime('%Y-%m-%d %H:%M'),
        'is_merged': ticket_obj.is_merged,
        'merged_into': {
            'id': ticket_obj.merged_into.id,
            'ticket_number': ticket_obj.merged_into.ticket_number or f"#{ticket_obj.merged_into.id}",
            'title': ticket_obj.merged_into.title,
        } if ticket_obj.merged_into else None,
        'merged_at': ticket_obj.merged_at.strftime('%Y-%m-%d %H:%M') if ticket_obj.merged_at else None,
    }

    # Serialize comments with nested replies
    def serialize_comment(comment):
        # Handle author - for guest/Telegram tickets, use guest_name when author is None
        author_data = None
        if comment.author:
            author_data = {
                'id': comment.author.id,
                'name': f"{comment.author.first_name} {comment.author.last_name}".strip() or comment.author.username,
            }
        elif ticket_obj.is_guest_ticket and ticket_obj.guest_name:
            # Use guest name for Telegram/guest tickets
            author_data = {
                'id': None,
                'name': ticket_obj.guest_name,
                'is_guest': True,
            }
        
        return {
            'id': comment.id,
            'author': author_data,
            'message': comment.message,
            'attachments': comment.attachments,
            'is_internal': comment.is_internal,
            'created_at': comment.created_at.strftime('%Y-%m-%d %H:%M'),
            'updated_at': comment.updated_at.strftime('%Y-%m-%d %H:%M'),
            'replies': [serialize_comment(reply) for reply in comment.replies.all()]
        }

    # Get only top-level comments (those without a parent)
    top_level_comments = ticket_obj.comments.filter(parent_comment__isnull=True)
    comments = [serialize_comment(c) for c in top_level_comments]

    # Serialize attachments
    attachments = [{
        'id': a.id,
        'file_url': a.file_url,
        'file_name': a.file_name,
        'file_size': a.file_size,
        'file_type': a.file_type,
        'is_internal': a.is_internal,
        'uploaded_by': {
            'id': a.uploaded_by.id,
            'name': f"{a.uploaded_by.first_name} {a.uploaded_by.last_name}".strip() or a.uploaded_by.username,
        } if a.uploaded_by else None,
        'uploaded_at': a.uploaded_at.strftime('%Y-%m-%d %H:%M'),
    } for a in ticket_obj.attachments.all()]

    # Serialize activity stream
    def get_activity_actor(activity):
        if activity.actor:
            return {
                'id': activity.actor.id,
                'name': f"{activity.actor.first_name} {activity.actor.last_name}".strip() or activity.actor.username,
            }
        elif ticket_obj.is_guest_ticket and ticket_obj.guest_name:
            return {'id': None, 'name': ticket_obj.guest_name, 'is_guest': True}
        return {'name': 'System'}
    
    activities = [{
        'id': a.id,
        'activity_type': a.activity_type,
        'activity_display': a.get_activity_type_display(),
        'actor': get_activity_actor(a),
        'description': a.description,
        'metadata': a.metadata,
        'created_at': a.created_at.strftime('%Y-%m-%d %H:%M'),
    } for a in ticket_obj.activities.all()]

    # Get available users for assignment
    users = User.objects.all().order_by('first_name', 'last_name')
    users_data = [{
        'id': u.id,
        'name': f"{u.first_name} {u.last_name}".strip() or u.username
    } for u in users]

    # Get available groups
    groups = Group.objects.all().order_by('name')
    groups_data = [{
        'id': g.id,
        'name': g.name,
        'description': g.description
    } for g in groups]

    # Get SLA data if exists
    sla_data = None
    if hasattr(ticket_obj, 'sla'):
        sla = ticket_obj.sla
        sla_data = {
            'id': sla.id,
            'policy': {
                'id': sla.policy.id,
                'name': sla.policy.name,
                'priority': sla.policy.priority,
                'first_response_time': sla.policy.first_response_time,
                'resolution_time': sla.policy.resolution_time,
            },
            'response_due_at': sla.response_due_at.strftime('%Y-%m-%d %H:%M:%S') if sla.response_due_at else None,
            'resolution_due_at': sla.resolution_due_at.strftime('%Y-%m-%d %H:%M:%S') if sla.resolution_due_at else None,
            'response_breached': sla.response_breached,
            'resolution_breached': sla.resolution_breached,
            'is_on_hold': sla.is_on_hold,
            'hold_reason': sla.hold_reason,
            'hold_started_at': sla.hold_started_at.strftime('%Y-%m-%d %H:%M:%S') if sla.hold_started_at else None,
            'total_hold_time': sla.total_hold_time,
            'created_at': sla.created_at.strftime('%Y-%m-%d %H:%M:%S'),
        }

    return {
        'ticket': ticket_data,
        'comments': comments,
        'attachments': attachments,
        'activities': activities,
        'users': users_data,
        'groups': groups_data,
        'sla': sla_data,
    }


def _process_comment_mentions(comment, ticket, mention_ids, author):
    """
    Process mentions in a comment:
    1. Add mentioned users to the comment's mentions field
    2. Send notification emails to mentioned users
    
    Args:
        comment: TicketComment instance
        ticket: Ticket instance
        mention_ids: List of user IDs that were mentioned
        author: User who created the comment
    """
    from modules.settings.models import EmailTemplate, NotificationSettings
    from shared.utilities.Mailer import Mailer
    
    if not mention_ids:
        return
    
    # Get mentioned users (excluding the author - don't notify yourself)
    mentioned_users = User.objects.filter(
        id__in=mention_ids,
        is_active=True
    ).exclude(id=author.id)
    
    if not mentioned_users.exists():
        return
    
    # Add mentions to comment
    comment.mentions.set(mentioned_users)
    
    # Check if mention notifications are enabled
    try:
        notification_settings = NotificationSettings.get_settings()
        if not notification_settings.notify_ticket_mentioned:
            return
    except Exception:
        pass  # Default to sending if setting doesn't exist
    
    # Get email template
    try:
        template = EmailTemplate.objects.get(
            template_type='user_mentioned',
            status='active'
        )
    except EmailTemplate.DoesNotExist:
        return
    
    # Get business info
    try:
        from shared.models import Client
        org = Client.get_current()
        company_name = org.name if org else 'Support'
    except Exception:
        company_name = 'Support'
    
    base_url = getattr(settings, 'SITE_URL', 'https://app.coredesk.io')
    ticket_url = f"{base_url}/tickets/{ticket.id}"
    
    author_name = f"{author.first_name} {author.last_name}".strip() or author.username
    
    mailer = Mailer()
    
    # Send notification to each mentioned user
    for user in mentioned_users:
        if not user.email:
            continue
        
        user_name = f"{user.first_name} {user.last_name}".strip() or user.username
        
        try:
            context = {
                'user_name': user_name,
                'mentioned_by': author_name,
                'ticket_number': ticket.ticket_number or f"#{ticket.id}",
                'ticket_subject': ticket.title,
                'comment_preview': comment.message[:200] + ('...' if len(comment.message) > 200 else ''),
                'ticket_url': ticket_url,
                'company_name': company_name,
            }
            
            rendered_subject, rendered_html, rendered_text = template.render(context)
            
            mailer.send_raw_email(
                to_email=user.email,
                subject=rendered_subject or f'You were mentioned in Ticket #{ticket.ticket_number}',
                html_content=rendered_html or '',
                text_content=rendered_text or '',
            )
        except Exception as e:
            # Log error but don't fail the comment creation
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to send mention notification to {user.email}: {e}")


@login_required
def ticket_add_comment(request, id: int):
    """Add a comment to a ticket."""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        ticket = Ticket.objects.get(id=id)
    except Ticket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)

    # Handle JSON data from Inertia
    if request.content_type == 'application/json':
        data = json.loads(request.body)
        message = data.get('message', '').strip()
        is_internal = data.get('is_internal', False)
        attachments_json = data.get('attachments', '[]')
        parent_id = data.get('parent_id')
        mention_ids = data.get('mentions', [])  # List of user IDs being mentioned
    else:
        message = request.POST.get('message', '').strip()
        is_internal = request.POST.get('is_internal') == 'true'
        attachments_json = request.POST.get('attachments', '[]')
        parent_id = request.POST.get('parent_id')
        mention_ids = json.loads(request.POST.get('mentions', '[]'))

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
            parent_comment = TicketComment.objects.get(id=parent_id, ticket=ticket)
        except TicketComment.DoesNotExist:
            pass

    # Create comment
    comment = TicketComment.objects.create(
        ticket=ticket,
        author=request.user,
        message=message,
        is_internal=is_internal,
        attachments=attachments_data,
        parent_comment=parent_comment
    )
    
    # Handle mentions
    if mention_ids:
        _process_comment_mentions(comment, ticket, mention_ids, request.user)

    return JsonResponse({'success': True})


@login_required
def ticket_upload_attachment(request, id: int):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        ticket = Ticket.objects.get(id=id)
    except Ticket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)

    # Handle both form data and JSON
    if request.content_type and 'application/json' in request.content_type:
        import json
        data = json.loads(request.body)
        file_url = data.get('file_url')
        file_name = data.get('file_name')
        file_size = data.get('file_size', 0)
        file_type = data.get('file_type', '')
        is_internal = data.get('is_internal', False)
    else:
        file_url = request.POST.get('file_url')
        file_name = request.POST.get('file_name')
        file_size = request.POST.get('file_size', 0)
        file_type = request.POST.get('file_type', '')
        is_internal = request.POST.get('is_internal', 'false').lower() == 'true'

    if not file_url or not file_name:
        return JsonResponse({'error': 'File URL and name are required'}, status=400)

    attachment = TicketAttachment.objects.create(
        ticket=ticket,
        file_url=file_url,
        file_name=file_name,
        file_size=int(file_size) if file_size else None,
        file_type=file_type,
        is_internal=is_internal,
        uploaded_by=request.user
    )

    return JsonResponse({
        'id': attachment.id,
        'file_url': attachment.file_url,
        'file_name': attachment.file_name,
        'file_size': attachment.file_size,
        'file_type': attachment.file_type,
        'is_internal': attachment.is_internal,
        'uploaded_at': attachment.uploaded_at.strftime('%Y-%m-%d %H:%M'),
    })


@login_required
def ticket_update_status(request, id: int):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        ticket = Ticket.objects.get(id=id)
    except Ticket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)

    new_status = request.POST.get('status')
    if new_status not in dict(Ticket.Status.choices):
        return JsonResponse({'error': 'Invalid status'}, status=400)

    ticket.status = new_status
    ticket.save()

    return JsonResponse({
        'status': ticket.status,
        'status_display': ticket.get_status_display(),
    })


@login_required
def ticket_update_fields(request, id: int):
    """Update ticket fields: assignee, watchers, tags, type, priority, group."""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        ticket = Ticket.objects.get(id=id)
    except Ticket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)

    # Handle JSON data from Inertia
    if request.content_type == 'application/json':
        data = json.loads(request.body)
    else:
        data = request.POST

    # Update fields if provided
    if 'assignee' in data:
        assignee_id = data.get('assignee')
        old_assignee = ticket.assignee
        ticket.assignee = User.objects.get(id=assignee_id) if assignee_id else None

        # Log activity
        if old_assignee != ticket.assignee:
            old_name = f"{old_assignee.first_name} {old_assignee.last_name}".strip() or old_assignee.username if old_assignee else 'Unassigned'
            new_name = f"{ticket.assignee.first_name} {ticket.assignee.last_name}".strip() or ticket.assignee.username if ticket.assignee else 'Unassigned'
            ActivityStream.objects.create(
                ticket=ticket,
                activity_type='field_change',
                actor=request.user,
                description=f"Changed assignee from {old_name} to {new_name}"
            )

        # Auto-update status to 'open' when ticket is first assigned
        if ticket.assignee and not old_assignee and ticket.status == 'new':
            ticket.status = 'open'

    if 'group' in data:
        group_id = data.get('group')
        old_group = ticket.group
        ticket.group = Group.objects.get(id=group_id) if group_id else None

        # Log activity
        if old_group != ticket.group:
            old_name = old_group.name if old_group else 'None'
            new_name = ticket.group.name if ticket.group else 'None'
            ActivityStream.objects.create(
                ticket=ticket,
                activity_type='field_change',
                actor=request.user,
                description=f"Changed assignment group from {old_name} to {new_name}"
            )

    if 'type' in data:
        old_type = ticket.type
        ticket.type = data.get('type')
        if old_type != ticket.type:
            ActivityStream.objects.create(
                ticket=ticket,
                activity_type='field_change',
                actor=request.user,
                description=f"Changed type from {ticket.get_type_display()} to {dict(Ticket.Type.choices).get(ticket.type)}"
            )

    if 'priority' in data:
        old_priority = ticket.priority
        ticket.priority = data.get('priority')
        if old_priority != ticket.priority:
            ActivityStream.objects.create(
                ticket=ticket,
                activity_type='field_change',
                actor=request.user,
                description=f"Changed priority from {dict(Ticket.Priority.choices).get(old_priority)} to {dict(Ticket.Priority.choices).get(ticket.priority)}"
            )

    if 'tags' in data:
        old_tags = ticket.tags.copy() if ticket.tags else []
        tags = data.get('tags')
        ticket.tags = json.loads(tags) if isinstance(tags, str) else tags
        if old_tags != ticket.tags:
            ActivityStream.objects.create(
                ticket=ticket,
                activity_type='field_change',
                actor=request.user,
                description=f"Updated tags"
            )

    if 'watchers' in data:
        old_watchers = list(ticket.watchers.all())
        watchers = data.get('watchers')
        watcher_ids = json.loads(watchers) if isinstance(watchers, str) else watchers
        ticket.watchers.set(User.objects.filter(id__in=watcher_ids))
        new_watchers = list(ticket.watchers.all())

        if set(old_watchers) != set(new_watchers):
            ActivityStream.objects.create(
                ticket=ticket,
                activity_type='field_change',
                actor=request.user,
                description=f"Updated watchers"
            )

    ticket.save()

    return JsonResponse({'success': True})


@login_required
def get_ticket_work_items(request, ticket_id: int):
    """Get all work items for a ticket."""
    try:
        ticket = Ticket.objects.get(id=ticket_id)
    except Ticket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)

    work_items = WorkItem.objects.filter(ticket=ticket).select_related('assignee', 'created_by')

    work_items_data = []
    for item in work_items:
        work_items_data.append({
            'id': item.id,
            'title': item.title,
            'description': item.description,
            'status': item.status,
            'status_display': item.get_status_display(),
            'priority': item.priority,
            'priority_display': item.get_priority_display(),
            'assignee': {
                'id': item.assignee.id,
                'name': item.assignee.get_full_name() or item.assignee.username
            } if item.assignee else None,
            'due_date': item.due_date.strftime('%Y-%m-%d') if item.due_date else None,
            'created_at': item.created_at.strftime('%b %d, %Y'),
            'completed_at': item.completed_at.strftime('%b %d, %Y %H:%M') if item.completed_at else None,
            'work_notes': item.work_notes,
        })

    return JsonResponse({'work_items': work_items_data})


@login_required
def create_work_item(request, ticket_id: int):
    """Create a work item for a ticket."""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        ticket = Ticket.objects.get(id=ticket_id)
    except Ticket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)

    if request.content_type == 'application/json':
        data = json.loads(request.body)
    else:
        data = request.POST

    title = data.get('title', '').strip()
    if not title:
        return JsonResponse({'error': 'Title is required'}, status=400)

    description = data.get('description', '').strip()
    priority = data.get('priority', 'normal')
    assignee_id = data.get('assignee')
    due_date = data.get('due_date') or None

    # Create work item
    work_item = WorkItem.objects.create(
        ticket=ticket,
        title=title,
        description=description,
        priority=priority,
        created_by=request.user,
        assignee_id=assignee_id if assignee_id else None,
        due_date=due_date,
    )

    return JsonResponse({
        'success': True,
        'work_item': {
            'id': work_item.id,
            'title': work_item.title,
            'status': work_item.status,
            'status_display': work_item.get_status_display(),
        }
    })


@login_required
def update_work_item(request, ticket_id: int, work_item_id: int):
    """Update a work item."""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        ticket = Ticket.objects.get(id=ticket_id)
        work_item = WorkItem.objects.get(id=work_item_id, ticket=ticket)
    except (Ticket.DoesNotExist, WorkItem.DoesNotExist):
        return JsonResponse({'error': 'Work item not found'}, status=404)

    if request.content_type == 'application/json':
        data = json.loads(request.body)
    else:
        data = request.POST

    # Update fields
    if 'title' in data and data['title'].strip():
        work_item.title = data['title'].strip()

    if 'description' in data:
        work_item.description = data['description'].strip()

    if 'status' in data:
        work_item.status = data['status']

    if 'priority' in data:
        work_item.priority = data['priority']

    if 'assignee' in data:
        assignee_id = data['assignee']
        work_item.assignee_id = assignee_id if assignee_id else None

    if 'work_notes' in data:
        work_item.work_notes = data['work_notes'].strip()

    if 'due_date' in data:
        due_date_str = data['due_date']
        if due_date_str:
            try:
                work_item.due_date = datetime.strptime(due_date_str, '%Y-%m-%d').date()
            except (ValueError, TypeError):
                work_item.due_date = None
        else:
            work_item.due_date = None

    work_item.save()

    return JsonResponse({
        'success': True,
        'work_item': {
            'id': work_item.id,
            'title': work_item.title,
            'description': work_item.description,
            'status': work_item.status,
            'status_display': work_item.get_status_display(),
            'priority': work_item.priority,
            'priority_display': work_item.get_priority_display(),
            'assignee': {
                'id': work_item.assignee.id,
                'name': work_item.assignee.get_full_name() or work_item.assignee.username
            } if work_item.assignee else None,
            'due_date': work_item.due_date.strftime('%Y-%m-%d') if work_item.due_date else None,
        }
    })


@login_required
def ticket_search_for_merge(request):
    """Search tickets for merge functionality."""
    query = request.GET.get('q', '').strip()
    exclude_id = request.GET.get('exclude', None)
    
    if len(query) < 2:
        return JsonResponse({'tickets': []})
    
    tickets = Ticket.objects.filter(
        Q(ticket_number__icontains=query) |
        Q(title__icontains=query) |
        Q(description__icontains=query)
    ).exclude(
        status__in=[Ticket.Status.CLOSED]
    ).exclude(
        merged_into__isnull=False  # Exclude already merged tickets
    )
    
    if exclude_id:
        tickets = tickets.exclude(id=exclude_id)
    
    tickets = tickets[:10]  # Limit results
    
    return JsonResponse({
        'tickets': [
            {
                'id': t.id,
                'ticket_number': t.ticket_number,
                'title': t.title,
                'status': t.status,
                'status_display': t.get_status_display(),
                'priority': t.priority,
                'requester': {
                    'name': t.guest_name if t.is_guest_ticket else (t.requester.get_full_name() if t.requester else 'Unknown')
                } if t.is_guest_ticket or t.requester else None,
                'created_at': t.created_at.strftime('%Y-%m-%d %H:%M'),
            }
            for t in tickets
        ]
    })


@login_required
def ticket_merge(request, id: int):
    """Merge a ticket into another ticket."""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        source_ticket = Ticket.objects.get(id=id)
    except Ticket.DoesNotExist:
        return JsonResponse({'error': 'Ticket not found'}, status=404)
    
    # Check if source ticket is already merged
    if source_ticket.is_merged:
        return JsonResponse({'error': 'This ticket has already been merged'}, status=400)
    
    if request.content_type == 'application/json':
        data = json.loads(request.body)
    else:
        data = request.POST
    
    target_ticket_id = data.get('target_ticket_id')
    if not target_ticket_id:
        return JsonResponse({'error': 'Target ticket is required'}, status=400)
    
    try:
        target_ticket = Ticket.objects.get(id=target_ticket_id)
    except Ticket.DoesNotExist:
        return JsonResponse({'error': 'Target ticket not found'}, status=404)
    
    # Prevent merging into self
    if source_ticket.id == target_ticket.id:
        return JsonResponse({'error': 'Cannot merge a ticket into itself'}, status=400)
    
    # Prevent merging into an already merged ticket
    if target_ticket.is_merged:
        return JsonResponse({'error': 'Cannot merge into a ticket that has already been merged'}, status=400)
    
    # Perform the merge
    from django.utils import timezone
    
    # Copy comments from source to target
    from modules.ticket.models import TicketComment, TicketAttachment
    for comment in source_ticket.comments.all():
        TicketComment.objects.create(
            ticket=target_ticket,
            author=comment.author,
            message=f"[Merged from {source_ticket.ticket_number}] {comment.message}",
            is_internal=comment.is_internal,
            attachments=comment.attachments,
        )
    
    # Copy attachments from source to target
    for attachment in source_ticket.attachments.all():
        TicketAttachment.objects.create(
            ticket=target_ticket,
            file_url=attachment.file_url,
            file_name=attachment.file_name,
            file_size=attachment.file_size,
            file_type=attachment.file_type,
            uploaded_by=attachment.uploaded_by,
            is_internal=attachment.is_internal,
        )
    
    # Mark source ticket as merged
    source_ticket.merged_into = target_ticket
    source_ticket.merged_at = timezone.now()
    source_ticket.status = Ticket.Status.CLOSED
    source_ticket.save()
    
    # Create activity log on source ticket
    ActivityStream.objects.create(
        ticket=source_ticket,
        activity_type=ActivityStream.ActivityType.TICKET_MERGED,
        actor=request.user,
        description=f"Ticket merged into {target_ticket.ticket_number}",
        metadata={
            'target_ticket_id': target_ticket.id,
            'target_ticket_number': target_ticket.ticket_number,
        }
    )
    
    # Create activity log on target ticket
    ActivityStream.objects.create(
        ticket=target_ticket,
        activity_type=ActivityStream.ActivityType.TICKET_MERGED,
        actor=request.user,
        description=f"Ticket {source_ticket.ticket_number} was merged into this ticket",
        metadata={
            'source_ticket_id': source_ticket.id,
            'source_ticket_number': source_ticket.ticket_number,
        }
    )
    
    return JsonResponse({
        'success': True,
        'message': f'Ticket {source_ticket.ticket_number} has been merged into {target_ticket.ticket_number}',
        'merged_into': {
            'id': target_ticket.id,
            'ticket_number': target_ticket.ticket_number,
        }
    })


@login_required
def search_mentionable_users(request):
    """
    Search for users that can be mentioned in tickets.
    Returns agents and admins (not customers) for mentions.
    If no query provided, returns recent/all users.
    """
    from django.db.models import Q, Value
    from django.db.models.functions import Concat
    from modules.users.models import UserProfile
    
    query = request.GET.get('q', '').strip()
    limit = min(int(request.GET.get('limit', 10)), 20)
    
    # Base queryset: agents and admins (not customers)
    base_qs = UserProfile.objects.select_related('user', 'role').filter(
        user__is_active=True
    ).exclude(
        role__name__iexact='Customer'  # Exclude customers from mentions
    ).only(
        'id', 'avatar_url', 'user__id', 'user__username', 'user__email',
        'user__first_name', 'user__last_name', 'role__name'
    )
    
    # If query provided, filter by name/username/email
    if query:
        users = base_qs.filter(
            Q(user__first_name__icontains=query) |
            Q(user__last_name__icontains=query) |
            Q(user__username__icontains=query) |
            Q(user__email__icontains=query)
        )[:limit]
    else:
        # No query - return all users (ordered by name)
        users = base_qs.order_by('user__first_name', 'user__last_name')[:limit]
    
    results = []
    for profile in users:
        user = profile.user
        name = f"{user.first_name} {user.last_name}".strip()
        if not name:
            name = user.username
        
        results.append({
            'id': user.id,
            'username': user.username,
            'name': name,
            'email': user.email,
            'avatar': profile.avatar_url or None,
            'role': profile.role.name if profile.role else None,
        })
    
    return JsonResponse({'users': results})

