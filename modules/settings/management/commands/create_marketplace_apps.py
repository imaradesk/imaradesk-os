from django.core.management.base import BaseCommand
from django.db import connection
from modules.settings.models import App


# Canonical list of marketplace apps - this is the source of truth
MARKETPLACE_APPS = [
    {
        'name': 'Customer Portal',
        'slug': 'customer-portal',
        'description': 'Self-service portal for customers',
        'long_description': 'Empower customers with a branded self-service portal. Allow customers to create tickets, track progress, and access knowledge base articles. Features include: customizable branding, ticket submission forms, ticket tracking, knowledge base access, customer dashboard, and mobile-responsive design.',
        'icon': 'globe',
        'category': 'productivity',
        'price': 0.00,
        'is_free': True,
        'status': 'active',
        'is_featured': True,
        'version': '1.0.0',
    },
    {
        'name': 'Knowledge Base',
        'slug': 'knowledge-base',
        'description': 'Self-service knowledge base for customers and agents',
        'long_description': 'Create and manage a comprehensive knowledge base to help customers find answers quickly. Reduce support tickets with searchable articles, FAQs, and documentation. Features include: article categories, rich text editor, article versioning, search functionality, article ratings, related articles, and public/internal visibility options.',
        'icon': 'book-open',
        'category': 'productivity',
        'price': 0.00,
        'is_free': True,
        'status': 'active',
        'is_featured': True,
        'version': '2.0.0',
    },
]


class Command(BaseCommand):
    help = 'Sync marketplace apps - creates new, updates existing, removes deleted'

    def handle(self, *args, **options):
        created_count = 0
        updated_count = 0
        deleted_count = 0

        # Get all valid slugs from the canonical list
        valid_slugs = {app['slug'] for app in MARKETPLACE_APPS}

        # Create or update apps from the canonical list
        for app_data in MARKETPLACE_APPS:
            slug = app_data['slug']
            app, created = App.objects.update_or_create(
                slug=slug,
                defaults=app_data
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'  + Created: {app.name}'))
                created_count += 1
            else:
                self.stdout.write(f'  ~ Updated: {app.name}')
                updated_count += 1

        # Delete apps that are no longer in the canonical list
        orphaned_apps = App.objects.exclude(slug__in=valid_slugs)
        for app in orphaned_apps:
            self.stdout.write(self.style.WARNING(f'  - Deleted: {app.name} ({app.slug})'))
            app.delete()
            deleted_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'\nSync complete! Created: {created_count}, Updated: {updated_count}, Deleted: {deleted_count}'
            )
        )
