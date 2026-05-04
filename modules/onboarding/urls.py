from django.urls import path
from . import views

urlpatterns = [
    path('quick-start/', views.quick_start, name='quick_start'),
    path('api/onboarding/status/', views.get_status, name='onboarding_status'),
    path('api/onboarding/modules/', views.get_modules, name='onboarding_modules'),
    path('api/onboarding/modules/save/', views.save_modules, name='onboarding_save_modules'),
    path('api/onboarding/channels/', views.get_channels, name='onboarding_channels'),
    path('api/onboarding/channels/save/', views.save_channels, name='onboarding_save_channels'),
    path('api/onboarding/groups/', views.get_groups, name='onboarding_groups'),
    path('api/onboarding/users-groups/save/', views.save_users_groups, name='onboarding_save_users_groups'),
    path('api/onboarding/sla/save/', views.save_sla, name='onboarding_save_sla'),
    path('api/onboarding/emails-smtp/save/', views.save_emails_smtp, name='onboarding_save_emails_smtp'),
    path('api/onboarding/notifications/save/', views.save_notifications, name='onboarding_save_notifications'),
    path('api/onboarding/skip/', views.skip_step, name='onboarding_skip_step'),
    path('api/onboarding/complete/', views.complete, name='onboarding_complete'),
]
