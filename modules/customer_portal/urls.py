from django.urls import path
from . import views

urlpatterns = [
    # Customer Portal (Public/Guest)
    path('portal/', views.portal_home, name='customer_portal_home'),
    path('portal/create-ticket/', views.portal_create_ticket, name='portal_create_ticket'),
    path('portal/submit-ticket/', views.portal_submit_ticket, name='portal_submit_ticket'),
    path('portal/track-ticket/', views.portal_track_ticket, name='portal_track_ticket'),
    path('portal/add-comment/', views.portal_add_comment, name='portal_add_comment'),
    path('portal/kb/', views.portal_kb_list, name='portal_kb_list'),
    path('portal/kb/<int:article_id>/', views.portal_kb_article, name='portal_kb_article'),
    path('portal/kb-search/', views.portal_kb_search, name='portal_kb_search'),
    path('portal/surveys/', views.portal_surveys, name='portal_surveys'),
    path('portal/surveys/submit/', views.portal_surveys_submit, name='portal_surveys_submit'),
    path('portal/login/', views.portal_login, name='customer_portal_login'),
    
    # Customers Management (Admin side)
    path('customers/', views.customers_list, name='customers_list'),
    path('customers/add/', views.customer_add, name='customer_add'),
    path('customers/<int:customer_id>/', views.customer_view, name='customer_view'),
    path('customers/<int:customer_id>/edit/', views.customer_edit, name='customer_edit'),
    path('customers/<int:customer_id>/delete/', views.customer_delete, name='customer_delete'),
    
    # Customer Contacts
    path('customers/<int:customer_id>/contacts/add/', views.customer_contact_add, name='customer_contact_add'),
    path('contacts/<int:contact_id>/edit/', views.customer_contact_edit, name='customer_contact_edit'),
    path('contacts/<int:contact_id>/delete/', views.customer_contact_delete, name='customer_contact_delete'),
    
    # Customer Tickets (Admin side)
    path('customer-tickets/', views.customer_tickets_list, name='customer_tickets_list'),
    path('customer-tickets/<int:ticket_id>/', views.customer_ticket_view, name='customer_ticket_view'),
    path('customer-tickets/<int:ticket_id>/update/', views.customer_ticket_update, name='customer_ticket_update'),
    
    # Customer Assets
    path('customers/<int:customer_id>/assets/add/', views.customer_asset_add, name='customer_asset_add'),
    path('assets/<int:asset_id>/edit/', views.customer_asset_edit, name='customer_asset_edit'),
    path('assets/<int:asset_id>/delete/', views.customer_asset_delete, name='customer_asset_delete'),
    
    # Customer Portal Settings
    path('settings/customer-portal/', views.customer_portal_settings, name='customer_portal_settings'),
    path('settings/customer-portal/update/', views.customer_portal_settings_update, name='customer_portal_settings_update'),
]
