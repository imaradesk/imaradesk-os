from shared.utilities.organization import organization_name
from urllib.parse import urlencode
from django.contrib.auth.decorators import login_required
from shared.decorators import admin_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect
from django.views.decorators.http import require_http_methods
from django.core.paginator import Paginator
from django.db import models
from django.utils import timezone
from django.utils.http import url_has_allowed_host_and_scheme
from django.conf import settings as django_settings
from inertia import inertia
import json
import logging
from datetime import datetime

from shared.decorators import require_app
from shared.utilities.throttle import rate_limited
from shared.utilities.uploads import store_upload, UploadError
from .models import (
    Customer, 
    CustomerContact, 
    CustomerTicket, 
    CustomerTicketComment,
    CustomerAsset,
    CustomerPortalSettings
)
from modules.ticket.models import Ticket, TicketAttachment


logger = logging.getLogger(__name__)


# ============================================
# Customer Portal (Customer-facing)
# ============================================

@require_app('customer-portal')
@inertia('CustomerPortalHome')
def portal_home(request):
    """Customer portal homepage."""
    from modules.kb.models import KBCategory, KBArticle
    from modules.ticket.models import Ticket
    
    settings = CustomerPortalSettings.get_settings()
    
    tenant_name = organization_name(settings.portal_title)
    
    # Get KB categories and articles if enabled
    categories = []
    popular_articles = []
    latest_articles = []
    most_viewed_articles = []
    announcements = []
    
    if settings.show_kb_in_portal:
        categories = KBCategory.objects.all()
        # Most viewed (top 6)
        most_viewed_articles = KBArticle.objects.filter(status='published').order_by('-views')[:6]
        # Latest articles (top 6)
        latest_articles = KBArticle.objects.filter(status='published').order_by('-created_at')[:6]
        # Featured articles as announcements
        announcements = KBArticle.objects.filter(status='published', featured=True).order_by('-created_at')[:3]
        # Keep popular articles for backward compatibility
        popular_articles = most_viewed_articles
    
    # Get user's tickets if logged in
    user_tickets = []
    if request.user.is_authenticated:
        tickets = Ticket.objects.filter(requester=request.user).order_by('-created_at')[:20]
        user_tickets = [
            {
                'id': t.id,
                'uuid': str(t.uuid),
                'ticket_number': t.ticket_number,
                'title': t.title,
                'status': t.status,
                'priority': t.priority,
                'created_at': t.created_at.isoformat(),
                'updated_at': t.updated_at.isoformat(),
                'assignee': f"{t.assignee.first_name} {t.assignee.last_name}".strip() if t.assignee else None,
            }
            for t in tickets
        ]
    
    return {
        'portal_settings': {
            'portal_title': settings.portal_title,
            'portal_welcome_message': settings.portal_welcome_message,
            'show_kb_in_portal': settings.show_kb_in_portal,
            'allow_guest_tickets': settings.allow_guest_tickets,
            'tenant_name': tenant_name,
        },
        'user_tickets': user_tickets,
        'categories': [
            {
                'id': c.id,
                'name': c.name,
                'description': c.description,
                'icon': c.icon,
                'article_count': c.articles.filter(status='published').count(),
            }
            for c in categories
        ],
        'popular_articles': [
            {
                'id': a.id,
                'uuid': str(a.uuid),
                'title': a.title,
                'slug': a.slug,
                'excerpt': a.content[:150] + '...' if len(a.content) > 150 else a.content,
                'views': a.views,
                'category': a.category.name if a.category else 'Uncategorized',
                'display_image': a.display_image or '',
            }
            for a in popular_articles
        ],
        'latest_articles': [
            {
                'id': a.id,
                'uuid': str(a.uuid),
                'title': a.title,
                'slug': a.slug,
                'excerpt': a.content[:150] + '...' if len(a.content) > 150 else a.content,
                'views': a.views,
                'category': a.category.name if a.category else 'Uncategorized',
                'created_at': a.created_at.isoformat(),
                'display_image': a.display_image or '',
            }
            for a in latest_articles
        ],
        'most_viewed_articles': [
            {
                'id': a.id,
                'uuid': str(a.uuid),
                'title': a.title,
                'slug': a.slug,
                'excerpt': a.content[:150] + '...' if len(a.content) > 150 else a.content,
                'views': a.views,
                'category': a.category.name if a.category else 'Uncategorized',
                'display_image': a.display_image or '',
            }
            for a in most_viewed_articles
        ],
        'announcements': [
            {
                'id': a.id,
                'uuid': str(a.uuid),
                'title': a.title,
                'slug': a.slug,
                'excerpt': a.content[:200] + '...' if len(a.content) > 200 else a.content,
                'category': a.category.name if a.category else 'Uncategorized',
                'created_at': a.created_at.isoformat(),
                'display_image': a.display_image or '',
            }
            for a in announcements
        ]
    }


