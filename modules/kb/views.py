from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.core.paginator import Paginator
from django.conf import settings as django_settings
from django.contrib.auth import get_user_model
from django.db import connection, models
from inertia import inertia
from .models import KBCategory, KBArticle
from shared.decorators import require_app
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


def _is_notification_enabled(setting_name):
    """Check if a specific notification is enabled in NotificationSettings."""
    try:
        from modules.settings.models import NotificationSettings
        settings = NotificationSettings.get_settings()
        return getattr(settings, setting_name, False)
    except Exception as e:
        logger.error(f"Failed to get notification settings: {e}")
        return False


def _get_article_url(article):
    """Build article URL for email templates."""
    try:
        from django.conf import settings as django_settings
        base_url = getattr(django_settings, 'SITE_URL', 'http://localhost:8000')
        return f"{base_url}/kb/articles/{article.uuid}"
    except Exception:
        return ''


def _get_company_name():
    """Get company name from settings."""
    try:
        from shared.models import Client
        client = Client.get_current()
        return client.name if client else 'Support Team'
    except Exception:
        return 'Support Team'


def send_approval_notification(article, request):
    """Send email notification to admins/approvers when article needs approval"""
    from modules.settings.models import KnowledgeBaseSettings
    from shared.utilities.Mailer import Mailer
    
    kb_settings = KnowledgeBaseSettings.get_settings()
    
    # Only send if approval is required and notifications are enabled
    if not kb_settings.require_approval or not kb_settings.notify_approvers:
        return
    
    # Get all staff/admin users
    approvers = User.objects.filter(is_staff=True, is_active=True)
    
    if not approvers.exists():
        return
    
    try:
        mailer = Mailer()
        
        for approver in approvers:
            if not approver.email:
                continue
            
            mailer.send_email(
                template_type='kb_article_published',  # Reuse for approval notification
                to_emails=[approver.email],
                context={
                    'subscriber_name': approver.get_full_name() or approver.username,
                    'article_title': article.title,
                    'category_name': article.category.name if article.category else 'Uncategorized',
                    'author_name': article.created_by.get_full_name() if article.created_by else 'Unknown',
                    'article_summary': article.summary or 'No summary provided',
                    'article_url': _get_article_url(article),
                    'company_name': _get_company_name(),
                }
            )
    except Exception as e:
        logger.error(f"Failed to send approval notification: {e}")


def _send_article_updated_notification(article):
    """Notify article author when their published article is updated by someone else."""
    if not _is_notification_enabled('notify_kb_article_updated'):
        return

    if not article.created_by or not article.created_by.email:
        return

    try:
        from shared.utilities.Mailer import Mailer
        mailer = Mailer()
        mailer.send_email(
            template_type='kb_article_updated',
            to_emails=[article.created_by.email],
            context={
                'subscriber_name': article.created_by.get_full_name() or article.created_by.username,
                'article_title': article.title,
                'category_name': article.category.name if article.category else 'Uncategorized',
                'article_url': _get_article_url(article),
                'company_name': _get_company_name(),
            }
        )
    except Exception as e:
        logger.error(f"Failed to send article updated notification: {e}")


def send_author_notification(article, approved=True, reason=''):
    """Notify article author when article is approved or rejected.
    
    Checks NotificationSettings.notify_kb_article_approved before sending.
    """
    from modules.settings.models import KnowledgeBaseSettings
    from shared.utilities.Mailer import Mailer
    
    kb_settings = KnowledgeBaseSettings.get_settings()
    
    # Only send if approval workflow is enabled
    if not kb_settings.require_approval:
        return
    
    # Check NotificationSettings for whether to send
    if approved and not _is_notification_enabled('notify_kb_article_approved'):
        return
    
    if not article.created_by or not article.created_by.email:
        return
    
    try:
        mailer = Mailer()
        
        if approved:
            mailer.send_email(
                template_type='kb_article_approved',
                to_emails=[article.created_by.email],
                context={
                    'author_name': article.created_by.get_full_name() or article.created_by.username,
                    'article_title': article.title,
                    'category_name': article.category.name if article.category else 'Uncategorized',
                    'article_url': _get_article_url(article),
                    'company_name': _get_company_name(),
                }
            )
            logger.info(f"Sent KB article approved notification for '{article.title}'")
        else:
            mailer.send_email(
                template_type='kb_article_rejected',
                to_emails=[article.created_by.email],
                context={
                    'author_name': article.created_by.get_full_name() or article.created_by.username,
                    'article_title': article.title,
                    'category_name': article.category.name if article.category else 'Uncategorized',
                    'rejection_reason': reason or 'No specific reason provided.',
                    'company_name': _get_company_name(),
                }
            )
            logger.info(f"Sent KB article rejected notification for '{article.title}'")
    except Exception as e:
        logger.error(f"Failed to send author notification: {e}")


