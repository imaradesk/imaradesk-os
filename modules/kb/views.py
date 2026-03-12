from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.core.paginator import Paginator
from django.core.mail import send_mail
from django.conf import settings as django_settings
from django.contrib.auth import get_user_model
from inertia import inertia
from .models import KBCategory, KBArticle
from shared.decorators import require_app

User = get_user_model()


def send_approval_notification(article, request):
    """Send email notification to admins/approvers when article needs approval"""
    from modules.settings.models import KnowledgeBaseSettings
    
    kb_settings = KnowledgeBaseSettings.get_settings()
    
    # Only send if approval is required and notifications are enabled
    if not kb_settings.require_approval or not kb_settings.notify_approvers:
        return
    
    # Get all staff/admin users
    approvers = User.objects.filter(is_staff=True, is_active=True)
    recipient_emails = [user.email for user in approvers if user.email]
    
    if not recipient_emails:
        return
    
    subject = f'New KB Article Pending Approval: {article.title}'
    message = f"""
Hello,

A new knowledge base article has been submitted and requires your approval.

Title: {article.title}
Author: {article.created_by.get_full_name() if article.created_by else 'Unknown'}
Category: {article.category.name if article.category else 'Uncategorized'}

Please review and approve this article in the admin panel.

Thank you!
"""
    
    try:
        send_mail(
            subject,
            message,
            django_settings.DEFAULT_FROM_EMAIL,
            recipient_emails,
            fail_silently=True,
        )
    except Exception as e:
        print(f"Failed to send approval notification: {e}")


def send_author_notification(article, approved=True, reason=''):
    """Notify article author when article is approved or rejected"""
    from modules.settings.models import KnowledgeBaseSettings
    
    kb_settings = KnowledgeBaseSettings.get_settings()
    
    # Only send if approval workflow is enabled
    if not kb_settings.require_approval:
        return
    
    if approved and not kb_settings.notify_author_on_approval:
        return
    if not approved and not kb_settings.notify_author_on_rejection:
        return
    
    if not article.created_by or not article.created_by.email:
        return
    
    if approved:
        subject = f'Your KB Article Has Been Approved: {article.title}'
        message = f"""
Hello {article.created_by.get_full_name()},

Good news! Your knowledge base article has been approved and is now published.

Title: {article.title}
Category: {article.category.name if article.category else 'Uncategorized'}

Your article is now visible to users in the knowledge base.

Thank you for your contribution!
"""
    else:
        subject = f'Your KB Article Needs Revision: {article.title}'
        reason_text = f"\n\nReason:\n{reason}\n" if reason else ""
        message = f"""
Hello {article.created_by.get_full_name()},

Your knowledge base article requires some revisions before it can be published.

Title: {article.title}
Category: {article.category.name if article.category else 'Uncategorized'}{reason_text}

Please review the feedback and make necessary changes.

Thank you!
"""
    
    try:
        send_mail(
            subject,
            message,
            django_settings.DEFAULT_FROM_EMAIL,
            [article.created_by.email],
            fail_silently=True,
        )
    except Exception as e:
        print(f"Failed to send author notification: {e}")


def get_kb_sidebar(request):
    """Generate sidebar data for KB views."""
    all_count = KBArticle.objects.count()
    pending_count = KBArticle.objects.filter(status='pending').count()
    published_count = KBArticle.objects.filter(status='published').count()
    draft_count = KBArticle.objects.filter(status='draft').count()
    rejected_count = KBArticle.objects.filter(status='rejected').count()
    my_articles_count = KBArticle.objects.filter(created_by=request.user).count()

    return {
        'views': [
            {'id': 'all', 'label': 'All Articles', 'count': all_count, 'active': False},
            {'id': 'published', 'label': 'Published', 'count': published_count, 'active': False},
            {'id': 'pending', 'label': 'Pending Approval', 'count': pending_count, 'active': False},
            {'id': 'draft', 'label': 'Drafts', 'count': draft_count, 'active': False},
            {'id': 'rejected', 'label': 'Rejected', 'count': rejected_count, 'active': False},
            {'id': 'my_articles', 'label': 'Created by Me', 'count': my_articles_count, 'active': False},
        ]
    }, pending_count


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
        created_by=request.user
    )
    
    # Send notifications based on settings
    if status == 'pending' and kb_settings.notify_approvers:
        send_approval_notification(article, request)
    
    return redirect('knowledgebase')


@require_app('knowledge-base')
@login_required
@inertia('KBArticleForm')
def kb_article_edit(request, article_id):
    """Edit KB article"""
    from modules.settings.models import KnowledgeBaseSettings
    
    kb_settings = KnowledgeBaseSettings.get_settings()
    article = get_object_or_404(KBArticle, id=article_id)
    categories = KBCategory.objects.all()
    sidebar, pending_count = get_kb_sidebar(request)
    
    return {
        'mode': 'edit',
        'article': {
            'id': article.id,
            'title': article.title,
            'summary': article.summary,
            'content': article.content,
            'category': article.category.id if article.category else '',
            'tags': article.tags,
            'status': article.status,
            'featured': article.featured,
            'allow_comments': article.allow_comments,
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
def kb_article_edit_post(request, article_id):
    """Handle KB article update"""
    from modules.settings.models import KnowledgeBaseSettings
    
    kb_settings = KnowledgeBaseSettings.get_settings()
    article = get_object_or_404(KBArticle, id=article_id)
    
    old_status = article.status
    
    title = request.POST.get('title', '').strip()
    summary = request.POST.get('summary', '').strip()
    content = request.POST.get('content', '').strip()
    category_id = request.POST.get('category', '')
    tags = request.POST.get('tags', '').strip()
    status = request.POST.get('status', 'draft')
    featured = request.POST.get('featured') == 'true' or request.POST.get('featured') == True
    allow_comments = request.POST.get('allow_comments') == 'true' or request.POST.get('allow_comments') == True
    
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
    article.save()
    
    # Send notifications based on status changes
    if old_status != 'pending' and status == 'pending' and kb_settings.notify_approvers:
        send_approval_notification(article, request)
    
    if old_status == 'pending' and status == 'published' and kb_settings.notify_author_on_approval:
        send_author_notification(article, approved=True)
    
    if old_status == 'pending' and status == 'draft' and kb_settings.notify_author_on_rejection:
        send_author_notification(article, approved=False)
    
    return redirect('knowledgebase')


@require_app('knowledge-base')
@login_required
@inertia('KBArticleView')
def kb_article_view(request, article_id):
    """View KB article"""
    article = get_object_or_404(KBArticle, id=article_id)
    
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
                'title': rel_article.title,
                'summary': rel_article.summary,
                'views': rel_article.views,
                'created_at': rel_article.created_at.isoformat(),
            })
    
    return {
        'article': {
            'id': article.id,
            'title': article.title,
            'summary': article.summary,
            'content': article.content,
            'slug': article.slug,
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
