from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import redirect
from django.views.decorators.http import require_http_methods, require_POST, require_GET
from inertia import inertia
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from modules.users.models import UserProfile, Organization, Role, Group
from modules.users.permissions import Permission
from modules.users.invitations import is_agent_role
from modules.sla.models import SLAPolicy, BusinessHours, Holiday
from modules.tickets.views import invalidate_views_cache
from .models import App, InstalledApp, SecuritySettings
from shared.utilities.organization import organization_name
from shared.utilities.sanitization import sanitize_plain_text
from shared.utilities.uploads import UploadError, store_image_data
from shared.decorators import admin_required
import json
import math
import logging

logger = logging.getLogger(__name__)

User = get_user_model()


@login_required
@admin_required
@inertia('SettingsHome')
def settings_home(request):
    """Administration landing page: a grid of all settings areas."""
    return {}


def _account_overview():
    """Usage figures for the Account page."""
    from modules.ticket.models import Ticket

    now = timezone.now()
    return {
        'users': User.objects.filter(is_active=True).count(),
        'agents': UserProfile.objects.filter(is_agent=True, user__is_active=True).count(),
        'tickets': Ticket.objects.count(),
        'tickets_this_month': Ticket.objects.filter(
            created_at__gte=now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        ).count(),
    }


@login_required
@admin_required
@inertia('Settings')
def general_settings(request):
    """General settings page."""
    from django.conf import settings
    from shared.models import Client
    from modules.email_to_ticket.models import HelpEmail

    client = Client.get_current()
    business_hours = BusinessHours.objects.filter(is_active=True).first()
    help_email = HelpEmail.objects.first()

    business_data = {
        'company_name': client.name,
        'description': client.description,
        'business_type': client.business_type,
        'org_size': client.org_size,
        'domain': client.domain_url or request.get_host(),
        'created_on': client.created_on.isoformat() if client.created_on else None,
        'help_email': help_email.email_address if help_email else None,
        'logo_url': client.logo_url,
        'subdomain': '',
    }

    business_hours_data = None
    if business_hours:
        business_hours_data = {
            'id': business_hours.id,
            'name': business_hours.name,
            'timezone': business_hours.timezone,
            'monday_start': str(business_hours.monday_start) if business_hours.monday_start else None,
            'monday_end': str(business_hours.monday_end) if business_hours.monday_end else None,
            'tuesday_start': str(business_hours.tuesday_start) if business_hours.tuesday_start else None,
            'tuesday_end': str(business_hours.tuesday_end) if business_hours.tuesday_end else None,
            'wednesday_start': str(business_hours.wednesday_start) if business_hours.wednesday_start else None,
            'wednesday_end': str(business_hours.wednesday_end) if business_hours.wednesday_end else None,
            'thursday_start': str(business_hours.thursday_start) if business_hours.thursday_start else None,
            'thursday_end': str(business_hours.thursday_end) if business_hours.thursday_end else None,
            'friday_start': str(business_hours.friday_start) if business_hours.friday_start else None,
            'friday_end': str(business_hours.friday_end) if business_hours.friday_end else None,
            'saturday_start': str(business_hours.saturday_start) if business_hours.saturday_start else None,
            'saturday_end': str(business_hours.saturday_end) if business_hours.saturday_end else None,
            'sunday_start': str(business_hours.sunday_start) if business_hours.sunday_start else None,
            'sunday_end': str(business_hours.sunday_end) if business_hours.sunday_end else None,
        }
    
    return {
        'activeSection': 'general',
        'business': business_data,
        'account': _account_overview(),
        'businessHours': business_hours_data,
    }


@login_required
@admin_required
@require_http_methods(["POST"])
def update_business_info(request):
    """Update business/company information."""
    from shared.models import Client

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)
    if not isinstance(data, dict):
        return JsonResponse({'success': False, 'error': 'Invalid request'}, status=400)

    client = Client.get_current()
    fields = ('description', 'business_type', 'org_size')
    if 'company_name' in data:
        name = sanitize_plain_text(str(data['company_name'] or '')).strip()
        if not name:
            return JsonResponse({'success': False, 'error': 'Company name is required'}, status=400)
        client.name = name[:100]
    for field in fields:
        if field in data:
            value = sanitize_plain_text(str(data[field] or ''))
            limit = client._meta.get_field(field).max_length
            setattr(client, field, value[:limit] if limit else value)
    client.save()

    return JsonResponse({
        'success': True,
        'message': 'Business information updated successfully',
        'business': {
            'company_name': client.name,
            'description': client.description,
            'business_type': client.business_type,
            'org_size': client.org_size,
        }
    })


@login_required
@admin_required
@require_http_methods(["POST"])
def update_business_logo(request):
    """Update business/company logo. Body: {"logo": "<data url>"}."""
    from shared.models import Client

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)

    logo_data = data.get('logo') if isinstance(data, dict) else None
    if not logo_data:
        return JsonResponse({'success': False, 'error': 'No logo data provided'}, status=400)

    try:
        logo_url = store_image_data(logo_data, 'logo', 'logos')
    except UploadError as exc:
        return JsonResponse({'success': False, 'error': exc.message}, status=exc.status)

    client = Client.get_current()
    client.logo_url = logo_url
    client.save(update_fields=['logo_url'])
    return JsonResponse({'success': True, 'message': 'Logo updated successfully', 'logo_url': logo_url})


@login_required
@admin_required
@require_http_methods(["POST"])
def remove_business_logo(request):
    """Remove business/company logo."""
    from shared.models import Client

    client = Client.get_current()
    client.logo_url = None
    client.save(update_fields=['logo_url'])
    return JsonResponse({'success': True, 'message': 'Logo removed successfully'})


@login_required
@admin_required
@inertia('Settings')
def notifications_settings(request):
    """Notifications settings page."""
    from .models import NotificationSettings
    from shared.utilities.enums.notifications import NotificationsRegistry
    
    # Get business notification settings (singleton)
    settings = NotificationSettings.get_settings()
    
    # Build notification_modules from registry
    notification_modules = NotificationsRegistry.get_modules_with_items()
    
    # Build preferences dict from all registered fields
    notification_preferences = {}
    for field in NotificationsRegistry.get_all_fields():
        notification_preferences[field] = getattr(settings, field, False)
    notification_preferences['weekly_performance_report'] = settings.weekly_performance_report
    notification_preferences['weekly_report_email'] = settings.weekly_report_email or request.user.email
    
    # Check which modules are installed
    installed_modules = {
        'tasks': False,
        'kb': False,
        'assets': False,
        'surveys': False,
    }
    
    # Check for Tasks module
    tasks_app = App.objects.filter(slug='tasks-projects').first()
    if tasks_app:
        installed_modules['tasks'] = InstalledApp.objects.filter(app=tasks_app, is_active=True).exists()
    
    # Check for KB module
    kb_app = App.objects.filter(slug='knowledge-base').first()
    if kb_app:
        installed_modules['kb'] = InstalledApp.objects.filter(app=kb_app, is_active=True).exists()
    
    # Check for Assets module
    assets_app = App.objects.filter(slug='assets').first()
    if assets_app:
        installed_modules['assets'] = InstalledApp.objects.filter(app=assets_app, is_active=True).exists()
    
    # Check for Surveys module
    surveys_app = App.objects.filter(slug='surveys').first()
    if surveys_app:
        installed_modules['surveys'] = InstalledApp.objects.filter(app=surveys_app, is_active=True).exists()
    
    return {
        'activeSection': 'notifications',
        'installedModules': installed_modules,
        'notification_modules': notification_modules,
        'notification_preferences': notification_preferences,
        'user_email': request.user.email,
    }


@login_required
@admin_required
@require_http_methods(["POST"])
def notifications_settings_update(request):
    """Update business notification settings."""
    from .models import NotificationSettings
    
    try:
        data = json.loads(request.body)
        settings = NotificationSettings.get_settings()
        
        # Notification fields
        notification_fields = [
            # Ticket Notifications
            'notify_new_ticket_created',
            'notify_ticket_assigned',
            'notify_ticket_status_changed',
            'notify_ticket_priority_changed',
            'notify_new_comment',
            'notify_ticket_merged',
            # Task Notifications
            'notify_task_assigned',
            'notify_task_status_changed',
            'notify_task_comment',
            'notify_task_due_soon',
            'notify_task_overdue',
            # KB Notifications
            'notify_kb_article_updated',
            'notify_kb_article_approved',
            # Asset Notifications
            'notify_asset_assigned',
            'notify_asset_status_changed',
            'notify_asset_maintenance_due',
            'notify_asset_warranty_expiring',
            # Survey Notifications
            'notify_survey_response',
            'notify_survey_completed',
            'notify_survey_reminder',
            # SLA Notifications
            'notify_sla_resolution_warning',
            'notify_sla_resolution_breached',
            # General Notifications
            'notify_ticket_mentioned',
            # Reports
            'weekly_performance_report',
        ]
        
        for field in notification_fields:
            if field in data:
                setattr(settings, field, data[field])
        
        # Handle weekly_report_email
        if 'weekly_report_email' in data:
            settings.weekly_report_email = data['weekly_report_email'] if data['weekly_report_email'] else None
        
        settings.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Notification settings saved successfully'
        })
    except Exception as e:
        logger.exception('Request failed')
        logger.error(f"Error updating notification settings: {e}")
        return JsonResponse({
            'success': False,
            'message': 'Something went wrong. Please try again.'
        }, status=400)


@login_required
@admin_required
@inertia('SecuritySettings')
def security_settings(request):
    """Security settings page."""
    settings = SecuritySettings.get_settings()
    profile = request.user.profile if hasattr(request.user, 'profile') else None
    
    return {
        'security_settings': {
            # Two-Factor Authentication Methods
            'enable_email_2fa': settings.enable_email_2fa,
            'enable_authenticator_2fa': settings.enable_authenticator_2fa,
            
            # 2FA Requirements
            'require_2fa_for_admins': settings.require_2fa_for_admins,
            'require_2fa_for_all_users': settings.require_2fa_for_all_users,
        },
        'auth': {
            'user': {
                'email': request.user.email,
                'email_2fa_enabled': profile.email_2fa_enabled if profile else False,
                'authenticator_2fa_enabled': profile.authenticator_2fa_enabled if profile else False,
            }
        }
    }


@login_required
@admin_required
@require_http_methods(["POST"])
def security_settings_update(request):
    """Update security settings."""
    try:
        settings = SecuritySettings.get_settings()
        data = json.loads(request.body)
        
        # Update settings
        for field, value in data.items():
            if hasattr(settings, field):
                setattr(settings, field, value)
        
        settings.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Security settings saved successfully'
        })
    except Exception as e:
        logger.exception('Request failed')
        return JsonResponse({
            'success': False,
            'message': 'Something went wrong. Please try again.'
        }, status=400)


