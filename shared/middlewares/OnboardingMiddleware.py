"""Onboarding Middleware - Redirects to onboarding if no user exists in the database,
and to quick-start if onboarding is not complete."""
from django.shortcuts import redirect


class OnboardingMiddleware:
    """
    Middleware that:
    1. Redirects to /onboarding/ if no users exist (fresh install)
    2. Redirects authenticated admins to /quick-start/ if onboarding is not complete
    """

    EXEMPT_URLS = [
        '/onboarding/',
        '/quick-start/',
        '/api/onboarding/',
        '/static/',
        '/media/',
        '/admin/',
        '/health/',
        '/favicon.ico',
        '/logout/',
    ]

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path
        if any(path.startswith(url) for url in self.EXEMPT_URLS):
            return self.get_response(request)

        # Check if any users exist in the database
        if not self._users_exist():
            return redirect('/onboarding/')

        # Check if authenticated admin has completed onboarding
        if request.user.is_authenticated and request.user.is_superuser:
            if not self._is_onboarding_complete(request.user):
                return redirect('/quick-start/')

        return self.get_response(request)

    def _users_exist(self):
        """Check if at least one user exists in the database."""
        try:
            from django.contrib.auth.models import User
            return User.objects.exists()
        except Exception:
            return False

    def _is_onboarding_complete(self, user):
        """Check if onboarding is complete for this user."""
        try:
            from modules.onboarding.models import OnboardingProgress
            progress, _ = OnboardingProgress.objects.get_or_create(user=user)
            return progress.is_complete
        except Exception:
            return True  # Don't block on errors
