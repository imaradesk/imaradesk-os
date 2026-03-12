from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.http import JsonResponse
from django.shortcuts import redirect
from django.views.decorators.http import require_http_methods
from django.db import connection
from inertia import inertia
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from modules.users.models import UserProfile, Organization, Role, Group
from modules.users.permissions import Permission
from modules.sla.models import SLAPolicy, BusinessHours, Holiday
from modules.tickets.views import invalidate_views_cache
from .models import App, InstalledApp, SecuritySettings
import json
import logging

logger = logging.getLogger(__name__)

User = get_user_model()


@login_required
@inertia('Settings')
def general_settings(request):
    """General settings page."""
    from shared.models import Client, Domain
    from modules.sla.models import BusinessHours
    
    # Get current organization (single-tenant)
    tenant = Client.get_current()
    
    # Debug logging
    print(f"[general_settings] Organization: {tenant.name if tenant else 'None'}")
    
    # Get business hours if exists
    business_hours = BusinessHours.objects.filter(is_active=True).first()
    
    # Get primary domain
    primary_domain = Domain.objects.filter(tenant=tenant, is_primary=True).first()
    
    business_data = {
        'company_name': tenant.name if tenant else '',
        'description': tenant.description if tenant else '',
        'business_type': tenant.business_type if tenant else '',
        'org_size': tenant.org_size if tenant else '',
        'domain': primary_domain.domain if primary_domain else '',
        'created_on': tenant.created_on.isoformat() if tenant and tenant.created_on else None,
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
        'businessHours': business_hours_data,
    }