# ============ Two-Factor Authentication Views ============

@login_required
@require_http_methods(["POST"])
def send_email_2fa_code(request):
    """Send 2FA verification code to user's email."""
    import random
    from shared.utilities.Mailer import Mailer
    from shared.utilities.templates import GlobalEmailTemplates
    
    try:
        profile = request.user.profile
        
        # Generate 6-digit code
        code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
        
        # Store code with expiration (10 minutes)
        profile.email_2fa_code = code
        profile.email_2fa_code_expires = timezone.now() + timedelta(minutes=10)
        profile.save()
        
        # Send email using Mailer with GlobalEmailTemplates
        template = GlobalEmailTemplates.TWO_FA_ENABLE_CODE
        mailer = Mailer()
        mailer.send_raw_email(
            to_email=request.user.email,
            subject=template['subject'],
            body_html=template['body_html'],
            body_text=template['body_text'],
            context={
                'user_name': profile.full_name or request.user.username,
                'code': code,
            },
            fail_silently=False,
        )
        
        return JsonResponse({
            'success': True,
            'message': 'Verification code sent'
        })
    except Exception as e:
        logger.error(f"Failed to send 2FA email: {e}")
        return JsonResponse({
            'success': False,
            'message': 'Failed to send verification code'
        }, status=500)


@login_required
@require_http_methods(["POST"])
def verify_email_2fa_code(request):
    """Verify email 2FA code and enable email 2FA."""
    try:
        data = json.loads(request.body)
        code = data.get('code', '')
        
        profile = request.user.profile
        
        # Check if code matches and not expired
        if not profile.email_2fa_code:
            return JsonResponse({
                'success': False,
                'message': 'No verification code found. Please request a new one.'
            }, status=400)
        
        if profile.email_2fa_code_expires and profile.email_2fa_code_expires < timezone.now():
            return JsonResponse({
                'success': False,
                'message': 'Verification code has expired. Please request a new one.'
            }, status=400)
        
        if profile.email_2fa_code != code:
            return JsonResponse({
                'success': False,
                'message': 'Invalid verification code'
            }, status=400)
        
        # Enable email 2FA
        profile.email_2fa_enabled = True
        profile.email_2fa_code = ''
        profile.email_2fa_code_expires = None
        profile.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Email 2FA enabled successfully'
        })
    except Exception as e:
        logger.error(f"Failed to verify email 2FA: {e}")
        return JsonResponse({
            'success': False,
            'message': 'Failed to verify code'
        }, status=500)


@login_required
@require_http_methods(["POST"])
def setup_authenticator_2fa(request):
    """Generate TOTP secret and QR code for authenticator app setup."""
    import pyotp
    import qrcode
    import base64
    from io import BytesIO
    
    try:
        profile = request.user.profile
        
        # Generate new TOTP secret
        secret = pyotp.random_base32()
        
        # Store secret temporarily (will be saved on verification)
        profile.totp_secret = secret
        profile.save()
        
        # Generate provisioning URI
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(
            name=request.user.email,
            issuer_name='Imaradesk'
        )
        
        # Generate QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color='black', back_color='white')
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        # Format secret for display (add spaces every 4 characters)
        formatted_secret = ' '.join([secret[i:i+4] for i in range(0, len(secret), 4)])
        
        return JsonResponse({
            'success': True,
            'qr_code': f'data:image/png;base64,{qr_code_base64}',
            'secret_key': formatted_secret
        })
    except Exception as e:
        logger.error(f"Failed to setup authenticator 2FA: {e}")
        return JsonResponse({
            'success': False,
            'message': 'Failed to generate QR code'
        }, status=500)


@login_required
@require_http_methods(["POST"])
def verify_authenticator_2fa(request):
    """Verify TOTP code and enable authenticator 2FA."""
    import pyotp
    
    try:
        data = json.loads(request.body)
        code = data.get('code', '')
        
        profile = request.user.profile
        
        if not profile.totp_secret:
            return JsonResponse({
                'success': False,
                'message': 'No authenticator setup found. Please set up again.'
            }, status=400)
        
        # Verify TOTP code
        totp = pyotp.TOTP(profile.totp_secret)
        if not totp.verify(code):
            return JsonResponse({
                'success': False,
                'message': 'Invalid verification code'
            }, status=400)
        
        # Enable authenticator 2FA
        profile.authenticator_2fa_enabled = True
        profile.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Authenticator 2FA enabled successfully'
        })
    except Exception as e:
        logger.error(f"Failed to verify authenticator 2FA: {e}")
        return JsonResponse({
            'success': False,
            'message': 'Failed to verify code'
        }, status=500)


@login_required
@require_http_methods(["POST"])
def send_disable_2fa_code(request):
    """Send confirmation code to disable 2FA."""
    import random
    from shared.utilities.Mailer import Mailer
    from shared.utilities.templates import GlobalEmailTemplates
    
    try:
        data = json.loads(request.body)
        method = data.get('method', 'email')  # 'email' or 'authenticator'
        
        profile = request.user.profile
        
        # Check if the method is actually enabled
        if method == 'email' and not profile.email_2fa_enabled:
            return JsonResponse({
                'success': False,
                'message': 'Email 2FA is not enabled'
            }, status=400)
        
        if method == 'authenticator' and not profile.authenticator_2fa_enabled:
            return JsonResponse({
                'success': False,
                'message': 'Authenticator 2FA is not enabled'
            }, status=400)
        
        # Generate 6-digit code
        code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
        
        # Store code with expiration (10 minutes)
        profile.email_2fa_code = code
        profile.email_2fa_code_expires = timezone.now() + timedelta(minutes=10)
        profile.save()
        
        # Send email using Mailer with GlobalEmailTemplates
        template = GlobalEmailTemplates.TWO_FA_DISABLE_CODE
        mailer = Mailer()
        mailer.send_raw_email(
            to_email=request.user.email,
            subject=template['subject'],
            body_html=template['body_html'],
            body_text=template['body_text'],
            context={
                'user_name': profile.full_name or request.user.username,
                'code': code,
            },
            fail_silently=False,
        )
        
        return JsonResponse({
            'success': True,
            'message': 'Confirmation code sent to your email'
        })
    except Exception as e:
        logger.error(f"Failed to send disable 2FA email: {e}")
        return JsonResponse({
            'success': False,
            'message': 'Failed to send confirmation code'
        }, status=500)


@login_required
@require_http_methods(["POST"])
def disable_email_2fa(request):
    """Disable email 2FA after code verification."""
    try:
        data = json.loads(request.body)
        code = data.get('code', '')
        
        profile = request.user.profile
        
        # Check if email 2FA is enabled
        if not profile.email_2fa_enabled:
            return JsonResponse({
                'success': False,
                'message': 'Email 2FA is not enabled'
            }, status=400)
        
        # Check if code matches and not expired
        if not profile.email_2fa_code:
            return JsonResponse({
                'success': False,
                'message': 'No confirmation code found. Please request a new one.'
            }, status=400)
        
        if profile.email_2fa_code_expires and profile.email_2fa_code_expires < timezone.now():
            return JsonResponse({
                'success': False,
                'message': 'Confirmation code has expired. Please request a new one.'
            }, status=400)
        
        if profile.email_2fa_code != code:
            return JsonResponse({
                'success': False,
                'message': 'Invalid confirmation code'
            }, status=400)
        
        # Disable email 2FA
        profile.email_2fa_enabled = False
        profile.email_2fa_code = ''
        profile.email_2fa_code_expires = None
        profile.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Email 2FA disabled successfully'
        })
    except Exception as e:
        logger.error(f"Failed to disable email 2FA: {e}")
        return JsonResponse({
            'success': False,
            'message': 'Failed to disable email 2FA'
        }, status=500)


@login_required
@require_http_methods(["POST"])
def disable_authenticator_2fa(request):
    """Disable authenticator 2FA after code verification."""
    try:
        data = json.loads(request.body)
        code = data.get('code', '')
        
        profile = request.user.profile
        
        # Check if authenticator 2FA is enabled
        if not profile.authenticator_2fa_enabled:
            return JsonResponse({
                'success': False,
                'message': 'Authenticator 2FA is not enabled'
            }, status=400)
        
        # Check if code matches and not expired
        if not profile.email_2fa_code:
            return JsonResponse({
                'success': False,
                'message': 'No confirmation code found. Please request a new one.'
            }, status=400)
        
        if profile.email_2fa_code_expires and profile.email_2fa_code_expires < timezone.now():
            return JsonResponse({
                'success': False,
                'message': 'Confirmation code has expired. Please request a new one.'
            }, status=400)
        
        if profile.email_2fa_code != code:
            return JsonResponse({
                'success': False,
                'message': 'Invalid confirmation code'
            }, status=400)
        
        # Disable authenticator 2FA
        profile.authenticator_2fa_enabled = False
        profile.totp_secret = ''
        profile.email_2fa_code = ''
        profile.email_2fa_code_expires = None
        profile.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Authenticator 2FA disabled successfully'
        })
    except Exception as e:
        logger.error(f"Failed to disable authenticator 2FA: {e}")
        return JsonResponse({
            'success': False,
            'message': 'Failed to disable authenticator 2FA'
        }, status=500)


@login_required
@admin_required
@inertia('TeamUsers')
def team_users(request):
    """Team users page."""
    qs = UserProfile.objects.select_related('user', 'organization', 'role').prefetch_related('groups').order_by('user__username')
    page_num = int(request.GET.get('page', 1))
    paginator = Paginator(qs, 10)
    page = paginator.get_page(page_num)

    users = []
    for up in page.object_list:
        user_groups = [{'id': g.id, 'name': g.name} for g in up.groups.all()]
        
        users.append({
            'id': up.user.id,
            'username': up.user.username,
            'name': up.full_name or up.user.get_username(),
            'email': up.user.email,
            'full_name': up.full_name,
            'role': up.role.name if up.role else ('Agent' if up.is_agent else 'User'),
            'role_id': up.role.id if up.role else None,
            'is_agent': up.is_agent,
            'status': 'Active',
            'tickets': 0,
            'organization': up.organization.name if up.organization else None,
            'custom_permissions': up.custom_permissions,
            'groups': user_groups,
        })

    orgs = list(Organization.objects.all().values('id', 'name'))
    roles = list(Role.objects.all().values('id', 'name', 'description'))
    groups_qs = Group.objects.all()
    groups = [
        {
            'id': g.id,
            'name': g.name,
            'description': g.description,
            'member_count': g.members.count(),
        }
        for g in groups_qs
    ]

    from modules.users.models import UserInvitation
    from modules.users.invitations import serialize_invitation
    invitations = [
        serialize_invitation(inv)
        for inv in UserInvitation.objects.filter(status=UserInvitation.Status.PENDING).select_related('role', 'invited_by__profile')[:100]
    ]

    return {
        'users': users,
        'orgs': orgs,
        'roles': roles,
        'groups': groups,
        'invitations': invitations,
        'pagination': {
            'page': page.number,
            'pages': paginator.num_pages,
            'count': paginator.count,
            'has_next': page.has_next(),
            'has_prev': page.has_previous(),
        },
    }


