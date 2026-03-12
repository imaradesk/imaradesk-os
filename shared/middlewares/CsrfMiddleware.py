class InertiaCSRFMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Inertia always sends this header
        if request.headers.get('X-Inertia'):
            print("Inertia request detected - skipping CSRF checks =======> ", request.path)
            setattr(request, '_dont_enforce_csrf_checks', True)

        return self.get_response(request)