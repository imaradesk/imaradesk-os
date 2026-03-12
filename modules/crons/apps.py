from django.apps import AppConfig


class CronsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'modules.crons'
    verbose_name = 'Scheduled Tasks (Crons)'
