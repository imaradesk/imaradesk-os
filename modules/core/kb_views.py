"""
Knowledge Base views - KB articles, categories, and approvals
"""
import json
from django.shortcuts import redirect
from django.urls import reverse
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.core.paginator import Paginator
from django.db import models
from inertia import inertia

from modules.kb.models import KBCategory, KBArticle
from shared.decorators import require_app


def get_kb_sidebar(request, current_view='all'):
    """Shared KB workspace sidebar (see modules.kb.views.get_kb_sidebar)."""
    from modules.kb.views import get_kb_sidebar as kb_sidebar
    return kb_sidebar(request)


@require_app('knowledge-base')
@login_required
def knowledgebase(request):
    """The KB has no overview page any more; /knowledgebase/ lands on All articles."""
    url = reverse('kb_articles_list')
    if request.GET:
        url = f"{url}?{request.GET.urlencode()}"
    return redirect(url)


@require_app('knowledge-base')
@login_required
@inertia('KBArticles')
def kb_articles_list(request):
    """Knowledge base articles list page with card view."""
    # Get view filter
    view = request.GET.get('view', 'all')

    # View titles mapping
    view_titles = {
        'all': 'All Articles',
        'published': 'Published Articles',
        'pending': 'Pending Articles',
        'draft': 'Draft Articles',
        'archived': 'Archived Articles',
        'rejected': 'Rejected Articles',
        'my_articles': 'My Articles',
    }

    # Base queryset
    articles_qs = KBArticle.objects.all().select_related('category', 'created_by')

    # Category filter (from the sidebar / overview) takes precedence over the view
    current_category = None
    category_id = request.GET.get('category')
    if category_id and category_id.isdigit():
        current_category = KBCategory.objects.filter(id=category_id).first()
    if current_category:
        # Categories have their own page now; keep any other params (e.g. ?new=1)
        params = request.GET.copy()
        params.pop('category')
        url = reverse('kb_category_view_tab', args=[current_category.id, 'articles'])
        return redirect(f"{url}?{params.urlencode()}" if params else url)
    if current_category:
        articles_qs = articles_qs.filter(category=current_category)
        view = 'all'

    # Apply view filter
    if view == 'published':
        articles_qs = articles_qs.filter(status='published')
    elif view == 'pending':
        articles_qs = articles_qs.filter(status='pending')
    elif view == 'draft':
        articles_qs = articles_qs.filter(status='draft')
    elif view == 'archived':
        articles_qs = articles_qs.filter(status='archived')
    elif view == 'rejected':
        articles_qs = articles_qs.filter(status='rejected')
    elif view == 'my_articles':
        articles_qs = articles_qs.filter(created_by=request.user)

    articles_qs = articles_qs.order_by('-created_at')

    articles_data = []
    for article in articles_qs:
        articles_data.append({
            'id': article.id,
            'uuid': str(article.uuid),
            'title': article.title,
            'summary': article.summary,
            'category': article.category.name if article.category else 'Uncategorized',
            'categoryId': article.category.id if article.category else None,
            'views': article.views,
            'status': article.status,
            'featured': article.featured,
            'author': article.created_by.get_full_name() if article.created_by else 'Unknown',
            'updated_at': article.updated_at.strftime('%b %d, %Y') if article.updated_at else None,
            'created_at': article.created_at.isoformat(),
            'display_image': article.display_image or '',
        })

    sidebar, pending_count = get_kb_sidebar(request, view)

    return {
        'articles': articles_data,
        'currentView': view,
        'viewTitle': current_category.name if current_category else view_titles.get(view, 'All Articles'),
        'currentCategory': {
            'id': current_category.id,
            'name': current_category.name,
            'icon': current_category.icon,
            'description': current_category.description,
        } if current_category else None,
        'sidebar': sidebar,
        'pendingCount': pending_count,
    }


@require_app('knowledge-base')
@login_required
@inertia('KBApprovals')
def kb_approvals(request):
    """Knowledge Base articles pending approval."""
    from modules.settings.models import KnowledgeBaseSettings

    kb_settings = KnowledgeBaseSettings.get_settings()

    pending_articles = KBArticle.objects.filter(status='pending').select_related('created_by', 'category').order_by('-created_at')

    page_num = int(request.GET.get('page', 1))
    paginator = Paginator(pending_articles, 10)
    page = paginator.get_page(page_num)

    articles = []
    for article in page.object_list:
        articles.append({
            'id': article.id,
            'uuid': str(article.uuid),
            'title': article.title,
            'summary': article.summary,
            'category': article.category.name if article.category else 'Uncategorized',
            'category_id': article.category.id if article.category else None,
            'author': article.created_by.get_full_name() if article.created_by and hasattr(article.created_by, 'get_full_name') else (article.created_by.username if article.created_by else 'Unknown'),
            'created_at': article.created_at.isoformat(),
            'views': article.views,
            'status': article.status,
            'display_image': article.display_image or '',
        })

    sidebar, pending_count = get_kb_sidebar(request, 'pending')

    return {
        'articles': articles,
        'requiresApproval': kb_settings.require_approval,
        'autoPublishOnApproval': kb_settings.auto_publish_on_approval,
        'sidebar': sidebar,
        'pendingCount': pending_count,
        'pagination': {
            'page': page.number,
            'pages': paginator.num_pages,
            'count': paginator.count,
            'has_next': page.has_next(),
            'has_prev': page.has_previous(),
        },
    }


@require_app('knowledge-base')
@login_required
def kb_article_approve(request, article_id):
    """Approve a knowledge base article."""
    from modules.settings.models import KnowledgeBaseSettings
    from modules.kb.views import send_author_notification

    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        article = KBArticle.objects.get(id=article_id)
    except KBArticle.DoesNotExist:
        return JsonResponse({'error': 'Article not found'}, status=404)

    kb_settings = KnowledgeBaseSettings.get_settings()

    if kb_settings.auto_publish_on_approval:
        article.status = 'published'
    else:
        article.status = 'draft'

    article.save()

    if kb_settings.notify_author_on_approval:
        send_author_notification(article, approved=True)

    return redirect('kb_approvals')


@require_app('knowledge-base')
@login_required
def kb_article_reject(request, article_id):
    """Reject a knowledge base article."""
    from modules.settings.models import KnowledgeBaseSettings
    from modules.kb.views import send_author_notification

    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        article = KBArticle.objects.get(id=article_id)
    except KBArticle.DoesNotExist:
        return JsonResponse({'error': 'Article not found'}, status=404)

    try:
        data = json.loads(request.body)
        reason = data.get('reason', '')
    except:
        reason = request.POST.get('reason', '')

    kb_settings = KnowledgeBaseSettings.get_settings()

    article.status = 'draft'
    article.save()

    if kb_settings.notify_author_on_rejection:
        send_author_notification(article, approved=False, reason=reason)

    return redirect('kb_approvals')

