from django.core.management.base import BaseCommand
from modules.settings.models import KnowledgeBaseSettings


class Command(BaseCommand):
    help = 'Initialize Knowledge Base settings with default values'

    def handle(self, *args, **options):
        settings, created = KnowledgeBaseSettings.objects.get_or_create(
            pk=1,
            defaults={
                'public_access': True,
                'require_login_to_view': False,
                'allow_article_rating': True,
                'allow_article_comments': True,
                'require_approval': True,
                'auto_publish_on_approval': True,
                'notify_approvers': True,
                'notify_author_on_approval': True,
                'notify_author_on_rejection': True,
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS('Successfully created Knowledge Base settings with defaults'))
        else:
            self.stdout.write(self.style.WARNING('Knowledge Base settings already exist'))
