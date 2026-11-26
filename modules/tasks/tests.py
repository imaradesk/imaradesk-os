"""
Tests for tasks & projects.
Run with:
    python manage.py test modules.tasks
"""
import json
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.utils import timezone
from modules.onboarding.models import OnboardingProgress
from modules.tasks import services
from modules.tasks.models import Project, ProjectActivity, Task, TaskActivityStream
User = get_user_model()
class TasksTestBase(TestCase):
    def setUp(self):
        from modules.settings.models import App, InstalledApp
        app, _ = App.objects.get_or_create(
            slug='tasks-projects',
            defaults={'name': 'Tasks & Projects', 'description': 'Tasks', 'long_description': 'Tasks'},
        )
        InstalledApp.objects.get_or_create(app=app, defaults={'is_active': True})
        self.admin = User.objects.create_superuser('admin', 'admin@example.com', 'pw')
        # Admins are sent to quick start until onboarding is complete
        OnboardingProgress.objects.create(user=self.admin, is_complete=True)
        self.owner = User.objects.create_user('owner', 'owner@example.com', 'pw', first_name='Olive', last_name='Owner')
        self.member = User.objects.create_user('member', 'member@example.com', 'pw', first_name='Max', last_name='Member')
        self.inactive = User.objects.create_user('gone', 'gone@example.com', 'pw', is_active=False)
        self.client = Client()
        self.client.force_login(self.owner)
    # helpers
    def post_json(self, url, data, client=None):
        return (client or self.client).post(
            url, data=json.dumps(data), content_type='application/json',
            HTTP_X_REQUESTED_WITH='XMLHttpRequest',
        )
    def inertia_get(self, url, data=None, client=None):
        return (client or self.client).get(
            url, data or {}, HTTP_X_INERTIA='true', HTTP_X_INERTIA_VERSION='1.0',
        )
    def props(self, response):
        self.assertEqual(response.status_code, 200, getattr(response, 'content', b'')[:500])
        return response.json()['props']
    def make_project(self, **kwargs):
        defaults = {'name': 'Launch', 'owner': self.owner, 'created_by': self.owner, 'status': Project.Status.ACTIVE}
        defaults.update(kwargs)
        return Project.objects.create(**defaults)
    def make_task(self, **kwargs):
        defaults = {'title': 'Task', 'description': '<p>x</p>', 'created_by': self.owner}
        defaults.update(kwargs)
        return Task.objects.create(**defaults)
