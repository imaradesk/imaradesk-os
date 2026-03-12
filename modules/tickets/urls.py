from django.urls import path
from . import views

urlpatterns = [
    path('tickets/', views.tickets, name='tickets'),
    path('tickets/new/', views.add_ticket, name='add_ticket'),
    path('tickets/bulk/mark-draft/', views.bulk_mark_draft, name='bulk_mark_draft'),
    path('tickets/<int:id>/', views.ticket_view, name='ticket_view'),
    path('tickets/<int:id>/comment/', views.ticket_add_comment, name='ticket_add_comment'),
    path('tickets/<int:id>/attachment/', views.ticket_upload_attachment, name='ticket_upload_attachment'),
    path('tickets/<int:id>/status/', views.ticket_update_status, name='ticket_update_status'),
    path('tickets/<int:id>/update/', views.ticket_update_fields, name='ticket_update_fields'),
    path('tickets/<int:id>/merge/', views.ticket_merge, name='ticket_merge'),
    path('tickets/search/', views.ticket_search_for_merge, name='ticket_search_for_merge'),
    path('tickets/<int:ticket_id>/work-items/', views.get_ticket_work_items, name='get_ticket_work_items'),
    path('tickets/<int:ticket_id>/work-items/create/', views.create_work_item, name='create_work_item'),
    path('tickets/<int:ticket_id>/work-items/<int:work_item_id>/update/', views.update_work_item, name='update_work_item'),
    path('tickets/mentions/search/', views.search_mentionable_users, name='search_mentionable_users'),
    path('upload/', views.upload_file, name='upload_file'),
]

