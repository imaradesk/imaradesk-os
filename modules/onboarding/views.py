import json

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import redirect
from django.utils import timezone
from django.views.decorators.http import require_http_methods
from inertia import inertia

from .models import OnboardingProgress


@login_required
@inertia('QuickStart')
def quick_start(request):
    """Quick start onboarding page. Only accessible by admins."""
    user = request.user
    is_admin = user.is_superuser or (
        hasattr(user, 'profile') and 
        user.profile.role and 
        user.profile.role.name == 'Administrator'
    )
    
    if not is_admin:
        return redirect('/dashboard/')
    
    progress, _ = OnboardingProgress.objects.get_or_create(user=request.user)
    if progress.is_complete:
        return redirect('/dashboard/')
    return {}


@login_required
@require_http_methods(["GET"])
def get_status(request):
    """Get onboarding status for the current user."""
    progress, _ = OnboardingProgress.objects.get_or_create(user=request.user)

    return JsonResponse({
        'success': True,
        'onboarding': {
            'is_complete': progress.is_complete,
            'current_step': progress.current_step,
            'steps': progress.get_step_status(),
            'data': {
                'modules': progress.modules_data,
                'users_groups': progress.users_groups_data,
                'sla': progress.sla_data,
                'emails_smtp': progress.emails_smtp_data,
                'notifications': progress.notifications_data,
            },
        },
    })


@login_required
@require_http_methods(["GET"])
def get_modules(request):
    """Get available modules/apps for the modules step."""
    from modules.settings.models import App, InstalledApp

    apps_qs = App.objects.filter(status__in=['active', 'beta'])
    installed_ids = set(
        InstalledApp.objects.filter(is_active=True).values_list('app_id', flat=True)
    )

    apps = []
    for app in apps_qs:
        apps.append({
            'id': app.id,
            'name': app.name,
            'slug': app.slug,
            'description': app.description,
            'icon': app.icon,
            'category': app.category,
            'is_free': app.is_free,
            'is_installed': app.id in installed_ids,
        })

    return JsonResponse({'success': True, 'apps': apps})


@login_required
@require_http_methods(["POST"])
def save_modules(request):
    """Save modules step - activate/deactivate modules."""
    from modules.settings.models import App, InstalledApp

    body = json.loads(request.body)
    app_ids = body.get('app_ids', [])

    installed_count = 0
    for app_id in app_ids:
        try:
            app = App.objects.get(id=app_id)
            existing = InstalledApp.objects.filter(app=app).first()
            if existing:
                if not existing.is_active:
                    existing.is_active = True
                    existing.uninstalled_at = None
                    existing.save(update_fields=['is_active', 'uninstalled_at'])
                    installed_count += 1
            else:
                InstalledApp.objects.create(
                    app=app,
                    is_active=True,
                    subscription_status='active' if app.is_free else 'trial',
                )
                installed_count += 1
        except App.DoesNotExist:
            continue

    progress, _ = OnboardingProgress.objects.get_or_create(user=request.user)
    progress.modules_completed = True
    progress.modules_data = {'app_ids': app_ids, 'installed_count': installed_count}
    if progress.current_step < 2:
        progress.current_step = 2
    progress.save(update_fields=['modules_completed', 'modules_data', 'current_step', 'updated_at'])

    return JsonResponse({'success': True, 'installed_count': installed_count})


@login_required
@require_http_methods(["GET"])
def get_channels(request):
    """Get available channels for the channels step."""
    from modules.settings.models import Channel

    channels_qs = Channel.objects.all().order_by('id')
    channels = []
    for ch in channels_qs:
        channels.append({
            'id': ch.id,
            'name': ch.name,
            'slug': ch.channel_id,
            'description': ch.description or '',
            'is_activated': ch.is_activated,
        })

    return JsonResponse({'success': True, 'channels': channels})


