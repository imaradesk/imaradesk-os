from django.db import migrations

OLD_ENTRIES = ['check-sla-breach-warnings', 'handle-sla-breaches']


def remove_old_entries(apps, schema_editor):
    PeriodicTask = apps.get_model('django_celery_beat', 'PeriodicTask')
    PeriodicTask.objects.filter(name__in=OLD_ENTRIES).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('sla', '0002_rename_sla_tickets_policy__67c3cf_idx_sla_ticket_policy__3eb3e7_idx_and_more'),
        ('django_celery_beat', '__first__'),
    ]

    operations = [migrations.RunPython(remove_old_entries, migrations.RunPython.noop)]