def get_kb_sidebar(request):
    """Generate sidebar data for KB views from SettingsView model."""
    from modules.settings.models import SettingsView
    
    # Get active KB views from database
    kb_views = SettingsView.objects.filter(
        type='KB',
        is_active=True
    ).order_by('order')
    
    # Calculate counts for each view
    view_counts = {
        'all': KBArticle.objects.count(),
        'published': KBArticle.objects.filter(status='published').count(),
        'draft': KBArticle.objects.filter(status='draft').count(),
        'archived': KBArticle.objects.filter(status='archived').count(),
        'pending': KBArticle.objects.filter(status='pending').count(),
        'rejected': KBArticle.objects.filter(status='rejected').count(),
        'my_articles': KBArticle.objects.filter(created_by=request.user).count(),
    }
    
    pending_count = view_counts.get('pending', 0)
    
    views_data = []
    for view in kb_views:
        views_data.append({
            'id': view.view_id,
            'label': view.label,
            'count': view_counts.get(view.view_id, 0),
            'active': False,
        })
    
    return {
        'views': views_data
    }, pending_count


@require_app('knowledge-base')
@login_required
@inertia('KnowledgeBase')
def kb_home(request):
    """Knowledge Base home/dashboard page."""
    sidebar, pending_count = get_kb_sidebar(request)
    categories = KBCategory.objects.all()

    # Stats
    total_articles = KBArticle.objects.count()
    published_articles = KBArticle.objects.filter(status='published').count()
    total_views = KBArticle.objects.aggregate(total=models.Sum('views'))['total'] or 0
    total_categories = categories.count()

    stats = {
        'totalArticles': total_articles,
        'publishedArticles': published_articles,
        'totalViews': total_views,
        'totalCategories': total_categories,
    }

    # Top performing articles (by views)
    top_articles_qs = KBArticle.objects.filter(status='published').order_by('-views')[:5]
    top_articles = [
        {
            'id': a.id,
            'uuid': str(a.uuid),
            'title': a.title,
            'views': a.views,
        }
        for a in top_articles_qs
    ]

    # Categories with article counts
    categories_data = [
        {
            'id': cat.id,
            'name': cat.name,
            'icon': cat.icon,
            'count': cat.articles.count(),
        }
        for cat in categories
    ]

    # Featured / popular articles
    featured_qs = KBArticle.objects.filter(status='published').order_by('-views')[:6]
    featured_articles = [
        {
            'id': a.id,
            'uuid': str(a.uuid),
            'title': a.title,
            'summary': a.summary,
            'display_image': a.display_image or '',
            'status': a.status,
            'featured': a.featured,
            'views': a.views,
            'category': a.category.name if a.category else None,
            'created_at': a.created_at.isoformat(),
            'author': a.created_by.get_full_name() if a.created_by else None,
        }
        for a in featured_qs
    ]

    return {
        'sidebar': sidebar,
        'pendingCount': pending_count,
        'categories': categories_data,
        'stats': stats,
        'topArticles': top_articles,
        'featuredArticles': featured_articles,
    }


