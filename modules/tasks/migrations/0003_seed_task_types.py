from django.db import migrations

DEFAULTS = [
    ('Task', 'check-square', 'blue'),
    ('Bug', 'bug', 'red'),
    ('Feature', 'sparkles', 'emerald'),
    ('Improvement', 'trending-up', 'violet'),
    ('Chore', 'wrench', 'slate'),
]


def seed_task_types(apps, schema_editor):
    TaskType = apps.get_model('tasks', 'TaskType')
    Task = apps.get_model('tasks', 'Task')
    types = [
        TaskType.objects.get_or_create(
            name=name, defaults={'icon': icon, 'color': color, 'position': position},
        )[0]
        for position, (name, icon, color) in enumerate(DEFAULTS)
    ]
    # Tasks that predate types fall back to the first type
    Task.objects.filter(task_type__isnull=True).update(task_type=types[0])


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0002_tasktype_task_converted_to_ticket_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_task_types, migrations.RunPython.noop),
    ]
