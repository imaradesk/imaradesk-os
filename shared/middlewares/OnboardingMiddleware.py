"""
Onboarding Middleware - Redirects to onboarding if no business is registered.
"""
from django.shortcuts import redirect
from django.urls import reverse


class OnboardingMiddleware:
    """
    Middleware that checks if a business/organization exists.
    If not, redirects all requests to the onboarding page.
    """
    
    # URLs that should be accessible even without a business registered
    EXEMPT_URLS = [
        '/onboarding/',
        '/static/',
        '/media/',
        '/admin/',
        '/health/',
        '/favicon.ico',
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
        self._business_exists = None
    
    def __call__(self, request):
        # Skip check for exempt URLs
        path = request.path
        if any(path.startswith(url) for url in self.EXEMPT_URLS):
            return self.get_response(request)
        
        # Check if business exists (cache the result for performance)
        if self._business_exists is None:
            self._business_exists = self._check_business_exists()
        
        # If no business exists, redirect to onboarding
        if not self._business_exists:
            # Re-check in case business was just created
            self._business_exists = self._check_business_exists()
            if not self._business_exists:
                return redirect('/onboarding/')
        
        return self.get_response(request)
    
    def _check_business_exists(self):
        """Check if at least one organization exists in the database."""
        try:
            from shared.models import Client
            print(f"This =======================> {Client.objects.exists()}")
            return Client.objects.exists()
        except Exception:
            # If there's a database error, assume onboarding is needed
            return False
