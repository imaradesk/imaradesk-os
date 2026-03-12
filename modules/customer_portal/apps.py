from django.apps import AppConfig


class CustomerPortalConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'modules.customer_portal'
    label = 'customer_portal'  # Keep original label for migrations
    verbose_name = 'Customer Portal'