@login_required
@require_http_methods(["POST"])
def update_business_info(request):
    """Update business/company information."""
    from django.db import connection
    from shared.models import Client
    import json
    
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)
    
    # Get current organization (single-tenant)
    from shared.models import Client
    tenant = Client.get_current()
    
    if not tenant:
        return JsonResponse({'success': False, 'error': 'No tenant found'}, status=400)
    
    # Update tenant fields
    if 'company_name' in data:
        tenant.name = data['company_name']
    if 'description' in data:
        tenant.description = data['description']
    if 'business_type' in data:
        tenant.business_type = data['business_type']
    if 'org_size' in data:
        tenant.org_size = data['org_size']
    
    try:
        tenant.save()
        return JsonResponse({
            'success': True,
            'message': 'Business information updated successfully',
            'business': {
                'company_name': tenant.name,
                'description': tenant.description,
                'business_type': tenant.business_type,
                'org_size': tenant.org_size,
            }
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@login_required
@inertia('Settings')
def notifications_settings(request):
    """Notifications settings page."""
    from .models import NotificationSettings
    
    # Get business notification settings (singleton)
    settings = NotificationSettings.get_settings()
    
    return {
        'activeSection': 'notifications',
        'notification_preferences': {
            # Ticket Notifications
            'notify_new_ticket_created': settings.notify_new_ticket_created,
            'notify_ticket_assigned': settings.notify_ticket_assigned,
            'notify_ticket_status_changed': settings.notify_ticket_status_changed,
            'notify_ticket_priority_changed': settings.notify_ticket_priority_changed,
            'notify_new_comment': settings.notify_new_comment,
            'notify_ticket_reassigned': settings.notify_ticket_reassigned,
            'notify_ticket_group_assigned': settings.notify_ticket_group_assigned,
            'notify_ticket_merged': settings.notify_ticket_merged,
            'notify_ticket_mentioned': settings.notify_ticket_mentioned,
            # Reports
            'weekly_performance_report': settings.weekly_performance_report,
            'weekly_report_email': settings.weekly_report_email or request.user.email,
        },
        'user_email': request.user.email,
    }


@login_required
@require_http_methods(["POST"])
def notifications_settings_update(request):
    """Update business notification settings."""
    from .models import NotificationSettings
    
    try:
        data = json.loads(request.body)
        settings = NotificationSettings.get_settings()
        
        # Notification fields
        notification_fields = [
            'notify_new_ticket_created',
            'notify_ticket_assigned',
            'notify_ticket_status_changed',
            'notify_ticket_priority_changed',
            'notify_new_comment',
            'notify_ticket_reassigned',
            'notify_ticket_group_assigned',
            'notify_ticket_merged',
            'notify_ticket_mentioned',
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
        logger.error(f"Error updating notification settings: {e}")
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=400)


@login_required
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
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=400)


# ============ Two-Factor Authentication Views ============

@login_required
@require_http_methods(["POST"])
def send_email_2fa_code(request):
    """Send 2FA verification code to user's email."""
    import random
    from shared.utilities.Mailer import Mailer
    from shared.utilities.GlobalEmailTenplates import GlobalEmailTemplates
    
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
            issuer_name='ImaraDesk'
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
    from shared.utilities.GlobalEmailTenplates import GlobalEmailTemplates
    
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

    return {
        'users': users,
        'orgs': orgs,
        'roles': roles,
        'groups': groups,
        'pagination': {
            'page': page.number,
            'pages': paginator.num_pages,
            'count': paginator.count,
            'has_next': page.has_next(),
            'has_prev': page.has_previous(),
        },
    }


@login_required
@inertia('TeamRoles')
def team_roles(request):
    """Team roles page."""
    roles_qs = Role.objects.all()
    roles = [
        {
            'id': r.id,
            'name': r.name,
            'description': r.description,
            'permissions': r.permissions if isinstance(r.permissions, list) else [],
            'is_system': r.is_system,
        }
        for r in roles_qs
    ]
    permissions_grouped = Permission.get_grouped()

    return {
        'roles': roles,
        'permissions': permissions_grouped,
    }


@login_required
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
@inertia('TeamImport')
def team_import(request):
    """Team import page."""
    return {}


# Team Users CRUD
@login_required
@inertia('TeamUserForm')
def team_user_add(request):
    """Add new user."""
    if request.method == 'POST':
        username = request.POST.get('username')
        email = request.POST.get('email')
        full_name = request.POST.get('full_name')
        password = request.POST.get('password')
        org_id = request.POST.get('organization')
        role_id = request.POST.get('role')
        
        # Handle groups - Inertia.js sends arrays as indexed keys (groups[0], groups[1], etc.)
        group_ids = request.POST.getlist('groups')
        if not group_ids:
            # Try indexed format from Inertia.js
            i = 0
            while f'groups[{i}]' in request.POST:
                group_ids.append(request.POST.get(f'groups[{i}]'))
                i += 1
        
        # Debug logging
        logger.info(f"[team_user_add] POST data: {dict(request.POST)}")
        logger.info(f"[team_user_add] group_ids: {group_ids}")
        
        # Determine if user is an agent based on role
        # Agent roles: Administrator, Agent, Manager
        is_agent = False
        role = None
        if role_id:
            try:
                role = Role.objects.get(id=role_id)
                is_agent = role.name in ['Administrator', 'Agent', 'Manager']
            except Role.DoesNotExist:
                pass

        if not username or not email:
            return {'error': 'Username and email are required'}
        
        # Create user
        user = User.objects.create_user(username=username, email=email, password=password or 'changeme123')
        
        # Get organization
        org = Organization.objects.get(id=org_id) if org_id else None
        
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
        
        return redirect('team_users')
    
    # GET - Show form
    orgs = list(Organization.objects.all().values('id', 'name'))
    roles = list(Role.objects.all().values('id', 'name', 'description'))
    groups_qs = Group.objects.all()
    groups = [{'id': g.id, 'name': g.name, 'description': g.description} for g in groups_qs]
    
    return {
        'mode': 'add',
        'orgs': orgs,
        'roles': roles,
        'groups': groups,
    }


@login_required
@inertia('TeamUserForm')
def team_user_edit(request, user_id):
    """Edit existing user."""
    try:
        user = User.objects.get(id=user_id)
        profile = user.profile
    except (User.DoesNotExist, UserProfile.DoesNotExist):
        return redirect('team_users')

    if request.method == 'POST':
        full_name = request.POST.get('full_name')
        email = request.POST.get('email')
        org_id = request.POST.get('organization')
        role_id = request.POST.get('role')
        
        # Handle groups - Inertia.js sends arrays as indexed keys (groups[0], groups[1], etc.)
        group_ids = request.POST.getlist('groups')
        if not group_ids:
            # Try indexed format from Inertia.js
            i = 0
            while f'groups[{i}]' in request.POST:
                group_ids.append(request.POST.get(f'groups[{i}]'))
                i += 1

        # Debug logging
        logger.info(f"[team_user_edit] POST data: {dict(request.POST)}")
        logger.info(f"[team_user_edit] group_ids: {group_ids}")

        user.email = email or user.email
        profile.full_name = full_name or profile.full_name
        
        if org_id:
            try:
                profile.organization = Organization.objects.get(id=org_id)
            except Organization.DoesNotExist:
                profile.organization = None
        else:
            profile.organization = None
        
        if role_id:
            try:
                role = Role.objects.get(id=role_id)
                profile.role = role
                # Determine if user is an agent based on role
                profile.is_agent = role.name in ['Administrator', 'Agent', 'Manager']
            except Role.DoesNotExist:
                profile.role = None
                profile.is_agent = False
        else:
            profile.role = None
            profile.is_agent = False
        
        # Update groups
        if group_ids:
            groups = Group.objects.filter(id__in=group_ids)
            profile.groups.set(groups)
        else:
            profile.groups.clear()
        
        profile.save()
        user.save(update_fields=['email'])
        return redirect('team_users')
    
    # GET - Show form with existing data
    orgs = list(Organization.objects.all().values('id', 'name'))
    roles = list(Role.objects.all().values('id', 'name', 'description'))
    groups_qs = Group.objects.all()
    groups = [{'id': g.id, 'name': g.name, 'description': g.description} for g in groups_qs]
    
    return {
        'mode': 'edit',
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': profile.full_name,
            'is_agent': profile.is_agent,
            'organization': profile.organization.id if profile.organization else '',
            'role': profile.role.id if profile.role else '',
            'groups': [g.id for g in profile.groups.all()],
        },
        'orgs': orgs,
        'roles': roles,
        'groups': groups,
    }