@login_required
@admin_required
@inertia('TeamGroups')
def team_groups(request):
    """Team groups page."""
    groups_qs = Group.objects.all()
    groups = [
        {
            'id': g.id,
            'name': g.name,
            'description': g.description,
            'member_count': g.members.count(),
        }
        for g in groups_qs
    ]

    return {
        'groups': groups,
    }


@login_required
@admin_required
def team_group_view(request, group_id):
    """Get group details including users and tickets."""
    try:
        from modules.ticket.models import Ticket
        
        group = Group.objects.get(id=group_id)
        
        # Get users in this group
        users = []
        for profile in group.members.select_related('user', 'organization', 'role'):
            users.append({
                'id': profile.user.id,
                'username': profile.user.username,
                'email': profile.user.email,
                'full_name': profile.full_name,
                'is_agent': profile.is_agent,
                'organization': profile.organization.name if profile.organization else None,
                'role': profile.role.name if profile.role else None,
                'status': 'online',  # You can implement real status tracking
            })
        
        # Get tickets assigned to this group
        tickets = []
        for ticket in Ticket.objects.filter(group=group).select_related('assignee', 'assignee__profile')[:20]:
            tickets.append({
                'id': ticket.id,
                'uuid': str(ticket.uuid),
                'subject': ticket.title,
                'status': ticket.status,
                'priority': ticket.priority,
                'assignee': ticket.assignee.profile.full_name if ticket.assignee and hasattr(ticket.assignee, 'profile') else None,
            })
        
        return JsonResponse({
            'id': group.id,
            'name': group.name,
            'description': group.description,
            'created_at': group.created_at.isoformat(),
            'member_count': group.members.count(),
            'ticket_count': Ticket.objects.filter(group=group).count(),
            'users': users,
            'tickets': tickets,
        })
    except Group.DoesNotExist:
        return JsonResponse({'error': 'Group not found'}, status=404)


@login_required
@admin_required
def team_user_view(request, user_id):
    """Get user details including tickets and groups."""
    try:
        from modules.ticket.models import Ticket
        
        user = User.objects.get(id=user_id)
        profile = user.profile
        
        # Get user's groups
        groups = []
        for group in profile.groups.all():
            groups.append({
                'id': group.id,
                'name': group.name,
                'description': group.description,
                'member_count': group.members.count(),
            })
        
        # Get user's tickets (assigned or created)
        tickets = []
        user_tickets = Ticket.objects.filter(assignee=user).select_related('group')[:20]
        for ticket in user_tickets:
            tickets.append({
                'id': ticket.id,
                'uuid': str(ticket.uuid),
                'title': ticket.title,
                'status': ticket.status,
                'priority': ticket.priority,
                'created_at': ticket.created_at.isoformat(),
            })
        
        return JsonResponse({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': profile.full_name,
            'is_agent': profile.is_agent,
            'organization': profile.organization.name if profile.organization else None,
            'role': profile.role.name if profile.role else None,
            'status': 'online',  # You can implement real status tracking
            'created_at': user.date_joined.isoformat(),
            'ticket_count': Ticket.objects.filter(assignee=user).count(),
            'groups': groups,
            'tickets': tickets,
            'permissions': profile.custom_permissions if isinstance(profile.custom_permissions, list) else [],
        })
    except (User.DoesNotExist, UserProfile.DoesNotExist):
        return JsonResponse({'error': 'User not found'}, status=404)


@login_required
@admin_required
@inertia('TeamUserForm')
def team_user_add(request):
    """Add new user."""
    from modules.people.views import generate_strong_password, _send_welcome_email
    
    if request.method == 'POST':
        email = request.POST.get('email')
        full_name = request.POST.get('full_name')
        role_id = request.POST.get('role')
        
        # Use email as username
        username = email
        
        # Auto-generate strong password
        password = generate_strong_password()
        
        # Get organization from current user
        org = None
        if hasattr(request.user, 'profile') and request.user.profile.organization:
            org = request.user.profile.organization
        
        # Handle groups - Inertia.js sends arrays as indexed keys (groups[0], groups[1], etc.)
        group_ids = request.POST.getlist('groups')
        if not group_ids:
            # Try indexed format from Inertia.js
            i = 0
            while f'groups[{i}]' in request.POST:
                group_ids.append(request.POST.get(f'groups[{i}]'))
                i += 1
        
        
        # Determine if user is an agent based on role
        # Every role except Customer is a team role
        is_agent = False
        role = None
        if role_id:
            try:
                role = Role.objects.get(id=role_id)
                is_agent = is_agent_role(role)
            except Role.DoesNotExist:
                pass

        if not email:
            return {'error': 'Email is required'}
        
        # Check for duplicate email/username
        if User.objects.filter(email=email).exists() or User.objects.filter(username=email).exists():
            return {'error': 'A user with this email already exists'}
        

        # Create user
        user = User.objects.create_user(username=username, email=email, password=password)
        
        # Create profile
        profile = UserProfile.objects.create(
            user=user,
            full_name=full_name or '',
            is_agent=is_agent,
            organization=org,
            role=role
        )
        
        # Add to groups
        if group_ids:
            groups = Group.objects.filter(id__in=group_ids)
            profile.groups.set(groups)
        
        # Send welcome email with credentials
        _send_welcome_email(user, password)
        
        return redirect('team_users')
    
    # GET - Show form
    organization = None
    if hasattr(request.user, 'profile') and request.user.profile.organization:
        org = request.user.profile.organization
        organization = {'id': org.id, 'name': org.name}
    
    roles = list(Role.objects.all().values('id', 'name', 'description'))
    groups_qs = Group.objects.all()
    groups = [{'id': g.id, 'name': g.name, 'description': g.description} for g in groups_qs]
    
    return {
        'mode': 'add',
        'organization': organization,
        'roles': roles,
        'groups': groups,
    }


@login_required
@admin_required
@require_POST
def team_user_update(request, user_id):
    """Update a user's basic details (name and email) from the edit modal.

    Role and group membership are intentionally not editable here.
    """
    from django.core.validators import validate_email
    from django.core.exceptions import ValidationError

    try:
        user = User.objects.get(id=user_id)
        profile = user.profile
    except (User.DoesNotExist, UserProfile.DoesNotExist):
        return JsonResponse({'error': 'User not found'}, status=404)

    try:
        body = json.loads(request.body or '{}')
    except (ValueError, TypeError):
        return JsonResponse({'error': 'Invalid request'}, status=400)
    if not isinstance(body, dict):
        return JsonResponse({'error': 'Invalid request'}, status=400)

    full_name = (body.get('full_name') or '').strip()
    email = (body.get('email') or '').strip()

    errors = {}
    if not full_name:
        errors['full_name'] = 'Name is required'
    if not email:
        errors['email'] = 'Email is required'
    else:
        try:
            validate_email(email)
        except ValidationError:
            errors['email'] = 'Enter a valid email address'
        else:
            if User.objects.filter(email__iexact=email).exclude(id=user.id).exists():
                errors['email'] = 'A user with this email already exists'

    if errors:
        return JsonResponse({'error': next(iter(errors.values())), 'errors': errors}, status=400)

    profile.full_name = full_name
    profile.save(update_fields=['full_name'])

    user.email = email
    user.save(update_fields=['email'])

    return JsonResponse({
        'success': True,
        'user': {
            'id': user.id,
            'full_name': profile.full_name,
            'name': profile.full_name or user.get_username(),
            'email': user.email,
        },
    })


@login_required
@admin_required
def team_user_delete(request, user_id):
    """Delete user."""
    if request.method == 'POST':
        try:
            user = User.objects.get(id=user_id)
            user.delete()
        except User.DoesNotExist:
            pass
    return redirect('team_users')


# Team invitations
MAX_INVITES_PER_REQUEST = 50


@login_required
@admin_required
@require_POST
def team_user_invite(request):
    """Invite people by email. Body: {"emails": [...], "role_id": 1}."""
    from django.core.validators import validate_email
    from django.core.exceptions import ValidationError
    from modules.users.models import UserInvitation
    from modules.users.invitations import find_user, is_team_member, send_invitation_email, INVITE_EXPIRY_DAYS

    try:
        body = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid request'}, status=400)

    raw_emails = body.get('emails') or []
    if not isinstance(raw_emails, list) or not raw_emails:
        return JsonResponse({'error': 'Add at least one email address'}, status=400)
    if len(raw_emails) > MAX_INVITES_PER_REQUEST:
        return JsonResponse({'error': f'You can invite up to {MAX_INVITES_PER_REQUEST} people at a time'}, status=400)

    role = Role.objects.filter(id=body.get('role_id')).first()
    if not role:
        return JsonResponse({'error': 'Choose a role'}, status=400)

    emails = []
    for raw in raw_emails:
        email = str(raw).strip().lower()
        try:
            validate_email(email)
        except ValidationError:
            return JsonResponse({'error': f'"{email}" isn\'t a valid email address'}, status=400)
        if email not in emails:
            emails.append(email)


    sent, skipped, failed = [], [], []
    for email in emails:
        if is_team_member(find_user(email)):
            skipped.append({'email': email, 'reason': 'Already on the team'})
            continue
        invitation = UserInvitation.create_for(email, role, request.user, expires_days=INVITE_EXPIRY_DAYS)
        if send_invitation_email(request, invitation):
            sent.append(email)
        else:
            # Keep the invitation so it can be resent from the pending list
            failed.append(email)

    return JsonResponse({'success': True, 'sent': sent, 'skipped': skipped, 'failed': failed})


