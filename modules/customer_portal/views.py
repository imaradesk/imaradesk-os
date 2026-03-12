from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.core.paginator import Paginator
from django.db import models
from django.utils import timezone
from inertia import inertia
import json
import traceback
from datetime import datetime

from shared.decorators import require_app
from shared.models import Client
from .models import (
    Customer, 
    CustomerContact, 
    CustomerTicket, 
    CustomerTicketComment,
    CustomerAsset,
    CustomerPortalSettings
)
from modules.ticket.models import Ticket


def get_organization_name():
    """Get the current organization name for single-tenant setup."""
    try:
        org = Client.get_current()
        return org.name if org else 'Support'
    except Exception:
        return 'Support'


def get_organization():
    """Get the current organization for single-tenant setup."""
    try:
        return Client.get_current()
    except Exception:
        return None


# ============================================
# Customer Portal (Customer-facing)
# ============================================

@require_app('customer-portal')
@inertia('CustomerPortalHome')
def portal_home(request):
    """Customer portal homepage."""
    from modules.kb.models import KBCategory, KBArticle
    
    settings = CustomerPortalSettings.get_settings()
    
    # Get tenant/business name
    tenant_name = get_organization_name() or settings.portal_title
    
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
    
    return {
        'portal_settings': {
            'portal_title': settings.portal_title,
            'portal_welcome_message': settings.portal_welcome_message,
            'show_kb_in_portal': settings.show_kb_in_portal,
            'allow_guest_tickets': settings.allow_guest_tickets,
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
        'popular_articles': [
            {
                'id': a.id,
                'title': a.title,
                'slug': a.slug,
                'excerpt': a.content[:150] + '...' if len(a.content) > 150 else a.content,
                'views': a.views,
                'category': a.category.name if a.category else 'Uncategorized',
            }
            for a in popular_articles
        ],
        'latest_articles': [
            {
                'id': a.id,
                'title': a.title,
                'slug': a.slug,
                'excerpt': a.content[:150] + '...' if len(a.content) > 150 else a.content,
                'views': a.views,
                'category': a.category.name if a.category else 'Uncategorized',
                'created_at': a.created_at.isoformat(),
            }
            for a in latest_articles
        ],
        'most_viewed_articles': [
            {
                'id': a.id,
                'title': a.title,
                'slug': a.slug,
                'excerpt': a.content[:150] + '...' if len(a.content) > 150 else a.content,
                'views': a.views,
                'category': a.category.name if a.category else 'Uncategorized',
            }
            for a in most_viewed_articles
        ],
        'announcements': [
            {
                'id': a.id,
                'title': a.title,
                'slug': a.slug,
                'excerpt': a.content[:200] + '...' if len(a.content) > 200 else a.content,
                'category': a.category.name if a.category else 'Uncategorized',
                'created_at': a.created_at.isoformat(),
            }
            for a in announcements
        ]
    }


@require_app('customer-portal')
@inertia('CustomerPortalLogin')
def portal_login(request):
    """Customer portal login page."""
    return {}


@require_app('customer-portal')
@inertia('PortalCreateTicket')
def portal_create_ticket(request):
    """Guest ticket creation page."""
    settings = CustomerPortalSettings.get_settings()
    from modules.kb.models import KBArticle
    
    # Get tenant/business name
    tenant_name = get_organization_name() or settings.portal_title
    
    # Get suggested KB articles if enabled
    suggested_articles = []
    if settings.suggest_kb_before_ticket:
        suggested_articles = KBArticle.objects.filter(status='published').order_by('-views')[:5]
    
    return {
        'suggest_kb': settings.suggest_kb_before_ticket,
        'tenant_name': tenant_name,
        'suggested_articles': [
            {
                'id': a.id,
                'title': a.title,
                'slug': a.slug,
                'excerpt': a.content[:100] + '...' if len(a.content) > 100 else a.content,
            }
            for a in suggested_articles
        ]
    }


@require_app('customer-portal')
@csrf_exempt
@require_http_methods(["POST"])
def portal_submit_ticket(request):
    """Submit a guest ticket."""
    try:
        # Parse request body
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError as e:
            return JsonResponse({
                'success': False,
                'message': f'Invalid JSON data: {str(e)}'
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
        ticket = Ticket.objects.create(
            title=data.get('subject'),
            description=data.get('description'),
            is_guest_ticket=True,
            guest_name=data.get('name'),
            guest_email=data.get('email'),
            guest_phone=data.get('phone', ''),
            source='customer_portal',
            status=Ticket.Status.NEW,
            priority=Ticket.Priority.NORMAL,
        )
        
        # Note: Confirmation email is sent by ticket signals 
        # based on NotificationSettings.notify_new_ticket_created
        
        return JsonResponse({
            'success': True,
            'ticket_number': ticket.ticket_number,
            'message': 'Ticket created successfully'
        })
    except Exception as e:
        # Log the full error for debugging
        print(f"Ticket creation error: {str(e)}")
        print(traceback.format_exc())
        return JsonResponse({
            'success': False,
            'message': f'Error creating ticket: {str(e)}'
        }, status=500)


@require_app('customer-portal')
@inertia('PortalTrackTicket')
def portal_track_ticket(request):
    """Track ticket page."""
    settings = CustomerPortalSettings.get_settings()
    
    # Get tenant/business name
    tenant_name = get_organization_name() or settings.portal_title
    
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
@csrf_exempt
@require_http_methods(["POST"])
def portal_add_comment(request):
    """Add a comment to a guest ticket."""
    try:
        # Parse request body
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError as e:
            return JsonResponse({
                'success': False,
                'message': f'Invalid JSON data: {str(e)}'
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
        # Log the full error for debugging
        print(f"Comment creation error: {str(e)}")
        print(traceback.format_exc())
        return JsonResponse({
            'success': False,
            'message': f'Error adding comment: {str(e)}'
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
    
    # Get tenant/business name
    tenant_name = get_organization_name() or settings.portal_title
    
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
                'title': a.title,
                'slug': a.slug,
                'excerpt': a.content[:200] + '...' if len(a.content) > 200 else a.content,
                'views': a.views,
                'category': a.category.name if a.category else 'Uncategorized',
                'author': f"{a.created_by.first_name} {a.created_by.last_name}".strip() if a.created_by and a.created_by.first_name else (a.created_by.username if a.created_by else None),
                'updated_at': a.updated_at.strftime('%b %d, %Y') if a.updated_at else None,
                'created_at': a.created_at.isoformat(),
            }
            for a in articles
        ],
        'selectedCategory': selected_category,
    }


@require_app('customer-portal')
@inertia('PortalKBArticle')
def portal_kb_article(request, article_id):
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
    
    # Get tenant/business name
    tenant_name = get_organization_name() or settings.portal_title
    
    article = get_object_or_404(KBArticle, id=article_id, status='published')
    
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
            'title': article.title,
            'content': article.content,
            'category': article.category.name,
            'views': article.views,
            'created_at': article.created_at.isoformat(),
            'updated_at': article.updated_at.isoformat(),
        },
        'related_articles': [
            {
                'id': a.id,
                'title': a.title,
                'slug': a.slug,
                'excerpt': a.content[:100] + '...' if len(a.content) > 100 else a.content,
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
    
    # Get tenant/business name
    tenant_name = get_organization_name() or settings.portal_title
    
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
                'title': a.title,
                'slug': a.slug,
                'excerpt': a.content[:200] + '...' if len(a.content) > 200 else a.content,
                'category': a.category.name,
                'views': a.views,
            }
            for a in results
        ]
    }


@require_app('customer-portal')
@inertia('CustomerPortalSurveys')
def portal_surveys(request):
    """Customer survey page with business-type specific questions."""
    from .survey_questions import SurveyQuestions
    
    settings = CustomerPortalSettings.get_settings()
    
    # Get tenant/business name and type
    org = get_organization()
    tenant_name = org.name if org else settings.portal_title
    business_type = getattr(org, 'business_type', 'Other') if org else 'Other'
    
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
            'message': f'Error submitting survey: {str(e)}'
        }, status=500)


