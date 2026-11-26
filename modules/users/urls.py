from django.urls import path
from . import views

urlpatterns = [
    path('people/', views.user_list, name='user_list'),
    path('people/groups/', views.group_list, name='group_list'),
    path('people/permissions/', views.permission_list, name='permission_list'),
    path('people/add/', views.user_create, name='user_create'),
    path('people/<int:id>/edit/', views.user_edit, name='user_edit'),
    path('people/<int:id>/delete/', views.user_delete, name='user_delete'),
    path('people/<int:id>/permissions/', views.user_assign_permissions, name='user_assign_permissions'),
    path('groups/new/', views.group_create, name='group_create'),
    path('groups/<int:id>/edit/', views.group_edit, name='group_edit'),
    path('groups/<int:id>/delete/', views.group_delete, name='group_delete'),
    # Profile
    path('profile/', views.profile, name='profile'),
    path('profile/update/', views.profile_update, name='profile_update'),
    path('profile/change-password/', views.profile_change_password, name='profile_change_password'),
    path('profile/update-avatar/', views.profile_update_avatar, name='profile_update_avatar'),
    path('profile/remove-avatar/', views.profile_remove_avatar, name='profile_remove_avatar'),
]
