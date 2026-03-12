from django.db import models
from django.contrib.auth import get_user_model
from django.utils.text import slugify

User = get_user_model()


class KBCategory(models.Model):
    """Knowledge Base Category"""
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=10, default='📁')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='kb_categories')
    
    class Meta:
        verbose_name = 'KB Category'
        verbose_name_plural = 'KB Categories'
        ordering = ['name']
    
    def __str__(self):
        return self.name


class KBArticle(models.Model):
    """Knowledge Base Article"""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending', 'Pending Review'),
        ('published', 'Published'),
    ]
    
    title = models.CharField(max_length=300)
    slug = models.SlugField(max_length=350, unique=True, blank=True)
    summary = models.TextField(blank=True, help_text='Brief summary for search results')
    content = models.TextField()
    category = models.ForeignKey(KBCategory, on_delete=models.SET_NULL, null=True, related_name='articles')
    tags = models.CharField(max_length=500, blank=True, help_text='Comma-separated tags')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    featured = models.BooleanField(default=False)
    allow_comments = models.BooleanField(default=True)
    views = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='kb_articles_created')
    # author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='kb_articles_authored')
    
    class Meta:
        verbose_name = 'KB Article'
        verbose_name_plural = 'KB Articles'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
            # Ensure uniqueness
            original_slug = self.slug
            counter = 1
            while KBArticle.objects.filter(slug=self.slug).exists():
                self.slug = f"{original_slug}-{counter}"
                counter += 1
        super().save(*args, **kwargs)