class ProjectCrudTests(TasksTestBase):
    def test_create_project(self):
        res = self.post_json('/tasks/projects/new/', {
            'name': '  Website redesign ', 'description': 'New site', 'status': 'planned',
            'owner': self.member.id, 'start_date': '2026-01-01', 'target_date': '2026-03-01',
        })
        self.assertEqual(res.status_code, 201, res.content)
        project = Project.objects.get()
        self.assertEqual(project.name, 'Website redesign')
        self.assertEqual(project.owner, self.member)
        self.assertEqual(project.created_by, self.owner)
        self.assertEqual(str(project.target_date), '2026-03-01')
        self.assertTrue(project.activities.filter(activity_type=ProjectActivity.ActivityType.PROJECT_CREATED).exists())
        self.assertEqual(res.json()['project']['progress'], 0)
    def test_owner_defaults_to_creator(self):
        res = self.post_json('/tasks/projects/new/', {'name': 'Mine'})
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Project.objects.get().owner, self.owner)
    def test_create_validation_errors(self):
        res = self.post_json('/tasks/projects/new/', {
            'name': '', 'status': 'bogus', 'start_date': '2026-05-01', 'target_date': '2026-04-01',
        })
        self.assertEqual(res.status_code, 400)
        errors = res.json()['errors']
        self.assertIn('name', errors)
        self.assertIn('status', errors)
        self.assertIn('target_date', errors)
        self.assertFalse(Project.objects.exists())
    def test_invalid_date_format_rejected(self):
        res = self.post_json('/tasks/projects/new/', {'name': 'X', 'target_date': '03/01/2026'})
        self.assertEqual(res.status_code, 400)
        self.assertIn('target_date', res.json()['errors'])
    def test_owner_must_be_active_member(self):
        res = self.post_json('/tasks/projects/new/', {'name': 'X', 'owner': self.inactive.id})
        self.assertEqual(res.status_code, 400)
        res = self.post_json('/tasks/projects/new/', {'name': 'X', 'owner': 999999})
        self.assertEqual(res.status_code, 400)
        self.assertIn('owner', res.json()['errors'])
    def test_edit_project(self):
        project = self.make_project()
        res = self.post_json(f'/tasks/projects/{project.uuid}/update/', {'name': 'Launch v2', 'description': 'Updated'})
        self.assertEqual(res.status_code, 200, res.content)
        project.refresh_from_db()
        self.assertEqual(project.name, 'Launch v2')
        self.assertTrue(project.activities.filter(activity_type=ProjectActivity.ActivityType.PROJECT_UPDATED).exists())
    def test_partial_update_validates_against_existing_dates(self):
        project = self.make_project(start_date=timezone.localdate())
        res = self.post_json(f'/tasks/projects/{project.uuid}/update/', {
            'target_date': (timezone.localdate() - timedelta(days=1)).isoformat(),
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn('target_date', res.json()['errors'])
    def test_status_change_logged(self):
        project = self.make_project(status=Project.Status.PLANNED)
        res = self.post_json(f'/tasks/projects/{project.uuid}/update/', {'status': 'on_hold'})
        self.assertEqual(res.status_code, 200)
        project.refresh_from_db()
        self.assertEqual(project.status, Project.Status.ON_HOLD)
        activity = project.activities.get(activity_type=ProjectActivity.ActivityType.STATUS_CHANGED)
        self.assertEqual(activity.metadata, {'old_value': 'planned', 'new_value': 'on_hold'})
    def test_archive_and_restore(self):
        project = self.make_project()
        task = self.make_task(project=project)
        res = self.post_json(f'/tasks/projects/{project.uuid}/archive/', {})
        self.assertEqual(res.status_code, 200)
        project.refresh_from_db()
        self.assertTrue(project.is_archived)
        self.assertIsNotNone(project.archived_at)
        # Tasks are preserved and stay linked
        task.refresh_from_db()
        self.assertEqual(task.project, project)
        # Archived projects disappear from pickers
        self.assertEqual(services.project_options(), [])
        res = self.post_json(f'/tasks/projects/{project.uuid}/unarchive/', {})
        self.assertEqual(res.status_code, 200)
        project.refresh_from_db()
        self.assertFalse(project.is_archived)
        self.assertIsNone(project.archived_at)
    def test_archive_requires_post(self):
        project = self.make_project()
        res = self.client.get(f'/tasks/projects/{project.uuid}/archive/')
        self.assertEqual(res.status_code, 405)
class ProjectAuthorizationTests(TasksTestBase):
    def test_member_cannot_edit_or_archive_others_project(self):
        project = self.make_project()
        self.client.force_login(self.member)
        res = self.post_json(f'/tasks/projects/{project.uuid}/update/', {'name': 'Hijack'})
        self.assertEqual(res.status_code, 403)
        res = self.post_json(f'/tasks/projects/{project.uuid}/archive/', {})
        self.assertEqual(res.status_code, 403)
        project.refresh_from_db()
        self.assertEqual(project.name, 'Launch')
        self.assertFalse(project.is_archived)
    def test_member_can_view_but_not_edit(self):
        project = self.make_project()
        self.client.force_login(self.member)
        props = self.props(self.inertia_get(f'/tasks/projects/{project.uuid}/'))
        self.assertFalse(props['project']['permissions']['can_edit'])
    def test_old_settings_url_redirects_to_overview(self):
        project = self.make_project()
        self.client.force_login(self.admin)
        res = self.inertia_get(f'/tasks/projects/{project.uuid}/settings/')
        self.assertIn(res.status_code, (302, 409))
    def test_admin_can_edit_any_project(self):
        project = self.make_project()
        self.client.force_login(self.admin)
        res = self.post_json(f'/tasks/projects/{project.uuid}/update/', {'status': 'completed'})
        self.assertEqual(res.status_code, 200)
    def test_manage_projects_permission_grants_edit(self):
        from modules.users.models import Role, UserProfile
        role = Role.objects.create(name='PM', permissions=['manage_projects'])
        UserProfile.objects.update_or_create(user=self.member, defaults={'role': role})
        project = self.make_project()
        self.client.force_login(self.member)
        res = self.post_json(f'/tasks/projects/{project.uuid}/update/', {'name': 'Renamed'})
        self.assertEqual(res.status_code, 200)
    def test_anonymous_is_redirected(self):
        project = self.make_project()
        anon = Client()
        res = anon.get(f'/tasks/projects/{project.uuid}/')
        self.assertEqual(res.status_code, 302)
        self.assertIn('/login', res['Location'])
        res = self.post_json('/tasks/projects/new/', {'name': 'x'}, client=anon)
        self.assertNotEqual(res.status_code, 201)
        self.assertEqual(Project.objects.count(), 1)  # only the fixture project
    def test_unknown_project_404(self):
        import uuid
        res = self.post_json(f'/tasks/projects/{uuid.uuid4()}/update/', {'name': 'x'})
        self.assertEqual(res.status_code, 404)
class ProjectTaskTests(TasksTestBase):
    def test_create_task_within_project(self):
        project = self.make_project()
        res = self.post_json('/tasks/new/', {
            'title': 'Write copy', 'description': '<p>Do it</p>', 'project': str(project.uuid), 'status': 'in_progress',
        })
        self.assertEqual(res.status_code, 201, res.content)
        task = Task.objects.get(title='Write copy')
        self.assertEqual(task.project, project)
        self.assertEqual(task.status, Task.Status.IN_PROGRESS)
        self.assertEqual(res.json()['task']['project']['uuid'], str(project.uuid))
        self.assertTrue(project.activities.filter(activity_type=ProjectActivity.ActivityType.TASK_ADDED).exists())
    def test_cannot_create_task_in_archived_project(self):
        project = self.make_project(is_archived=True)
        res = self.post_json('/tasks/new/', {'title': 'x', 'description': 'y', 'project': str(project.uuid)})
        self.assertEqual(res.status_code, 400)
        self.assertFalse(Task.objects.exists())
    def test_unknown_project_rejected_for_task(self):
        import uuid
        res = self.post_json('/tasks/new/', {'title': 'x', 'description': 'y', 'project': str(uuid.uuid4())})
        self.assertEqual(res.status_code, 400)
        self.assertIn('project', res.json()['errors'])
    def test_link_existing_task_to_project(self):
        project = self.make_project()
        task = self.make_task()
        res = self.post_json(f'/tasks/{task.uuid}/update/', {'project': str(project.uuid)})
        self.assertEqual(res.status_code, 200, res.content)
        task.refresh_from_db()
        self.assertEqual(task.project, project)
        self.assertTrue(task.activities.filter(activity_type=TaskActivityStream.ActivityType.PROJECT_CHANGED).exists())
        # and remove it again
        res = self.post_json(f'/tasks/{task.uuid}/update/', {'project': None})
        self.assertEqual(res.status_code, 200)
        task.refresh_from_db()
        self.assertIsNone(task.project)
        self.assertTrue(project.activities.filter(activity_type=ProjectActivity.ActivityType.TASK_REMOVED).exists())
    def test_bulk_add_existing_tasks(self):
        project = self.make_project()
        t1, t2 = self.make_task(title='a'), self.make_task(title='b')
        res = self.post_json(f'/tasks/projects/{project.uuid}/add-tasks/', {'task_uuids': [str(t1.uuid), str(t2.uuid)]})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['moved'], 2)
        self.assertEqual(project.tasks.count(), 2)
    def test_task_in_archived_project_keeps_working(self):
        project = self.make_project()
        task = self.make_task(project=project)
        project.is_archived = True
        project.save()
        # Editing other fields on a task already in the archived project still works
        res = self.post_json(f'/tasks/{task.uuid}/update/', {'status': 'done', 'project': str(project.uuid)})
        self.assertEqual(res.status_code, 200, res.content)
        # But other tasks cannot be moved into it
        other = self.make_task(title='other')
        res = self.post_json(f'/tasks/{other.uuid}/update/', {'project': str(project.uuid)})
        self.assertEqual(res.status_code, 400)
    def test_progress_calculation(self):
        project = self.make_project()
        yesterday = timezone.localdate() - timedelta(days=1)
        self.make_task(project=project, status=Task.Status.DONE)
        self.make_task(project=project, status=Task.Status.DONE)
        self.make_task(project=project, status=Task.Status.TODO, due_date=yesterday)
        self.make_task(project=project, status=Task.Status.IN_PROGRESS)
        # Excluded from progress
        self.make_task(project=project, status=Task.Status.CANCELLED)
        self.make_task(project=project, status=Task.Status.DRAFT)
        # Not in project
        self.make_task(status=Task.Status.DONE)
        annotated = services.project_queryset().get(pk=project.pk)
        data = services.serialize_project(annotated)
        self.assertEqual(data['counts'], {'total': 4, 'done': 2, 'open': 2, 'overdue': 1})
        self.assertEqual(data['progress'], 50)
    def test_progress_empty_project(self):
        project = self.make_project()
        data = services.serialize_project(services.project_queryset().get(pk=project.pk))
        self.assertEqual(data['progress'], 0)
    def test_project_overview_and_tasks_pages(self):
        project = self.make_project()
        self.make_task(project=project, title='Alpha', priority='urgent')
        self.make_task(project=project, title='Beta', priority='low')
        self.make_task(title='Elsewhere')
        props = self.props(self.inertia_get(f'/tasks/projects/{project.uuid}/'))
        self.assertEqual(props['tab'], 'overview')
        self.assertTrue(props['activity'])
        props = self.props(self.inertia_get(f'/tasks/projects/{project.uuid}/tasks/', {'sort': 'priority'}))
        self.assertEqual([t['title'] for t in props['tasks']], ['Alpha', 'Beta'])
        props = self.props(self.inertia_get(f'/tasks/projects/{project.uuid}/tasks/', {'search': 'bet'}))
        self.assertEqual([t['title'] for t in props['tasks']], ['Beta'])
        props = self.props(self.inertia_get(f'/tasks/projects/{project.uuid}/tasks/', {'layout': 'board'}))
        self.assertEqual(len(props['tasks']), 2)
        self.assertTrue(props['boardColumns'])
class ProjectIndexTests(TasksTestBase):
    def test_search_filter_sort_and_pagination(self):
        today = timezone.localdate()
        self.make_project(name='Alpha', status=Project.Status.ACTIVE, target_date=today + timedelta(days=5))
        self.make_project(name='Beta', status=Project.Status.PLANNED, target_date=today + timedelta(days=1))
        self.make_project(name='Gamma', status=Project.Status.ACTIVE, owner=self.member)
        self.make_project(name='Old', is_archived=True)
        props = self.props(self.inertia_get('/tasks/projects/'))
        self.assertEqual({p['name'] for p in props['projects']}, {'Alpha', 'Beta', 'Gamma'})
        props = self.props(self.inertia_get('/tasks/projects/', {'status': 'active'}))
        self.assertEqual({p['name'] for p in props['projects']}, {'Alpha', 'Gamma'})
        props = self.props(self.inertia_get('/tasks/projects/', {'search': 'gam'}))
        self.assertEqual([p['name'] for p in props['projects']], ['Gamma'])
        props = self.props(self.inertia_get('/tasks/projects/', {'owner': self.member.id}))
        self.assertEqual([p['name'] for p in props['projects']], ['Gamma'])
        props = self.props(self.inertia_get('/tasks/projects/', {'sort': 'target_date'}))
        self.assertEqual([p['name'] for p in props['projects']], ['Beta', 'Alpha', 'Gamma'])
        props = self.props(self.inertia_get('/tasks/projects/', {'archived': '1'}))
        self.assertEqual([p['name'] for p in props['projects']], ['Old'])
        props = self.props(self.inertia_get('/tasks/projects/', {'per_page': 5, 'page': 1, 'sort': 'name'}))
        self.assertEqual(props['pagination']['total_count'], 3)
        counts = props['workspace']['project_counts']
        self.assertEqual(counts['all'], 3)
        self.assertEqual(counts['active'], 2)
        self.assertEqual(counts['archived'], 1)
class ExistingTaskBehaviourTests(TasksTestBase):
    def test_standalone_task_create_still_redirects_for_inertia_form(self):
        res = self.client.post('/tasks/new/', {'title': 'Plain', 'description': 'Body', 'priority': 'high'})
        self.assertEqual(res.status_code, 302)
        task = Task.objects.get(title='Plain')
        self.assertIsNone(task.project)
        self.assertEqual(task.priority, 'high')
        self.assertEqual(task.status, 'todo')
    def test_task_requires_title_and_description(self):
        res = self.post_json('/tasks/new/', {'title': 'x'})
        self.assertEqual(res.status_code, 400)
        self.assertIn('description', res.json()['errors'])
    def test_task_list_filters_and_views(self):
        project = self.make_project()
        today = timezone.localdate()
        mine = self.make_task(title='Mine', assignee=self.owner, project=project)
        self.make_task(title='Theirs', assignee=self.member, due_date=today - timedelta(days=2))
        self.make_task(title='Soon', due_date=today + timedelta(days=3), status=Task.Status.REVIEW)
        self.make_task(title='Hidden draft', status=Task.Status.DRAFT)
        props = self.props(self.inertia_get('/tasks/', {'view': 'all'}))
        self.assertEqual({t['title'] for t in props['tasks']}, {'Mine', 'Theirs', 'Soon'})
        props = self.props(self.inertia_get('/tasks/', {'view': 'my_tasks'}))
        self.assertEqual([t['title'] for t in props['tasks']], ['Mine'])
        props = self.props(self.inertia_get('/tasks/', {'view': 'overdue'}))
        self.assertEqual([t['title'] for t in props['tasks']], ['Theirs'])
        self.assertTrue(props['tasks'][0]['is_overdue'])
        props = self.props(self.inertia_get('/tasks/', {'view': 'due_soon'}))
        self.assertEqual([t['title'] for t in props['tasks']], ['Soon'])
        props = self.props(self.inertia_get('/tasks/', {'view': 'all', 'project': str(project.uuid)}))
        self.assertEqual([t['uuid'] for t in props['tasks']], [str(mine.uuid)])
        props = self.props(self.inertia_get('/tasks/', {'view': 'all', 'project': 'none'}))
        self.assertEqual({t['title'] for t in props['tasks']}, {'Theirs', 'Soon'})
        props = self.props(self.inertia_get('/tasks/', {'view': 'all', 'search': f'#{mine.id}'}))
        self.assertEqual([t['title'] for t in props['tasks']], ['Mine'])
        props = self.props(self.inertia_get('/tasks/', {'view': 'drafts'}))
        self.assertEqual([t['title'] for t in props['tasks']], ['Hidden draft'])
        counts = props['workspace']['task_counts']
        self.assertEqual(counts['all'], 3)
        self.assertEqual(counts['overdue'], 1)
        self.assertEqual(counts['drafts'], 1)
    def test_task_list_pagination(self):
        for i in range(7):
            self.make_task(title=f'T{i}')
        props = self.props(self.inertia_get('/tasks/', {'view': 'all', 'per_page': 5, 'page': 2}))
        self.assertEqual(props['pagination']['current_page'], 2)
        self.assertEqual(props['pagination']['total_count'], 7)
        self.assertEqual(len(props['tasks']), 2)
    def test_status_update_validated(self):
        task = self.make_task()
        res = self.post_json(f'/tasks/{task.uuid}/update/', {'status': 'nonsense'})
        self.assertEqual(res.status_code, 400)
        res = self.post_json(f'/tasks/{task.uuid}/update/', {'status': 'done'})
        self.assertEqual(res.status_code, 200)
        task.refresh_from_db()
        self.assertEqual(task.status, 'done')
        self.assertIsNotNone(task.completed_at)
    def test_assignee_must_exist(self):
        task = self.make_task()
        res = self.post_json(f'/tasks/{task.uuid}/update/', {'assignee': 999999})
        self.assertEqual(res.status_code, 400)
    def test_task_detail_and_api_include_project(self):
        project = self.make_project()
        task = self.make_task(project=project)
        props = self.props(self.inertia_get(f'/tasks/{task.uuid}/'))
        self.assertEqual(props['task']['project']['uuid'], str(project.uuid))
        res = self.client.get(f'/api/tasks/{task.uuid}/')
        self.assertEqual(res.json()['task']['project']['name'], 'Launch')
    def test_overview_page(self):
        today = timezone.localdate()
        self.make_task(title='Late', assignee=self.owner, due_date=today - timedelta(days=1))
        self.make_project(name='Active one')
        props = self.props(self.inertia_get('/tasks/overview/'))
        self.assertEqual([t['title'] for t in props['overdue']], ['Late'])
        self.assertEqual([p['name'] for p in props['activeProjects']], ['Active one'])
class TaskDetailTests(TasksTestBase):
    def test_related_tasks_on_task_page(self):
        project = self.make_project()
        task = self.make_task(title='Main', project=project, tags=['billing'])
        sibling = self.make_task(title='Sibling', project=project)
        done_sibling = self.make_task(title='Done sibling', project=project, status=Task.Status.DONE)
        tagged = self.make_task(title='Tagged', tags=['billing', 'ui'])
        self.make_task(title='Unrelated', tags=['other'])
        self.make_task(title='Draft sibling', project=project, status=Task.Status.DRAFT)
        props = self.props(self.inertia_get(f'/tasks/{task.uuid}/'))
        related = props['related_tasks']
        self.assertEqual([r['title'] for r in related], ['Sibling', 'Done sibling', 'Tagged'])
        self.assertEqual([r['relation'] for r in related], ['project', 'project', 'tags'])
        self.assertNotIn(str(task.uuid), [r['uuid'] for r in related])
        self.assertEqual(related[0]['uuid'], str(sibling.uuid))
        self.assertEqual(related[1]['uuid'], str(done_sibling.uuid))
        self.assertEqual(related[2]['uuid'], str(tagged.uuid))
    def test_task_without_relations_has_empty_related_list(self):
        task = self.make_task(title='Lonely')
        self.make_task(title='Other')
        props = self.props(self.inertia_get(f'/tasks/{task.uuid}/'))
        self.assertEqual(props['related_tasks'], [])
    def test_update_description(self):
        task = self.make_task(title='Doc')
        res = self.post_json(f'/tasks/{task.uuid}/update/', {'description': '<p>New body</p>'})
        self.assertEqual(res.status_code, 200)
        task.refresh_from_db()
        self.assertEqual(task.description, '<p>New body</p>')
    def test_update_rejects_blank_description(self):
        task = self.make_task(title='Doc', description='<p>Keep</p>')
        res = self.post_json(f'/tasks/{task.uuid}/update/', {'description': '   '})
        self.assertEqual(res.status_code, 400)
        task.refresh_from_db()
        self.assertEqual(task.description, '<p>Keep</p>')
class TaskConversionTests(TasksTestBase):
    def setUp(self):
        super().setUp()
        from unittest.mock import patch
        for target in (
            'modules.ticket.signals.send_ticket_email_task.delay',
            'modules.ticket.signals.send_group_assignment_notification_task.delay',
        ):
            patcher = patch(target)
            patcher.start()
            self.addCleanup(patcher.stop)
    def make_ticket(self, **kwargs):
        from modules.ticket.models import Ticket
        defaults = {'title': 'Printer down', 'description': 'It is down', 'requester': self.member, 'source': 'internal'}
        defaults.update(kwargs)
        return Ticket.objects.create(**defaults)
    def test_convert_task_to_ticket(self):
        task = self.make_task(title='Fix printer', assignee=self.member, priority='high')
        task.watchers.add(self.admin)
        response = self.post_json(f'/tasks/{task.uuid}/convert-to-ticket/', {'complete_task': True})
        self.assertEqual(response.status_code, 201, response.content)
        task.refresh_from_db()
        ticket = task.converted_to_ticket
        self.assertIsNotNone(ticket)
        self.assertEqual(ticket.title, 'Fix printer')
        self.assertEqual(ticket.priority, 'high')
        self.assertEqual(ticket.assignee, self.member)
        self.assertEqual(ticket.requester, self.owner)
        self.assertIn(self.admin, ticket.watchers.all())
        self.assertEqual(task.status, Task.Status.DONE)
        self.assertTrue(task.activities.filter(activity_type='converted_to_ticket').exists())
    def test_convert_task_to_ticket_twice_is_rejected(self):
        task = self.make_task()
        self.assertEqual(self.post_json(f'/tasks/{task.uuid}/convert-to-ticket/', {}).status_code, 201)
        response = self.post_json(f'/tasks/{task.uuid}/convert-to-ticket/', {})
        self.assertEqual(response.status_code, 400)
        self.assertIn('task', response.json()['errors'])
    def test_convert_task_to_ticket_rejects_bad_priority(self):
        task = self.make_task()
        response = self.post_json(f'/tasks/{task.uuid}/convert-to-ticket/', {'priority': 'nope'})
        self.assertEqual(response.status_code, 400)
        self.assertIn('priority', response.json()['errors'])
    def test_convert_task_to_work_item(self):
        ticket = self.make_ticket()
        task = self.make_task(title='Replace toner', status='in_progress', related_ticket=ticket)
        response = self.post_json(f'/tasks/{task.uuid}/convert-to-work-item/', {})
        self.assertEqual(response.status_code, 201, response.content)
        task.refresh_from_db()
        item = task.converted_to_work_item
        self.assertEqual(item.ticket, ticket)
        self.assertEqual(item.title, 'Replace toner')
        self.assertEqual(item.status, 'in_progress')
        self.assertEqual(task.status, Task.Status.IN_PROGRESS)
    def test_convert_to_work_item_on_chosen_ticket(self):
        ticket = self.make_ticket()
        task = self.make_task()
        response = self.post_json(
            f'/tasks/{task.uuid}/convert-to-work-item/', {'ticket_uuid': str(ticket.uuid), 'title': 'Custom'}
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(ticket.work_items.get().title, 'Custom')
    def test_convert_to_work_item_requires_ticket(self):
        task = self.make_task()
        response = self.post_json(f'/tasks/{task.uuid}/convert-to-work-item/', {})
        self.assertEqual(response.status_code, 400)
        self.assertIn('ticket_uuid', response.json()['errors'])
    def test_convert_to_work_item_twice_is_rejected(self):
        ticket = self.make_ticket()
        task = self.make_task()
        payload = {'ticket_uuid': str(ticket.uuid)}
        self.assertEqual(self.post_json(f'/tasks/{task.uuid}/convert-to-work-item/', payload).status_code, 201)
        response = self.post_json(f'/tasks/{task.uuid}/convert-to-work-item/', payload)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(ticket.work_items.count(), 1)
    def test_task_view_exposes_conversions(self):
        ticket = self.make_ticket()
        task = self.make_task()
        self.post_json(f'/tasks/{task.uuid}/convert-to-work-item/', {'ticket_uuid': str(ticket.uuid)})
        props = self.props(self.inertia_get(f'/tasks/{task.uuid}/'))
        self.assertEqual(props['task']['converted_to_work_item']['ticket']['uuid'], str(ticket.uuid))