@login_required
@admin_required
@require_POST
def team_invite_resend(request, invite_id):
    """Issue a fresh link (new token, new expiry) and email it again."""
    from modules.users.models import UserInvitation
    from modules.users.invitations import send_invitation_email, INVITE_EXPIRY_DAYS

    invitation = UserInvitation.objects.filter(id=invite_id, status=UserInvitation.Status.PENDING).first()
    if not invitation:
        return JsonResponse({'error': 'Invitation not found'}, status=404)

    if invitation.role is None:
        return JsonResponse({'error': 'The role for this invitation was deleted. Revoke it and invite again.'}, status=400)

    # Keep the original inviter: resending shouldn't change who "invited" them
    fresh = UserInvitation.create_for(invitation.email, invitation.role, invitation.invited_by or request.user, expires_days=INVITE_EXPIRY_DAYS)
    if not send_invitation_email(request, fresh):
        return JsonResponse({'error': "Couldn't send the email. Check your email settings and try again."}, status=502)
    return JsonResponse({'success': True})


@login_required
@admin_required
@require_POST
def team_invite_revoke(request, invite_id):
    """Cancel a pending invitation so its link stops working."""
    from modules.users.models import UserInvitation

    updated = UserInvitation.objects.filter(
        id=invite_id, status=UserInvitation.Status.PENDING,
    ).update(status=UserInvitation.Status.REVOKED)
    if not updated:
        return JsonResponse({'error': 'Invitation not found'}, status=404)
    return JsonResponse({'success': True})


# Team Groups CRUD (the add/edit form is a modal on the groups page; these are its JSON endpoints)
def _group_payload(request, group_id=None):
    """Validated {'name', 'description'} from a JSON body, or (None, errors)."""
    try:
        data = json.loads(request.body or b'{}')
    except (ValueError, TypeError):
        return None, {'form': 'Invalid request'}
    if not isinstance(data, dict):
        return None, {'form': 'Invalid request'}
    name = str(data.get('name') or '').strip()
    description = str(data.get('description') or '').strip()
    errors = {}
    if not name:
        errors['name'] = 'Group name is required'
    elif len(name) > Group._meta.get_field('name').max_length:
        errors['name'] = 'Group name is too long'
    elif Group.objects.filter(name__iexact=name).exclude(id=group_id).exists():
        errors['name'] = 'A group with this name already exists'
    if errors:
        return None, errors
    return {'name': name, 'description': description}, None


def _serialize_group(group):
    return {
        'id': group.id,
        'name': group.name,
        'description': group.description,
        'member_count': group.members.count(),
    }


@login_required
@admin_required
@require_http_methods(["POST"])
def team_group_add(request):
    """Create a group."""
    data, errors = _group_payload(request)
    if errors:
        return JsonResponse({'errors': errors}, status=400)
    try:
        with transaction.atomic():
            group = Group.objects.create(**data)
    except IntegrityError:  # a concurrent create with the same name
        return JsonResponse({'errors': {'name': 'A group with this name already exists'}}, status=400)
    return JsonResponse({'group': _serialize_group(group)}, status=201)


@login_required
@admin_required
@require_http_methods(["POST"])
def team_group_edit(request, group_id):
    """Rename / redescribe a group."""
    group = Group.objects.filter(id=group_id).first()
    if group is None:
        return JsonResponse({'errors': {'form': 'Group not found'}}, status=404)
    data, errors = _group_payload(request, group_id)
    if errors:
        return JsonResponse({'errors': errors}, status=400)
    group.name = data['name']
    group.description = data['description']
    try:
        with transaction.atomic():
            group.save(update_fields=['name', 'description', 'updated_at'])
    except IntegrityError:
        return JsonResponse({'errors': {'name': 'A group with this name already exists'}}, status=400)
    return JsonResponse({'group': _serialize_group(group)})


@login_required
@admin_required
def team_group_delete(request, group_id):
    """Delete group."""
    if request.method == 'POST':
        try:
            group = Group.objects.get(id=group_id)
            group.delete()
        except Group.DoesNotExist:
            pass
    return redirect('team_groups')


@login_required
@admin_required
def team_group_available_agents(request, group_id):
    """Get available agents that can be added to a group (not already members)."""
    try:
        group = Group.objects.get(id=group_id)
        
        # Get all agents not in this group
        # Agents, including those holding a custom role
        existing_member_ids = group.members.values_list('id', flat=True)
        available_profiles = UserProfile.objects.filter(
            Q(is_agent=True) | Q(role__name__in=['Administrator', 'Agent'])
        ).exclude(
            id__in=existing_member_ids
        ).select_related('user', 'organization', 'role')
        
        agents = []
        for profile in available_profiles:
            agents.append({
                'id': profile.user.id,
                'profile_id': profile.id,
                'username': profile.user.username,
                'email': profile.user.email,
                'full_name': profile.full_name or profile.user.username,
                'organization': profile.organization.name if profile.organization else None,
                'role': profile.role.name if profile.role else None,
            })
        
        return JsonResponse({
            'agents': agents,
            'group_name': group.name,
        })
    except Group.DoesNotExist:
        return JsonResponse({'error': 'Group not found'}, status=404)


@login_required
@admin_required
@require_http_methods(["POST"])
def team_group_add_members(request, group_id):
    """Add members to a group."""
    try:
        group = Group.objects.get(id=group_id)
        data = json.loads(request.body)
        profile_ids = data.get('profile_ids', [])
        
        if not profile_ids:
            return JsonResponse({'error': 'No members selected'}, status=400)
        
        # Add members to group (filter by agent roles)
        profiles = UserProfile.objects.filter(
            Q(is_agent=True) | Q(role__name__in=['Administrator', 'Agent']),
            id__in=profile_ids,
        )
        added_count = 0
        for profile in profiles:
            if not group.members.filter(id=profile.id).exists():
                group.members.add(profile)
                added_count += 1
        
        return JsonResponse({
            'success': True,
            'message': f'Added {added_count} member(s) to group',
            'member_count': group.members.count(),
        })
    except Group.DoesNotExist:
        return JsonResponse({'error': 'Group not found'}, status=404)
    except Exception as e:
        logger.exception('Request failed')
        logger.error(f"Error adding members to group: {e}")
        return JsonResponse({'error': 'Something went wrong. Please try again.'}, status=400)


# Emails Settings Views
@login_required
@admin_required
@inertia('EmailsTemplates')
def emails_templates(request):
    """Email templates settings page.

    template_type is unique, so there is at most one template per type (a few dozen rows).
    Everything is sent at once and searched and filtered in the browser.
    """
    from .models import EmailTemplate, NotificationSettings

    templates_data = [
        {
            'id': t.id,
            'name': t.name,
            'template_type': t.template_type,
            'type': t.get_template_type_display(),
            'category': _email_template_category(t.template_type),
            'subject': t.subject,
            'status': t.status,
            'variable_count': len(t.available_variables or {}),
            'updated_at': t.updated_at.isoformat() if t.updated_at else None,
        }
        for t in EmailTemplate.objects.all().order_by('name')
    ]
    return {
        'activeSection': 'emails-templates',
        'templates': templates_data,
        'emailSettings': {
            'use_business_name_in_footer': NotificationSettings.get_settings().use_business_name_in_footer,
        },
        'businessName': organization_name(''),
    }


@login_required
@admin_required
@require_http_methods(["POST"])
def email_settings_update(request):
    """Save email-wide options shown on the templates page."""
    from .models import NotificationSettings

    try:
        data = json.loads(request.body)
        settings = NotificationSettings.get_settings()
        if 'use_business_name_in_footer' in data:
            settings.use_business_name_in_footer = bool(data['use_business_name_in_footer'])
            settings.save(update_fields=['use_business_name_in_footer', 'updated_at'])
        return JsonResponse({
            'success': True,
            'use_business_name_in_footer': settings.use_business_name_in_footer,
        })
    except Exception as e:
        logger.error(f"Error updating email settings: {e}")
        return JsonResponse({'success': False, 'message': 'Could not save the setting'}, status=400)


def _email_template_category(template_type):
    """Group a template type under the heading the templates page shows it in."""
    if template_type.startswith('sla_'):
        return 'SLA'
    if template_type.startswith('asset_'):
        return 'Assets'
    if template_type.startswith('kb_'):
        return 'Knowledge base'
    if 'task' in template_type:
        return 'Tasks'
    if template_type.startswith('comment_') or template_type == 'user_mentioned':
        return 'Comments'
    if template_type in ('welcome_user', 'password_reset'):
        return 'Account'
    if template_type.startswith('survey_'):
        return 'Surveys'
    if template_type.endswith('_report'):
        return 'Reports'
    if template_type == 'custom':
        return 'Custom'
    return 'Tickets'


@login_required
@admin_required
@require_http_methods(["POST"])
def test_email_template(request, template_id):
    """Send a test email using the specified template with Mailer."""
    from .models import EmailTemplate
    from shared.utilities.Mailer import Mailer
    import json
    
    try:
        # Get test email address from request or use current user's email
        data = json.loads(request.body)
        test_email = data.get('email', request.user.email)
        
        # Validate email address
        if not test_email or '@' not in test_email:
            return JsonResponse({
                'success': False,
                'message': 'Invalid email address provided',
            }, status=400)
        
        # Get user's full name from profile or construct from first/last name
        try:
            user_full_name = request.user.profile.full_name
        except:
            user_full_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
        
        # Sample context for testing - comprehensive placeholders
        context = {
            'customer_name': user_full_name,
            'agent_name': user_full_name,
            'user_name': user_full_name,
            'user_email': request.user.email,
            'username': request.user.username,
            'ticket_number': 'TKT-12345',
            'ticket_subject': 'Sample Test Ticket Subject',
            'ticket_priority': 'High',
            'ticket_status': 'Open',
            'ticket_description': 'This is a sample ticket description for testing purposes.',
            'company_name': 'Imaradesk Support',
            'ticket_url': f'{request.scheme}://{request.get_host()}/tickets/12345',
            'login_url': f'{request.scheme}://{request.get_host()}/login',
            'reset_url': f'{request.scheme}://{request.get_host()}/reset-password/test-token-abc123',
            'expiry_hours': '24',
            'time_remaining': '2 hours',
            'task_title': 'Sample Task Title',
            'task_description': 'This is a sample task description.',
            'task_due_date': '2024-12-31',
            'task_status': 'In Progress',
            'comment_text': 'This is a sample comment text for testing.',
            'comment_author': user_full_name,
            'sla_name': 'Standard SLA',
            'breach_time': '30 minutes',
            'current_time': '2024-01-15 10:30 AM',
        }
        
        # Initialize Mailer
        mailer = Mailer()
        
        # Use Mailer to send test email with validation and sanitization
        success = mailer.send_email(
            template_id=template_id,
            to_email=test_email,
            context=context,
            subject_prefix='[TEST] '
        )
        
        if success:
            return JsonResponse({
                'success': True,
                'message': f'Test email sent successfully to {test_email}',
            })
        else:
            return JsonResponse({
                'success': False,
                'message': 'Failed to send test email. Check SMTP configuration and logs.',
            }, status=500)
    
    except EmailTemplate.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'Email template not found',
        }, status=404)
    except ValueError as e:
        logger.exception('Request failed')
        # Validation errors (e.g., missing placeholders)
        return JsonResponse({
            'success': False,
            'message': 'Template validation error',
        }, status=400)
    except Exception as e:
        logger.exception('Request failed')
        return JsonResponse({
            'success': False,
            'message': 'Failed to send test email',
        }, status=500)


