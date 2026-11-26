from django.urls import path
from . import views

urlpatterns = [
    # Customer Portal (Public/Guest)
    path('portal/', views.portal_home, name='customer_portal_home'),
    path('portal/create-ticket/', views.portal_create_ticket, name='portal_create_ticket'),
    path('portal/submit-ticket/', views.portal_submit_ticket, name='portal_submit_ticket'),
    path('portal/track-ticket/', views.portal_track_ticket, name='portal_track_ticket'),
    path('portal/ticket/<str:ticket_number>/', views.portal_ticket_detail, name='portal_ticket_detail'),
    path('portal/ticket/<str:ticket_number>/add-comment/', views.portal_ticket_add_comment, name='portal_ticket_add_comment'),
    path('portal/add-comment/', views.portal_add_comment, name='portal_add_comment'),
    path('portal/system-status/', views.portal_system_status, name='portal_system_status'),
    path('portal/kb/', views.portal_kb_list, name='portal_kb_list'),
    path('portal/kb/<uuid:uuid>/', views.portal_kb_article, name='portal_kb_article'),
    path('portal/kb-search/', views.portal_kb_search, name='portal_kb_search'),
    path('portal/surveys/', views.portal_surveys, name='portal_surveys'),
    path('portal/surveys/submit/', views.portal_surveys_submit, name='portal_surveys_submit'),
    path('portal/login/', views.portal_login, name='customer_portal_login'),
    
    # File Upload API
    path('api/upload-file/', views.portal_upload_file, name='portal_upload_file'),
]
