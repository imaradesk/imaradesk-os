from django.core.management.base import BaseCommand
from modules.sla.models import SLAPolicy, BusinessHours, Holiday, SLASettings
from datetime import time, date


class Command(BaseCommand):
    help = 'Create sample SLA policies, business hours, and holidays for testing'

    def handle(self, *args, **options):
        # Create or get SLA Settings (disabled by default)
        settings = SLASettings.get_settings()
        if settings.id == 1:
            self.stdout.write(self.style.SUCCESS('SLA Settings initialized (disabled by default)'))
        else:
            self.stdout.write(self.style.WARNING('SLA Settings already exist'))
        
        # Create SLA Policies
        policies = [
            {
                'name': 'Critical Priority SLA',
                'priority': 'critical',
                'description': 'For critical issues affecting business operations',
                'first_response_time': 60,  # 1 hour
                'resolution_time': 240,  # 4 hours
                'status': 'active',
                'apply_business_hours': True,
                'notify_before_breach': 30,
            },
            {
                'name': 'High Priority SLA',
                'priority': 'high',
                'description': 'For high priority issues requiring urgent attention',
                'first_response_time': 120,  # 2 hours
                'resolution_time': 480,  # 8 hours
                'status': 'active',
                'apply_business_hours': True,
                'notify_before_breach': 30,
            },
            {
                'name': 'Medium Priority SLA',
                'priority': 'medium',
                'description': 'For standard priority issues',
                'first_response_time': 240,  # 4 hours
                'resolution_time': 1440,  # 24 hours
                'status': 'active',
                'apply_business_hours': True,
                'notify_before_breach': 60,
            },
            {
                'name': 'Low Priority SLA',
                'priority': 'low',
                'description': 'For low priority issues and general inquiries',
                'first_response_time': 480,  # 8 hours
                'resolution_time': 2880,  # 48 hours
                'status': 'active',
                'apply_business_hours': True,
                'notify_before_breach': 60,
            },
        ]

        for policy_data in policies:
            policy, created = SLAPolicy.objects.get_or_create(
                priority=policy_data['priority'],
                defaults=policy_data
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created: {policy.name}'))
            else:
                self.stdout.write(self.style.WARNING(f'Already exists: {policy.name}'))

        # Create default business hours (Monday-Friday, 9 AM - 5 PM)
        bh, created = BusinessHours.objects.get_or_create(
            name="Default Business Hours",
            defaults={
                'timezone': 'UTC',
                'monday_enabled': True,
                'monday_start': time(9, 0),
                'monday_end': time(17, 0),
                'tuesday_enabled': True,
                'tuesday_start': time(9, 0),
                'tuesday_end': time(17, 0),
                'wednesday_enabled': True,
                'wednesday_start': time(9, 0),
                'wednesday_end': time(17, 0),
                'thursday_enabled': True,
                'thursday_start': time(9, 0),
                'thursday_end': time(17, 0),
                'friday_enabled': True,
                'friday_start': time(9, 0),
                'friday_end': time(17, 0),
                'saturday_enabled': False,
                'saturday_start': time(9, 0),
                'saturday_end': time(17, 0),
                'sunday_enabled': False,
                'sunday_start': time(9, 0),
                'sunday_end': time(17, 0),
                'pause_outside_hours': True,
                'exclude_holidays': True,
                'is_active': True,
            }
        )

        if created:
            self.stdout.write(self.style.SUCCESS(f'Created: {bh.name}'))
        else:
            self.stdout.write(self.style.WARNING(f'Already exists: {bh.name}'))

        # Create sample holidays
        holidays = [
            {
                'name': 'New Year\'s Day',
                'date': date(2024, 1, 1),
                'recurring': True,
                'status': 'active',
            },
            {
                'name': 'Christmas Day',
                'date': date(2024, 12, 25),
                'recurring': True,
                'status': 'active',
            },
        ]

        for holiday_data in holidays:
            holiday, created = Holiday.objects.get_or_create(
                name=holiday_data['name'],
                defaults=holiday_data
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created holiday: {holiday.name}'))
            else:
                self.stdout.write(self.style.WARNING(f'Holiday already exists: {holiday.name}'))

        self.stdout.write(self.style.SUCCESS('\nSample SLA data created successfully!'))