def portal_login(request):
    """Requesters sign in on the main login page, then return to where they were."""
    next_url = request.GET.get('next') or '/portal/'
    if not (next_url.startswith('/') and url_has_allowed_host_and_scheme(
        next_url, allowed_hosts={request.get_host()}, require_https=request.is_secure(),
    )):
        next_url = '/portal/'
    if request.user.is_authenticated:
        return redirect(next_url)
    return redirect(f"/?{urlencode({'next': next_url})}")


@require_app('customer-portal')
@inertia('PortalCreateTicket')
def portal_create_ticket(request):
    """Guest ticket creation page."""
    settings = CustomerPortalSettings.get_settings()
    from modules.kb.models import KBArticle
    from modules.settings.models import Channel
    
    tenant_name = organization_name(settings.portal_title)
    
    # Check if web channel is activated
    web_channel = Channel.objects.filter(channel_id='web').first()
    web_channel_active = web_channel.is_activated if web_channel else False
    
    # Get suggested KB articles if enabled
    suggested_articles = []
    if settings.suggest_kb_before_ticket:
        suggested_articles = KBArticle.objects.filter(status='published').order_by('-views')[:5]
    
    return {
        'suggest_kb': settings.suggest_kb_before_ticket,
        'tenant_name': tenant_name,
        'webChannelActive': web_channel_active,
        'suggested_articles': [
            {
                'id': a.id,
                'uuid': str(a.uuid),
                'title': a.title,
                'slug': a.slug,
                'excerpt': a.content[:100] + '...' if len(a.content) > 100 else a.content,
            }
            for a in suggested_articles
        ]
    }


@require_app('customer-portal')
@require_http_methods(["POST"])
def portal_upload_file(request):
    """Upload a ticket attachment from the public portal (CSRF protected and rate limited)."""
    if rate_limited(request, 'portal-upload', limit=20, window=10 * 60):
        return JsonResponse({'success': False, 'error': 'Too many uploads. Please try again later.'}, status=429)
    if 'file' not in request.FILES:
        return JsonResponse({'success': False, 'error': 'No file provided'}, status=400)

    uploaded_file = request.FILES['file']
    try:
        stored = store_upload(uploaded_file, 'ticket-attachments')
    except UploadError as exc:
        return JsonResponse({'success': False, 'error': exc.message}, status=exc.status)

    return JsonResponse({'success': True, 'file_url': stored.get('url'), 'file_name': uploaded_file.name})