@login_required
@admin_required
@inertia('EditEmailTemplate')
def edit_email_template(request, template_id):
    """Edit email template page."""
    from .models import EmailTemplate

    template = EmailTemplate.objects.filter(id=template_id).first()
    if template is None:
        return redirect('emails_templates')
    return {
        'activeSection': 'emails-templates',
        'template': {
            'id': template.id,
            'name': template.name,
            'template_type': template.template_type,
            'type': template.get_template_type_display(),
            'category': _email_template_category(template.template_type),
            'subject': template.subject,
            'body_text': template.body_text,
            'status': template.status,
            'available_variables': template.available_variables,
            'updated_at': template.updated_at.isoformat() if template.updated_at else None,
        },
    }


@login_required
@admin_required
@require_http_methods(["POST"])
def update_email_template(request, template_id):
    """Update email template."""
    from .models import EmailTemplate
    import json
    
    try:
        template = EmailTemplate.objects.get(id=template_id)
        data = json.loads(request.body)
        
        name = str(data.get('name', template.name)).strip()
        subject = str(data.get('subject', template.subject)).strip()
        body_text = str(data.get('body_text', template.body_text))
        status = data.get('status', template.status)

        errors = {}
        if not name:
            errors['name'] = 'Name is required'
        elif len(name) > EmailTemplate._meta.get_field('name').max_length:
            errors['name'] = 'Name is too long'
        if not subject:
            errors['subject'] = 'Subject is required'
        elif len(subject) > EmailTemplate._meta.get_field('subject').max_length:
            errors['subject'] = 'Subject is too long'
        if not body_text.strip():
            errors['body_text'] = 'Email body is required'
        if status not in dict(EmailTemplate.STATUS_CHOICES):
            errors['status'] = 'Invalid status'
        if errors:
            return JsonResponse({'success': False, 'message': 'Please fix the highlighted fields', 'errors': errors}, status=400)

        template.name = name
        template.subject = subject
        template.body_text = body_text
        template.status = status
        # body_html is now auto-generated from body_text, keep it empty
        template.body_html = ''

        template.save()

        return JsonResponse({
            'success': True,
            'message': 'Email template updated successfully',
            'updated_at': template.updated_at.isoformat(),
        })
    
    except EmailTemplate.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'Email template not found',
        }, status=404)
    except Exception as e:
        logger.exception('Request failed')
        return JsonResponse({
            'success': False,
            'message': 'Failed to update template',
        }, status=500)


@login_required
@admin_required
@inertia('EmailsSMTP')
def emails_smtp(request):
    """SMTP configuration settings page."""
    from modules.settings.models import SMTP
    
    smtp_config = {}
    try:
        smtp = SMTP.objects.first()
        if smtp:
            smtp_config = {
                'enabled': smtp.enabled,
                'active': smtp.active,
                'host': smtp.host,
                'port': smtp.port,
                'username': smtp.username,
                'use_tls': smtp.use_tls,
                'use_ssl': smtp.use_ssl,
                'from_email': smtp.default_from_email,
                'from_name': smtp.sender_name or '',
                'has_password': bool(smtp.password_encrypted),
            }
    except Exception:
        pass
    
    return {
        'activeSection': 'emails-smtp',
        'smtp_config': smtp_config,
    }


@login_required
@admin_required
@require_POST
def test_smtp(request):
    """Test SMTP connection with provided credentials."""
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    try:
        data = json.loads(request.body)
        
        host = data.get('host', '').strip()
        port = int(data.get('port', 587))
        username = data.get('username', '').strip()
        password = data.get('password', '')
        use_tls = data.get('use_tls', True)
        use_ssl = data.get('use_ssl', False)
        from_email = data.get('from_email', '').strip()
        from_name = data.get('from_name', '').strip()
        test_email = data.get('test_email', request.user.email).strip()
        
        if not all([host, port, username, from_email]):
            return JsonResponse({
                'success': False,
                'message': 'Missing required fields: host, port, username, and from_email are required.'
            }, status=400)
        
        if not test_email or '@' not in test_email:
            return JsonResponse({
                'success': False,
                'message': 'A valid test email address is required.'
            }, status=400)
        
        # If no password provided but we have existing config, use stored password
        if not password:
            from modules.settings.models import SMTP
            smtp_config = SMTP.objects.first()
            if smtp_config and smtp_config.password_encrypted:
                password = smtp_config.get_password()
        
        if not password:
            return JsonResponse({
                'success': False,
                'message': 'Password is required for SMTP connection test.'
            }, status=400)
        
        # Create test email
        msg = MIMEMultipart()
        msg['From'] = f'"{from_name}" <{from_email}>' if from_name else from_email
        msg['To'] = test_email
        msg['Subject'] = 'SMTP Configuration Test - Imaradesk'
        
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #4a154b;">✅ SMTP Test Successful!</h2>
            <p>Your SMTP configuration is working correctly.</p>
            <p><strong>Server:</strong> {host}:{port}</p>
            <p><strong>Encryption:</strong> {'TLS' if use_tls else 'SSL' if use_ssl else 'None'}</p>
            <hr style="border: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">This is an automated test email from Imaradesk.</p>
        </body>
        </html>
        """
        msg.attach(MIMEText(body, 'html'))
        
        # Connect and send
        if use_ssl:
            server = smtplib.SMTP_SSL(host, port, timeout=30)
        else:
            server = smtplib.SMTP(host, port, timeout=30)
            if use_tls:
                server.starttls()
        
        server.login(username, password)
        server.send_message(msg)
        server.quit()
        
        return JsonResponse({
            'success': True,
            'message': f'Test email sent successfully to {test_email}!'
        })
        
    except smtplib.SMTPAuthenticationError:
        return JsonResponse({
            'success': False,
            'message': 'Authentication failed. Please check your username and password.'
        }, status=400)
    except smtplib.SMTPConnectError:
        return JsonResponse({
            'success': False,
            'message': f'Could not connect to SMTP server. Please check the host and port.'
        }, status=400)
    except smtplib.SMTPException as e:
        logger.exception('Request failed')
        return JsonResponse({
            'success': False,
            'message': 'SMTP error'
        }, status=400)
    except Exception as e:
        logger.exception('Request failed')
        return JsonResponse({
            'success': False,
            'message': 'Connection failed'
        }, status=500)


@login_required
@admin_required
@require_POST
def save_smtp(request):
    """Save SMTP configuration to database."""
    from modules.settings.models import SMTP
    
    try:
        data = json.loads(request.body)
        
        enabled = data.get('enabled', False)
        active = data.get('active', True)
        
        # Get existing SMTP config first
        smtp_config = SMTP.objects.first()
        
        # Extract fields from request, falling back to existing stored values
        host = data.get('host', '').strip() if 'host' in data else (smtp_config.host if smtp_config else '')
        port = int(data.get('port', 587)) if 'port' in data else (smtp_config.port if smtp_config else 587)
        username = data.get('username', '').strip() if 'username' in data else (smtp_config.username if smtp_config else '')
        password = data.get('password', '')
        use_tls = data.get('use_tls', True) if 'use_tls' in data else (smtp_config.use_tls if smtp_config else True)
        use_ssl = data.get('use_ssl', False) if 'use_ssl' in data else (smtp_config.use_ssl if smtp_config else False)
        from_email = data.get('from_email', '').strip() if 'from_email' in data else (smtp_config.default_from_email if smtp_config else '')
        from_name = data.get('from_name', '').strip() if 'from_name' in data else (smtp_config.sender_name if smtp_config else '')
        
        # Validation only required when enabling SMTP
        if enabled:
            if not all([host, port, username, from_email]):
                return JsonResponse({
                    'success': False,
                    'message': 'Missing required fields: host, port, username, and from_email are required.'
                }, status=400)
        
        # Create or update SMTP config
        if not smtp_config:
            smtp_config = SMTP(
                enabled=enabled,
                active=active,
                host=host or 'smtp.example.com',
                port=port,
                username=username or '',
                use_tls=use_tls,
                use_ssl=use_ssl,
                default_from_email=from_email or 'noreply@example.com',
                sender_name=from_name or '',
            )
        else:
            smtp_config.enabled = enabled
            smtp_config.active = active
            smtp_config.host = host
            smtp_config.port = port
            smtp_config.username = username
            smtp_config.use_tls = use_tls
            smtp_config.use_ssl = use_ssl
            smtp_config.default_from_email = from_email
            smtp_config.sender_name = from_name
        
        # Only update password if provided (allows keeping existing password)
        if password:
            smtp_config.set_password(password)
        
        smtp_config.save()
        
        return JsonResponse({
            'success': True,
            'message': 'SMTP configuration saved successfully!'
        })
        
    except Exception as e:
        logger.exception('Request failed')
        return JsonResponse({
            'success': False,
            'message': 'Failed to save configuration'
        }, status=500)



# Marketplace View
@login_required
@admin_required
@inertia('Marketplace')
def marketplace(request):
    """Marketplace page for installing apps."""
    # TODO: Fetch actual apps from marketplace API
    return {
        'activeSection': 'marketplace',
        'apps': [],
    }


# Channels API
@login_required
@admin_required
@require_POST
def channel_toggle(request, channel_id):
    """Toggle a channel's is_activated state."""
    from .models import Channel

    try:
        channel = Channel.objects.get(id=channel_id)
    except Channel.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Channel not found'}, status=404)

    if channel.status == 'coming_soon':
        return JsonResponse({'success': False, 'message': 'This channel is not yet available'}, status=400)

    channel.is_activated = not channel.is_activated
    channel.save(update_fields=['is_activated', 'updated_at'])

    return JsonResponse({
        'success': True,
        'is_activated': channel.is_activated,
        'message': f'{channel.name} {"activated" if channel.is_activated else "deactivated"} successfully',
    })


@login_required
@admin_required
@require_POST
def channel_config(request, channel_id):
    """Update a channel's configuration settings."""
    import json
    from .models import Channel

    try:
        channel = Channel.objects.get(id=channel_id)
    except Channel.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Channel not found'}, status=404)

    try:
        data = json.loads(request.body)
        config = data.get('config', {})
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)

    # Merge new config with existing config
    existing_config = channel.config or {}
    existing_config.update(config)
    channel.config = existing_config
    channel.save(update_fields=['config', 'updated_at'])

    return JsonResponse({
        'success': True,
        'channel': {
            'id': channel.id,
            'channel_id': channel.channel_id,
            'name': channel.name,
            'config': channel.config,
        },
        'message': f'{channel.name} settings updated successfully',
    })