@login_required
def team_user_delete(request, user_id):
    """Delete user."""
    if request.method == 'POST':
        try:
            user = User.objects.get(id=user_id)
            user.delete()
        except User.DoesNotExist:
            pass
    return redirect('team_users')


# Team Roles CRUD
@login_required
@inertia('TeamRoleForm')
def team_role_add(request):
    """Add new role."""
    if request.method == 'POST':
        name = request.POST.get('name')
        description = request.POST.get('description', '')
        permissions = request.POST.getlist('permissions')
        
        if not name:
            return {'error': 'Role name is required'}
        
        if Role.objects.filter(name=name).exists():
            return {'error': 'Role name already exists'}
        
        Role.objects.create(
            name=name,
            description=description,
            permissions=permissions,
        )
        return redirect('team_roles')
    
    # GET - Show form
    permissions_grouped = Permission.get_grouped()
    return {
        'mode': 'add',
        'permissions': permissions_grouped,
    }


@login_required
@inertia('TeamRoleForm')
def team_role_edit(request, role_id):
    """Edit existing role."""
    try:
        role = Role.objects.get(id=role_id)
    except Role.DoesNotExist:
        return redirect('team_roles')
    
    if request.method == 'POST':
        description = request.POST.get('description', '')
        permissions = request.POST.getlist('permissions')
        
        # Only allow name changes for non-system roles
        if not role.is_system:
            name = request.POST.get('name')
            if not name:
                return {'error': 'Role name is required'}
            if Role.objects.filter(name=name).exclude(id=role_id).exists():
                return {'error': 'Role name already exists'}
            role.name = name
        
        role.description = description
        role.permissions = permissions
        role.save()
        return redirect('team_roles')
    
    # GET - Show form with existing data
    permissions_grouped = Permission.get_grouped()
    return {
        'mode': 'edit',
        'role': {
            'id': role.id,
            'name': role.name,
            'description': role.description,
            'is_system': role.is_system,
            'permissions': role.permissions if isinstance(role.permissions, list) else [],
        },
        'permissions': permissions_grouped,
    }


@login_required
def team_role_delete(request, role_id):
    """Delete role."""
    if request.method == 'POST':
        try:
            role = Role.objects.get(id=role_id)
            if not role.is_system:
                role.delete()
        except Role.DoesNotExist:
            pass
    return redirect('team_roles')


