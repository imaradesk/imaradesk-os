from django.urls import path
from . import views

urlpatterns = [
    # Settings
    path('knowledgebase/settings/', views.kb_settings, name='kb_settings'),
    path('knowledgebase/settings/update/', views.kb_settings_update, name='kb_settings_update'),
    
    # Category management
    path('knowledgebase/category/new/', views.kb_category_add, name='kb_category_add'),
    path('knowledgebase/category/add/', views.kb_category_add_post, name='kb_category_add_post'),
    path('knowledgebase/category/<int:category_id>/edit/', views.kb_category_edit, name='kb_category_edit'),
    path('knowledgebase/category/<int:category_id>/update/', views.kb_category_edit_post, name='kb_category_edit_post'),
    path('knowledgebase/category/<int:category_id>/delete/', views.kb_category_delete, name='kb_category_delete'),

    # Article management
    path('knowledgebase/article/new/', views.kb_article_add, name='kb_article_add'),
    path('knowledgebase/article/add/', views.kb_article_add_post, name='kb_article_add_post'),
    path('knowledgebase/article/<int:article_id>/', views.kb_article_view, name='kb_article_view'),
    path('knowledgebase/article/<int:article_id>/edit/', views.kb_article_edit, name='kb_article_edit'),
    path('knowledgebase/article/<int:article_id>/update/', views.kb_article_edit_post, name='kb_article_edit_post'),
]

