from shared.utilities.organization import organization_name, site_url
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.core.paginator import Paginator
from django.conf import settings as django_settings
from django.http import JsonResponse
from django.urls import reverse
from django.utils.http import url_has_allowed_host_and_scheme
from django.contrib.auth import get_user_model
from django.db import connection, models
from inertia import inertia
from .models import KBCategory, KBArticle
from shared.decorators import require_app, admin_required
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
    return site_url(f'/kb/articles/{article.uuid}')


def _get_company_name():
    """Get company name from the organization settings."""
    try:
        return organization_name('Support Team')
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


def _redirect_back(request):
    """Return to the page the request came from (the article drawer lives on KB pages)."""
    referer = request.META.get('HTTP_REFERER')
    if referer and url_has_allowed_host_and_scheme(referer, allowed_hosts={request.get_host()}):
        return redirect(referer)
    return redirect('kb_articles_list')


def get_kb_sidebar(request):
    """Sidebar data for the KB workspace: saved views (SettingsView), categories, the pending count and the approval setting."""
    from modules.settings.models import SettingsView, KnowledgeBaseSettings

    kb_views = SettingsView.objects.filter(type='KB', is_active=True).order_by('order')

    view_counts = {
        'all': KBArticle.objects.count(),
        'published': KBArticle.objects.filter(status='published').count(),
        'draft': KBArticle.objects.filter(status='draft').count(),
        'archived': KBArticle.objects.filter(status='archived').count(),
        'pending': KBArticle.objects.filter(status='pending').count(),
        'rejected': KBArticle.objects.filter(status='rejected').count(),
        'my_articles': KBArticle.objects.filter(created_by=request.user).count(),
    }
    pending_count = view_counts['pending']

    views_data = [
        {'id': view.view_id, 'label': view.label, 'count': view_counts.get(view.view_id, 0)}
        for view in kb_views
    ]
    categories_data = [
        {'id': cat.id, 'name': cat.name, 'icon': cat.icon, 'count': cat.article_count}
        for cat in KBCategory.objects.annotate(article_count=models.Count('articles')).order_by('name')
    ]

    return {
        'views': views_data,
        'categories': categories_data,
        'counts': {'all': view_counts['all'], 'pending': pending_count},
        'requireApproval': KnowledgeBaseSettings.get_settings().require_approval,
    }, pending_count