@require_app('knowledge-base')
@login_required
@inertia('KBArticles')
def kb_articles(request):
    """List KB articles, optionally filtered by view or category."""
    sidebar, pending_count = get_kb_sidebar(request)
    current_view = request.GET.get('view', 'all')
    category_id = request.GET.get('category')
    view_title = 'All Articles'

    articles_qs = KBArticle.objects.select_related('category', 'created_by').all()

    if category_id:
        articles_qs = articles_qs.filter(category_id=category_id)
        cat = KBCategory.objects.filter(id=category_id).first()
        if cat:
            view_title = cat.name
    elif current_view == 'published':
        articles_qs = articles_qs.filter(status='published')
        view_title = 'Published'
    elif current_view == 'draft':
        articles_qs = articles_qs.filter(status='draft')
        view_title = 'Drafts'
    elif current_view == 'pending':
        articles_qs = articles_qs.filter(status='pending')
        view_title = 'Pending Review'
    elif current_view == 'archived':
        articles_qs = articles_qs.filter(status='archived')
        view_title = 'Archived'
    elif current_view == 'rejected':
        articles_qs = articles_qs.filter(status='rejected')
        view_title = 'Rejected'
    elif current_view == 'my_articles':
        articles_qs = articles_qs.filter(created_by=request.user)
        view_title = 'My Articles'

    articles = [
        {
            'id': a.id,
            'uuid': str(a.uuid),
            'title': a.title,
            'summary': a.summary,
            'display_image': a.display_image or '',
            'status': a.status,
            'featured': a.featured,
            'views': a.views,
            'category': a.category.name if a.category else None,
            'created_at': a.created_at.isoformat(),
            'author': a.created_by.get_full_name() if a.created_by else None,
        }
        for a in articles_qs
    ]

    return {
        'articles': articles,
        'sidebar': sidebar,
        'currentView': current_view,
        'pendingCount': pending_count,
        'viewTitle': view_title,
    }


@require_app('knowledge-base')
@login_required
@inertia('KBCategoryForm')
def kb_category_add(request):
    """Add new KB category"""
    # Get all categories with pagination
    page = request.GET.get('page', 1)
    categories = KBCategory.objects.all().order_by('-created_at')
    paginator = Paginator(categories, 10)  # 10 items per page
    page_obj = paginator.get_page(page)
    
    categories_data = []
    for category in page_obj:
        article_count = KBArticle.objects.filter(category=category).count()
        categories_data.append({
            'id': category.id,
            'name': category.name,
            'description': category.description,
            'icon': category.icon,
            'article_count': article_count,
            'created_at': category.created_at.isoformat(),
            'created_by': category.created_by.get_full_name() if category.created_by else 'Unknown',
        })
    
    sidebar, pending_count = get_kb_sidebar(request)

    return {
        'mode': 'add',
        'categories': categories_data,
        'sidebar': sidebar,
        'pendingCount': pending_count,
        'pagination': {
            'current_page': page_obj.number,
            'total_pages': paginator.num_pages,
            'has_previous': page_obj.has_previous(),
            'has_next': page_obj.has_next(),
            'total_items': paginator.count,
        }
    }


@require_app('knowledge-base')
@login_required
@require_http_methods(['POST'])
def kb_category_add_post(request):
    """Handle KB category creation"""
    name = request.POST.get('name', '').strip()
    description = request.POST.get('description', '').strip()
    icon = request.POST.get('icon', '📁')
    
    errors = {}
    if not name:
        errors['name'] = 'Category name is required'
    
    if errors:
        return redirect('kb_category_add')
    
    category = KBCategory.objects.create(
        name=name,
        description=description,
        icon=icon,
        created_by=request.user
    )
    
    return redirect('knowledgebase')


@require_app('knowledge-base')
@login_required
@inertia('KBCategoryForm')
def kb_category_edit(request, category_id):
    """Edit KB category"""
    category = get_object_or_404(KBCategory, id=category_id)
    sidebar, pending_count = get_kb_sidebar(request)
    
    return {
        'mode': 'edit',
        'category': {
            'id': category.id,
            'name': category.name,
            'description': category.description,
            'icon': category.icon,
        },
        'sidebar': sidebar,
        'pendingCount': pending_count,
    }


@require_app('knowledge-base')
@login_required
@require_http_methods(['POST'])
def kb_category_edit_post(request, category_id):
    """Handle KB category update"""
    category = get_object_or_404(KBCategory, id=category_id)
    
    name = request.POST.get('name', '').strip()
    description = request.POST.get('description', '').strip()
    icon = request.POST.get('icon', '📁')
    
    errors = {}
    if not name:
        errors['name'] = 'Category name is required'
    
    if errors:
        return redirect('kb_category_edit', category_id=category_id)
    
    category.name = name
    category.description = description
    category.icon = icon
    category.save()
    
    return redirect('kb_category_add')