@login_required
def team_role_view(request, role_id):
    """Get role details including users with this role."""
    try:
        role = Role.objects.get(id=role_id)
        
        # Get users with this role
        users = []
        for profile in UserProfile.objects.filter(role=role).select_related('user', 'organization'):
            users.append({
                'id': profile.user.id,
                'username': profile.user.username,
                'email': profile.user.email,
                'full_name': profile.full_name,
                'is_agent': profile.is_agent,
                'organization': profile.organization.name if profile.organization else None,
                'status': 'online',
            })
        
        # Get all permissions grouped
        permissions_grouped = Permission.get_grouped()
        
        return JsonResponse({
            'id': role.id,
            'name': role.name,
            'description': role.description,
            'is_system': role.is_system,
            'permissions': role.permissions if isinstance(role.permissions, list) else [],
            'all_permissions': permissions_grouped,
            'user_count': len(users),
            'users': users,
            'created_at': role.created_at.isoformat() if hasattr(role, 'created_at') and role.created_at else None,
        })
    except Role.DoesNotExist:
        return JsonResponse({'error': 'Role not found'}, status=404)


@login_required
@require_http_methods(["POST"])
def team_role_update_permissions(request, role_id):
    """Update role permissions."""
    try:
        role = Role.objects.get(id=role_id)
        
        # Handle permissions - Inertia.js sends arrays as indexed keys
        permissions = request.POST.getlist('permissions')
        if not permissions:
            # Try indexed format from Inertia.js
            i = 0
            while f'permissions[{i}]' in request.POST:
                permissions.append(request.POST.get(f'permissions[{i}]'))
                i += 1
        
        role.permissions = permissions
        role.save()
        
        return JsonResponse({
            'success': True,
            'permissions': role.permissions,
        })
    except Role.DoesNotExist:
        return JsonResponse({'error': 'Role not found'}, status=404)


# Team Groups CRUD
@login_required
@inertia('TeamGroupForm')
def team_group_add(request):
    """Add new group."""
    if request.method == 'POST':
        name = request.POST.get('name')
        description = request.POST.get('description', '')
        
        if not name:
            return {'error': 'Group name is required'}
        
        if Group.objects.filter(name=name).exists():
            return {'error': 'Group name already exists'}
        
        Group.objects.create(
            name=name,
            description=description,
        )
        return redirect('team_groups')
    
    # GET - Show form
    return {
        'mode': 'add',
    }


@login_required
@inertia('TeamGroupForm')
def team_group_edit(request, group_id):
    """Edit existing group."""
    try:
        group = Group.objects.get(id=group_id)
    except Group.DoesNotExist:
        return redirect('team_groups')
    
    if request.method == 'POST':
        name = request.POST.get('name')
        description = request.POST.get('description', '')
        
        if not name:
            return {'error': 'Group name is required'}
        
        if Group.objects.filter(name=name).exclude(id=group_id).exists():
            return {'error': 'Group name already exists'}
        
        group.name = name
        group.description = description
        group.save()
        return redirect('team_groups')
    
    # GET - Show form with existing data
    return {
        'mode': 'edit',
        'group': {
            'id': group.id,
            'name': group.name,
            'description': group.description,
        },
    }


