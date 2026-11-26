from django.urls import path
from django.views.generic import RedirectView
from . import views

urlpatterns = [
    path('administration/', views.settings_home, name='settings_home'),
    path('administration/general/', views.general_settings, name='general_settings'),
    path('administration/update-business/', views.update_business_info, name='update_business_info'),
    path('administration/update-business-logo/', views.update_business_logo, name='update_business_logo'),
    path('administration/remove-business-logo/', views.remove_business_logo, name='remove_business_logo'),
    path('administration/notifications/', views.notifications_settings, name='notifications_settings'),
    path('administration/notifications/update/', views.notifications_settings_update, name='notifications_settings_update'),
    path('administration/security/', views.security_settings, name='security_settings'),
    path('administration/security/update/', views.security_settings_update, name='security_settings_update'),
    
    # 2FA Endpoints
    path('administration/security/2fa/email/send/', views.send_email_2fa_code, name='send_email_2fa_code'),
    path('administration/security/2fa/email/verify/', views.verify_email_2fa_code, name='verify_email_2fa_code'),
    path('administration/security/2fa/authenticator/setup/', views.setup_authenticator_2fa, name='setup_authenticator_2fa'),
    path('administration/security/2fa/authenticator/verify/', views.verify_authenticator_2fa, name='verify_authenticator_2fa'),
    path('administration/security/2fa/disable/send/', views.send_disable_2fa_code, name='send_disable_2fa_code'),
    path('administration/security/2fa/email/disable/', views.disable_email_2fa, name='disable_email_2fa'),
    path('administration/security/2fa/authenticator/disable/', views.disable_authenticator_2fa, name='disable_authenticator_2fa'),
    
    # Team section
    path('administration/team/users/', views.team_users, name='team_users'),
    path('administration/team/users/add/', views.team_user_add, name='team_user_add'),
    path('administration/team/users/<int:user_id>/update/', views.team_user_update, name='team_user_update'),
    path('administration/team/users/<int:user_id>/view/', views.team_user_view, name='team_user_view'),
    path('administration/team/users/<int:user_id>/delete/', views.team_user_delete, name='team_user_delete'),
    path('administration/team/users/invite/', views.team_user_invite, name='team_user_invite'),
    path('administration/team/invites/<int:invite_id>/resend/', views.team_invite_resend, name='team_invite_resend'),
    path('administration/team/invites/<int:invite_id>/revoke/', views.team_invite_revoke, name='team_invite_revoke'),
    path('administration/team/groups/', views.team_groups, name='team_groups'),
    path('administration/team/groups/add/', views.team_group_add, name='team_group_add'),
    path('administration/team/groups/<int:group_id>/edit/', views.team_group_edit, name='team_group_edit'),
    path('administration/team/groups/<int:group_id>/view/', views.team_group_view, name='team_group_view'),
    path('administration/team/groups/<int:group_id>/delete/', views.team_group_delete, name='team_group_delete'),
    path('administration/team/groups/<int:group_id>/available-agents/', views.team_group_available_agents, name='team_group_available_agents'),
    path('administration/team/groups/<int:group_id>/add-members/', views.team_group_add_members, name='team_group_add_members'),
    # Emails section
    path('administration/emails/templates/', views.emails_templates, name='emails_templates'),
    path('administration/emails/settings/update/', views.email_settings_update, name='email_settings_update'),
    path('administration/emails/templates/<int:template_id>/edit/', views.edit_email_template, name='edit_email_template'),
    path('administration/emails/templates/<int:template_id>/update/', views.update_email_template, name='update_email_template'),
    path('administration/emails/templates/<int:template_id>/test/', views.test_email_template, name='test_email_template'),
    path('administration/emails/smtp/', views.emails_smtp, name='emails_smtp'),
    path('administration/emails/smtp/test/', views.test_smtp, name='test_smtp'),
    path('administration/emails/smtp/save/', views.save_smtp, name='save_smtp'),
    # Marketplace
    path('administration/marketplace/', views.marketplace, name='marketplace'),
    path('administration/marketplace/app/<str:slug>/', views.marketplace_app_detail, name='marketplace_app_detail'),
    path('administration/marketplace/installed/', RedirectView.as_view(pattern_name='marketplace'), name='installed_apps'),
    path('administration/marketplace/install/<int:app_id>/', views.install_app, name='install_app'),
    path('administration/marketplace/uninstall/<int:app_id>/', views.uninstall_app, name='uninstall_app'),
    # Channels
    path('administration/channels/', views.channels_settings, name='channels_settings'),
    path('api/channels/status/', views.channels_status, name='channels_status'),
    path('api/channels/<int:channel_id>/toggle/', views.channel_toggle, name='channel_toggle'),
    path('api/channels/<int:channel_id>/config/', views.channel_config, name='channel_config'),
    path('api/channels/<int:channel_id>/regenerate-key/', views.channel_regenerate_key, name='channel_regenerate_key'),
    
    # Views Management
    path('administration/views/', views.settings_views, name='settings_views'),
    path('administration/views/<int:view_id>/toggle/', views.toggle_view, name='toggle_view'),
    path('administration/views/<int:view_id>/set-default/', views.set_default_view, name='set_default_view'),
    path('administration/views/reorder/', views.reorder_views, name='reorder_views'),
    # SLA section (combined page)
    path('administration/sla/', views.sla_settings, name='sla_settings'),
    path('administration/sla/policies/add/', views.sla_policy_add, name='sla_policy_add'),
    path('administration/sla/policies/<int:policy_id>/edit/', views.sla_policy_edit, name='sla_policy_edit'),
    
    # User Profile Stats, Audit Logs, and Devices
    path('api/administration/user/stats/', views.api_user_stats, name='api_user_stats'),
    path('api/administration/user/audit-logs/', views.api_user_audit_logs, name='api_user_audit_logs'),
    path('api/administration/user/devices/', views.api_user_devices, name='api_user_devices'),
    path('api/administration/user/devices/<int:device_id>/revoke/', views.api_revoke_device, name='api_revoke_device'),

    # Email Integration (IMAP)
    path('administration/integrations/email/imap/', views.email_imap_setup, name='email_imap_setup'),
    path('api/integrations/custom-imap/connect/', views.custom_imap_connect, name='custom_imap_connect'),
    path('api/integrations/custom-imap/configure/', views.custom_imap_configure, name='custom_imap_configure'),
    path('api/integrations/custom-imap/disconnect/', views.custom_imap_disconnect, name='custom_imap_disconnect'),
    path('api/integrations/custom-imap/test/', views.custom_imap_test, name='custom_imap_test'),
    path('api/integrations/custom-imap/mailboxes/', views.custom_imap_list_mailboxes, name='custom_imap_list_mailboxes'),
]
