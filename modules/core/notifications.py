"""
In-app notification feed for the bell in the top bar.

The feed is derived from existing ticket, comment, task and SLA records, so there
is nothing extra to store. Read state is kept in the browser.
"""
from datetime import datetime, time, timedelta

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_GET

from modules.sla.models import TicketSLA
from modules.tasks.models import Task
from modules.ticket.models import ActivityStream, TicketComment

FEED_SIZE = 20
FEED_DAYS = 30

OPEN_TASK_STATUSES = ['todo', 'in_progress', 'review']


def _item(key, kind, text, at, url):
    return {'id': key, 'type': kind, 'text': text, 'at': at.isoformat(), 'url': url}


def _label(ticket):
    return f'#{ticket.ticket_number or ticket.id} "{ticket.title}"'


def _name(user, fallback):
    return (user.get_full_name() or user.username) if user else fallback


def build_feed(user):
    """Newest-first list of things that happened to the user's tickets and tasks."""
    now = timezone.now()
    since = now - timedelta(days=FEED_DAYS)
    items = []

    mentions = TicketComment.objects.filter(
        mentions=user, created_at__gte=since,
    ).exclude(author=user).select_related('ticket', 'author').order_by('-created_at')[:FEED_SIZE]
    mentioned_ids = set()
    for comment in mentions:
        mentioned_ids.add(comment.id)
        items.append(_item(
            f'comment-{comment.id}', 'mention',
            f'{_name(comment.author, "Someone")} mentioned you in ticket {_label(comment.ticket)}',
            comment.created_at, f'/tickets/{comment.ticket.uuid}/',
        ))

    replies = TicketComment.objects.filter(
        ticket__assignee=user, created_at__gte=since,
    ).exclude(author=user).exclude(id__in=mentioned_ids).select_related(
        'ticket', 'author',
    ).order_by('-created_at')[:FEED_SIZE]
    for comment in replies:
        verb = 'added a note on' if comment.is_internal else 'replied on'
        items.append(_item(
            f'comment-{comment.id}', 'reply',
            f'{_name(comment.author, "A requester")} {verb} ticket {_label(comment.ticket)}',
            comment.created_at, f'/tickets/{comment.ticket.uuid}/',
        ))

    activities = ActivityStream.objects.filter(
        ticket__assignee=user,
        created_at__gte=since,
        activity_type__in=['assigned', 'status_changed', 'priority_changed', 'reopened'],
    ).exclude(actor=user).select_related('ticket').order_by('-created_at')[:FEED_SIZE]
    for activity in activities:
        items.append(_item(
            f'activity-{activity.id}', 'ticket',
            f'{activity.description} (ticket {_label(activity.ticket)})',
            activity.created_at, f'/tickets/{activity.ticket.uuid}/',
        ))

    breaches = TicketSLA.objects.filter(
        ticket__assignee=user, resolution_breached=True,
        resolution_due_at__gte=since, resolution_due_at__lte=now,
    ).select_related('ticket').order_by('-resolution_due_at')[:FEED_SIZE]
    for sla in breaches:
        items.append(_item(
            f'sla-{sla.id}', 'ticket',
            f'Ticket {_label(sla.ticket)} breached its SLA resolution time',
            sla.resolution_due_at, f'/tickets/{sla.ticket.uuid}/',
        ))

    today = timezone.localdate()
    tasks = Task.objects.filter(
        assignee=user, status__in=OPEN_TASK_STATUSES,
        due_date__gte=since.date(), due_date__lte=today,
    ).order_by('-due_date')[:FEED_SIZE]
    for task in tasks:
        overdue = task.due_date < today
        # Becomes unread again when it turns overdue
        became = task.due_date + timedelta(days=1) if overdue else task.due_date
        items.append(_item(
            f'task-{task.id}-{"overdue" if overdue else "due"}', 'task',
            f'Task "{task.title}" is {"overdue" if overdue else "due today"}',
            timezone.make_aware(datetime.combine(became, time.min)), f'/tasks/{task.uuid}/',
        ))

    items.sort(key=lambda i: i['at'], reverse=True)
    return items[:FEED_SIZE]


@require_GET
@login_required
def notifications_feed(request):
    return JsonResponse({'notifications': build_feed(request.user)})
