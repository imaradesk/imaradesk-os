from django.urls import path
from . import views

urlpatterns = [
    path('people/', views.people, name='people'),
    path('people/add/', views.user_create, name='user_create'),
    path('people/<int:id>/edit/', views.user_edit, name='user_edit'),
    path('people/<int:id>/delete/', views.user_delete, name='user_delete'),
]