# ============================================
# Customers Management (Admin)
# ============================================

@require_app('customer-portal')
@login_required
@inertia('CustomersList')
def customers_list(request):
    """List all customers."""
    page = int(request.GET.get('page', 1))
    search = request.GET.get('search', '')
    status_filter = request.GET.get('status', '')
    tier_filter = request.GET.get('tier', '')
    
    customers = Customer.objects.all().select_related('account_owner')
    
    if search:
        customers = customers.filter(
            models.Q(name__icontains=search) |
            models.Q(email__icontains=search) |
            models.Q(slug__icontains=search)
        )
    
    if status_filter:
        customers = customers.filter(status=status_filter)
    
    if tier_filter:
        customers = customers.filter(tier=tier_filter)
    
    paginator = Paginator(customers, 20)
    page_obj = paginator.get_page(page)
    
    return {
        'customers': {
            'data': [
                {
                    'id': c.id,
                    'name': c.name,
                    'slug': c.slug,
                    'email': c.email,
                    'phone': c.phone,
                    'status': c.status,
                    'tier': c.tier,
                    'account_owner': {
                        'id': c.account_owner.id,
                        'name': f"{c.account_owner.first_name} {c.account_owner.last_name}"
                    } if c.account_owner else None,
                    'portal_enabled': c.portal_enabled,
                    'created_at': c.created_at.isoformat(),
                }
                for c in page_obj
            ],
            'total': paginator.count,
            'per_page': 20,
            'current_page': page,
            'last_page': paginator.num_pages,
        },
        'filters': {
            'search': search,
            'status': status_filter,
            'tier': tier_filter,
        }
    }