@require_app('customer-portal')
@require_http_methods(["POST"])
def portal_submit_ticket(request):
    """Submit a guest ticket."""
    if rate_limited(request, 'portal-submit-ticket', limit=20, window=10 * 60):
        return JsonResponse({'success': False, 'message': 'Too many requests. Please try again later.'}, status=429)
    try:
        # Check if web channel is active before allowing ticket creation
        from modules.settings.models import Channel
        web_channel = Channel.objects.filter(channel_id='web').first()
        if not web_channel or not web_channel.is_activated:
            return JsonResponse({
                'success': False,
                'message': 'Ticket submission is currently unavailable. The web channel is inactive.'
            }, status=400)
        
        # Parse request body
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError as e:
            return JsonResponse({
                'success': False,
                'message': 'Invalid JSON data'
            }, status=400)
        
        # Validate required fields
        required_fields = ['name', 'email', 'subject', 'description']
        missing_fields = [field for field in required_fields if not data.get(field)]
        
        if missing_fields:
            return JsonResponse({
                'success': False,
                'message': f'Missing required fields: {", ".join(missing_fields)}'
            }, status=400)
        
        # Create ticket in main ticket table
        # Get 'web' channel for customer portal tickets
        from modules.settings.models import Channel
        web_channel = Channel.objects.filter(channel_id='web').first()
        
        ticket = Ticket.objects.create(
            title=data.get('subject'),
            description=data.get('description'),
            is_guest_ticket=True,
            guest_name=data.get('name'),
            guest_email=data.get('email'),
            guest_phone=data.get('phone', ''),
            source='customer_portal',
            channel=web_channel,
            status=Ticket.Status.NEW,
            priority=Ticket.Priority.NORMAL,
        )
        
        # Create ticket attachments
        attachments = data.get('attachments', [])
        for attachment in attachments:
            # only links we could have issued: no javascript:/data: URLs
            if str(attachment.get('url', '')).startswith(('https://', 'http://', '/media/')):
                TicketAttachment.objects.create(
                    ticket=ticket,
                    file_url=attachment.get('url'),
                    file_name=attachment.get('name', 'attachment'),
                    file_size=attachment.get('size'),
                    file_type=attachment.get('type', ''),
                    is_internal=False,
                    uploaded_by=None  # Guest upload
                )
        
        # Note: Confirmation email is sent by ticket signals 
        # based on NotificationSettings.notify_new_ticket_created
        
        return JsonResponse({
            'success': True,
            'ticket_number': ticket.ticket_number,
            'message': 'Ticket created successfully'
        })
    except Exception as e:
        logger.exception('Ticket creation failed')
        return JsonResponse({
            'success': False,
            'message': 'Error creating ticket'
        }, status=500)


@require_app('customer-portal')
@inertia('PortalTrackTicket')
def portal_track_ticket(request):
    """Track ticket page."""
    settings = CustomerPortalSettings.get_settings()
    
    tenant_name = organization_name(settings.portal_title)
    
    ticket_number = request.GET.get('ticket_number', '')
    email = request.GET.get('email', '')
    
    ticket_data = None
    comments = []
    activity_logs = []
    
    if ticket_number and email:
        try:
            ticket = Ticket.objects.get(
                ticket_number=ticket_number,
                guest_email=email,
                is_guest_ticket=True
            )
            
            ticket_data = {
                'id': ticket.id,
                'ticket_number': ticket.ticket_number,
                'subject': ticket.title,
                'description': ticket.description,
                'status': ticket.status,
                'priority': ticket.priority,
                'created_at': ticket.created_at.isoformat(),
                'updated_at': ticket.updated_at.isoformat(),
            }
            
            # Get non-internal comments
            comments = [
                {
                    'id': c.id,
                    'author': (
                        f"{c.author.first_name} {c.author.last_name}" if c.author 
                        else ticket.guest_name if ticket.guest_name 
                        else 'Guest'
                    ),
                    'message': c.message,
                    'created_at': c.created_at.isoformat(),
                    'is_guest': c.author is None,
                }
                for c in ticket.comments.filter(is_internal=False).order_by('created_at')
            ]
            
            # Get activity logs (customer-friendly activities only)
            activity_logs = [
                {
                    'id': a.id,
                    'activity_type': a.activity_type,
                    'description': a.description,
                    'actor': f"{a.actor.first_name} {a.actor.last_name}" if a.actor else 'System',
                    'created_at': a.created_at.isoformat(),
                }
                for a in ticket.activities.all().order_by('-created_at')
            ]
        except Ticket.DoesNotExist:
            pass
    
    return {
        'tenant_name': tenant_name,
        'ticket': ticket_data,
        'comments': comments,
        'activity_logs': activity_logs,
        'search': {
            'ticket_number': ticket_number,
            'email': email,
        }
    }


