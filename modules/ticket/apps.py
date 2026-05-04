from django.apps import AppConfig


class TicketConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'modules.ticket'
    label = 'ticket' 

    def ready(self):
        """Import signals when Django starts."""
        import modules.ticket.signals


