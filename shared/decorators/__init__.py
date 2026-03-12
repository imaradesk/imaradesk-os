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
    Decorator to check if an app is installed and trial is valid.
    Shows appropriate pages:
    - "App Not Installed" if not installed
    - "Trial Expired" if trial has ended
    
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
                        'price': float(app.price),
                        'is_free': app.is_free,
                        'version': app.version,
                    }
                except App.DoesNotExist:
                    app_info = {
                        'name': app_slug.replace('-', ' ').title(),
                        'slug': app_slug,
                        'description': 'This app is not available.',
                        'icon': '📦',
                        'price': 0,
                        'is_free': False,
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
            
            # Check if trial has expired (only for trial subscriptions)
            if installed_app.subscription_status == 'trial' and installed_app.is_trial_expired:
                # Update status to expired
                installed_app.subscription_status = 'expired'
                installed_app.save(update_fields=['subscription_status'])
                
                app = installed_app.app
                app_info = {
                    'name': app.name,
                    'slug': app.slug,
                    'description': app.description,
                    'icon': app.icon,
                    'price': float(app.price),
                    'is_free': app.is_free,
                    'version': app.version,
                }
                
                # Return JSON for API requests
                if _is_api_request(request):
                    return JsonResponse({
                        'success': False,
                        'error': 'trial_expired',
                        'message': f'Your trial for {app.name} has expired. Please upgrade to continue using this feature.',
                        'app': app_info,
                        'trial_ended_at': installed_app.trial_ends_at.isoformat() if installed_app.trial_ends_at else None,
                    }, status=403)
                
                return inertia_render(request, 'TrialExpired', {
                    'app': app_info,
                    'trial_ended_at': installed_app.trial_ends_at.isoformat() if installed_app.trial_ends_at else None,
                    'return_url': request.META.get('HTTP_REFERER', '/'),
                })
            
            # Check if subscription is expired status
            if installed_app.subscription_status == 'expired':
                app = installed_app.app
                app_info = {
                    'name': app.name,
                    'slug': app.slug,
                    'description': app.description,
                    'icon': app.icon,
                    'price': float(app.price),
                    'is_free': app.is_free,
                    'version': app.version,
                }
                
                # Return JSON for API requests
                if _is_api_request(request):
                    return JsonResponse({
                        'success': False,
                        'error': 'subscription_expired',
                        'message': f'Your subscription for {app.name} has expired. Please renew to continue using this feature.',
                        'app': app_info,
                        'trial_ended_at': installed_app.trial_ends_at.isoformat() if installed_app.trial_ends_at else None,
                    }, status=403)
                
                return inertia_render(request, 'TrialExpired', {
                    'app': app_info,
                    'trial_ended_at': installed_app.trial_ends_at.isoformat() if installed_app.trial_ends_at else None,
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
            
            # Check for any active, non-expired installation
            try:
                installed_app = InstalledApp.objects.filter(
                    app__slug__in=app_slugs,
                    is_active=True
                ).exclude(subscription_status='expired').first()
            except Exception as e:
                logger.error(f"Error checking app installation for {app_slugs}: {e}")
                installed_app = None
            
            if not installed_app:
                app_info = {
                    'name': 'Required App',
                    'slug': app_slugs[0] if app_slugs else '',
                    'description': 'One of the required apps must be installed.',
                    'icon': '📦',
                    'price': 0,
                    'is_free': False,
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
            
            # Check trial expiration
            if installed_app.subscription_status == 'trial' and installed_app.is_trial_expired:
                installed_app.subscription_status = 'expired'
                installed_app.save(update_fields=['subscription_status'])
                
                app = installed_app.app
                app_info = {
                    'name': app.name,
                    'slug': app.slug,
                    'description': app.description,
                    'icon': app.icon,
                    'price': float(app.price),
                    'is_free': app.is_free,
                }
                
                # Return JSON for API requests
                if _is_api_request(request):
                    return JsonResponse({
                        'success': False,
                        'error': 'trial_expired',
                        'message': f'Your trial for {app.name} has expired.',
                        'app': app_info,
                        'trial_ended_at': installed_app.trial_ends_at.isoformat() if installed_app.trial_ends_at else None,
                    }, status=403)
                
                return inertia_render(request, 'TrialExpired', {
                    'app': app_info,
                    'trial_ended_at': installed_app.trial_ends_at.isoformat() if installed_app.trial_ends_at else None,
                    'return_url': request.META.get('HTTP_REFERER', '/'),
                })
            
            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator
