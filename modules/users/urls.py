from django.urls import path
from . import views

urlpatterns = [
    path('people/', views.user_list, name='user_list'),
    path('people/roles/', views.role_list, name='role_list'),
    path('people/groups/', views.group_list, name='group_list'),
    path('people/permissions/', views.permission_list, name='permission_list'),
    path('people/add/', views.user_create, name='user_create'),
    path('people/<int:id>/edit/', views.user_edit, name='user_edit'),
    path('people/<int:id>/delete/', views.user_delete, name='user_delete'),
    path('people/<int:id>/permissions/', views.user_assign_permissions, name='user_assign_permissions'),
    path('roles/new/', views.role_create, name='role_create'),
    path('roles/<int:id>/edit/', views.role_edit, name='role_edit'),
    path('roles/<int:id>/delete/', views.role_delete, name='role_delete'),
    path('groups/new/', views.group_create, name='group_create'),
    path('groups/<int:id>/edit/', views.group_edit, name='group_edit'),
    path('groups/<int:id>/delete/', views.group_delete, name='group_delete'),
]