@login_required
@admin_required
@require_POST
def channel_regenerate_key(request, channel_id):
    """Regenerate API key for the API channel."""
    import secrets
    from .models import Channel

    try:
        channel = Channel.objects.get(id=channel_id)
    except Channel.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Channel not found'}, status=404)

    if channel.channel_id != 'api':
        return JsonResponse({'success': False, 'message': 'API key can only be regenerated for API channel'}, status=400)

    # Generate a new API key
    new_api_key = f"sk_live_{secrets.token_hex(24)}"
    
    config = channel.config or {}
    config['api_key'] = new_api_key
    channel.config = config
    channel.save(update_fields=['config', 'updated_at'])

    return JsonResponse({
        'success': True,
        'api_key': new_api_key,
        'message': 'API key regenerated successfully',
    })


def _channels_with_status(request, include_config=True):
    """Return channels enriched with connected email providers."""
    from .models import Channel

    fields = [
        'id', 'channel_id', 'name', 'description', 'icon', 'icon_bg',
        'icon_color', 'is_activated', 'status', 'is_connected', 'inbox_count', 'order',
    ]
    if include_config:
        fields.append('config')
    channels = list(Channel.objects.all().values(*fields))

    # Enrich email channel with connected providers
    email_providers = []
    try:
        from modules.email_to_ticket.models import OutlookMailbox, CustomIMAPMailbox
        if OutlookMailbox.objects.filter(is_active=True).exists():
            email_providers.append({'name': 'Outlook', 'id': 'outlook'})
        if CustomIMAPMailbox.objects.filter(is_active=True).exists():
            email_providers.append({'name': 'Custom IMAP', 'id': 'imap'})
    except Exception:
        pass

    for ch in channels:
        if ch['channel_id'] == 'email':
            ch['connected_providers'] = email_providers

    return channels


@login_required
@require_GET
def channels_status(request):
    """Lightweight channel status list for the sidebar popover."""
    return JsonResponse({'channels': _channels_with_status(request, include_config=False)})


@login_required
@admin_required
@inertia('Channels')
def channels_settings(request):
    """Channels configuration page."""
    return {
        'activeSection': 'channels',
        'channels': _channels_with_status(request),
    }


# SLA Settings Views
@login_required
@admin_required
@inertia('SLASettings')
def sla_settings(request):
    """Combined SLA settings page (policies, business hours, holidays)."""
    from modules.sla.models import SLASettings
    
    # Get SLA policies
    policies_qs = SLAPolicy.objects.all()
    priority_order = {'urgent': 0, 'high': 1, 'medium': 2, 'low': 3}
    policies = sorted([
        {
            'id': p.id,
            'name': p.name,
            'priority': (p.priority or '').lower(),
            'first_response': p.get_first_response_display(),
            'first_response_minutes': p.first_response_time,
            'resolution_time': p.get_resolution_time_display(),
            'resolution_time_minutes': p.resolution_time,
            'status': p.status,
            'description': p.description,
            'apply_business_hours': p.apply_business_hours,
            'apply_holidays': p.apply_holidays,
            'send_escalation_emails': p.send_escalation_emails,
            'auto_assign_on_breach': p.auto_assign_on_breach,
            'pause_on_pending': p.pause_on_pending,
            'notify_before_breach': p.notify_before_breach,
            'use_custom_rules': p.use_custom_rules,
            'custom_rules': p.custom_rules,
            'rules_logic': p.rules_logic,
        }
        for p in policies_qs
    ], key=lambda p: (priority_order.get(p['priority'], 9), p['name']))
    
    # Get business hours
    try:
        bh = BusinessHours.objects.filter(is_active=True).first()
        business_hours = {
            'id': bh.id,
            'name': bh.name,
            'timezone': bh.timezone,
            'monday_enabled': bh.monday_enabled,
            'monday_start': bh.monday_start.strftime('%H:%M'),
            'monday_end': bh.monday_end.strftime('%H:%M'),
            'tuesday_enabled': bh.tuesday_enabled,
            'tuesday_start': bh.tuesday_start.strftime('%H:%M'),
            'tuesday_end': bh.tuesday_end.strftime('%H:%M'),
            'wednesday_enabled': bh.wednesday_enabled,
            'wednesday_start': bh.wednesday_start.strftime('%H:%M'),
            'wednesday_end': bh.wednesday_end.strftime('%H:%M'),
            'thursday_enabled': bh.thursday_enabled,
            'thursday_start': bh.thursday_start.strftime('%H:%M'),
            'thursday_end': bh.thursday_end.strftime('%H:%M'),
            'friday_enabled': bh.friday_enabled,
            'friday_start': bh.friday_start.strftime('%H:%M'),
            'friday_end': bh.friday_end.strftime('%H:%M'),
            'saturday_enabled': bh.saturday_enabled,
            'saturday_start': bh.saturday_start.strftime('%H:%M'),
            'saturday_end': bh.saturday_end.strftime('%H:%M'),
            'sunday_enabled': bh.sunday_enabled,
            'sunday_start': bh.sunday_start.strftime('%H:%M'),
            'sunday_end': bh.sunday_end.strftime('%H:%M'),
            'pause_outside_hours': bh.pause_outside_hours,
            'exclude_holidays': bh.exclude_holidays,
        } if bh else None
    except Exception:
        business_hours = None
    
    # Get holidays
    holidays_qs = Holiday.objects.all().order_by('date')
    holidays = [
        {
            'id': h.id,
            'name': h.name,
            'date': h.date.strftime('%Y-%m-%d'),
            'recurring': h.recurring,
            'status': h.status,
        }
        for h in holidays_qs
    ]
    
    # Get SLA enabled status
    sla_settings_obj = SLASettings.get_settings()
    
    return {
        'activeSection': 'sla',
        'policies': policies,
        'business_hours': business_hours,
        'holidays': holidays,
        'slaEnabled': sla_settings_obj.enabled,
    }


@login_required
@inertia('SLAPolicies')
def sla_policies(request):
    """SLA policies configuration page."""
    policies_qs = SLAPolicy.objects.all().order_by('priority')
    policies = [
        {
            'id': p.id,
            'name': p.name,
            'priority': p.priority,
            'first_response': p.get_first_response_display(),
            'first_response_minutes': p.first_response_time,
            'resolution_time': p.get_resolution_time_display(),
            'resolution_time_minutes': p.resolution_time,
            'status': p.status,
            'description': p.description,
            'apply_business_hours': p.apply_business_hours,
            'apply_holidays': p.apply_holidays,
            'send_escalation_emails': p.send_escalation_emails,
            'auto_assign_on_breach': p.auto_assign_on_breach,
            'pause_on_pending': p.pause_on_pending,
            'notify_before_breach': p.notify_before_breach,
            'use_custom_rules': p.use_custom_rules,
            'custom_rules': p.custom_rules,
            'rules_logic': p.rules_logic,
        }
        for p in policies_qs
    ]
    
    return {
        'activeSection': 'sla-policies',
        'policies': policies,
    }


@login_required
@admin_required
@inertia('AddSLAPolicy')
def sla_policy_add(request):
    """Add SLA policy page."""
    # Active simple-mode policies, grouped by priority (one allowed per priority)
    existing_policies = SLAPolicy.objects.filter(status='active', use_custom_rules=False)
    policies_by_priority = {}
    for p in existing_policies:
        policies_by_priority[(p.priority or '').lower()] = {
            'id': p.id,
            'name': p.name,
            'priority': (p.priority or '').lower(),
        }
    
    return {
        'activeSection': 'sla-policies',
        'policy': None,
        'existingPoliciesByPriority': policies_by_priority,
    }


@login_required
@admin_required
@inertia('AddSLAPolicy')
def sla_policy_edit(request, policy_id):
    """Edit SLA policy page."""
    try:
        policy = SLAPolicy.objects.get(id=policy_id)
        policy_data = {
            'id': policy.id,
            'name': policy.name,
            'priority': (policy.priority or '').lower(),
            'description': policy.description,
            'status': policy.status,
            'notify_before_breach': policy.notify_before_breach,
            'first_response_time': policy.first_response_time,
            'resolution_time': policy.resolution_time,
            'apply_business_hours': policy.apply_business_hours,
            'apply_holidays': policy.apply_holidays,
            'send_escalation_emails': policy.send_escalation_emails,
            'escalate_on_breach': policy.send_escalation_emails,
            'auto_assign_on_breach': policy.auto_assign_on_breach,
            'pause_on_pending': policy.pause_on_pending,
            'use_custom_rules': policy.use_custom_rules,
            'custom_rules': policy.custom_rules,
            'rules_logic': policy.rules_logic,
        }
    except SLAPolicy.DoesNotExist:
        from django.shortcuts import redirect
        return redirect('sla_settings')
    
    # Active simple-mode policies (excluding current), grouped by priority
    existing_policies = SLAPolicy.objects.filter(status='active', use_custom_rules=False).exclude(id=policy_id)
    policies_by_priority = {}
    for p in existing_policies:
        policies_by_priority[(p.priority or '').lower()] = {
            'id': p.id,
            'name': p.name,
            'priority': (p.priority or '').lower(),
        }
    
    return {
        'activeSection': 'sla-policies',
        'policy': policy_data,
        'existingPoliciesByPriority': policies_by_priority,
    }


@login_required
@inertia('SLABusinessHours')
def sla_business_hours(request):
    """Business hours configuration page."""
    try:
        bh = BusinessHours.objects.filter(is_active=True).first()
        business_hours = {
            'id': bh.id,
            'name': bh.name,
            'timezone': bh.timezone,
            'monday_enabled': bh.monday_enabled,
            'monday_start': bh.monday_start.strftime('%H:%M'),
            'monday_end': bh.monday_end.strftime('%H:%M'),
            'tuesday_enabled': bh.tuesday_enabled,
            'tuesday_start': bh.tuesday_start.strftime('%H:%M'),
            'tuesday_end': bh.tuesday_end.strftime('%H:%M'),
            'wednesday_enabled': bh.wednesday_enabled,
            'wednesday_start': bh.wednesday_start.strftime('%H:%M'),
            'wednesday_end': bh.wednesday_end.strftime('%H:%M'),
            'thursday_enabled': bh.thursday_enabled,
            'thursday_start': bh.thursday_start.strftime('%H:%M'),
            'thursday_end': bh.thursday_end.strftime('%H:%M'),
            'friday_enabled': bh.friday_enabled,
            'friday_start': bh.friday_start.strftime('%H:%M'),
            'friday_end': bh.friday_end.strftime('%H:%M'),
            'saturday_enabled': bh.saturday_enabled,
            'saturday_start': bh.saturday_start.strftime('%H:%M'),
            'saturday_end': bh.saturday_end.strftime('%H:%M'),
            'sunday_enabled': bh.sunday_enabled,
            'sunday_start': bh.sunday_start.strftime('%H:%M'),
            'sunday_end': bh.sunday_end.strftime('%H:%M'),
            'pause_outside_hours': bh.pause_outside_hours,
            'exclude_holidays': bh.exclude_holidays,
        } if bh else None
    except Exception:
        business_hours = None
    
    # Get SLA enabled status
    from modules.sla.models import SLASettings
    sla_settings = SLASettings.get_settings()
    
    return {
        'activeSection': 'sla-business-hours',
        'business_hours': business_hours,
        'slaEnabled': sla_settings.enabled,
    }