@require_app('customer-portal')
@login_required(login_url='/portal/login/')
@inertia('CustomerPortalTicketDetail')
def portal_ticket_detail(request, ticket_number):
    """Authenticated user ticket detail page."""
    from modules.ticket.models import TicketComment, ActivityStream

    settings = CustomerPortalSettings.get_settings()
    tenant_name = organization_name(settings.portal_title)

    ticket = get_object_or_404(Ticket, ticket_number=ticket_number, requester=request.user)

    ticket_data = {
        'id': ticket.id,
        'ticket_number': ticket.ticket_number,
        'subject': ticket.title,
        'description': ticket.description,
        'status': ticket.status,
        'priority': ticket.priority,
        'created_at': ticket.created_at.isoformat(),
        'updated_at': ticket.updated_at.isoformat(),
        'assignee': f"{ticket.assignee.first_name} {ticket.assignee.last_name}".strip() if ticket.assignee else None,
    }

    comments = [
        {
            'id': c.id,
            'author': f"{c.author.first_name} {c.author.last_name}".strip() if c.author else 'System',
            'message': c.message,
            'created_at': c.created_at.isoformat(),
            'is_agent': c.author != request.user if c.author else True,
        }
        for c in ticket.comments.filter(is_internal=False).order_by('created_at')
    ]

    activity_logs = [
        {
            'id': a.id,
            'activity_type': a.activity_type,
            'description': a.description,
            'actor': f"{a.actor.first_name} {a.actor.last_name}".strip() if a.actor else 'System',
            'created_at': a.created_at.isoformat(),
        }
        for a in ticket.activities.all().order_by('-created_at')
    ]

    return {
        'tenant_name': tenant_name,
        'ticket': ticket_data,
        'comments': comments,
        'activity_logs': activity_logs,
        'currentUser': {
            'name': f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username,
            'email': request.user.email,
        },
    }


@require_app('customer-portal')
@login_required(login_url='/portal/login/')
@require_http_methods(["POST"])
def portal_ticket_add_comment(request, ticket_number):
    """Add a comment to a ticket as an authenticated user."""
    from modules.ticket.models import TicketComment, ActivityStream

    try:
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError as e:
            return JsonResponse({'success': False, 'message': 'Invalid JSON data'}, status=400)

        message = data.get('message', '').strip()
        if not message:
            return JsonResponse({'success': False, 'message': 'Message is required'}, status=400)

        ticket = get_object_or_404(Ticket, ticket_number=ticket_number, requester=request.user)

        comment = TicketComment.objects.create(
            ticket=ticket,
            author=request.user,
            message=message,
            is_internal=False,
        )

        user_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
        ActivityStream.objects.create(
            ticket=ticket,
            activity_type=ActivityStream.ActivityType.COMMENT_ADDED,
            actor=request.user,
            description=f"Comment added by {user_name}",
            metadata={'comment_id': comment.id}
        )

        return JsonResponse({
            'success': True,
            'comment': {
                'id': comment.id,
                'author': user_name,
                'message': comment.message,
                'created_at': comment.created_at.isoformat(),
                'is_agent': False,
            }
        })
    except Exception as e:
        logger.exception('Comment creation failed')
        return JsonResponse({'success': False, 'message': 'Error adding comment'}, status=500)


@require_app('customer-portal')
@inertia('PortalSystemStatus')
def portal_system_status(request):
    """System status page showing service health."""
    settings = CustomerPortalSettings.get_settings()
    
    tenant_name = organization_name(settings.portal_title)
    
    return {
        'tenant_name': tenant_name,
    }


