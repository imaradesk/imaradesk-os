"""
Knowledge Base views - KB articles, categories, and approvals
"""
import json
from django.shortcuts import redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.core.paginator import Paginator
from django.db import models
from inertia import inertia

from modules.kb.models import KBCategory, KBArticle
from shared.decorators import require_app


def get_kb_sidebar(request, current_view='all'):
    """Generate sidebar data for KB views."""
    all_count = KBArticle.objects.count()
    pending_count = KBArticle.objects.filter(status='pending').count()
    published_count = KBArticle.objects.filter(status='published').count()
    draft_count = KBArticle.objects.filter(status='draft').count()
    rejected_count = KBArticle.objects.filter(status='rejected').count()
    my_articles_count = KBArticle.objects.filter(created_by=request.user).count()

    return {
        'views': [
            {'id': 'all', 'label': 'All Articles', 'count': all_count, 'active': current_view == 'all'},
            {'id': 'published', 'label': 'Published', 'count': published_count, 'active': current_view == 'published'},
            {'id': 'pending', 'label': 'Pending Approval', 'count': pending_count, 'active': current_view == 'pending'},
            {'id': 'draft', 'label': 'Drafts', 'count': draft_count, 'active': current_view == 'draft'},
            {'id': 'rejected', 'label': 'Rejected', 'count': rejected_count, 'active': current_view == 'rejected'},
            {'id': 'my_articles', 'label': 'Created by Me', 'count': my_articles_count, 'active': current_view == 'my_articles'},
        ]
    }, pending_count


@require_app('knowledge-base')
@login_required
@inertia('KnowledgeBase')
def knowledgebase(request):
    """Knowledge base page."""
    # Get view filter
    view = request.GET.get('view', 'all')

    # Get all categories with article count
    categories = KBCategory.objects.all()
    categories_data = []
    for category in categories:
        article_count = KBArticle.objects.filter(category=category).count()
        categories_data.append({
            'id': category.id,
            'name': category.name,
            'description': category.description,
            'icon': category.icon,
            'count': article_count,
        })

    # Base queryset
    articles_qs = KBArticle.objects.all().select_related('category', 'created_by')

    # Apply view filter
    if view == 'published':
        articles_qs = articles_qs.filter(status='published')
    elif view == 'pending':
        articles_qs = articles_qs.filter(status='pending')
    elif view == 'draft':
        articles_qs = articles_qs.filter(status='draft')
    elif view == 'rejected':
        articles_qs = articles_qs.filter(status='rejected')
    elif view == 'my_articles':
        articles_qs = articles_qs.filter(created_by=request.user)

    articles_qs = articles_qs.order_by('-created_at')

    articles_data = []
    for article in articles_qs:
        articles_data.append({
            'id': article.id,
            'title': article.title,
            'summary': article.summary,
            'category': article.category.name if article.category else 'Uncategorized',
            'categoryId': article.category.id if article.category else None,
            'views': article.views,
            'status': article.status,
            'featured': article.featured,
            'created_at': article.created_at.isoformat(),
            'updated_at': article.updated_at.strftime('%b %d, %Y') if article.updated_at else None,
            'author': article.created_by.get_full_name() if article.created_by else 'Unknown',
        })

    sidebar, pending_count = get_kb_sidebar(request, view)

    # Stats for dashboard
    total_articles = KBArticle.objects.count()
    published_articles = KBArticle.objects.filter(status='published').count()
    total_views = KBArticle.objects.aggregate(total=models.Sum('views'))['total'] or 0
    total_categories = KBCategory.objects.count()

    # Top articles by views (for chart)
    top_articles = KBArticle.objects.filter(status='published').order_by('-views')[:5]
    top_articles_data = [
        {'id': a.id, 'title': a.title[:30] + ('...' if len(a.title) > 30 else ''), 'views': a.views}
        for a in top_articles
    ]

    # Recent/featured articles
    featured_articles = KBArticle.objects.filter(status='published').order_by('-views', '-created_at')[:6]
    featured_data = []
    for article in featured_articles:
        featured_data.append({
            'id': article.id,
            'title': article.title,
            'summary': article.summary[:120] + '...' if article.summary and len(article.summary) > 120 else article.summary,
            'category': article.category.name if article.category else 'Uncategorized',
            'views': article.views,
            'author': article.created_by.get_full_name() if article.created_by else 'Unknown',
            'updated_at': article.updated_at.strftime('%b %d, %Y') if article.updated_at else None,
        })

    return {
        'categories': categories_data,
        'articles': articles_data,
        'currentView': view,
        'sidebar': sidebar,
        'pendingCount': pending_count,
        'stats': {
            'totalArticles': total_articles,
            'publishedArticles': published_articles,
            'totalViews': total_views,
            'totalCategories': total_categories,
        },
        'topArticles': top_articles_data,
        'featuredArticles': featured_data,
    }


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
        'rejected': 'Rejected Articles',
        'my_articles': 'My Articles',
    }

    # Base queryset
    articles_qs = KBArticle.objects.all().select_related('category', 'created_by')

    # Apply view filter
    if view == 'published':
        articles_qs = articles_qs.filter(status='published')
    elif view == 'pending':
        articles_qs = articles_qs.filter(status='pending')
    elif view == 'draft':
        articles_qs = articles_qs.filter(status='draft')
    elif view == 'rejected':
        articles_qs = articles_qs.filter(status='rejected')
    elif view == 'my_articles':
        articles_qs = articles_qs.filter(created_by=request.user)

    articles_qs = articles_qs.order_by('-created_at')

    articles_data = []
    for article in articles_qs:
        articles_data.append({
            'id': article.id,
            'title': article.title,
            'summary': article.summary,
            'category': article.category.name if article.category else 'Uncategorized',
            'views': article.views,
            'status': article.status,
            'featured': article.featured,
            'author': article.created_by.get_full_name() if article.created_by else 'Unknown',
            'updated_at': article.updated_at.strftime('%b %d, %Y') if article.updated_at else None,
            'created_at': article.created_at.isoformat(),
        })

    sidebar, pending_count = get_kb_sidebar(request, view)

    return {
        'articles': articles_data,
        'currentView': view,
        'viewTitle': view_titles.get(view, 'All Articles'),
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
            'title': article.title,
            'summary': article.summary,
            'category': article.category.name if article.category else 'Uncategorized',
            'category_id': article.category.id if article.category else None,
            'author': article.created_by.get_full_name() if article.created_by and hasattr(article.created_by, 'get_full_name') else (article.created_by.username if article.created_by else 'Unknown'),
            'created_at': article.created_at.isoformat(),
            'views': article.views,
            'status': article.status,
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

