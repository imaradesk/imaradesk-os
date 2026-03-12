from django.apps import AppConfig


class SharedConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'shared'

    def ready(self):
        """Import signals when Django starts."""
        import shared.signals  # noqa
        import modules.ticket.signals  # noqa - Ensure ticket signals are also loaded since they contain important logic