@require_app('customer-portal')
@require_http_methods(["POST"])
def portal_add_comment(request):
    """Add a comment to a guest ticket."""
    if rate_limited(request, 'portal-add-comment', limit=20, window=10 * 60):
        return JsonResponse({'success': False, 'message': 'Too many requests. Please try again later.'}, status=429)
    try:
        # Parse request body
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError as e:
            return JsonResponse({
                'success': False,
                'message': 'Invalid JSON data'
            }, status=400)
        
        # Validate required fields
        required_fields = ['ticket_number', 'email', 'message']
        missing_fields = [field for field in required_fields if not data.get(field)]
        
        if missing_fields:
            return JsonResponse({
                'success': False,
                'message': f'Missing required fields: {", ".join(missing_fields)}'
            }, status=400)
        
        # Verify ticket ownership
        try:
            ticket = Ticket.objects.get(
                ticket_number=data.get('ticket_number'),
                guest_email=data.get('email'),
                is_guest_ticket=True
            )
        except Ticket.DoesNotExist:
            return JsonResponse({
                'success': False,
                'message': 'Ticket not found or email does not match'
            }, status=404)
        
        # Import TicketComment model
        from modules.ticket.models import TicketComment
        
        # Create comment (no author since it's a guest)
        comment = TicketComment.objects.create(
            ticket=ticket,
            author=None,  # Guest comment has no author
            message=data.get('message'),
            is_internal=False,
        )
        
        # Create activity log for the comment
        from modules.ticket.models import ActivityStream
        ActivityStream.objects.create(
            ticket=ticket,
            activity_type=ActivityStream.ActivityType.COMMENT_ADDED,
            actor=None,
            description=f"Comment added by {ticket.guest_name} (Guest)",
            metadata={'comment_id': comment.id, 'is_guest_comment': True}
        )
        
        return JsonResponse({
            'success': True,
            'message': 'Comment added successfully',
            'comment': {
                'id': comment.id,
                'author': ticket.guest_name,
                'message': comment.message,
                'created_at': comment.created_at.isoformat(),
                'is_guest': True,
            }
        })
    except Exception as e:
        logger.exception('Comment creation failed')
        return JsonResponse({
            'success': False,
            'message': 'Error adding comment'
        }, status=500)


@require_app('customer-portal')
@inertia('CustomerPortalKBList')
def portal_kb_list(request):
    """List KB articles in customer portal with category filtering."""
    from modules.kb.models import KBCategory, KBArticle
    from modules.settings.models import KnowledgeBaseSettings
    
    settings = CustomerPortalSettings.get_settings()
    kb_settings = KnowledgeBaseSettings.get_settings()
    
    # Check if public access is allowed or if login is required
    if not kb_settings.public_access:
        if not request.user.is_authenticated:
            return redirect('customer_portal_login')
    
    if kb_settings.require_login_to_view and not request.user.is_authenticated:
        return redirect('customer_portal_login')
    
    tenant_name = organization_name(settings.portal_title)
    
    # Get selected category from query param
    category_id = request.GET.get('category')
    selected_category = None
    
    # Get all categories
    categories = KBCategory.objects.all()
    
    # Filter articles by category if specified
    articles_query = KBArticle.objects.filter(status='published')
    
    if category_id:
        try:
            selected_category = int(category_id)
            articles_query = articles_query.filter(category_id=selected_category)
        except (ValueError, TypeError):
            pass
    
    # Order by most recent
    articles = articles_query.order_by('-created_at')
    
    return {
        'portal_settings': {
            'portal_title': settings.portal_title,
            'tenant_name': tenant_name,
        },
        'categories': [
            {
                'id': c.id,
                'name': c.name,
                'description': c.description,
                'icon': c.icon,
                'article_count': c.articles.filter(status='published').count(),
            }
            for c in categories
        ],
        'articles': [
            {
                'id': a.id,
                'uuid': str(a.uuid),
                'title': a.title,
                'slug': a.slug,
                'excerpt': a.content[:200] + '...' if len(a.content) > 200 else a.content,
                'views': a.views,
                'category': a.category.name if a.category else 'Uncategorized',
                'author': f"{a.created_by.first_name} {a.created_by.last_name}".strip() if a.created_by and a.created_by.first_name else (a.created_by.username if a.created_by else None),
                'updated_at': a.updated_at.strftime('%b %d, %Y') if a.updated_at else None,
                'created_at': a.created_at.isoformat(),
                'display_image': a.display_image or '',
            }
            for a in articles
        ],
        'selectedCategory': selected_category,
    }


