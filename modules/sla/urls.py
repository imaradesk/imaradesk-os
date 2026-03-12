from django.urls import path
from . import views

app_name = 'sla'

urlpatterns = [
    # SLA Settings endpoints
    path('api/settings/', views.get_sla_settings, name='get_settings'),
    path('api/settings/update/', views.update_sla_settings, name='update_settings'),
    path('api/timezones/', views.get_timezones, name='get_timezones'),
    
    # SLA Policy endpoints
    path('api/policies/create/', views.create_sla_policy, name='create_policy'),
    path('api/policies/<int:policy_id>/update/', views.update_sla_policy, name='update_policy'),
    path('api/policies/<int:policy_id>/delete/', views.delete_sla_policy, name='delete_policy'),
    
    # SLA Hold/Resume endpoints
    path('api/tickets/<int:ticket_id>/sla/hold/', views.hold_sla, name='hold_sla'),
    path('api/tickets/<int:ticket_id>/sla/resume/', views.resume_sla, name='resume_sla'),
]
