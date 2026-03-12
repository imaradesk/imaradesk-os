"""
Main URL Configuration - Single Tenant Application

All application URLs are served from this single configuration.
"""
from django.contrib import admin
from django.urls import path, re_path, include
from django.conf import settings
from django.conf.urls.static import static

from django.http import JsonResponse

def health(request):
    return JsonResponse({"status": "ok"})

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # ========================
    # SYSTEM ROUTES
    # ========================
    path('health/', health, name='health'),
    
    # ========================
    # APPLICATION ROUTES
    # ========================
    # Core module - dashboard, login, reports
    path('', include('modules.core.urls')),
    # Tickets module
    path('', include('modules.tickets.urls')),
    # People module - users, organizations
    path('', include('modules.people.urls')),
    # Users module URLs
    path('', include('modules.users.urls')),
    # Settings module URLs
    path('', include('modules.settings.urls')),
    # KB module URLs
    path('', include('modules.kb.urls')),
    # SLA module URLs
    path('sla/', include('modules.sla.urls')),
    # Customer portal
    path('', include('modules.customer_portal.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Custom error handlers
handler404 = 'modules.core.views.page_not_found'
handler500 = 'modules.core.views.server_error'
