from functools import wraps
from django.shortcuts import redirect
from django.http import JsonResponse
from inertia import render as inertia_render
import logging

logger = logging.getLogger(__name__)


def _is_api_request(request):
    """Check if the request expects a JSON response (not Inertia)."""
    # Inertia requests should NOT be treated as API requests
    # They have X-Inertia header and need Inertia responses
    if request.headers.get('X-Inertia'):
        return False
    
    accept = request.META.get('HTTP_ACCEPT', '')
    content_type = request.content_type if hasattr(request, 'content_type') else ''
    # API requests typically accept JSON or have JSON content type
    return (
        'application/json' in accept or 
        'application/json' in content_type or
        request.headers.get('X-Requested-With') == 'XMLHttpRequest'
    )


def require_app(app_slug):
    """
    Decorator to check if an app is installed.
    Shows the "App Not Installed" page if it is not.
    
    For API requests, returns JSON response instead of Inertia page.
    
    Usage:
        @require_app('asset-management')
        @login_required
        def my_view(request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            # Import here to avoid circular imports
            from modules.settings.models import InstalledApp, App
            
            # Check if app is installed and active
            try:
                installed_app = InstalledApp.objects.select_related('app').get(
                    app__slug=app_slug,
                    is_active=True
                )
            except InstalledApp.DoesNotExist:
                installed_app = None
            except Exception as e:
                logger.error(f"Error checking app installation for {app_slug}: {e}")
                installed_app = None
            
            if not installed_app:
                # Get app info for display
                try:
                    app = App.objects.get(slug=app_slug)
                    app_info = {
                        'name': app.name,
                        'slug': app.slug,
                        'description': app.description,
                        'icon': app.icon,
                        'version': app.version,
                    }
                except App.DoesNotExist:
                    app_info = {
                        'name': app_slug.replace('-', ' ').title(),
                        'slug': app_slug,
                        'description': 'This app is not available.',
                        'icon': '📦',
                        'version': '1.0.0',
                    }
                
                # Return JSON for API requests
                if _is_api_request(request):
                    return JsonResponse({
                        'success': False,
                        'error': 'app_not_installed',
                        'message': f'The {app_info["name"]} app is not installed. Please install it from the marketplace.',
                        'app': app_info,
                    }, status=403)
                
                return inertia_render(request, 'AppNotInstalled', {
                    'app': app_info,
                    'return_url': request.META.get('HTTP_REFERER', '/'),
                })
            
            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator


def require_any_app(*app_slugs):
    """
    Decorator to check if ANY of the specified apps is installed.
    Useful for views that can work with multiple apps.
    For API requests, returns JSON response instead of Inertia page.
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            # Import here to avoid circular imports
            from modules.settings.models import InstalledApp, App
            
            # Check for any active installation
            try:
                installed_app = InstalledApp.objects.filter(
                    app__slug__in=app_slugs,
                    is_active=True
                ).first()
            except Exception as e:
                logger.error(f"Error checking app installation for {app_slugs}: {e}")
                installed_app = None
            
            if not installed_app:
                app_info = {
                    'name': 'Required App',
                    'slug': app_slugs[0] if app_slugs else '',
                    'description': 'One of the required apps must be installed.',
                    'icon': '📦',
                }
                
                # Return JSON for API requests
                if _is_api_request(request):
                    return JsonResponse({
                        'success': False,
                        'error': 'app_not_installed',
                        'message': 'One of the required apps must be installed.',
                        'app': app_info,
                    }, status=403)
                
                return inertia_render(request, 'AppNotInstalled', {
                    'app': app_info,
                    'return_url': request.META.get('HTTP_REFERER', '/'),
                })
            
            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator


def is_admin_user(user):
    """Superusers and users with the Administrator role. Everyone else (agents) is kept out of Administration."""
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    profile = getattr(user, 'profile', None)
    return bool(profile and profile.role and profile.role.name == 'Administrator')


def admin_required(view_func):
    """
    Decorator that restricts access to admin users only.
    Users must be either:
    - A superuser (is_superuser=True)
    - Have an 'Admin' role in their userprofile
    
    For API requests, returns JSON 403 response.
    For page requests, renders PermissionDenied Inertia page.
    
    Usage:
        @admin_required
        @login_required
        def my_admin_view(request):
            ...
    """
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        user = request.user
        
        # Check if user is authenticated
        if not user.is_authenticated:
            if _is_api_request(request):
                return JsonResponse({
                    'success': False,
                    'error': 'authentication_required',
                    'message': 'You must be logged in to access this resource.',
                }, status=401)
            return redirect('login')
        
        if not is_admin_user(user):
            if _is_api_request(request):
                return JsonResponse({
                    'success': False,
                    'error': 'permission_denied',
                    'message': 'You do not have permission to access this resource. Admin access required.',
                }, status=403)
            
            return inertia_render(request, 'PermissionDenied', {
                'message': 'You do not have permission to access this page.',
                'description': 'This page is restricted to administrators only.',
                'return_url': request.META.get('HTTP_REFERER', '/'),
            })
        
        return view_func(request, *args, **kwargs)
    return _wrapped_view
