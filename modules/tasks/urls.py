from django.urls import path
from . import views, project_views

urlpatterns = [
    path('tasks/', views.tasks, name='tasks'),
    path('tasks/overview/', project_views.tasks_overview, name='tasks_overview'),

    # Projects
    path('tasks/projects/', project_views.projects, name='projects'),
    path('tasks/projects/new/', project_views.project_create, name='project_create'),
    path('tasks/projects/<uuid:uuid>/', project_views.project_view, name='project_view'),
    path('tasks/projects/<uuid:uuid>/tasks/', project_views.project_view, {'tab': 'tasks'}, name='project_tasks'),
    # The settings tab was removed; old links land on the overview (edit/archive live in the header menu)
    path('tasks/projects/<uuid:uuid>/settings/', project_views.project_view, {'tab': 'settings'}, name='project_settings'),
    path('tasks/projects/<uuid:uuid>/update/', project_views.project_update, name='project_update'),
    path('tasks/projects/<uuid:uuid>/archive/', project_views.project_archive, name='project_archive'),
    path('tasks/projects/<uuid:uuid>/unarchive/', project_views.project_unarchive, name='project_unarchive'),
    path('tasks/projects/<uuid:uuid>/add-tasks/', project_views.project_add_tasks, name='project_add_tasks'),
    path('api/tasks/projects/', project_views.project_options, name='project_options'),
    path('api/tasks/projects/<uuid:uuid>/candidates/', project_views.project_task_candidates, name='project_task_candidates'),

    path('tasks/new/', views.add_task, name='add_task'),
    path('tasks/bulk/mark-draft/', views.bulk_mark_draft, name='bulk_mark_draft_tasks'),
    path('tasks/bulk/remove-draft/', views.bulk_remove_draft, name='bulk_remove_draft_tasks'),
    path('api/tasks/types/', views.task_types, name='task_types'),
    path('api/tasks/form-data/', views.task_form_data, name='task_form_data'),
    path('api/tasks/<uuid:uuid>/', views.task_api, name='task_api'),
    path('tasks/<uuid:uuid>/', views.task_view, name='task_view'),
    path('tasks/<uuid:uuid>/comment/', views.task_add_comment, name='task_add_comment'),
    path('tasks/<uuid:uuid>/comment/<int:comment_id>/', views.task_comment_detail, name='task_comment_detail'),
    path('tasks/<uuid:uuid>/attachment/', views.task_upload_attachment, name='task_upload_attachment'),
    path('tasks/<uuid:uuid>/update/', views.task_update_fields, name='task_update_fields'),
    path('tasks/<uuid:uuid>/convert-to-ticket/', views.task_convert_to_ticket, name='task_convert_to_ticket'),
    path('tasks/<uuid:uuid>/convert-to-work-item/', views.task_convert_to_work_item, name='task_convert_to_work_item'),
    path('tickets/<uuid:ticket_uuid>/convert-to-task/', views.convert_ticket_to_task, name='convert_ticket_to_task'),
    path('tickets/<uuid:ticket_uuid>/create-task/', views.create_task_from_ticket, name='create_task_from_ticket'),
    
    # Board Column APIs
    path('api/tasks/board-columns/', views.board_columns, name='board_columns'),
    path('api/tasks/board-columns/reorder/', views.board_column_reorder, name='board_column_reorder'),
    path('api/tasks/board-columns/<str:column_id>/', views.board_column_update, name='board_column_update'),
]

