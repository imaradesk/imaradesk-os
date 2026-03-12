from inertia import share
from django.middleware.csrf import get_token
from django.conf import settings

def inertia_share(get_response):
    """
    Middleware to share common data with all Inertia responses.
    """
    def middleware(request):
        # Ensure CSRF token is generated and available
        csrf_token = get_token(request)
        
        # Share app/business info - single tenant mode
        app_name = getattr(settings, 'APP_NAME', 'ImaraDesk')
        share(request, tenant={
            'name': app_name,
            'schema': 'default',
        })
        
        # Share auth data with all Inertia responses
        if request.user.is_authenticated:
            try:
                profile = request.user.profile
                full_name = profile.full_name or f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
            except:
                full_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
            
            share(request, auth={
                'user': {
                    'id': request.user.id,
                    'name': full_name,
                    'email': request.user.email,
                    'username': request.user.username,
                }
            })
            
            # Share KB settings and pending count for approval menu
            try:
                from modules.settings.models import KnowledgeBaseSettings
                from modules.kb.models import KBArticle
                
                kb_settings = KnowledgeBaseSettings.get_settings()
                pending_kb_count = KBArticle.objects.filter(status='pending').count()
                
                share(request, kb_approval={
                    'enabled': True,  # KB is always enabled once the app is installed
                    'requiresApproval': kb_settings.require_approval,
                    'pendingCount': pending_kb_count,
                })
            except:
                share(request, kb_approval={
                    'enabled': False,
                    'requiresApproval': False,
                    'pendingCount': 0,
                })
        else:
            share(request, auth={'user': None})
            share(request, kb_approval={
                'enabled': False,
                'requiresApproval': False,
                'pendingCount': 0,
            })
        
        response = get_response(request)
        return response
    
    return middleware
