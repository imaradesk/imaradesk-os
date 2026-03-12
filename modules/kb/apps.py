from django.apps import AppConfig


class KbConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'modules.kb'
    label = 'kb'  # Keep original label for migrations
    verbose_name = 'Knowledge Base'
