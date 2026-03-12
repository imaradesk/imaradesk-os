from django.contrib import admin
from django.contrib import messages
from .models import KBCategory, KBArticle


def approve_articles(modeladmin, request, queryset):
    """Admin action to approve pending articles"""
    from modules.settings.models import KnowledgeBaseSettings
    from .views import send_author_notification
    
    kb_settings = KnowledgeBaseSettings.get_settings()
    
    count = 0
    for article in queryset.filter(status='pending'):
        if kb_settings.auto_publish_on_approval:
            article.status = 'published'
        else:
            article.status = 'approved'  # You may want to add this status
        article.save()
        
        if kb_settings.notify_author_on_approval:
            send_author_notification(article, approved=True)
        
        count += 1
    
    messages.success(request, f'{count} article(s) approved successfully.')

approve_articles.short_description = "Approve selected articles"


def reject_articles(modeladmin, request, queryset):
    """Admin action to reject pending articles"""
    from modules.settings.models import KnowledgeBaseSettings
    from .views import send_author_notification
    
    kb_settings = KnowledgeBaseSettings.get_settings()
    
    count = 0
    for article in queryset.filter(status='pending'):
        article.status = 'draft'
        article.save()
        
        if kb_settings.notify_author_on_rejection:
            send_author_notification(article, approved=False)
        
        count += 1
    
    messages.success(request, f'{count} article(s) rejected.')

reject_articles.short_description = "Reject selected articles"


@admin.register(KBCategory)
class KBCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'icon', 'created_by', 'created_at')
    search_fields = ('name', 'description')
    list_filter = ('created_at',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(KBArticle)
class KBArticleAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'status', 'featured', 'views', 'created_by', 'created_at')
    search_fields = ('title', 'summary', 'content', 'tags')
    list_filter = ('status', 'featured', 'category', 'created_at')
    readonly_fields = ('slug', 'views', 'created_at', 'updated_at')
    prepopulated_fields = {'slug': ('title',)}
    actions = [approve_articles, reject_articles]
