"""
Regression tests for SLA behaviour.

Run with:
    python manage.py test modules.sla
"""
import json
from datetime import timedelta
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.utils import timezone

from modules.sla.models import SLAPolicy, SLASettings, TicketSLA
from modules.ticket.models import Ticket

User = get_user_model()


class SLATests(TestCase):

    def setUp(self):
        self.agent = User.objects.create_user('agent', 'agent@example.com', 'pw')
        self.customer = User.objects.create_user('cust', 'cust@example.com', 'pw')
        settings = SLASettings.get_settings()
        settings.enabled = True
        settings.save()
        for priority, first, resolution in [('medium', 60, 480), ('urgent', 15, 60)]:
            SLAPolicy.objects.create(
                name=priority, priority=priority, first_response_time=first,
                resolution_time=resolution, send_escalation_emails=True,
            )
        self.client = Client()
        self.client.force_login(self.agent)

    def make_ticket(self, **kwargs):
        defaults = {'title': 'T', 'description': '<p>x</p>', 'requester': self.customer}
        defaults.update(kwargs)
        with mock.patch('modules.ticket.signals.send_ticket_email_task'), \
                mock.patch('modules.ticket.signals.send_group_assignment_notification_task'):
            return Ticket.objects.create(**defaults)

    def reload(self, ticket):
        return Ticket.objects.get(pk=ticket.pk)

    def test_priority_change_keeps_pending_ticket_on_hold(self):
        ticket = self.make_ticket()
        self.client.post(f'/tickets/{ticket.uuid}/status/', {'status': 'pending'})
        ticket = self.reload(ticket)
        self.assertTrue(ticket.sla.is_on_hold)

        ticket.priority = 'urgent'
        ticket.save()
        ticket = self.reload(ticket)
        self.assertEqual(ticket.sla.policy.priority, 'urgent')
        self.assertTrue(ticket.sla.is_on_hold)

    def test_automatic_hold_does_not_show_ticket_as_pending(self):
        ticket = self.make_ticket(status='open', assignee=self.agent)
        TicketSLA.objects.filter(pk=ticket.sla.pk).update(
            is_on_hold=True, hold_reason='SYSTEM_OUTSIDE_BUSINESS_HOURS', hold_started_at=timezone.now())
        self.assertEqual(self.reload(ticket).computed_status, 'open')

    def test_manual_hold_still_shows_as_pending(self):
        ticket = self.make_ticket(status='open')
        TicketSLA.objects.filter(pk=ticket.sla.pk).update(
            is_on_hold=True, hold_reason='Waiting on vendor', hold_started_at=timezone.now())
        self.assertEqual(self.reload(ticket).computed_status, 'pending')

    def test_on_time_reply_is_not_reported_as_breached(self):
        ticket = self.make_ticket(status='open')
        TicketSLA.objects.filter(pk=ticket.sla.pk).update(
            response_due_at=timezone.now() - timedelta(hours=1),
            first_responded_at=timezone.now() - timedelta(hours=2),
            response_breached=False,
        )
        info = self.reload(ticket).sla_info
        self.assertEqual(info['response']['status'], 'on_track')
        self.assertEqual(info['overall_status'], 'on_track')

    def test_response_breach_makes_overall_status_breached(self):
        ticket = self.make_ticket(status='open')
        TicketSLA.objects.filter(pk=ticket.sla.pk).update(
            response_due_at=timezone.now() - timedelta(hours=1), response_breached=True)
        self.assertEqual(self.reload(ticket).sla_info['overall_status'], 'breached')

    def test_bulk_remove_draft_starts_the_sla(self):
        ticket = self.make_ticket(status='draft')
        self.assertFalse(hasattr(ticket, 'sla'))

        res = self.client.post(
            '/tickets/bulk/remove-draft/', json.dumps({'ticket_ids': [str(ticket.uuid)]}),
            content_type='application/json')
        self.assertEqual(res.json()['updated_count'], 1)

        ticket = self.reload(ticket)
        self.assertEqual(ticket.status, 'new')
        self.assertTrue(hasattr(ticket, 'sla'))

    def test_breach_email_uses_real_units(self):
        from modules.sla.utils import send_sla_breach_notification

        ticket = self.make_ticket(assignee=self.agent)
        with mock.patch('shared.utilities.Mailer.Mailer') as mailer:
            send_sla_breach_notification(ticket.sla, 'resolution')
        context = mailer.return_value.send_ticket_email.call_args.kwargs['additional_context']
        self.assertEqual(context['target_time'], '8 hours')


class SLAEngineTests(TestCase):
    """The scheduled job. Steps are called directly because the runner logs and swallows errors."""

    setUp = SLATests.setUp
    make_ticket = SLATests.make_ticket

    def overdue_ticket(self):
        ticket = self.make_ticket(status='open', assignee=self.agent)
        TicketSLA.objects.filter(pk=ticket.sla.pk).update(
            response_due_at=timezone.now() - timedelta(hours=2),
            resolution_due_at=timezone.now() - timedelta(hours=1),
        )
        return ticket

    def test_all_steps_run(self):
        from modules.crons.tasks.scheduler import _run_sla_steps
        from modules.sla.models import BusinessHours

        BusinessHours.objects.create(name='Hours', is_active=True)
        self.make_ticket(status='open')
        with mock.patch('modules.crons.tasks.scheduler.is_due', return_value=True), \
                mock.patch('modules.crons.tasks.sla.send_sla_notification'):
            result = _run_sla_steps()
        self.assertEqual(
            set(result), {'business_hours', 'holidays', 'warnings_queued', 'breaches_handled'})

    def test_breaches_are_recorded_when_notifications_are_off(self):
        from modules.crons.tasks.sla import _process_sla_breaches

        settings = SLASettings.get_settings()
        settings.send_notifications = False
        settings.save()
        ticket = self.overdue_ticket()
        with mock.patch('modules.crons.tasks.sla.send_sla_notification') as send:
            _process_sla_breaches()
        sla = TicketSLA.objects.get(ticket=ticket)
        self.assertTrue(sla.response_breached)
        self.assertTrue(sla.resolution_breached)
        send.delay.assert_not_called()

    def test_notification_feed_and_imap_options(self):
        from modules.email_to_ticket.models import CustomIMAPMailbox
        from modules.onboarding.models import OnboardingProgress

        admin = User.objects.create_superuser('boss', 'boss@example.com', 'pw')
        OnboardingProgress.objects.create(user=admin, is_complete=True)
        self.overdue_ticket()
        with mock.patch('modules.crons.tasks.sla.send_sla_notification'):
            from modules.crons.tasks.sla import _process_sla_breaches
            _process_sla_breaches()
        self.client.force_login(self.agent)
        feed = self.client.get('/api/notifications/').json()['notifications']
        self.assertTrue(any('breached' in item['text'] for item in feed))
        self.client.force_login(admin)
        mailbox = CustomIMAPMailbox.objects.create(
            email_address='help@example.com', imap_host='imap.example.com')
        res = self.client.post(
            '/api/integrations/custom-imap/configure/',
            json.dumps({'auto_create_tickets': False, 'auto_reply': True, 'default_priority': 'high'}),
            content_type='application/json')
        self.assertLess(res.status_code, 400)
        mailbox.refresh_from_db()
        self.assertEqual(
            (mailbox.auto_create_tickets, mailbox.auto_reply, mailbox.default_priority),
            (False, True, 'high'))