@require_app('knowledge-base')
@login_required
@require_http_methods(['POST'])
def kb_category_delete(request, category_id):
    """Delete KB category"""
    category = get_object_or_404(KBCategory, id=category_id)
    
    # Check if category has articles
    article_count = KBArticle.objects.filter(category=category).count()
    if article_count > 0:
        # Optionally, you can prevent deletion or reassign articles
        pass
    
    category.delete()
    return redirect('kb_category_add')


@require_app('knowledge-base')
@login_required
@inertia('KBArticleForm')
def kb_article_add(request):
    """Add new KB article"""
    from modules.settings.models import KnowledgeBaseSettings
    
    kb_settings = KnowledgeBaseSettings.get_settings()
    categories = KBCategory.objects.all()
    sidebar, pending_count = get_kb_sidebar(request)
    
    return {
        'mode': 'add',
        'categories': [
            {'id': cat.id, 'name': cat.name, 'icon': cat.icon}
            for cat in categories
        ],
        'sidebar': {
            'views': sidebar['views'],
            'currentView': 'all',
            'pendingCount': pending_count,
        },
        'kbSettings': {
            'requireApproval': kb_settings.require_approval,
        },
    }


@require_app('knowledge-base')
@login_required
@require_http_methods(['POST'])
def kb_article_add_post(request):
    """Handle KB article creation"""
    from modules.settings.models import KnowledgeBaseSettings
    
    kb_settings = KnowledgeBaseSettings.get_settings()
    
    title = request.POST.get('title', '').strip()
    summary = request.POST.get('summary', '').strip()
    content = request.POST.get('content', '').strip()
    category_id = request.POST.get('category', '')
    tags = request.POST.get('tags', '').strip()
    status = request.POST.get('status', 'draft')
    featured = request.POST.get('featured') == 'true' or request.POST.get('featured') == True
    allow_comments = request.POST.get('allow_comments') == 'true' or request.POST.get('allow_comments') == True
    display_image = request.POST.get('display_image', '').strip()
    
    # Enforce KB settings
    if kb_settings.require_approval and status == 'published':
        status = 'pending'  # Change to pending if approval is required
    
    errors = {}
    if not title:
        errors['title'] = 'Article title is required'
    if not content:
        errors['content'] = 'Article content is required'
    if not category_id:
        errors['category'] = 'Category is required'
    
    if errors:
        return redirect('kb_article_add')
    
    category = None
    if category_id:
        try:
            category = KBCategory.objects.get(id=category_id)
        except KBCategory.DoesNotExist:
            errors['category'] = 'Invalid category'
            return redirect('kb_article_add')
    
    article = KBArticle.objects.create(
        title=title,
        summary=summary,
        content=content,
        category=category,
        tags=tags,
        status=status,
        featured=featured,
        allow_comments=allow_comments,
        display_image=display_image,
        created_by=request.user
    )
    
    # Send notifications based on settings
    if status == 'pending' and kb_settings.notify_approvers:
        send_approval_notification(article, request)
    
    return redirect('knowledgebase')


@require_app('knowledge-base')
@login_required
@inertia('KBArticleForm')
def kb_article_edit(request, uuid):
    """Edit KB article"""
    from modules.settings.models import KnowledgeBaseSettings
    
    kb_settings = KnowledgeBaseSettings.get_settings()
    article = get_object_or_404(KBArticle, uuid=uuid)
    categories = KBCategory.objects.all()
    sidebar, pending_count = get_kb_sidebar(request)
    
    return {
        'mode': 'edit',
        'article': {
            'id': article.id,
            'uuid': str(article.uuid),
            'title': article.title,
            'summary': article.summary,
            'content': article.content,
            'category': article.category.id if article.category else '',
            'tags': article.tags,
            'status': article.status,
            'featured': article.featured,
            'allow_comments': article.allow_comments,
            'display_image': article.display_image or '',
        },
        'categories': [
            {'id': cat.id, 'name': cat.name, 'icon': cat.icon}
            for cat in categories
        ],
        'sidebar': {
            'views': sidebar['views'],
            'currentView': 'all',
            'pendingCount': pending_count,
        },
        'kbSettings': {
            'requireApproval': kb_settings.require_approval,
        },
    }