@login_required
@require_http_methods(["POST"])
def save_channels(request):
    """Save channels step - activate/deactivate channels."""
    from modules.settings.models import Channel

    body = json.loads(request.body)
    channels_data = body.get('channels', [])

    updated_count = 0
    for ch_data in channels_data:
        try:
            channel = Channel.objects.get(id=ch_data['id'])
            channel.is_activated = ch_data.get('is_activated', False)
            channel.save(update_fields=['is_activated'])
            updated_count += 1
        except Channel.DoesNotExist:
            continue

    progress, _ = OnboardingProgress.objects.get_or_create(user=request.user)
    progress.channels_completed = True
    progress.channels_data = {'updated_count': updated_count}
    if progress.current_step < 3:
        progress.current_step = 3
    progress.save(update_fields=['channels_completed', 'channels_data', 'current_step', 'updated_at'])

    return JsonResponse({'success': True, 'updated_count': updated_count})


@login_required
@require_http_methods(["GET"])
def get_groups(request):
    """Get existing groups for the agents step."""
    from modules.users.models import Group

    groups_list = list(
        Group.objects.all().values('id', 'name', 'description')
    )
    return JsonResponse({'success': True, 'groups': groups_list})


@login_required
@require_http_methods(["POST"])
def save_users_groups(request):
    """Save users & groups step."""
    from modules.users.models import Group, UserProfile
    from django.contrib.auth import get_user_model
    import secrets
    import string

    User = get_user_model()
    body = json.loads(request.body)
    groups = body.get('groups', [])
    users = body.get('users', [])

    created_groups = []
    for g in groups:
        name = g.get('name', '').strip()
        if name:
            group, created = Group.objects.get_or_create(
                name=name,
                defaults={'description': g.get('description', '')},
            )
            created_groups.append({'id': group.id, 'name': group.name, 'created': created})

    created_users = []
    for u in users:
        email = u.get('email', '').strip().lower()
        full_name = u.get('full_name', '').strip()
        if not email:
            continue
        if User.objects.filter(email=email).exists():
            continue

        username = email.split('@')[0]
        base_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        alphabet = string.ascii_letters + string.digits
        password = ''.join(secrets.choice(alphabet) for _ in range(12))

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
        )
        name_parts = full_name.split(' ', 1)
        user.first_name = name_parts[0] if name_parts else ''
        user.last_name = name_parts[1] if len(name_parts) > 1 else ''
        user.save(update_fields=['first_name', 'last_name'])

        profile = UserProfile.objects.create(
            user=user,
            full_name=full_name,
            is_agent=True,
            is_customer=False,
        )

        # Assign groups
        group_ids = u.get('group_ids', [])
        if group_ids:
            profile.groups.set(Group.objects.filter(id__in=group_ids))

        created_users.append({
            'id': user.id,
            'email': email,
            'full_name': full_name,
        })

    progress, _ = OnboardingProgress.objects.get_or_create(user=request.user)
    progress.users_groups_completed = True
    progress.users_groups_data = {
        'groups_created': len([g for g in created_groups if g['created']]),
        'users_created': len(created_users),
    }
    if progress.current_step < 4:
        progress.current_step = 4
    progress.save(update_fields=['users_groups_completed', 'users_groups_data', 'current_step', 'updated_at'])

    return JsonResponse({
        'success': True,
        'groups': created_groups,
        'users': created_users,
    })


@login_required
@require_http_methods(["POST"])
def save_sla(request):
    """Save SLA step - configure SLA policies."""
    from modules.sla.models import SLASettings, SLAPolicy

    body = json.loads(request.body)
    enable_sla = body.get('enable_sla', False)
    policies = body.get('policies', [])

    settings_obj = SLASettings.get_settings()
    settings_obj.enabled = enable_sla
    settings_obj.save(update_fields=['enabled', 'updated_at'])

    updated_policies = 0
    for p in policies:
        priority = p.get('priority', '').lower()
        if priority not in ['critical', 'high', 'medium', 'low']:
            continue
        first_response = int(p.get('first_response_time', 60))
        resolution = int(p.get('resolution_time', 480))
        policy, _ = SLAPolicy.objects.get_or_create(
            priority=priority,
            defaults={
                'name': f"{priority.title()} Priority SLA",
                'status': 'active',
                'first_response_time': first_response,
                'resolution_time': resolution,
            },
        )
        policy.first_response_time = first_response
        policy.resolution_time = resolution
        policy.status = 'active' if enable_sla else 'inactive'
        policy.save()
        updated_policies += 1

    progress, _ = OnboardingProgress.objects.get_or_create(user=request.user)
    progress.sla_completed = True
    progress.sla_data = {'enabled': enable_sla, 'policies_updated': updated_policies}
    if progress.current_step < 5:
        progress.current_step = 5
    progress.save(update_fields=['sla_completed', 'sla_data', 'current_step', 'updated_at'])

    return JsonResponse({'success': True, 'policies_updated': updated_policies})


