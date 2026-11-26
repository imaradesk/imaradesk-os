from django.apps import AppConfig


class SlaConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'modules.sla'
    label = 'sla'  # Keep original label for migrations
    verbose_name = 'SLA Management'

    def ready(self):
        from . import signals  # noqa: F401