@login_required
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
def team_group_available_agents(request, group_id):
    """Get available agents that can be added to a group (not already members)."""
    try:
        group = Group.objects.get(id=group_id)
        
        # Get all agents not in this group
        # Agent is determined by role (Administrator, Agent, Manager)
        existing_member_ids = group.members.values_list('id', flat=True)
        available_profiles = UserProfile.objects.filter(
            role__name__in=['Administrator', 'Agent', 'Manager']
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
            id__in=profile_ids,
            role__name__in=['Administrator', 'Agent', 'Manager']
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
        logger.error(f"Error adding members to group: {e}")
        return JsonResponse({'error': str(e)}, status=400)


# Emails Settings Views
@login_required
@inertia('EmailsTemplates')
def emails_templates(request):
    """Email templates settings page."""
    from .models import EmailTemplate
    from django.core.paginator import Paginator
    
    # Get page number from query params
    page_number = request.GET.get('page', 1)
    per_page = 10
    
    # Get all templates ordered by type
    all_templates = EmailTemplate.objects.all().order_by('template_type')
    
    # Paginate
    paginator = Paginator(all_templates, per_page)
    page_obj = paginator.get_page(page_number)
    
    templates_data = []
    for template in page_obj:
        templates_data.append({
            'id': template.id,
            'name': template.name,
            'template_type': template.template_type,
            'type': template.get_template_type_display(),
            'subject': template.subject,
            'body_html': template.body_html,
            'body_text': template.body_text,
            'status': template.status,
            'available_variables': template.available_variables,
            'created_at': template.created_at.isoformat() if template.created_at else None,
            'updated_at': template.updated_at.isoformat() if template.updated_at else None,
        })
    
    return {
        'activeSection': 'emails-templates',
        'templates': templates_data,
        'pagination': {
            'current_page': page_obj.number,
            'total_pages': paginator.num_pages,
            'per_page': per_page,
            'total_count': paginator.count,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous(),
        }
    }


@login_required
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
            user_full_name = request.user.userprofile.full_name
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
            'company_name': 'ImaraDesk Support',
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
        # Validation errors (e.g., missing placeholders)
        return JsonResponse({
            'success': False,
            'message': f'Template validation error: {str(e)}',
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Failed to send test email: {str(e)}',
        }, status=500)


@login_required
@inertia('EditEmailTemplate')
def edit_email_template(request, template_id):
    """Edit email template page."""
    from .models import EmailTemplate
    
    try:
        template = EmailTemplate.objects.get(id=template_id)
        
        template_data = {
            'id': template.id,
            'name': template.name,
            'template_type': template.template_type,
            'subject': template.subject,
            'body_html': template.body_html,
            'body_text': template.body_text,
            'status': template.status,
            'available_variables': template.available_variables,
        }
        
        return {
            'template': template_data,
        }
    except EmailTemplate.DoesNotExist:
        return redirect('emails_templates')


@login_required
@require_http_methods(["POST"])
def update_email_template(request, template_id):
    """Update email template."""
    from .models import EmailTemplate
    import json
    
    try:
        template = EmailTemplate.objects.get(id=template_id)
        data = json.loads(request.body)
        
        # Update allowed fields
        template.name = data.get('name', template.name)
        template.subject = data.get('subject', template.subject)
        template.body_text = data.get('body_text', template.body_text)
        template.status = data.get('status', template.status)
        # body_html is now auto-generated from body_text, keep it empty
        template.body_html = ''
        
        template.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Email template updated successfully',
        })
    
    except EmailTemplate.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'Email template not found',
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Failed to update template: {str(e)}',
        }, status=500)


# SLA Settings Views
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
            'apply_to_new_tickets': p.apply_to_new_tickets,
            'send_escalation_emails': p.send_escalation_emails,
            'auto_assign_on_breach': p.auto_assign_on_breach,
            'pause_on_pending': p.pause_on_pending,
            'notify_before_breach': p.notify_before_breach,
        }
        for p in policies_qs
    ]
    
    return {
        'activeSection': 'sla-policies',
        'policies': policies,
    }


@login_required
@inertia('AddSLAPolicy')
def sla_policy_add(request):
    """Add SLA policy page."""
    return {
        'activeSection': 'sla-policies',
        'policy': None,
    }


@login_required
@inertia('AddSLAPolicy')
def sla_policy_edit(request, policy_id):
    """Edit SLA policy page."""
    try:
        policy = SLAPolicy.objects.get(id=policy_id)
        policy_data = {
            'id': policy.id,
            'name': policy.name,
            'priority': policy.priority,
            'description': policy.description,
            'status': policy.status,
            'notify_before_breach': policy.notify_before_breach,
            'first_response_time': policy.first_response_time,
            'resolution_time': policy.resolution_time,
            'apply_to_new_tickets': policy.apply_to_new_tickets,
            'escalate_on_breach': policy.send_escalation_emails,
            'auto_assign_on_breach': policy.auto_assign_on_breach,
        }
    except SLAPolicy.DoesNotExist:
        from django.shortcuts import redirect
        return redirect('settings:sla_policies')
    
    return {
        'activeSection': 'sla-policies',
        'policy': policy_data,
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
@inertia('Marketplace')
def marketplace(request):
    """Marketplace page showing available apps."""
    apps_qs = App.objects.filter(status__in=['active', 'beta'])
    
    # Get installed apps with trial info
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
            'price': float(app.price),
            'is_free': app.is_free,
            'status': app.status,
            'is_featured': app.is_featured,
            'version': app.version,
            'developer': app.developer,
            'install_count': app.install_count,
            'is_installed': installed_app is not None,
        }
        
        # Add trial info if installed
        if installed_app:
            app_data['subscription_status'] = installed_app.subscription_status
            app_data['trial_days_remaining'] = installed_app.trial_days_remaining
            app_data['is_trial_expired'] = installed_app.is_trial_expired
            app_data['trial_ends_at'] = installed_app.trial_ends_at.isoformat() if installed_app.trial_ends_at else None
        
        apps.append(app_data)
    
    return {
        'activeSection': 'marketplace',
        'apps': apps,
    }