@require_app('customer-portal')
@inertia('PortalKBArticle')
def portal_kb_article(request, uuid):
    """View KB article in customer portal."""
    from modules.kb.models import KBArticle
    from modules.settings.models import KnowledgeBaseSettings
    
    settings = CustomerPortalSettings.get_settings()
    kb_settings = KnowledgeBaseSettings.get_settings()
    
    # Check if public access is allowed or if login is required
    if not kb_settings.public_access:
        if not request.user.is_authenticated:
            return redirect('customer_portal_login')
    
    if kb_settings.require_login_to_view and not request.user.is_authenticated:
        return redirect('customer_portal_login')
    
    tenant_name = organization_name(settings.portal_title)
    
    article = get_object_or_404(KBArticle, uuid=uuid, status='published')
    
    # Increment view count
    article.views += 1
    article.save(update_fields=['views'])
    
    # Get related articles
    related_articles = KBArticle.objects.filter(
        category=article.category,
        status='published'
    ).exclude(id=article.id)[:3]
    
    return {
        'tenant_name': tenant_name,
        'article': {
            'id': article.id,
            'uuid': str(article.uuid),
            'title': article.title,
            'content': article.content,
            'category': article.category.name,
            'views': article.views,
            'created_at': article.created_at.isoformat(),
            'updated_at': article.updated_at.isoformat(),
            'display_image': article.display_image or '',
        },
        'related_articles': [
            {
                'id': a.id,
                'uuid': str(a.uuid),
                'title': a.title,
                'slug': a.slug,
                'excerpt': a.content[:100] + '...' if len(a.content) > 100 else a.content,
                'display_image': a.display_image or '',
            }
            for a in related_articles
        ]
    }


@require_app('customer-portal')
@inertia('PortalKBSearch')
def portal_kb_search(request):
    """Search KB articles in customer portal."""
    from modules.kb.models import KBArticle
    from modules.settings.models import KnowledgeBaseSettings
    from django.db.models import Q
    
    settings = CustomerPortalSettings.get_settings()
    kb_settings = KnowledgeBaseSettings.get_settings()
    
    # Check if public access is allowed or if login is required
    if not kb_settings.public_access:
        if not request.user.is_authenticated:
            return redirect('customer_portal_login')
    
    if kb_settings.require_login_to_view and not request.user.is_authenticated:
        return redirect('customer_portal_login')
    
    tenant_name = organization_name(settings.portal_title)
    
    query = request.GET.get('q', '')
    results = []
    
    if query:
        # Search in title and content
        results = KBArticle.objects.filter(
            Q(title__icontains=query) | Q(content__icontains=query),
            status='published'
        ).order_by('-views')[:20]
    
    return {
        'tenant_name': tenant_name,
        'query': query,
        'results': [
            {
                'id': a.id,
                'uuid': str(a.uuid),
                'title': a.title,
                'slug': a.slug,
                'excerpt': a.content[:200] + '...' if len(a.content) > 200 else a.content,
                'category': a.category.name,
                'views': a.views,
                'display_image': a.display_image or '',
            }
            for a in results
        ]
    }


@require_app('customer-portal')
@inertia('CustomerPortalSurveys')
def portal_surveys(request):
    """Customer survey page with business-type specific questions."""
    from .survey_questions import SurveyQuestions
    from shared.models import Client
    
    settings = CustomerPortalSettings.get_settings()
    
    tenant_name = organization_name(settings.portal_title)
    client = Client.get_current()
    business_type = getattr(client, 'business_type', None) or 'Other'
    
    # Get questions for the business type
    questions = SurveyQuestions.get_questions_for_business_type(business_type)
    
    # Check if survey already submitted (could be stored in session or database)
    survey_submitted = request.session.get('survey_submitted', False)
    
    return {
        'portal_settings': {
            'portal_title': settings.portal_title,
            'tenant_name': tenant_name,
        },
        'business_type': business_type,
        'questions': questions,
        'survey_submitted': survey_submitted,
    }


@require_app('customer-portal')
@require_http_methods(["POST"])
def portal_surveys_submit(request):
    """Handle survey submission."""
    try:
        data = json.loads(request.body)
        business_type = data.get('business_type')
        responses = data.get('responses', {})
        
        # Store survey results (could be saved to database)
        # For now, we'll just mark it as submitted in session
        request.session['survey_submitted'] = True
        request.session['survey_responses'] = {
            'business_type': business_type,
            'responses': responses,
            'submitted_at': str(timezone.now()) if 'timezone' in dir() else str(datetime.now())
        }
        
        return JsonResponse({
            'success': True,
            'message': 'Survey submitted successfully'
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': 'Error submitting survey'
        }, status=500)