@login_required
@require_http_methods(["POST"])
def save_emails_smtp(request):
    """Save SMTP step - store config in onboarding progress for OS."""
    body = json.loads(request.body)

    # OS doesn't have a separate SMTP model; store in onboarding progress
    progress, _ = OnboardingProgress.objects.get_or_create(user=request.user)
    progress.emails_smtp_completed = True
    progress.emails_smtp_data = {
        'host': body.get('host', ''),
        'port': body.get('port', 587),
        'username': body.get('username', ''),
        'use_tls': body.get('use_tls', True),
        'use_ssl': body.get('use_ssl', False),
        'default_from_email': body.get('default_from_email', ''),
        'sender_name': body.get('sender_name', ''),
        'reply_to_email': body.get('reply_to_email', ''),
        'configured': bool(body.get('host')),
    }
    if progress.current_step < 6:
        progress.current_step = 6
    progress.save(update_fields=['emails_smtp_completed', 'emails_smtp_data', 'current_step', 'updated_at'])

    return JsonResponse({'success': True, 'smtp_configured': bool(body.get('host'))})


@login_required
@require_http_methods(["POST"])
def save_notifications(request):
    """Save notifications step."""
    from modules.settings.models import NotificationSettings

    body = json.loads(request.body)
    preferences = body.get('preferences', {})

    settings_obj, _ = NotificationSettings.objects.get_or_create(pk=1)

    # Map frontend keys to model fields
    field_mapping = {
        'email_new_ticket': 'notify_new_ticket_created',
        'email_ticket_assigned': 'notify_ticket_assigned',
        'email_ticket_reply': 'notify_new_comment',
        'email_ticket_resolved': 'notify_ticket_status_changed',
        'email_sla_breach': 'notify_sla_response_breached',
    }

    update_fields = []
    for frontend_key, model_field in field_mapping.items():
        if frontend_key in preferences and hasattr(settings_obj, model_field):
            setattr(settings_obj, model_field, preferences[frontend_key])
            update_fields.append(model_field)

    if update_fields:
        settings_obj.save(update_fields=update_fields)

    progress, _ = OnboardingProgress.objects.get_or_create(user=request.user)
    progress.notifications_completed = True
    progress.notifications_data = preferences
    if progress.current_step < 7:
        progress.current_step = 7
    progress.save(update_fields=['notifications_completed', 'notifications_data', 'current_step', 'updated_at'])

    return JsonResponse({'success': True})


@login_required
@require_http_methods(["POST"])
def skip_step(request):
    """Skip a step and move to the next one."""
    body = json.loads(request.body)
    step = body.get('step', 1)

    progress, _ = OnboardingProgress.objects.get_or_create(user=request.user)
    if step < 7 and progress.current_step <= step:
        progress.current_step = step + 1
    progress.save(update_fields=['current_step', 'updated_at'])

    return JsonResponse({'success': True, 'current_step': progress.current_step})


@login_required
@require_http_methods(["POST"])
def complete(request):
    """Mark onboarding as complete."""
    progress, _ = OnboardingProgress.objects.get_or_create(user=request.user)
    progress.is_complete = True
    progress.completed_at = timezone.now()
    progress.save(update_fields=['is_complete', 'completed_at', 'updated_at'])

    return JsonResponse({'success': True})