@login_required
@inertia('SLAHolidays')
def sla_holidays(request):
    """Holidays configuration page."""
    from modules.sla.models import SLASettings
    
    holidays_qs = Holiday.objects.all().order_by('date')
    holidays = [
        {
            'id': h.id,
            'name': h.name,
            'date': h.date.strftime('%Y-%m-%d'),
            'recurring': h.recurring,
            'status': h.status,
        }
        for h in holidays_qs
    ]
    
    sla_settings = SLASettings.get_settings()
    
    return {
        'activeSection': 'sla-holidays',
        'holidays': holidays,
        'slaEnabled': sla_settings.enabled,
    }


@login_required
@admin_required
@inertia('Marketplace')
def marketplace(request):
    """Marketplace page showing available apps."""
    apps_qs = App.objects.filter(status__in=['active', 'beta', 'coming_soon'])
    
    # Get installed apps
    installed_apps = {
        ia.app_id: ia 
        for ia in InstalledApp.objects.filter(is_active=True).select_related('app')
    }
    
    apps = []
    for app in apps_qs:
        installed_app = installed_apps.get(app.id)
        app_data = {
            'id': app.id,
            'name': app.name,
            'slug': app.slug,
            'description': app.description,
            'long_description': app.long_description,
            'icon': app.icon,
            'category': app.category,
            'status': app.status,
            'is_featured': app.is_featured,
            'version': app.version,
            'developer': app.developer,
            'install_count': app.install_count,
            'is_installed': installed_app is not None,
        }
                
        apps.append(app_data)
    
    return {
        'activeSection': 'marketplace',
        'apps': apps,
    }


@login_required
@admin_required
@inertia('MarketplaceAppDetail')
def marketplace_app_detail(request, slug):
    """Detail page for a marketplace app."""
    try:
        app = App.objects.get(slug=slug, status__in=['active', 'beta', 'coming_soon'])
    except App.DoesNotExist:
        from django.http import Http404
        raise Http404("App not found")

    installed_app = InstalledApp.objects.filter(app=app, is_active=True).first()

    app_data = {
        'id': app.id,
        'name': app.name,
        'slug': app.slug,
        'description': app.description,
        'long_description': app.long_description,
        'icon': app.icon,
        'category': app.category,
        'status': app.status,
        'is_featured': app.is_featured,
        'version': app.version,
        'developer': app.developer,
        'install_count': app.install_count,
        'is_installed': installed_app is not None,
    }

    return {
        'activeSection': 'marketplace',
        'app': app_data,
    }


@login_required
@admin_required
@require_http_methods(["POST"])
def install_app(request, app_id):
    """Install an app."""
    try:
        app = App.objects.get(id=app_id)
        
        # Check if app was ever installed (including inactive/uninstalled)
        existing_install = InstalledApp.objects.filter(app=app).first()
        
        if existing_install:
            if existing_install.is_active:
                return JsonResponse({
                    'success': False,
                    'message': 'App is already installed'
                }, status=400)
            
            # Reactivate the app, keeping its settings
            existing_install.is_active = True
            existing_install.uninstalled_at = None
            existing_install.installed_at = timezone.now()
            existing_install.save()
            
            # Increment install count
            app.install_count += 1
            app.save()
            
            return JsonResponse({
                'success': True,
                'message': f'{app.name} reinstalled!',
                'installed_app': {'id': existing_install.id, 'app_name': app.name},
            })
        
        installed_app = InstalledApp.objects.create(app=app, is_active=True)
        
        # Increment install count
        app.install_count += 1
        app.save()
        
        return JsonResponse({
            'success': True,
            'message': f'{app.name} installed successfully!',
            'installed_app': {'id': installed_app.id, 'app_name': app.name},
        })
    except App.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'App not found'
        }, status=404)
    except Exception as e:
        logger.exception('Request failed')
        return JsonResponse({
            'success': False,
            'message': 'Something went wrong. Please try again.'
        }, status=500)


@login_required
@admin_required
@require_http_methods(["DELETE"])
def uninstall_app(request, app_id):
    """Uninstall an app (soft delete - keeps app settings)."""
    try:
        app = App.objects.get(id=app_id)
        installed_app = InstalledApp.objects.get(app=app, is_active=True)
        
        # Soft delete - mark as inactive instead of deleting
        installed_app.is_active = False
        installed_app.uninstalled_at = timezone.now()
        installed_app.save()
        
        # Decrement install count
        if app.install_count > 0:
            app.install_count -= 1
            app.save()
        
        return JsonResponse({
            'success': True,
            'message': f'{app.name} uninstalled successfully.'
        })
    except InstalledApp.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'App is not installed'
        }, status=404)
    except Exception as e:
        logger.exception('Request failed')
        return JsonResponse({
            'success': False,
            'message': 'Something went wrong. Please try again.'
        }, status=500)


@login_required
@admin_required
@inertia('SettingsViews')
def settings_views(request):
    """Views management page."""
    from .models import SettingsView, InstalledApp, App
    
    # Get current type from query params (default to TICKET)
    current_type = request.GET.get('type', 'TICKET')
    
    # Check which modules are installed
    installed_modules = {
        'tasks': False,
        'kb': False,
    }
    
    # Check for Tasks module
    tasks_app = App.objects.filter(slug='tasks-projects').first()
    if tasks_app:
        tasks_installed = InstalledApp.objects.filter(app=tasks_app, is_active=True).exists()
        installed_modules['tasks'] = tasks_installed
    
    # Check for KB module
    kb_app = App.objects.filter(slug='knowledge-base').first()
    if kb_app:
        kb_installed = InstalledApp.objects.filter(app=kb_app, is_active=True).exists()
        installed_modules['kb'] = kb_installed
    
    # Get all views grouped by type
    all_views = SettingsView.objects.all()
    
    views_by_type = {
        'TICKET': [],
        'TASK': [],
        'KB': [],
    }
    
    for view in all_views:
        views_by_type[view.type].append({
            'id': view.id,
            'view_id': view.view_id,
            'label': view.label,
            'description': view.description,
            'is_active': view.is_active,
            'is_default': view.is_default,
            'order': view.order,
        })
    
    return {
        'activeSection': 'views',
        'views': views_by_type,
        'currentType': current_type,
        'installedModules': installed_modules,
    }


@login_required
@admin_required
@require_http_methods(["POST"])
def toggle_view(request, view_id):
    """Toggle a view's active status."""
    from .models import SettingsView
    
    try:
        view = SettingsView.objects.get(id=view_id)
        data = json.loads(request.body)
        view.is_active = data.get('is_active', not view.is_active)
        view.save()
        
        # Invalidate views cache
        invalidate_views_cache('default')
        
        return JsonResponse({
            'success': True,
            'message': f"View '{view.label}' {'enabled' if view.is_active else 'disabled'} successfully",
        })
    except SettingsView.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'View not found',
        }, status=404)
    except Exception as e:
        logger.exception('Request failed')
        return JsonResponse({
            'success': False,
            'message': 'Failed to update view',
        }, status=500)


@login_required
@admin_required
@require_http_methods(["POST"])
def reorder_views(request):
    """Reorder views based on the provided order."""
    from .models import SettingsView
    
    try:
        data = json.loads(request.body)
        view_ids = data.get('view_ids', [])
        
        if not view_ids:
            return JsonResponse({
                'success': False,
                'message': 'No view IDs provided',
            }, status=400)
        
        # Update order for each view
        for index, view_id in enumerate(view_ids):
            try:
                view = SettingsView.objects.get(id=view_id)
                view.order = (index + 1) * 10  # Increment by 10 to allow insertions
                view.save()
            except SettingsView.DoesNotExist:
                continue
        
        # Invalidate views cache
        invalidate_views_cache('default')
        
        return JsonResponse({
            'success': True,
            'message': 'Views reordered successfully',
        })
    except Exception as e:
        logger.exception('Request failed')
        return JsonResponse({
            'success': False,
            'message': 'Failed to reorder views',
        }, status=500)


@login_required
@admin_required
@require_http_methods(["POST"])
def set_default_view(request, view_id):
    """Set a view as the default for its type."""
    from .models import SettingsView
    
    try:
        view = SettingsView.objects.get(id=view_id)
        
        # Unset all other defaults for this type
        SettingsView.objects.filter(type=view.type).update(is_default=False)
        
        # Set this view as default
        view.is_default = True
        view.save()
        
        # Invalidate views cache
        invalidate_views_cache('default')
        
        return JsonResponse({
            'success': True,
            'message': f"'{view.label}' set as default for {view.get_type_display()} views",
        })
    except SettingsView.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'View not found',
        }, status=404)
    except Exception as e:
        logger.exception('Request failed')
        return JsonResponse({
            'success': False,
            'message': 'Failed to set default view',
        }, status=500)


# ============================================
# User Profile Stats, Audit Logs, and Devices
# ============================================

@login_required
@admin_required
@require_http_methods(["GET"])
def api_user_stats(request):
    """Get ticket stats for the current user."""
    from modules.ticket.models import Ticket
    from django.db.models import Q
    
    user = request.user
    
    # Get ticket counts by status for assigned tickets
    assigned_tickets = Ticket.objects.filter(assignee=user)
    
    open_count = assigned_tickets.filter(
        status__in=['new', 'open', 'in_progress']
    ).count()
    
    closed_count = assigned_tickets.filter(
        status__in=['resolved', 'closed']
    ).count()
    
    hold_count = assigned_tickets.filter(
        status='pending'
    ).count()
    
    # Count SLA breached tickets (using the related TicketSLA model)
    breached_count = assigned_tickets.filter(
        Q(sla__response_breached=True) | Q(sla__resolution_breached=True)
    ).exclude(
        status__in=['resolved', 'closed']
    ).count()
    
    return JsonResponse({
        'success': True,
        'stats': {
            'open': open_count,
            'closed': closed_count,
            'hold': hold_count,
            'breached': breached_count,
        }
    })