@login_required
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
            
            # Reactivate the app - NO NEW TRIAL (prevents trial abuse)
            existing_install.is_active = True
            existing_install.uninstalled_at = None
            existing_install.installed_at = timezone.now()
            
            # Check if trial was expired
            if existing_install.subscription_status == 'trial' and existing_install.is_trial_expired:
                existing_install.subscription_status = 'expired'
            
            existing_install.save()
            
            # Increment install count
            app.install_count += 1
            app.save()
            
            trial_days = existing_install.trial_days_remaining
            
            return JsonResponse({
                'success': True,
                'message': f'{app.name} reinstalled! Your original trial period applies.',
                'installed_app': {
                    'id': existing_install.id,
                    'app_name': app.name,
                    'subscription_status': existing_install.subscription_status,
                    'trial_ends_at': existing_install.trial_ends_at.isoformat() if existing_install.trial_ends_at else None,
                    'trial_days_remaining': trial_days,
                    'is_trial_expired': existing_install.is_trial_expired,
                }
            })
        
        # First time installation - create with 14-day trial
        trial_end = timezone.now() + timedelta(days=14) if not app.is_free else None
        
        installed_app = InstalledApp.objects.create(
            app=app,
            is_active=True,
            subscription_status='trial' if not app.is_free else 'active',
            trial_ends_at=trial_end,
            next_billing_date=trial_end if trial_end else None,
        )
        
        # Increment install count
        app.install_count += 1
        app.save()
        
        return JsonResponse({
            'success': True,
            'message': f'{app.name} installed successfully! You have 14 days free trial.',
            'installed_app': {
                'id': installed_app.id,
                'app_name': app.name,
                'subscription_status': installed_app.subscription_status,
                'trial_ends_at': installed_app.trial_ends_at.isoformat() if installed_app.trial_ends_at else None,
                'trial_days_remaining': 14 if trial_end else None,
                'is_trial_expired': False,
            }
        })
    except App.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'App not found'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=500)


@login_required
@require_http_methods(["DELETE"])
def uninstall_app(request, app_id):
    """Uninstall an app (soft delete - keeps record for trial tracking)."""
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
            'message': f'{app.name} uninstalled successfully. Note: Reinstalling will not reset your trial period.'
        })
    except InstalledApp.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'App is not installed'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=500)


@login_required
@inertia('InstalledApps')
def installed_apps(request):
    """View installed apps."""
    installed = InstalledApp.objects.select_related('app').filter(is_active=True)
    
    apps = [
        {
            'id': ia.id,
            'app_id': ia.app.id,
            'name': ia.app.name,
            'description': ia.app.description,
            'icon': ia.app.icon,
            'price': float(ia.app.price),
            'is_free': ia.app.is_free,
            'subscription_status': ia.subscription_status,
            'installed_at': ia.installed_at.isoformat(),
            'trial_ends_at': ia.trial_ends_at.isoformat() if ia.trial_ends_at else None,
            'next_billing_date': ia.next_billing_date.isoformat() if ia.next_billing_date else None,
            'settings': ia.settings,
        }
        for ia in installed
    ]
    
    return {
        'apps': apps,
    }


@login_required
@inertia('SettingsViews')
def settings_views(request):
    """Views management page."""
    from .models import SettingsView
    
    # Get current type from query params (default to TICKET)
    current_type = request.GET.get('type', 'TICKET')
    
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
    }


@login_required
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
        return JsonResponse({
            'success': False,
            'message': f'Failed to update view: {str(e)}',
        }, status=500)


@login_required
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
        return JsonResponse({
            'success': False,
            'message': f'Failed to reorder views: {str(e)}',
        }, status=500)


@login_required
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
        return JsonResponse({
            'success': False,
            'message': f'Failed to set default view: {str(e)}',
        }, status=500)
