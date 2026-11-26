"""
Tests for the agent ticket views.

Run with:
    python manage.py test modules.tickets
"""
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase

from modules.ticket.models import Ticket
from modules.tasks.models import Task
from shared.utilities.enums.views import ViewType

User = get_user_model()


class TicketViewTests(TestCase):

    def setUp(self):
        self.agent = User.objects.create_user('agent', 'agent@example.com', 'pw', first_name='Ada', last_name='Agent')
        self.customer = User.objects.create_user('cust', 'cust@example.com', 'pw', first_name='Cy', last_name='Customer')
        self.other = User.objects.create_user('other', 'other@example.com', 'pw')
        self.client.force_login(self.agent)

    def make_ticket(self, **kwargs):
        defaults = {'title': 'Ticket', 'description': '<p>x</p>', 'requester': self.customer}
        defaults.update(kwargs)
        return Ticket.objects.create(**defaults)

    def props(self, ticket):
        res = self.client.get(f'/tickets/{ticket.uuid}/', HTTP_X_INERTIA='true', HTTP_X_INERTIA_VERSION='1.0')
        self.assertEqual(res.status_code, 200, res.content[:500])
        return res.json()['props']

    def test_requester_tickets_lists_other_tickets_open_first(self):
        ticket = self.make_ticket(title='Main')
        resolved = self.make_ticket(title='Old resolved', status=Ticket.Status.RESOLVED)
        open_one = self.make_ticket(title='Still open')
        self.make_ticket(title='Draft', status=Ticket.Status.DRAFT)
        self.make_ticket(title='Someone else', requester=self.other)

        rows = self.props(ticket)['requester_tickets']
        self.assertEqual([r['title'] for r in rows], ['Still open', 'Old resolved'])
        self.assertEqual(rows[0]['uuid'], str(open_one.uuid))
        self.assertEqual(rows[1]['uuid'], str(resolved.uuid))
        self.assertNotIn(str(ticket.uuid), [r['uuid'] for r in rows])

    def test_guest_ticket_matches_other_tickets_by_email(self):
        ticket = self.make_ticket(requester=None, is_guest_ticket=True, guest_name='Gus', guest_email='gus@example.com')
        self.make_ticket(title='Same guest', requester=None, is_guest_ticket=True, guest_email='GUS@example.com')
        self.make_ticket(title='Other guest', requester=None, is_guest_ticket=True, guest_email='x@example.com')

        rows = self.props(ticket)['requester_tickets']
        self.assertEqual([r['title'] for r in rows], ['Same guest'])

    def test_linked_tasks(self):
        ticket = self.make_ticket()
        related = Task.objects.create(title='Follow up', description='<p>x</p>', created_by=self.agent, related_ticket=ticket)
        converted = Task.objects.create(title='Converted', description='<p>x</p>', created_by=self.agent, converted_from_ticket=ticket)
        Task.objects.create(title='Draft', description='<p>x</p>', created_by=self.agent, related_ticket=ticket, status=Task.Status.DRAFT)
        Task.objects.create(title='Unrelated', description='<p>x</p>', created_by=self.agent)

        rows = self.props(ticket)['linked_tasks']
        by_title = {r['title']: r for r in rows}
        self.assertEqual(set(by_title), {'Follow up', 'Converted'})
        self.assertEqual(by_title['Follow up']['uuid'], str(related.uuid))
        self.assertFalse(by_title['Follow up']['converted'])
        self.assertEqual(by_title['Converted']['uuid'], str(converted.uuid))
        self.assertTrue(by_title['Converted']['converted'])

    def test_ticket_without_relations(self):
        ticket = self.make_ticket(requester=self.other)
        props = self.props(ticket)
        self.assertEqual(props['requester_tickets'], [])
        self.assertEqual(props['linked_tasks'], [])


class TicketListApiTests(TestCase):

    def setUp(self):
        self.agent = User.objects.create_user('agent', 'agent@example.com', 'pw')
        self.client.force_login(self.agent)

    def test_list_api_pages_through_a_view(self):
        for i in range(17):
            Ticket.objects.create(title=f'T{i}', description='<p>x</p>', requester=self.agent)
        Ticket.objects.create(title='Draft', description='<p>x</p>', requester=self.agent, status=Ticket.Status.DRAFT)

        first = self.client.get('/tickets/api/list/', {'view': 'all_tickets'}).json()
        second = self.client.get('/tickets/api/list/', {'view': 'all_tickets', 'page': 2}).json()

        self.assertEqual(len(first['tickets']), 15)
        self.assertTrue(first['pagination']['has_next'])
        self.assertEqual(len(second['tickets']), 2)
        self.assertFalse(second['pagination']['has_next'])
        titles = {t['subject'] for t in first['tickets'] + second['tickets']}
        self.assertEqual(len(titles), 17)
        self.assertNotIn('Draft', titles)

    def test_list_api_applies_filters(self):
        Ticket.objects.create(title='Urgent one', description='<p>x</p>', requester=self.agent, priority='urgent')
        Ticket.objects.create(title='Low one', description='<p>x</p>', requester=self.agent, priority='low')
        data = self.client.get('/tickets/api/list/', {'view': 'all_tickets', 'priority': 'urgent'}).json()
        self.assertEqual([t['subject'] for t in data['tickets']], ['Urgent one'])

    def test_sidebar_counts_match_each_views_list(self):
        from modules.settings.models import SettingsView
        from shared.utilities.enums.views import ViewsRegistry

        cache.clear()  # the view list is cached between tests
        for data in ViewsRegistry.get_by_type(ViewType.TICKET):
            SettingsView.objects.create(**data)
        Ticket.objects.create(title='Mine', description='<p>x</p>', requester=self.agent)
        Ticket.objects.create(title='Assigned', description='<p>x</p>', requester=self.agent, assignee=self.agent, status='open')
        Ticket.objects.create(title='Pending', description='<p>x</p>', requester=self.agent, status='pending')
        Ticket.objects.create(title='Solved', description='<p>x</p>', requester=self.agent, status='resolved')
        Ticket.objects.create(title='Draft', description='<p>x</p>', requester=self.agent, status='draft')

        props = self.client.get('/tickets/', HTTP_X_INERTIA='true', HTTP_X_INERTIA_VERSION='1.0').json()['props']
        views = props['sidebar']['views']
        self.assertEqual(len(views), 14)
        for view in views:
            listed = self.client.get('/tickets/api/list/', {'view': view['id']}).json()['pagination']['total_count']
            self.assertEqual(view['count'], listed, view['id'])
        counts = {v['id']: v['count'] for v in views}
        self.assertEqual(counts['all_tickets'], 4)
        self.assertEqual(counts['recently_solved'], 1)

    def test_list_api_requires_login(self):
        self.client.logout()
        res = self.client.get('/tickets/api/list/')
        self.assertEqual(res.status_code, 302)
