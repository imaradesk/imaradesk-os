"""Module activation helpers shared by middleware and feature code."""


def get_installed_modules():
    """Return the active/installed status of every optional module for this install."""
    from modules.settings.models import App, InstalledApp

    installed_modules = {
        'tasks': False,
        'kb': False,
        'email_to_ticket': False,
        'customer_portal': False,
    }

    module_slugs = {
        'tasks': 'tasks-projects',
        'kb': 'knowledge-base',
        'email_to_ticket': 'email-to-ticket',
        'customer_portal': 'customer-portal',
    }

    try:
        for module_key, slug in module_slugs.items():
            app = App.objects.filter(slug=slug).first()
            if app:
                installed_modules[module_key] = InstalledApp.objects.filter(
                    app=app,
                    is_active=True,
                ).exists()
    except Exception:
        pass

    return installed_modules


def is_module_installed(module_key):
    """Return whether one optional module is active for this install."""
    if not module_key:
        return True
    return bool(get_installed_modules().get(module_key))