@login_required
@admin_required
@require_http_methods(["GET"])
def api_user_audit_logs(request):
    """Get paginated audit logs for the current user."""
    from modules.users.models import AuditLog
    
    user = request.user
    page = int(request.GET.get('page', 1))
    per_page = int(request.GET.get('per_page', 10))
    
    audit_logs = AuditLog.objects.filter(user=user).order_by('-created_at')
    
    paginator = Paginator(audit_logs, per_page)
    page_obj = paginator.get_page(page)
    
    logs_data = []
    for log in page_obj:
        logs_data.append({
            'id': log.id,
            'action': log.action,
            'actionDisplay': log.get_action_display(),
            'description': log.description,
            'ipAddress': log.ip_address,
            'browser': log.browser,
            'os': log.os,
            'deviceType': log.device_type,
            'location': log.location,
            'status': log.status,
            'createdAt': log.created_at.isoformat(),
        })
    
    return JsonResponse({
        'success': True,
        'logs': logs_data,
        'pagination': {
            'page': page,
            'perPage': per_page,
            'totalPages': paginator.num_pages,
            'totalItems': paginator.count,
            'hasNext': page_obj.has_next(),
            'hasPrevious': page_obj.has_previous(),
        }
    })


@login_required
@require_http_methods(["GET"])
def api_user_devices(request):
    """Get paginated devices for the current user."""
    from modules.users.models import UserDevice
    
    user = request.user
    page = int(request.GET.get('page', 1))
    per_page = int(request.GET.get('per_page', 10))
    
    devices = UserDevice.objects.filter(user=user).order_by('-last_active')
    
    paginator = Paginator(devices, per_page)
    page_obj = paginator.get_page(page)
    
    devices_data = []
    for device in page_obj:
        devices_data.append({
            'id': device.id,
            'deviceId': device.device_id,
            'deviceName': device.device_name,
            'deviceType': device.device_type,
            'browser': device.browser,
            'browserVersion': device.browser_version,
            'os': device.os,
            'osVersion': device.os_version,
            'ipAddress': device.ip_address,
            'location': device.location,
            'isCurrent': device.is_current,
            'isTrusted': device.is_trusted,
            'lastActive': device.last_active.isoformat(),
            'firstSeen': device.first_seen.isoformat(),
        })
    
    return JsonResponse({
        'success': True,
        'devices': devices_data,
        'pagination': {
            'page': page,
            'perPage': per_page,
            'totalPages': paginator.num_pages,
            'totalItems': paginator.count,
            'hasNext': page_obj.has_next(),
            'hasPrevious': page_obj.has_previous(),
        }
    })


@login_required
@require_http_methods(["POST"])
def api_revoke_device(request, device_id):
    """Revoke a user device/session."""
    from modules.users.models import UserDevice
    from django.contrib.sessions.models import Session
    
    user = request.user
    
    try:
        device = UserDevice.objects.get(id=device_id, user=user)
        
        # Delete the session if it exists
        if device.session_key:
            try:
                Session.objects.filter(session_key=device.session_key).delete()
            except Exception:
                pass
        
        # Delete the device record
        device.delete()
        
        return JsonResponse({
            'success': True,
            'message': 'Device revoked successfully'
        })
        
    except UserDevice.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Device not found'
        }, status=404)


# =============================================================================
# EMAIL INTEGRATION (IMAP)
# =============================================================================

@login_required
@admin_required
@inertia('EmailProviderSetup')
def email_imap_setup(request):
    """Email IMAP provider setup page."""
    from modules.email_to_ticket.models import CustomIMAPMailbox

    is_connected = False
    connected_mailboxes = []

    mailboxes = CustomIMAPMailbox.objects.filter(is_active=True)
    if mailboxes.exists():
        is_connected = True
        connected_mailboxes = [
            {
                'id': mb.id,
                'email': mb.email_address,
                'display_name': mb.display_name,
                'imap_host': mb.imap_host,
                'connected_at': mb.created_at.isoformat() if mb.created_at else None,
                'last_checked': mb.last_sync_at.isoformat() if mb.last_sync_at else None,
            }
            for mb in mailboxes
        ]

    # Show the saved routing options (never the password)
    current = mailboxes.first()
    config = {
        'auto_create_tickets': current.auto_create_tickets,
        'auto_reply': current.auto_reply,
        'default_priority': current.default_priority,
    } if current else {}

    return {
        'title': 'Custom IMAP/SMTP Integration',
        'provider_id': 'imap',
        'is_connected': is_connected,
        'config': config,
        'connected_mailboxes': connected_mailboxes,
    }


@login_required
@admin_required
@require_http_methods(["POST"])
def custom_imap_connect(request):
    """Connect a custom IMAP mailbox."""
    from modules.email_to_ticket.models import CustomIMAPMailbox

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        data = request.POST

    email_addr = data.get('email', '')
    password = data.get('password', '')
    imap_host = data.get('imap_host', '')
    imap_port = int(data.get('imap_port', 993))
    enable_smtp = data.get('enable_smtp', False)
    smtp_host = data.get('smtp_host', '')
    smtp_port = int(data.get('smtp_port', 587))
    use_ssl = data.get('use_ssl', True)

    if not all([email_addr, password, imap_host]):
        return JsonResponse({'success': False, 'error': 'Email, password, and IMAP host are required'})

    if enable_smtp and not smtp_host:
        return JsonResponse({'success': False, 'error': 'SMTP host is required when outgoing email is enabled'})

    # Test IMAP connection
    import imaplib
    import ssl as ssl_module

    try:
        if use_ssl:
            context = ssl_module.create_default_context()
            mail = imaplib.IMAP4_SSL(imap_host, imap_port, ssl_context=context)
        else:
            mail = imaplib.IMAP4(imap_host, imap_port)
        mail.login(email_addr, password)
        mail.select('INBOX')
        mail.logout()
    except Exception:
        logger.exception('Custom IMAP connection test failed')
        return JsonResponse({'success': False, 'error': 'IMAP connection failed. Check the server, port and credentials.'})

    mailbox, created = CustomIMAPMailbox.objects.update_or_create(
        email_address=email_addr,
        defaults={
            'display_name': email_addr.split('@')[0],
            'imap_host': imap_host,
            'imap_port': imap_port,
            'imap_use_ssl': use_ssl,
            'enable_smtp': enable_smtp,
            'smtp_host': smtp_host if enable_smtp else '',
            'smtp_port': smtp_port,
            'smtp_use_tls': smtp_port == 587 and enable_smtp,
            'smtp_use_ssl': smtp_port == 465 and enable_smtp,
            'username': email_addr,
            'password': password,
            'is_active': True,
        }
    )

    return JsonResponse({
        'success': True,
        'message': f'Mailbox {"connected" if created else "updated"} successfully',
        'mailbox_id': mailbox.id,
    })


@login_required
@admin_required
@require_http_methods(["POST"])
def custom_imap_configure(request):
    """Configure custom IMAP mailbox settings."""
    from modules.email_to_ticket.models import CustomIMAPMailbox

    # The setup page posts JSON; plain form posts are accepted too
    if request.content_type == 'application/json':
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'error': 'Invalid request'}, status=400)
    else:
        data = request.POST

    def flag(name):
        return str(data.get(name)).lower() in ('true', '1', 'on')

    # Only change what was sent, so omitted options keep their saved values
    changes = {name: flag(name) for name in ('auto_create_tickets', 'auto_reply') if name in data}
    if data.get('default_priority') in ('low', 'normal', 'high', 'urgent'):
        changes['default_priority'] = data['default_priority']
    if data.get('folder_to_watch'):
        changes['folder_to_watch'] = data['folder_to_watch']

    if changes:
        CustomIMAPMailbox.objects.filter(is_active=True).update(**changes)

    from django.shortcuts import redirect
    return redirect('email_imap_setup')


@login_required
@admin_required
@require_http_methods(["POST"])
def custom_imap_disconnect(request):
    """Disconnect a custom IMAP mailbox."""
    from modules.email_to_ticket.models import CustomIMAPMailbox

    try:
        data = json.loads(request.body)
        mailbox_id = data.get('mailbox_id')
    except json.JSONDecodeError:
        mailbox_id = request.POST.get('mailbox_id')

    if not mailbox_id:
        return JsonResponse({'status': 'error', 'message': 'mailbox_id required'}, status=400)

    mailbox = CustomIMAPMailbox.objects.filter(id=mailbox_id).first()
    if not mailbox:
        return JsonResponse({'status': 'error', 'message': 'Mailbox not found'}, status=404)

    email_addr = mailbox.email_address
    mailbox.delete()

    return JsonResponse({
        'status': 'success',
        'message': f'Mailbox {email_addr} disconnected'
    })


@login_required
@admin_required
@require_http_methods(["POST"])
def custom_imap_test(request):
    """Test custom IMAP mail connection."""
    from modules.email_to_ticket.models import CustomIMAPMailbox

    mailbox = CustomIMAPMailbox.objects.filter(is_active=True).first()
    if not mailbox:
        return JsonResponse({'success': False, 'error': 'No connected mailbox found'})

    success, message = mailbox.test_connection()
    if not success:
        logger.warning('Custom IMAP test failed: %s', message)
        message = 'Connection failed. Check the server, port and credentials.'

    if success:
        return JsonResponse({
            'success': True,
            'message': f'Connection successful to {mailbox.email_address}'
        })
    else:
        return JsonResponse({'success': False, 'error': message})


@login_required
@admin_required
def custom_imap_list_mailboxes(request):
    """List connected custom IMAP mailboxes."""
    from modules.email_to_ticket.models import CustomIMAPMailbox

    mailboxes = CustomIMAPMailbox.objects.all().order_by('-created_at')

    mailboxes_data = [
        {
            'id': mb.id,
            'email_address': mb.email_address,
            'display_name': mb.display_name,
            'imap_host': mb.imap_host,
            'smtp_host': mb.smtp_host,
            'is_active': mb.is_active,
            'auto_create_tickets': mb.auto_create_tickets,
            'folder_to_watch': mb.folder_to_watch,
            'last_sync_at': mb.last_sync_at.isoformat() if mb.last_sync_at else None,
            'created_at': mb.created_at.isoformat() if mb.created_at else None,
        }
        for mb in mailboxes
    ]

    return JsonResponse({
        'status': 'success',
        'mailboxes': mailboxes_data,
        'count': len(mailboxes_data),
    })