@require_app('knowledge-base')
@login_required
@require_http_methods(['POST'])
def kb_article_edit_post(request, uuid):
    """Handle KB article update"""
    from modules.settings.models import KnowledgeBaseSettings
    
    kb_settings = KnowledgeBaseSettings.get_settings()
    article = get_object_or_404(KBArticle, uuid=uuid)
    
    old_status = article.status
    
    title = request.POST.get('title', '').strip()
    summary = request.POST.get('summary', '').strip()
    content = request.POST.get('content', '').strip()
    category_id = request.POST.get('category', '')
    tags = request.POST.get('tags', '').strip()
    status = request.POST.get('status', 'draft')
    featured = request.POST.get('featured') == 'true' or request.POST.get('featured') == True
    allow_comments = request.POST.get('allow_comments') == 'true' or request.POST.get('allow_comments') == True
    display_image = request.POST.get('display_image', '').strip()
    
    # Enforce KB settings
    if kb_settings.require_approval and status == 'published' and old_status != 'published':
        status = 'pending'  # Change to pending if approval is required
    
    errors = {}
    if not title:
        errors['title'] = 'Article title is required'
    if not content:
        errors['content'] = 'Article content is required'
    if not category_id:
        errors['category'] = 'Category is required'
    
    if errors:
        return redirect('kb_article_edit', article_id=article_id)
    
    category = None
    if category_id:
        try:
            category = KBCategory.objects.get(id=category_id)
        except KBCategory.DoesNotExist:
            errors['category'] = 'Invalid category'
            return redirect('kb_article_edit', article_id=article_id)
    
    article.title = title
    article.summary = summary
    article.content = content
    article.category = category
    article.tags = tags
    article.status = status
    article.featured = featured
    article.allow_comments = allow_comments
    article.display_image = display_image
    article.save()
    
    # Send notifications based on status changes
    if old_status != 'pending' and status == 'pending' and kb_settings.notify_approvers:
        send_approval_notification(article, request)
    
    if old_status == 'pending' and status == 'published' and kb_settings.notify_author_on_approval:
        send_author_notification(article, approved=True)
    
    if old_status == 'pending' and status == 'draft' and kb_settings.notify_author_on_rejection:
        send_author_notification(article, approved=False)
    
    # Notify when a published article is updated (not status change, content update)
    if old_status == 'published' and status == 'published':
        _send_article_updated_notification(article)
    
    return redirect('knowledgebase')


@require_app('knowledge-base')
@login_required
@inertia('KBArticleView')
def kb_article_view(request, uuid):
    """View KB article"""
    article = get_object_or_404(KBArticle, uuid=uuid)
    
    # Increment view count
    article.views += 1
    article.save(update_fields=['views'])
    
    # Get related articles from the same category
    related_articles = []
    if article.category:
        related_articles_qs = KBArticle.objects.filter(
            category=article.category,
            status='published'
        ).exclude(id=article.id).order_by('-views')[:5]
        
        for rel_article in related_articles_qs:
            related_articles.append({
                'id': rel_article.id,
                'uuid': str(rel_article.uuid),
                'title': rel_article.title,
                'summary': rel_article.summary,
                'views': rel_article.views,
                'created_at': rel_article.created_at.isoformat(),
            })
    
    return {
        'article': {
            'id': article.id,
            'uuid': str(article.uuid),
            'title': article.title,
            'summary': article.summary,
            'content': article.content,
            'slug': article.slug,
            'display_image': article.display_image or '',
            'category': {
                'id': article.category.id,
                'name': article.category.name,
                'icon': article.category.icon,
            } if article.category else None,
            'tags': article.tags,
            'status': article.status,
            'featured': article.featured,
            'allow_comments': article.allow_comments,
            'views': article.views,
            'created_at': article.created_at.isoformat(),
            'updated_at': article.updated_at.isoformat(),
            'author': {
                'id': article.created_by.id,
                'name': article.created_by.get_full_name(),
                'email': article.created_by.email,
            } if article.created_by else None,
        },
        'relatedArticles': related_articles,
        'comments': [],  # TODO: Implement comments model
    }


