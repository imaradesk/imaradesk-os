from django.urls import path
from . import views

urlpatterns = [
    path('tickets/', views.tickets, name='tickets'),
    path('tickets/new/', views.add_ticket, name='add_ticket'),
    path('tickets/bulk/mark-draft/', views.bulk_mark_draft, name='bulk_mark_draft'),
    path('tickets/bulk/remove-draft/', views.bulk_remove_draft, name='bulk_remove_draft'),
    path('tickets/bulk/assign-agent/', views.bulk_assign_agent, name='bulk_assign_agent'),
    path('tickets/bulk/assign-team/', views.bulk_assign_team, name='bulk_assign_team'),
    path('tickets/bulk/change-status/', views.bulk_change_status, name='bulk_change_status'),
    path('tickets/bulk/change-priority/', views.bulk_change_priority, name='bulk_change_priority'),
    path('tickets/bulk/change-type/', views.bulk_change_type, name='bulk_change_type'),
    path('tickets/bulk/delete/', views.bulk_delete_tickets, name='bulk_delete_tickets'),
    path('tickets/<uuid:uuid>/duplicate/', views.duplicate_ticket, name='duplicate_ticket'),
    path('tickets/agents/', views.get_agents, name='get_agents'),
    path('tickets/teams/', views.get_teams, name='get_teams'),
    path('tickets/<uuid:uuid>/', views.ticket_view, name='ticket_view'),
    path('tickets/<uuid:uuid>/detail-api/', views.ticket_detail_api, name='ticket_detail_api'),
    path('tickets/<uuid:uuid>/comment/', views.ticket_add_comment, name='ticket_add_comment'),
    path('tickets/<uuid:uuid>/attachment/', views.ticket_upload_attachment, name='ticket_upload_attachment'),
    path('tickets/<uuid:uuid>/status/', views.ticket_update_status, name='ticket_update_status'),
    path('tickets/<uuid:uuid>/update/', views.ticket_update_fields, name='ticket_update_fields'),
    path('tickets/<uuid:uuid>/merge/', views.ticket_merge, name='ticket_merge'),
    path('tickets/search/', views.ticket_search_for_merge, name='ticket_search_for_merge'),
    path('tickets/<uuid:uuid>/work-items/', views.get_ticket_work_items, name='get_ticket_work_items'),
    path('tickets/<uuid:uuid>/work-items/create/', views.create_work_item, name='create_work_item'),
    path('tickets/<uuid:uuid>/work-items/<int:work_item_id>/update/', views.update_work_item, name='update_work_item'),
    path('tickets/mentions/search/', views.search_mentionable_users, name='search_mentionable_users'),
    path('upload/', views.upload_file, name='upload_file'),
]

