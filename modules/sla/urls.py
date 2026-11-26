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
    
    # Holiday endpoints
    path('api/holidays/create/', views.create_holiday, name='create_holiday'),
    path('api/holidays/<int:holiday_id>/update/', views.update_holiday, name='update_holiday'),
    path('api/holidays/<int:holiday_id>/delete/', views.delete_holiday, name='delete_holiday'),
    
    # Business Hours endpoints
    path('api/business-hours/save/', views.save_business_hours, name='save_business_hours'),
    
    # SLA Hold/Resume endpoints
    path('api/tickets/<uuid:ticket_uuid>/sla/hold/', views.hold_sla, name='hold_sla'),
    path('api/tickets/<uuid:ticket_uuid>/sla/resume/', views.resume_sla, name='resume_sla'),
]
