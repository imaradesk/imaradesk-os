from django.apps import AppConfig


class TasksConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'modules.tasks'
    verbose_name = 'Tasks'

    def ready(self):
        """Import signals when Django starts."""
        import modules.tasks.signals