@require_app('customer-portal')
@login_required
@inertia('CustomerForm')
def customer_add(request):
    """Add new customer form."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    users = User.objects.filter(is_active=True)
    
    return {
        'customer': None,
        'users': [
            {'id': u.id, 'name': f"{u.first_name} {u.last_name} ({u.email})"}
            for u in users
        ]
    }


@require_app('customer-portal')
@login_required
@inertia('CustomerView')
def customer_view(request, customer_id):
    """View customer details."""
    customer = get_object_or_404(Customer, id=customer_id)
    
    # Get contacts
    contacts = customer.contacts.all()
    
    # Get recent tickets
    recent_tickets = customer.tickets.all()[:10]
    
    # Get assets
    assets = customer.assets.all()
    
    return {
        'customer': {
            'id': customer.id,
            'name': customer.name,
            'slug': customer.slug,
            'email': customer.email,
            'phone': customer.phone,
            'website': customer.website,
            'address_line1': customer.address_line1,
            'address_line2': customer.address_line2,
            'city': customer.city,
            'state': customer.state,
            'postal_code': customer.postal_code,
            'country': customer.country,
            'status': customer.status,
            'tier': customer.tier,
            'account_owner': {
                'id': customer.account_owner.id,
                'name': f"{customer.account_owner.first_name} {customer.account_owner.last_name}"
            } if customer.account_owner else None,
            'portal_enabled': customer.portal_enabled,
            'allow_ticket_creation': customer.allow_ticket_creation,
            'allow_kb_access': customer.allow_kb_access,
            'billing_email': customer.billing_email,
            'tax_id': customer.tax_id,
            'notes': customer.notes,
            'created_at': customer.created_at.isoformat(),
        },
        'contacts': [
            {
                'id': c.id,
                'full_name': c.full_name,
                'email': c.email,
                'phone': c.phone,
                'job_title': c.job_title,
                'role': c.role,
                'is_primary': c.is_primary,
                'portal_access': c.portal_access,
            }
            for c in contacts
        ],
        'recent_tickets': [
            {
                'id': t.id,
                'ticket_number': t.ticket_number,
                'subject': t.subject,
                'status': t.status,
                'priority': t.priority,
                'created_at': t.created_at.isoformat(),
            }
            for t in recent_tickets
        ],
        'assets': [
            {
                'id': a.id,
                'name': a.name,
                'asset_tag': a.asset_tag,
                'status': a.status,
                'warranty_expiry': a.warranty_expiry.isoformat() if a.warranty_expiry else None,
            }
            for a in assets
        ]
    }


@require_app('customer-portal')
@login_required
@inertia('CustomerForm')
def customer_edit(request, customer_id):
    """Edit customer form."""
    customer = get_object_or_404(Customer, id=customer_id)
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    users = User.objects.filter(is_active=True)
    
    return {
        'customer': {
            'id': customer.id,
            'name': customer.name,
            'slug': customer.slug,
            'email': customer.email,
            'phone': customer.phone,
            'website': customer.website,
            'address_line1': customer.address_line1,
            'address_line2': customer.address_line2,
            'city': customer.city,
            'state': customer.state,
            'postal_code': customer.postal_code,
            'country': customer.country,
            'status': customer.status,
            'tier': customer.tier,
            'account_owner_id': customer.account_owner.id if customer.account_owner else None,
            'portal_enabled': customer.portal_enabled,
            'allow_ticket_creation': customer.allow_ticket_creation,
            'allow_kb_access': customer.allow_kb_access,
            'billing_email': customer.billing_email,
            'tax_id': customer.tax_id,
            'notes': customer.notes,
        },
        'users': [
            {'id': u.id, 'name': f"{u.first_name} {u.last_name} ({u.email})"}
            for u in users
        ]
    }


@require_app('customer-portal')
@login_required
@require_http_methods(["POST"])
def customer_delete(request, customer_id):
    """Delete a customer."""
    customer = get_object_or_404(Customer, id=customer_id)
    customer.delete()
    
    return JsonResponse({
        'success': True,
        'message': f'Customer "{customer.name}" deleted successfully'
    })


# ============================================
# Customer Contacts
# ============================================

@require_app('customer-portal')
@login_required
@inertia('CustomerContactForm')
def customer_contact_add(request, customer_id):
    """Add contact to customer."""
    customer = get_object_or_404(Customer, id=customer_id)
    
    return {
        'customer': {
            'id': customer.id,
            'name': customer.name,
        },
        'contact': None
    }


@require_app('customer-portal')
@login_required
@inertia('CustomerContactForm')
def customer_contact_edit(request, contact_id):
    """Edit customer contact."""
    contact = get_object_or_404(CustomerContact, id=contact_id)
    
    return {
        'customer': {
            'id': contact.customer.id,
            'name': contact.customer.name,
        },
        'contact': {
            'id': contact.id,
            'first_name': contact.first_name,
            'last_name': contact.last_name,
            'email': contact.email,
            'phone': contact.phone,
            'job_title': contact.job_title,
            'role': contact.role,
            'is_primary': contact.is_primary,
            'portal_access': contact.portal_access,
            'receive_notifications': contact.receive_notifications,
            'notes': contact.notes,
        }
    }


@require_app('customer-portal')
@login_required
@require_http_methods(["POST"])
def customer_contact_delete(request, contact_id):
    """Delete a customer contact."""
    contact = get_object_or_404(CustomerContact, id=contact_id)
    contact.delete()
    
    return JsonResponse({
        'success': True,
        'message': 'Contact deleted successfully'
    })


# ============================================
# Customer Tickets
# ============================================

@require_app('customer-portal')
@login_required
@inertia('CustomerTicketsList')
def customer_tickets_list(request):
    """List all customer tickets."""
    page = int(request.GET.get('page', 1))
    
    tickets = CustomerTicket.objects.all().select_related('customer', 'contact', 'assigned_to')
    
    paginator = Paginator(tickets, 20)
    page_obj = paginator.get_page(page)
    
    return {
        'tickets': {
            'data': [
                {
                    'id': t.id,
                    'ticket_number': t.ticket_number,
                    'customer': t.customer.name,
                    'contact': t.contact.full_name if t.contact else None,
                    'subject': t.subject,
                    'status': t.status,
                    'priority': t.priority,
                    'assigned_to': f"{t.assigned_to.first_name} {t.assigned_to.last_name}" if t.assigned_to else None,
                    'created_at': t.created_at.isoformat(),
                }
                for t in page_obj
            ],
            'total': paginator.count,
            'per_page': 20,
            'current_page': page,
            'last_page': paginator.num_pages,
        }
    }


@require_app('customer-portal')
@login_required
@inertia('CustomerTicketView')
def customer_ticket_view(request, ticket_id):
    """View customer ticket details."""
    ticket = get_object_or_404(CustomerTicket, id=ticket_id)
    comments = ticket.comments.all().select_related('author')
    
    return {
        'ticket': {
            'id': ticket.id,
            'ticket_number': ticket.ticket_number,
            'customer': {
                'id': ticket.customer.id,
                'name': ticket.customer.name,
            },
            'contact': {
                'id': ticket.contact.id,
                'full_name': ticket.contact.full_name,
                'email': ticket.contact.email,
            } if ticket.contact else None,
            'subject': ticket.subject,
            'description': ticket.description,
            'status': ticket.status,
            'priority': ticket.priority,
            'assigned_to': {
                'id': ticket.assigned_to.id,
                'name': f"{ticket.assigned_to.first_name} {ticket.assigned_to.last_name}"
            } if ticket.assigned_to else None,
            'portal_visible': ticket.portal_visible,
            'customer_satisfaction_rating': ticket.customer_satisfaction_rating,
            'customer_feedback': ticket.customer_feedback,
            'created_at': ticket.created_at.isoformat(),
            'updated_at': ticket.updated_at.isoformat(),
        },
        'comments': [
            {
                'id': c.id,
                'author': f"{c.author.first_name} {c.author.last_name}" if c.author else 'System',
                'comment': c.comment,
                'is_internal': c.is_internal,
                'created_at': c.created_at.isoformat(),
            }
            for c in comments
        ]
    }


@require_app('customer-portal')
@login_required
@require_http_methods(["POST"])
def customer_ticket_update(request, ticket_id):
    """Update customer ticket."""
    ticket = get_object_or_404(CustomerTicket, id=ticket_id)
    data = json.loads(request.body)
    
    # Update fields
    for field in ['status', 'priority', 'assigned_to_id', 'portal_visible']:
        if field in data:
            setattr(ticket, field, data[field])
    
    # Handle resolved/closed timestamps
    if data.get('status') == 'resolved' and not ticket.resolved_at:
        from django.utils import timezone
        ticket.resolved_at = timezone.now()
    
    if data.get('status') == 'closed' and not ticket.closed_at:
        from django.utils import timezone
        ticket.closed_at = timezone.now()
    
    ticket.save()
    
    return JsonResponse({
        'success': True,
        'message': 'Ticket updated successfully'
    })


# ============================================
# Customer Assets
# ============================================

@require_app('customer-portal')
@login_required
@inertia('CustomerAssetForm')
def customer_asset_add(request, customer_id):
    """Add asset to customer."""
    customer = get_object_or_404(Customer, id=customer_id)
    
    return {
        'customer': {
            'id': customer.id,
            'name': customer.name,
        },
        'asset': None
    }


@require_app('customer-portal')
@login_required
@inertia('CustomerAssetForm')
def customer_asset_edit(request, asset_id):
    """Edit customer asset."""
    asset = get_object_or_404(CustomerAsset, id=asset_id)
    
    return {
        'customer': {
            'id': asset.customer.id,
            'name': asset.customer.name,
        },
        'asset': {
            'id': asset.id,
            'name': asset.name,
            'asset_tag': asset.asset_tag,
            'serial_number': asset.serial_number,
            'model': asset.model,
            'manufacturer': asset.manufacturer,
            'status': asset.status,
            'purchase_date': asset.purchase_date.isoformat() if asset.purchase_date else None,
            'warranty_expiry': asset.warranty_expiry.isoformat() if asset.warranty_expiry else None,
            'support_level': asset.support_level,
            'support_expiry': asset.support_expiry.isoformat() if asset.support_expiry else None,
            'notes': asset.notes,
        }
    }


@require_app('customer-portal')
@login_required
@require_http_methods(["POST"])
def customer_asset_delete(request, asset_id):
    """Delete a customer asset."""
    asset = get_object_or_404(CustomerAsset, id=asset_id)
    asset.delete()
    
    return JsonResponse({
        'success': True,
        'message': 'Asset deleted successfully'
    })


# ============================================
# Customer Portal Settings
# ============================================

@require_app('customer-portal')
@login_required
@inertia('CustomerPortalSettings')
def customer_portal_settings(request):
    """Customer portal settings page."""
    settings = CustomerPortalSettings.get_settings()
    
    return {
        'settings': {
            # Portal Branding
            'portal_title': settings.portal_title,
            'portal_logo': settings.portal_logo,
            'portal_welcome_message': settings.portal_welcome_message,
            
            # Portal Features
            'enable_portal': settings.enable_portal,
            'allow_guest_tickets': settings.allow_guest_tickets,
            'require_approval_for_new_contacts': settings.require_approval_for_new_contacts,
            
            # Ticket Settings
            'default_ticket_priority': settings.default_ticket_priority,
            'auto_assign_tickets': settings.auto_assign_tickets,
            'notify_on_new_ticket': settings.notify_on_new_ticket,
            'notify_customer_on_update': settings.notify_customer_on_update,
            
            # Knowledge Base Integration
            'show_kb_in_portal': settings.show_kb_in_portal,
            'suggest_kb_before_ticket': settings.suggest_kb_before_ticket,
            
            # Customer Satisfaction
            'enable_satisfaction_survey': settings.enable_satisfaction_survey,
            'survey_delay_hours': settings.survey_delay_hours,
            
            # Asset Management
            'show_assets_in_portal': settings.show_assets_in_portal,
            'allow_customers_to_add_assets': settings.allow_customers_to_add_assets,
            
            # Security
            'require_2fa_for_portal': settings.require_2fa_for_portal,
            'session_timeout_minutes': settings.session_timeout_minutes,
        }
    }


@require_app('customer-portal')
@login_required
@require_http_methods(["POST"])
def customer_portal_settings_update(request):
    """Update customer portal settings."""
    try:
        settings = CustomerPortalSettings.get_settings()
        data = json.loads(request.body)
        
        # Update settings
        for field, value in data.items():
            if hasattr(settings, field):
                setattr(settings, field, value)
        
        settings.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Customer portal settings saved successfully'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=400)