@require_app('knowledge-base')
@login_required
def kb_home(request):
    """Shadowed by core's knowledgebase view; kept so the route resolves. No overview page."""
    return redirect('kb_articles_list')


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
    # Get all categories with pagination; ?search= matches name or description
    page = request.GET.get('page', 1)
    search = request.GET.get('search', '').strip()
    categories = KBCategory.objects.select_related('created_by').annotate(
        num_articles=models.Count('articles')
    ).order_by('-created_at')
    if search:
        categories = categories.filter(models.Q(name__icontains=search) | models.Q(description__icontains=search))
    paginator = Paginator(categories, 10)  # 10 items per page
    page_obj = paginator.get_page(page)
    
    categories_data = []
    for category in page_obj:
        categories_data.append({
            'id': category.id,
            'name': category.name,
            'description': category.description,
            'icon': category.icon,
            'article_count': category.num_articles,
            'created_at': category.created_at.isoformat(),
            'created_by': category.created_by.get_full_name() if category.created_by else 'Unknown',
        })
    
    sidebar, pending_count = get_kb_sidebar(request)

    return {
        'mode': 'add',
        'categories': categories_data,
        'search': search,
        # Total regardless of search, so the page can tell "no categories yet" from "no matches"
        'totalCategories': KBCategory.objects.count() if search else paginator.count,
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


def _serialize_article_row(article):
    """Article fields used by the list rows (components/kb/ArticleList.jsx)."""
    return {
        'id': article.id,
        'uuid': str(article.uuid),
        'title': article.title,
        'summary': article.summary,
        'category': article.category.name if article.category else 'Uncategorized',
        'categoryId': article.category_id,
        'views': article.views,
        'status': article.status,
        'featured': article.featured,
        'author': article.created_by.get_full_name() if article.created_by else 'Unknown',
        'created_at': article.created_at.isoformat(),
        'updated_at': article.updated_at.isoformat() if article.updated_at else None,
        'display_image': article.display_image or '',
    }


CATEGORY_TABS = ('overview', 'articles')


@require_app('knowledge-base')
@login_required
@inertia('KBCategoryView')
def kb_category_view(request, category_id, tab='overview'):
    """A category's page: overview and its articles (like a task project). Edit/delete live in the header menu."""
    if tab not in CATEGORY_TABS:
        return redirect('kb_category_view', category_id=category_id)
    category = get_object_or_404(KBCategory.objects.select_related('created_by'), id=category_id)
    articles_qs = KBArticle.objects.filter(category=category).select_related('category', 'created_by')

    by_status = dict(articles_qs.values_list('status').annotate(n=models.Count('id')).order_by())
    total = sum(by_status.values())
    counts = {
        'total': total,
        'published': by_status.get('published', 0),
        'draft': by_status.get('draft', 0),
        'pending': by_status.get('pending', 0),
        'views': articles_qs.aggregate(v=models.Sum('views'))['v'] or 0,
    }
    status_labels = [('published', 'Published'), ('pending', 'In review'), ('draft', 'Draft'), ('rejected', 'Rejected'), ('archived', 'Archived')]
    status_breakdown = [
        {'status': s, 'label': label, 'count': by_status.get(s, 0)}
        for s, label in status_labels
        if by_status.get(s, 0) or s in ('published', 'pending', 'draft')
    ]

    sidebar, pending_count = get_kb_sidebar(request)
    props = {
        'tab': tab,
        'category': {
            'id': category.id,
            'name': category.name,
            'description': category.description,
            'icon': category.icon,
            'created_at': category.created_at.isoformat(),
            'updated_at': category.updated_at.isoformat() if category.updated_at else None,
            'created_by': category.created_by.get_full_name() if category.created_by else None,
            'counts': counts,
            'progress': round(counts['published'] * 100 / total) if total else 0,
        },
        'sidebar': sidebar,
        'pendingCount': pending_count,
    }
    if tab == 'overview':
        props['statusBreakdown'] = status_breakdown
        props['topArticles'] = [_serialize_article_row(a) for a in articles_qs.filter(views__gt=0).order_by('-views')[:5]]
        props['recentArticles'] = [_serialize_article_row(a) for a in articles_qs.order_by('-updated_at')[:8]]
    elif tab == 'articles':
        props['articles'] = [_serialize_article_row(a) for a in articles_qs.order_by('-created_at')]
    return props


@require_app('knowledge-base')
@login_required
@require_http_methods(['POST'])
def kb_category_add_post(request):
    """Handle KB category creation"""
    name = request.POST.get('name', '').strip()
    description = request.POST.get('description', '').strip()
    icon = request.POST.get('icon') or 'Folder'
    
    errors = {}
    if not name:
        errors['name'] = 'Category name is required'
    
    # Plain XHR callers (e.g. "Add all" on the categories page) get JSON rather than a
    # redirect: axios would follow it to an HTML page and read that as an expired session
    wants_json = request.headers.get('X-Requested-With') == 'XMLHttpRequest' and not request.headers.get('X-Inertia')

    if errors:
        if wants_json:
            return JsonResponse({'errors': errors}, status=400)
        return _redirect_back(request)
    
    category = KBCategory.objects.create(
        name=name,
        description=description,
        icon=icon,
        created_by=request.user
    )
    
    if wants_json:
        return JsonResponse({'category': {'id': category.id, 'name': category.name, 'icon': category.icon}}, status=201)
    # Categories can be created from a popover on any KB page; stay on that page
    return _redirect_back(request)


@require_app('knowledge-base')
@login_required
def kb_category_edit(request, category_id):
    """Old edit page; categories are edited in a popover on the categories list."""
    get_object_or_404(KBCategory, id=category_id)
    return redirect('kb_category_add')


@require_app('knowledge-base')
@login_required
@require_http_methods(['POST'])
def kb_category_edit_post(request, category_id):
    """Handle KB category update"""
    category = get_object_or_404(KBCategory, id=category_id)
    
    name = request.POST.get('name', '').strip()
    description = request.POST.get('description', '').strip()
    icon = request.POST.get('icon') or 'Folder'
    
    errors = {}
    if not name:
        errors['name'] = 'Category name is required'
    
    if errors:
        return _redirect_back(request)
    
    category.name = name
    category.description = description
    category.icon = icon
    category.save()
    
    # Edited from a popover on the categories list; keep its page and search
    return _redirect_back(request)


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
def kb_article_add(request):
    """The article form is a drawer in the KB layout; open it on the articles list (keeps ?template= / ?category=)."""
    params = request.GET.copy()
    params['new'] = '1'
    return redirect(f"{reverse('kb_articles_list')}?{params.urlencode()}")


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
        return _redirect_back(request)
    
    category = None
    if category_id:
        try:
            category = KBCategory.objects.get(id=category_id)
        except KBCategory.DoesNotExist:
            errors['category'] = 'Invalid category'
            return _redirect_back(request)
    
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
    
    return redirect('kb_article_view', uuid=article.uuid)


@require_app('knowledge-base')
@login_required
def kb_article_edit(request, uuid):
    """The article form is a drawer in the KB layout; open it on the article page."""
    article = get_object_or_404(KBArticle, uuid=uuid)
    return redirect(f"{reverse('kb_article_view', args=[article.uuid])}?edit=1")


@require_app('knowledge-base')
@login_required
def kb_article_form_data(request, uuid):
    """Article fields for the edit drawer, opened from lists that don't carry the content."""
    article = get_object_or_404(KBArticle.objects.select_related('category'), uuid=uuid)
    return JsonResponse({
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
        }
    })


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
        return _redirect_back(request)
    
    category = None
    if category_id:
        try:
            category = KBCategory.objects.get(id=category_id)
        except KBCategory.DoesNotExist:
            errors['category'] = 'Invalid category'
            return _redirect_back(request)
    
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
    
    return redirect('kb_article_view', uuid=article.uuid)


@require_app('knowledge-base')
@login_required
@inertia('KBArticleView')
def kb_article_view(request, uuid):
    """View KB article"""
    article = get_object_or_404(KBArticle, uuid=uuid)
    
    # Increment view count
    article.views += 1
    article.save(update_fields=['views'])
    
    sidebar, pending_count = get_kb_sidebar(request)

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
        'sidebar': sidebar,
        'pendingCount': pending_count,
    }


@require_app('knowledge-base')
@login_required
def kb_settings_redirect(request):
    """Old /knowledgebase/settings/ URL; the page moved to Administration."""
    return redirect('kb_settings')


@require_app('knowledge-base')
@login_required
@admin_required
@inertia('KBSettings')
def kb_settings(request):
    """Knowledge Base settings page (Administration → Knowledge base)."""
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
    
    return {
        'settings': settings_data,
    }


@require_app('knowledge-base')
@login_required
@admin_required
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
    
    return redirect('kb_articles_list')


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
    
    return redirect('kb_articles_list')
