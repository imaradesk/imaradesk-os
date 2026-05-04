from django.urls import path
from . import views

urlpatterns = [
    path('tasks/', views.tasks, name='tasks'),
    path('tasks/new/', views.add_task, name='add_task'),
    path('tasks/bulk/mark-draft/', views.bulk_mark_draft, name='bulk_mark_draft_tasks'),
    path('tasks/bulk/remove-draft/', views.bulk_remove_draft, name='bulk_remove_draft_tasks'),
    path('api/tasks/form-data/', views.task_form_data, name='task_form_data'),
    path('api/tasks/<uuid:uuid>/', views.task_api, name='task_api'),
    path('tasks/<uuid:uuid>/', views.task_view, name='task_view'),
    path('tasks/<uuid:uuid>/comment/', views.task_add_comment, name='task_add_comment'),
    path('tasks/<uuid:uuid>/attachment/', views.task_upload_attachment, name='task_upload_attachment'),
    path('tasks/<uuid:uuid>/update/', views.task_update_fields, name='task_update_fields'),
    path('tickets/<uuid:ticket_uuid>/convert-to-task/', views.convert_ticket_to_task, name='convert_ticket_to_task'),
    path('tickets/<uuid:ticket_uuid>/create-task/', views.create_task_from_ticket, name='create_task_from_ticket'),
    
    # Board Column APIs
    path('api/tasks/board-columns/', views.board_columns, name='board_columns'),
    path('api/tasks/board-columns/reorder/', views.board_column_reorder, name='board_column_reorder'),
    path('api/tasks/board-columns/<str:column_id>/', views.board_column_update, name='board_column_update'),
]