@require_app('knowledge-base')
@login_required
@inertia('KBSettings')
def kb_settings(request):
    """Knowledge Base settings page."""
    from modules.settings.models import KnowledgeBaseSettings
    
    settings = KnowledgeBaseSettings.get_settings()
    
    # Serialize settings
    settings_data = {
        'id': settings.id,
        'public_access': settings.public_access,
        'require_login_to_view': settings.require_login_to_view,
        'allow_article_rating': settings.allow_article_rating,
        'allow_article_comments': settings.allow_article_comments,
        'require_approval': settings.require_approval,
        'auto_publish_on_approval': settings.auto_publish_on_approval,
        'notify_approvers': settings.notify_approvers,
        'notify_author_on_approval': settings.notify_author_on_approval,
        'notify_author_on_rejection': settings.notify_author_on_rejection,
    }
    
    sidebar, pending_count = get_kb_sidebar(request)
    
    return {
        'settings': settings_data,
        'sidebar': sidebar,
        'pendingCount': pending_count,
    }


@require_app('knowledge-base')
@login_required
@require_http_methods(['POST'])
def kb_settings_update(request):
    """Update Knowledge Base settings."""
    from modules.settings.models import KnowledgeBaseSettings
    import json
    
    settings = KnowledgeBaseSettings.get_settings()
    
    # Update boolean fields
    boolean_fields = [
        'public_access', 'require_login_to_view', 'allow_article_rating',
        'allow_article_comments', 'require_approval', 'auto_publish_on_approval',
        'notify_approvers', 'notify_author_on_approval', 'notify_author_on_rejection',
    ]
    
    # Handle JSON data from Inertia
    if request.content_type == 'application/json':
        data = json.loads(request.body)
        for field in boolean_fields:
            if field in data:
                setattr(settings, field, bool(data[field]))
        
        # If require_approval is turned off, also turn off dependent settings
        if 'require_approval' in data and not bool(data['require_approval']):
            settings.notify_approvers = False
            settings.notify_author_on_approval = False
            settings.notify_author_on_rejection = False
    else:
        # Handle form data
        for field in boolean_fields:
            if field in request.POST:
                setattr(settings, field, request.POST.get(field) == 'true')
        
        # If require_approval is turned off, also turn off dependent settings
        if request.POST.get('require_approval') != 'true':
            settings.notify_approvers = False
            settings.notify_author_on_approval = False
            settings.notify_author_on_rejection = False
    
    settings.save()
    
    return redirect('kb_settings')


@require_app('knowledge-base')
@login_required
@require_http_methods(['POST'])
def kb_article_approve(request, uuid):
    """Approve a pending KB article"""
    from modules.settings.models import KnowledgeBaseSettings
    from django.http import JsonResponse
    
    kb_settings = KnowledgeBaseSettings.get_settings()
    article = get_object_or_404(KBArticle, uuid=uuid)
    
    if article.status != 'pending':
        return JsonResponse({'error': 'Article is not pending approval'}, status=400)
    
    article.status = 'published'
    article.save()
    
    # Send notification to author
    if kb_settings.notify_author_on_approval:
        send_author_notification(article, approved=True)
    
    return redirect('knowledgebase')


@require_app('knowledge-base')
@login_required
@require_http_methods(['POST'])
def kb_article_reject(request, uuid):
    """Reject a pending KB article"""
    from modules.settings.models import KnowledgeBaseSettings
    from django.http import JsonResponse
    
    kb_settings = KnowledgeBaseSettings.get_settings()
    article = get_object_or_404(KBArticle, uuid=uuid)
    
    if article.status != 'pending':
        return JsonResponse({'error': 'Article is not pending approval'}, status=400)
    
    article.status = 'draft'
    article.save()
    
    # Send notification to author
    if kb_settings.notify_author_on_rejection:
        send_author_notification(article, approved=False)
    
    return redirect('knowledgebase')
