"""Management command to setup and seed data for single-tenant ImaraDesk."""
from django.core.management.base import BaseCommand
from django.core.management import call_command
from shared.models import Client


class Command(BaseCommand):
    help = 'Setup and seed data for ImaraDesk (single-tenant)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--init',
            action='store_true',
            help='Initialize the organization and all default data (runs all seed commands)',
        )
        parser.add_argument(
            '--seed-apps',
            action='store_true',
            help='Seed marketplace apps',
        )
        parser.add_argument(
            '--seed-email-templates',
            action='store_true',
            help='Seed default email templates (skips existing)',
        )
        parser.add_argument(
            '--reseed-email-templates',
            action='store_true',
            help='Delete all existing email templates and create fresh ones',
        )
        parser.add_argument(
            '--init-views',
            action='store_true',
            help='Initialize default views for tickets, tasks, and KB',
        )

    def handle(self, *args, **options):
        # Create or get organization
        org = Client.get_current()
        self.stdout.write(self.style.SUCCESS(f'Organization: {org.name}'))
        
        # Run all seeds if --init is provided
        if options.get('init'):
            self.stdout.write(self.style.SUCCESS('\n=== Initializing ImaraDesk ===\n'))
            self.seed_marketplace_apps()
            self.seed_email_templates(reseed=False)
            self.init_views()
            self.stdout.write(self.style.SUCCESS('\n=== Initialization Complete ==='))
            return
        
        # Individual seed commands
        if options.get('seed_apps'):
            self.seed_marketplace_apps()
        
        if options.get('seed_email_templates'):
            self.seed_email_templates(reseed=False)
        
        if options.get('reseed_email_templates'):
            self.seed_email_templates(reseed=True)
        
        if options.get('init_views'):
            self.init_views()

    def seed_marketplace_apps(self):
        """Seed marketplace apps."""
        self.stdout.write(self.style.SUCCESS('\n--- Seeding Marketplace Apps ---'))
        
        try:
            call_command('create_marketplace_apps')
            self.stdout.write(self.style.SUCCESS('  ✓ Marketplace apps seeded'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'  ✗ Failed - {str(e)}'))
    
    def seed_email_templates(self, reseed=False):
        """Seed default email templates."""
        from django.db import transaction
        from modules.settings.models import EmailTemplate
        from modules.settings.email_templates_defaults import DEFAULT_EMAIL_TEMPLATES
        
        if reseed:
            self.stdout.write(self.style.WARNING('\n--- RESEEDING Email Templates (Delete & Recreate) ---'))
        else:
            self.stdout.write(self.style.SUCCESS('\n--- Seeding Email Templates ---'))
        
        created_count = 0
        deleted_count = 0
        skipped_count = 0
        
        if reseed:
            with transaction.atomic():
                deleted_count = EmailTemplate.objects.count()
                EmailTemplate.objects.all().delete()
        
        for template_data in DEFAULT_EMAIL_TEMPLATES:
            template_type = template_data['template_type']
            
            existing = EmailTemplate.objects.filter(template_type=template_type).first()
            
            if existing:
                if reseed:
                    existing.delete()
                else:
                    skipped_count += 1
                    continue
            
            EmailTemplate.objects.create(**template_data)
            created_count += 1
        
        if reseed:
            self.stdout.write(self.style.SUCCESS(
                f'  ✓ Deleted: {deleted_count}, Created: {created_count}'
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f'  ✓ Created: {created_count}, Skipped: {skipped_count}'
            ))
    
    def init_views(self):
        """Initialize default views for tickets and KB."""
        from modules.settings.models import SettingsView
        
        self.stdout.write(self.style.SUCCESS('\n--- Initializing Views ---'))
        
        DEFAULT_VIEWS = [
            # TICKET VIEWS
            {'type': 'TICKET', 'view_id': 'all_tickets', 'label': 'All Tickets', 'description': 'View all tickets', 'order': 10},
            {'type': 'TICKET', 'view_id': 'unsolved', 'label': 'Your unsolved tickets', 'description': 'Tickets assigned to or requested by you that are not solved', 'order': 20, 'is_default': True},
            {'type': 'TICKET', 'view_id': 'response_overdue', 'label': 'All Response Overdue', 'description': 'Tickets with overdue SLA response time', 'order': 30},
            {'type': 'TICKET', 'view_id': 'resolution_due_today', 'label': 'All Resolution Due Today', 'description': 'Tickets with resolution due today', 'order': 40},
            {'type': 'TICKET', 'view_id': 'my_resolution_overdue', 'label': 'My Resolution Overdue', 'description': 'Your tickets with overdue resolution time', 'order': 50},
            {'type': 'TICKET', 'view_id': 'requested_by_me', 'label': 'Requested By Me', 'description': 'Tickets you have requested', 'order': 60},
            {'type': 'TICKET', 'view_id': 'watching', 'label': "Tickets I'm Watching", 'description': 'Tickets you are watching', 'order': 70},
            {'type': 'TICKET', 'view_id': 'unassigned', 'label': 'Unassigned tickets', 'description': 'Unsolved tickets not assigned to anyone', 'order': 80},
            {'type': 'TICKET', 'view_id': 'all_unsolved', 'label': 'All unsolved tickets', 'description': 'All unsolved tickets in the system', 'order': 90},
            {'type': 'TICKET', 'view_id': 'recently_updated', 'label': 'Recently updated tickets', 'description': 'Tickets updated in the last 7 days', 'order': 100},
            {'type': 'TICKET', 'view_id': 'new_in_groups', 'label': 'New tickets in your groups', 'description': 'New tickets assigned to your groups', 'order': 110},
            {'type': 'TICKET', 'view_id': 'pending', 'label': 'Pending tickets', 'description': 'Tickets in pending status', 'order': 120},
            {'type': 'TICKET', 'view_id': 'recently_solved', 'label': 'Recently solved tickets', 'description': 'Tickets solved in the last 7 days', 'order': 130},
            {'type': 'TICKET', 'view_id': 'unsolved_in_groups', 'label': 'Unsolved tickets in your groups', 'description': 'Unsolved tickets assigned to your groups', 'order': 140},
            # KB VIEWS
            {'type': 'KB', 'view_id': 'all', 'label': 'All Articles', 'description': 'View all KB articles', 'order': 10, 'is_default': True},
            {'type': 'KB', 'view_id': 'published', 'label': 'Published', 'description': 'Published KB articles', 'order': 20},
            {'type': 'KB', 'view_id': 'draft', 'label': 'Drafts', 'description': 'Draft KB articles', 'order': 30},
            {'type': 'KB', 'view_id': 'archived', 'label': 'Archived', 'description': 'Archived KB articles', 'order': 40},
        ]
        
        created_count = 0
        updated_count = 0
        
        for view_data in DEFAULT_VIEWS:
            existing = SettingsView.objects.filter(
                type=view_data['type'],
                view_id=view_data['view_id']
            ).first()
            
            if existing:
                is_active = existing.is_active
                for key, value in view_data.items():
                    setattr(existing, key, value)
                existing.is_active = is_active
                existing.save()
                updated_count += 1
            else:
                SettingsView.objects.create(**view_data)
                created_count += 1
        
        self.stdout.write(self.style.SUCCESS(
            f'  ✓ Created: {created_count}, Updated: {updated_count}'
        ))
