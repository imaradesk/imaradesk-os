from django.urls import path
from . import views
from . import kb_views

urlpatterns = [
    path('', views.login_view, name='login'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('onboarding/', views.onboarding, name='onboarding'),
    path('2fa-verify/', views.two_factor_verify, name='two_factor_verify'),
    path('2fa-verify/send-code/', views.send_login_2fa_code, name='send_login_2fa_code'),
    path('2fa-verify/verify/', views.verify_login_2fa, name='verify_login_2fa'),
    path('dashboard/', views.index, name='index'),
    path('reports/', views.reports, name='reports'),
    path('reports/export/', views.export_reports, name='export_reports'),

    # Knowledge Base
    path('knowledgebase/', kb_views.knowledgebase, name='knowledgebase'),
    path('knowledgebase/articles/', kb_views.kb_articles_list, name='kb_articles_list'),
    path('knowledgebase/approvals/', kb_views.kb_approvals, name='kb_approvals'),
    path('knowledgebase/article/<int:article_id>/approve/', kb_views.kb_article_approve, name='kb_article_approve'),
    path('knowledgebase/article/<int:article_id>/reject/', kb_views.kb_article_reject, name='kb_article_reject'),
]

