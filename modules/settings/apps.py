from django.apps import AppConfig


class SettingsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'modules.settings'
    label = 'settings'  # Keep original label for migrations
