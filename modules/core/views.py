"""
Core views - Dashboard, Login, Logout, Reports
"""
from django.shortcuts import render, redirect
from django.contrib.auth.models import User
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods
from inertia import inertia, render as inertia_render

import hmac
import logging
import secrets
import time

from shared.utilities.organization import absolute_url
from shared.utilities.throttle import clear_login_failures, login_locked, register_login_failure
from django.utils.http import url_has_allowed_host_and_scheme

logger = logging.getLogger(__name__)

AUTH_BACKEND = 'django.contrib.auth.backends.ModelBackend'

# Two-factor: one pending sign-in may only guess/send a limited number of times
TWO_FA_PENDING_SECONDS = 10 * 60
TWO_FA_MAX_ATTEMPTS = 5
TWO_FA_MAX_SENDS = 5
TWO_FA_SEND_COOLDOWN = 45
TWO_FA_SESSION_KEYS = (
    'pending_2fa_user_id', 'pending_2fa_email', 'pending_2fa_authenticator', 'pending_2fa_next',
    'pending_2fa_at', 'pending_2fa_attempts', 'pending_2fa_sends', 'pending_2fa_last_send',
)


def _safe_next(request, url):
    """Return `url` only if it is a same-site path ('' otherwise). Rejects //host, \\host and absolute URLs."""
    if url and url.startswith('/') and url_has_allowed_host_and_scheme(
        url, allowed_hosts={request.get_host()}, require_https=request.is_secure(),
    ):
        return url
    return ''


def _begin_2fa(request, user, next_url=''):
    """Park a password-verified sign-in until the 2FA code is entered."""
    profile = user.profile
    request.session.cycle_key()
    request.session['pending_2fa_user_id'] = user.id
    request.session['pending_2fa_email'] = bool(profile.email_2fa_enabled)
    request.session['pending_2fa_authenticator'] = bool(profile.authenticator_2fa_enabled)
    request.session['pending_2fa_next'] = _safe_next(request, next_url)
    request.session['pending_2fa_at'] = time.time()
    request.session['pending_2fa_attempts'] = 0
    request.session['pending_2fa_sends'] = 0
    request.session['pending_2fa_last_send'] = 0


def _clear_pending_2fa(request):
    for key in TWO_FA_SESSION_KEYS:
        request.session.pop(key, None)


def _pending_2fa_user(request):
    """The user waiting on 2FA in this session, or None (also None once the window has passed)."""
    uid = request.session.get('pending_2fa_user_id')
    started = request.session.get('pending_2fa_at') or 0
    if not uid or time.time() - started > TWO_FA_PENDING_SECONDS:
        if uid:
            _clear_pending_2fa(request)
        return None
    user = User.objects.filter(pk=uid, is_active=True).select_related('profile').first()
    if user is None or not hasattr(user, 'profile'):
        _clear_pending_2fa(request)
        return None
    return user


def _has_2fa(user):
    profile = getattr(user, 'profile', None)
    return bool(profile and (profile.email_2fa_enabled or profile.authenticator_2fa_enabled))


def _after_login_target(request, user, next_url):
    """Where a freshly signed-in user lands: an explicit same-site `next`, else the dashboard."""
    return _safe_next(request, next_url) or '/dashboard/'


@login_required
@inertia('Index')
def index(request):
    """Dashboard with ticket performance metrics."""
    from django.db.models import Count, Avg, Q, F
    from django.db.models.functions import TruncMonth, TruncDate, TruncWeek
    from django.utils import timezone
    from datetime import timedelta
    from modules.ticket.models import Ticket, ActivityStream
    from modules.users.models import Group
    
    user_profile = None
    try:
        user_profile = request.user.profile
    except:
        pass

    # Get time filter from query params - default to 7 days
    time_filter = request.GET.get('timeFilter', '7days')
    
    now = timezone.now()
    
    # Calculate date range based on filter
    filter_days = {
        '7days': 7,
        '30days': 30,
        '3months': 90,
        '6months': 180,
        '1year': 365,
    }
    days = filter_days.get(time_filter, 7)
    start_date = now - timedelta(days=days)
    
    # === TICKET STATS (filtered by time) ===
    all_tickets = Ticket.objects.all()
    filtered_tickets = all_tickets.filter(created_at__gte=start_date)
    
    # Count by status - map to frontend expected keys
    new_count = filtered_tickets.filter(status='new').count()
    open_count = filtered_tickets.filter(status='open').count()
    in_progress_count = filtered_tickets.filter(status='in_progress').count()
    pending_count = filtered_tickets.filter(status='pending').count()
    resolved_count = filtered_tickets.filter(status='resolved').count()
    closed_count = filtered_tickets.filter(status='closed').count()
    total_tickets = filtered_tickets.count()
    
    # Status distribution with percentages
    status_distribution = []
    if total_tickets > 0:
        for status, label in [('new', 'New'), ('open', 'Open'), ('in_progress', 'In Progress'), 
                               ('pending', 'On Hold'), ('resolved', 'Resolved'), ('closed', 'Closed')]:
            count = filtered_tickets.filter(status=status).count()
            if count > 0:
                status_distribution.append({
                    'status': label,
                    'count': count,
                    'percentage': round((count / total_tickets) * 100, 1)
                })
    
    # Priority breakdown
    priority_counts = filtered_tickets.exclude(status__in=['resolved', 'closed']).values('priority').annotate(count=Count('id'))
    open_total = sum(p['count'] for p in priority_counts)
    priorities = []
    for p in priority_counts:
        if p['count'] > 0:
            priorities.append({
                'label': p['priority'].capitalize() if p['priority'] else 'Normal',
                'count': p['count'],
                'percentage': round((p['count'] / open_total) * 100, 1) if open_total > 0 else 0
            })
    # Sort priorities by urgency
    priority_order = {'urgent': 0, 'high': 1, 'normal': 2, 'low': 3}
    priorities.sort(key=lambda x: priority_order.get(x['label'].lower(), 99))
    
    # === TIME-BASED PERFORMANCE DATA ===
    # Determine grouping based on filter
    performance_data = []
    
    if time_filter in ['7days', '30days']:
        # Daily grouping
        daily_data = filtered_tickets.annotate(
            day=TruncDate('created_at')
        ).values('day').annotate(
            total=Count('id'),
        ).order_by('day')
        
        # Create a complete date range
        date_labels = []
        current = start_date.date()
        end = now.date()
        while current <= end:
            date_labels.append(current)
            current += timedelta(days=1)
        
        # Map data to dates
        daily_dict = {}
        for d in daily_data:
            daily_dict[d['day']] = d['total']
        
        for date in date_labels:
            day_tickets = filtered_tickets.filter(created_at__date=date)
            performance_data.append({
                'label': date.strftime('%b %d') if time_filter == '30days' else date.strftime('%a'),
                'fullDate': date.strftime('%Y-%m-%d'),
                'open': day_tickets.filter(status__in=['new', 'open']).count(),
                'inProgress': day_tickets.filter(status='in_progress').count(),
                'hold': day_tickets.filter(status='pending').count(),
                'resolved': day_tickets.filter(status='resolved').count(),
                'closed': day_tickets.filter(status='closed').count(),
            })
    
    elif time_filter in ['3months', '6months']:
        # Weekly grouping
        weekly_data = filtered_tickets.annotate(
            week=TruncWeek('created_at')
        ).values('week').annotate(
            total=Count('id'),
        ).order_by('week')
        
        # Build complete week range
        weeks_count = days // 7
        for i in range(weeks_count):
            week_start = start_date + timedelta(weeks=i)
            week_end = week_start + timedelta(days=7)
            week_tickets = filtered_tickets.filter(
                created_at__gte=week_start,
                created_at__lt=week_end
            )
            performance_data.append({
                'label': f"W{i+1}",
                'fullDate': week_start.strftime('%b %d'),
                'open': week_tickets.filter(status__in=['new', 'open']).count(),
                'inProgress': week_tickets.filter(status='in_progress').count(),
                'hold': week_tickets.filter(status='pending').count(),
                'resolved': week_tickets.filter(status='resolved').count(),
                'closed': week_tickets.filter(status='closed').count(),
            })
    
    else:  # 1year - monthly grouping
        monthly_data = filtered_tickets.annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(
            total=Count('id'),
        ).order_by('month')
        
        for m in monthly_data:
            month_start = m['month']
            month_end = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
            month_tickets = filtered_tickets.filter(created_at__gte=month_start, created_at__lt=month_end)
            performance_data.append({
                'label': month_start.strftime('%b'),
                'fullDate': month_start.strftime('%Y-%m'),
                'open': month_tickets.filter(status__in=['new', 'open']).count(),
                'inProgress': month_tickets.filter(status='in_progress').count(),
                'hold': month_tickets.filter(status='pending').count(),
                'resolved': month_tickets.filter(status='resolved').count(),
                'closed': month_tickets.filter(status='closed').count(),
            })
    
    # === SLA STATS ===
    # Calculate average resolution time from resolved tickets
    resolved_tickets = all_tickets.filter(
        status__in=['resolved', 'closed'],
        resolved_at__isnull=False
    )
    
    avg_resolution_time = "—"
    if resolved_tickets.exists():
        avg_resolution_seconds = resolved_tickets.aggregate(
            avg=Avg(F('resolved_at') - F('created_at'))
        )['avg']
        if avg_resolution_seconds:
            total_seconds = avg_resolution_seconds.total_seconds()
            hours = int(total_seconds // 3600)
            minutes = int((total_seconds % 3600) // 60)
            avg_resolution_time = f"{hours}h {minutes}m"
    
    # Count open tickets for SLA stats (simplified - show active tickets status)
    active_tickets = all_tickets.exclude(status__in=['resolved', 'closed']).count()
    
    sla_data = {
        'breaches': 0,  # Would need SLA tracking fields on Ticket model
        'onTrack': active_tickets,
        'atRisk': 0,  # Would need SLA tracking fields on Ticket model
        'avgResponseTime': "—",  # Would need first_response_at field
        'avgResolutionTime': avg_resolution_time,
        'complianceRate': 100,  # Would need SLA tracking fields
    }
    
    # === GROUP STATS ===
    groups = Group.objects.annotate(
        active_tickets=Count('ticket', filter=Q(ticket__status__in=['new', 'open', 'in_progress', 'pending']))
    ).filter(active_tickets__gt=0).order_by('-active_tickets')[:5]
    
    group_stats = []
    for group in groups:
        # Calculate avg resolution time for this group
        group_resolved = all_tickets.filter(
            group=group,
            status__in=['resolved', 'closed'],
            resolved_at__isnull=False
        )
        if group_resolved.exists():
            avg_time = group_resolved.aggregate(
                avg=Avg(F('resolved_at') - F('created_at'))
            )['avg']
            if avg_time:
                total_seconds = avg_time.total_seconds()
                hours = int(total_seconds // 3600)
                minutes = int((total_seconds % 3600) // 60)
                avg_res_time = f"{hours}h {minutes}m"
            else:
                avg_res_time = "—"
        else:
            avg_res_time = "—"
        
        group_stats.append({
            'name': group.name,
            'activeTickets': group.active_tickets,
            'avgResolutionTime': avg_res_time,
        })
    
    # === RECENT ACTIVITY ===
    recent_activities = ActivityStream.objects.select_related(
        'actor', 'ticket'
    ).order_by('-created_at')[:5]
    
    recent_activity = []
    for activity in recent_activities:
        action = activity.description or f"Activity on ticket"
        if activity.ticket:
            action = f"{action}"
        
        user_name = "System"
        if activity.actor:
            user_name = f"{activity.actor.first_name} {activity.actor.last_name}".strip() or activity.actor.username
        
        # Format time ago
        time_diff = now - activity.created_at
        if time_diff.days > 0:
            time_ago = f"{time_diff.days} day{'s' if time_diff.days > 1 else ''} ago"
        elif time_diff.seconds >= 3600:
            hours = time_diff.seconds // 3600
            time_ago = f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif time_diff.seconds >= 60:
            minutes = time_diff.seconds // 60
            time_ago = f"{minutes} minute{'s' if minutes > 1 else ''} ago"
        else:
            time_ago = "Just now"
        
        recent_activity.append({
            'action': action,
            'user': user_name,
            'time': time_ago,
        })

    return {
        'title': 'Dashboard',
        'message': 'Welcome to ImaraDesk!',
        'timeFilter': time_filter,
        'dashboard': {
            'tickets': {
                'open': new_count + open_count,  # Frontend shows "Open" as new + open
                'inProgress': in_progress_count,
                'hold': pending_count,
                'resolved': resolved_count,
                'closed': closed_count,
                'total': total_tickets,
            },
            'sla': sla_data,
            'performanceData': performance_data,
            'statusDistribution': status_distribution,
            'priorities': priorities,
            'groups': group_stats,
            'recentActivity': recent_activity,
        },
    }


@ensure_csrf_cookie
@inertia('Login')
def login_view(request):
    """User login page (GET + POST)."""
    # Redirect to onboarding if no users exist (fresh install)
    if not User.objects.exists():
        return redirect('onboarding')

    # Check if organization is verified before allowing login attempts
    try:
        from shared.models import Client
        organization = Client.get_current()
        if organization and not getattr(organization, 'is_verified', True):
            return inertia_render(request, 'Login', {
                'errors': {'general': 'This workspace has not been verified yet. Please check your email for the verification link.'},
            })
    except Exception:
        logger.exception('Could not check organization status')

    next_url = request.POST.get('next') or request.GET.get('next') or ''
    invite = _login_invite_context(next_url)

    def fail(message):
        return inertia_render(request, 'Login', {
            'errors': {'general': message},
            'next': next_url,
            'invite': invite,
        })

    if request.method == 'POST':
        email = (request.POST.get('email') or '').strip()
        password = request.POST.get('password')

        errors = {}
        if not email:
            errors['email'] = 'Email is required'
        if not password:
            errors['password'] = 'Password is required'
        if errors:
            return inertia_render(request, 'Login', {'errors': errors, 'next': next_url, 'invite': invite})

        if login_locked(email):
            return fail('Too many failed attempts. Try again in 15 minutes, or reset your password.')

        # Same message for unknown email, wrong password and inactive account
        user_obj = User.objects.filter(email__iexact=email).order_by('-is_active', 'id').first()
        user = authenticate(request, username=user_obj.username, password=password) if user_obj else None
        if user is None:
            register_login_failure(email)
            return fail('Invalid email or password')

        clear_login_failures(email)

        if _has_2fa(user):
            _begin_2fa(request, user, next_url)
            return redirect('two_factor_verify')

        login(request, user, backend=AUTH_BACKEND)
        return redirect(_after_login_target(request, user, next_url))

    if request.user.is_authenticated:
        return redirect((_safe_next(request, next_url) or 'index') if invite else 'index')
    # GET request - pass next parameter to the form
    return {
        'errors': {},
        'next': next_url,
        'invite': invite,
    }


def logout_view(request):
    """Logout the user and redirect to login page."""
    logout(request)
    return redirect('login')


@ensure_csrf_cookie
@inertia('ForgotPassword')
def forgot_password(request):
    """Forgot password page - request password reset."""
    if request.method == 'POST':
        email = request.POST.get('email')
        
        if not email:
            return inertia_render(request, 'ForgotPassword', {
                'errors': {'email': 'Email is required'},
            })
        
        # Try to find user by email
        try:
            user = User.objects.filter(email__iexact=email.strip(), is_active=True).order_by('id').first()
            if user is None:
                raise User.DoesNotExist
            
            # Create password reset token
            from modules.users.models import PasswordResetToken
            reset_token = PasswordResetToken.create_token(user)
            
            # Build reset URL
            reset_url = absolute_url(request, f'/reset-password/{reset_token.token}/')
            
            # Send password reset email
            from shared.utilities.Mailer import Mailer
            from shared.utilities.templates import GlobalEmailTemplates
            
            # Get user's name
            try:
                user_name = user.profile.full_name or user.first_name or user.username
            except:
                user_name = user.first_name or user.username
            
            template = GlobalEmailTemplates.FORGOT_PASSWORD
            
            # Send email using send_raw_email with context for variable replacement
            mailer = Mailer()
            mailer.send_raw_email(
                to_email=user.email,
                subject=template['subject'],
                body_html=template['body_html'],
                body_text=template['body_text'],
                context={
                    'user_name': user_name,
                    'reset_url': reset_url,
                },
                fail_silently=False,
            )
            
        except User.DoesNotExist:
            pass
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Password reset email error: {str(e)}")
        
        # Always return success to prevent email enumeration
        return inertia_render(request, 'ForgotPassword', {
            'success': True,
            'email': email,
        })
    
    return {
        'errors': {},
    }


@ensure_csrf_cookie
@inertia('ResetPassword')
def reset_password(request, token):
    """Reset password page - set new password using token."""
    from modules.users.models import PasswordResetToken
    from django.utils import timezone
    
    # Validate token
    try:
        reset_token = PasswordResetToken.objects.get(token=token)
    except PasswordResetToken.DoesNotExist:
        return inertia_render(request, 'ResetPassword', {
            'errors': {'token': 'Invalid or expired reset link'},
            'token_valid': False,
        })
    
    # Check if token is still valid
    if not reset_token.is_valid:
        return inertia_render(request, 'ResetPassword', {
            'errors': {'token': 'This reset link has expired or already been used'},
            'token_valid': False,
        })
    
    if request.method == 'POST':
        password = request.POST.get('password')
        password_confirm = request.POST.get('password_confirm')
        
        errors = {}
        
        if not password:
            errors['password'] = 'Password is required'
        else:
            from django.contrib.auth.password_validation import validate_password
            from django.core.exceptions import ValidationError
            try:
                validate_password(password, reset_token.user)
            except ValidationError as exc:
                errors['password'] = ' '.join(exc.messages)
            if len(password) < 8 and 'password' not in errors:
                errors['password'] = 'Password must be at least 8 characters'
        
        if password != password_confirm:
            errors['password_confirm'] = 'Passwords do not match'
        
        if errors:
            return inertia_render(request, 'ResetPassword', {
                'errors': errors,
                'token_valid': True,
                'token': token,
            })
        
        # Reset the password
        user = reset_token.user
        user.set_password(password)
        user.save()
        
        # Burn this token and any other outstanding ones
        from modules.users.models import PasswordResetToken as _PRT
        _PRT.objects.filter(user=user, is_used=False).update(is_used=True)
        reset_token.is_used = True
        reset_token.save()
        
        # Sign out every existing session for this account (stolen/old sessions die with the old password)
        try:
            from django.contrib.sessions.models import Session
            from django.utils import timezone as _tz
            for sess in Session.objects.filter(expire_date__gt=_tz.now()):
                if sess.get_decoded().get('_auth_user_id') == str(user.pk):
                    sess.delete()
        except Exception:
            logger.exception('Could not clear sessions after password reset')
        clear_login_failures(user.email)
        
        try:
            from modules.users.models import AuditLog
            AuditLog.objects.create(user=user, action=AuditLog.ActionType.PASSWORD_RESET, description='Password reset via email link')
        except Exception:
            logger.exception('Could not write password-reset audit log')
        
        return inertia_render(request, 'ResetPassword', {
            'success': True,
            'token_valid': True,
        })
    
    return {
        'token_valid': True,
        'token': token,
        'errors': {},
    }


ROLE_MISSING_MSG = "The role this invitation was for no longer exists. Ask the person who invited you to send a new invitation."


def _invite_from_next(next_url):
    """Return the pending invitation a /invite/<token>/ redirect target points at, if any."""
    import re
    from modules.users.models import UserInvitation
    match = re.fullmatch(r'/invite/([\w-]+)/?', next_url or '')
    if not match:
        return None
    invitation = UserInvitation.objects.select_related('role').filter(token=match.group(1)).first()
    return invitation if invitation and invitation.is_valid else None


def _login_invite_context(next_url):
    """Extra Login props when the user is signing in to accept an invitation."""
    from shared.utilities.organization import organization_name
    invitation = _invite_from_next(next_url)
    if not invitation:
        return None
    return {
        'email': invitation.email,
        'workspace': organization_name('your help desk'),
        'role': invitation.role.name if invitation.role else None,
    }


@ensure_csrf_cookie
def accept_invite(request, token):
    """
    Public page behind the emailed invite link. Shows one of:
      - accept:   signed in as the invited email -> confirm and join
      - mismatch: signed in as someone else -> offer to switch accounts
      - login:    an account exists for the email -> sign in, then come back here
      - signup:   no account yet -> create one right here
    plus terminal states (invalid / expired / revoked / accepted).
    The token stays in the URL throughout so the invite is never lost.
    """
    from django.db import transaction
    from modules.users.models import UserInvitation
    from modules.users.invitations import (
        apply_invitation, display_name, find_user, is_team_member, InvitationRoleMissing,
    )

    from shared.utilities.organization import organization_name

    invite_path = f'/invite/{token}/'
    invitation = UserInvitation.objects.select_related('role', 'invited_by__profile').filter(token=token).first()

    def page(state, errors=None, **extra):
        props = {
            'state': state,
            'token': token,
            'errors': errors or {},
            'workspace': organization_name('your help desk'),
            'loginUrl': f'/login/?next={invite_path}',
        }
        if invitation:
            props['invite'] = {
                'email': invitation.email,
                'role': invitation.role.name if invitation.role else None,
                'role_description': invitation.role.description if invitation.role else '',
                'invited_by': display_name(invitation.invited_by) if invitation.invited_by else None,
                'expires_at': invitation.expires_at.isoformat(),
            }
        if request.user.is_authenticated:
            props['currentUser'] = {'email': request.user.email, 'name': display_name(request.user)}
        props.update(extra)
        return inertia_render(request, 'AcceptInvite', props)

    if not invitation:
        return page('invalid')
    if invitation.status == UserInvitation.Status.ACCEPTED:
        mine = request.user.is_authenticated and invitation.accepted_by_id == request.user.id
        return page('accepted', mine=mine)
    if invitation.status == UserInvitation.Status.REVOKED:
        return page('revoked')
    if invitation.is_expired:
        return page('expired')

    user = request.user if request.user.is_authenticated else None
    same_user = bool(user and (user.email or '').lower() == invitation.email.lower())
    existing = find_user(invitation.email)

    def resolve_state():
        if user:
            return 'accept' if same_user else 'mismatch'
        return 'login' if existing else 'signup'

    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'switch':
            # Signed in as someone else: sign out and land back on this invite
            logout(request)
            return redirect(invite_path)

        if action == 'accept':
            if not same_user:
                return redirect(invite_path)
            try:
                with transaction.atomic():
                    locked = UserInvitation.objects.select_for_update().get(pk=invitation.pk)
                    if not locked.is_valid:
                        return redirect(invite_path)
                    already_member = is_team_member(user)
                    apply_invitation(user, locked)
            except InvitationRoleMissing:
                return page('accept', {'general': ROLE_MISSING_MSG})
            return page('joined', already_member=already_member)

        if action == 'signup':
            if user:
                return redirect(invite_path)
            if existing:
                # An account was created in the meantime: they need to sign in instead
                return page('login', {'general': 'An account with this email already exists. Sign in to accept.'})

            full_name = (request.POST.get('full_name') or '').strip()
            password = request.POST.get('password') or ''
            password_confirm = request.POST.get('password_confirm') or ''
            errors = {}
            if not full_name:
                errors['full_name'] = 'Tell us your name'
            elif len(full_name) > 128:
                errors['full_name'] = 'Name is too long'
            if len(password) < 8:
                errors['password'] = 'Password must be at least 8 characters'
            elif password != password_confirm:
                errors['password_confirm'] = 'Passwords do not match'
            if errors:
                return page('signup', errors, full_name=full_name)

            try:
                with transaction.atomic():
                    locked = UserInvitation.objects.select_for_update().get(pk=invitation.pk)
                    if not locked.is_valid:
                        return redirect(invite_path)
                    if User.objects.filter(email__iexact=locked.email).exists() or User.objects.filter(username__iexact=locked.email).exists():
                        return page('login', {'general': 'An account with this email already exists. Sign in to accept.'})
                    parts = full_name.split(' ', 1)
                    new_user = User.objects.create_user(
                        username=locked.email,
                        email=locked.email,
                        password=password,
                        first_name=parts[0][:150],
                        last_name=(parts[1] if len(parts) > 1 else '')[:150],
                    )
                    profile = apply_invitation(new_user, locked)
                    profile.full_name = full_name
                    profile.save(update_fields=['full_name'])
            except InvitationRoleMissing:
                return page('signup', {'general': ROLE_MISSING_MSG}, full_name=full_name)

            login(request, new_user, backend=AUTH_BACKEND)
            return page('joined', already_member=False, currentUser={'email': new_user.email, 'name': full_name})

        return redirect(invite_path)

    return page(resolve_state())


@ensure_csrf_cookie
@inertia('TwoFactorVerify')
def two_factor_verify(request):
    """2FA verification page after successful password authentication."""
    user = _pending_2fa_user(request)
    if user is None:
        return redirect('login')

    return {
        'email_2fa_enabled': request.session.get('pending_2fa_email', False),
        'authenticator_2fa_enabled': request.session.get('pending_2fa_authenticator', False),
        'user_email': user.email,
        'user_name': user.profile.full_name or user.username,
    }


@require_http_methods(["POST"])
def send_login_2fa_code(request):
    """Send 2FA code for login verification."""
    from django.utils import timezone
    from datetime import timedelta
    from shared.utilities.Mailer import Mailer
    from shared.utilities.templates import GlobalEmailTemplates

    user = _pending_2fa_user(request)
    if user is None:
        return JsonResponse({'success': False, 'message': 'No pending login'}, status=400)
    if not request.session.get('pending_2fa_email'):
        return JsonResponse({'success': False, 'message': 'Email verification is not enabled for this account'}, status=400)

    sends = request.session.get('pending_2fa_sends', 0)
    wait = TWO_FA_SEND_COOLDOWN - (time.time() - request.session.get('pending_2fa_last_send', 0))
    if sends >= TWO_FA_MAX_SENDS:
        return JsonResponse({'success': False, 'message': 'Too many codes requested. Sign in again to start over.'}, status=429)
    if wait > 0:
        return JsonResponse({'success': False, 'message': f'Please wait {int(wait) + 1}s before requesting another code'}, status=429)
    request.session['pending_2fa_sends'] = sends + 1
    request.session['pending_2fa_last_send'] = time.time()

    try:
        profile = user.profile
        code = f'{secrets.randbelow(10**6):06d}'
        profile.email_2fa_code = code
        profile.email_2fa_code_expires = timezone.now() + timedelta(minutes=10)
        profile.save(update_fields=['email_2fa_code', 'email_2fa_code_expires'])

        template = GlobalEmailTemplates.TWO_FA_LOGIN_CODE
        Mailer().send_raw_email(
            to_email=user.email,
            subject=template['subject'],
            body_html=template['body_html'],
            body_text=template['body_text'],
            context={'user_name': profile.full_name or user.username, 'code': code},
            fail_silently=False,
        )
        return JsonResponse({'success': True, 'message': 'Verification code sent to your email'})
    except Exception:
        logger.exception('Failed to send login 2FA code')
        return JsonResponse({'success': False, 'message': 'Failed to send verification code'}, status=500)


@require_http_methods(["POST"])
def verify_login_2fa(request):
    """Verify 2FA code and complete login."""
    import json
    from django.utils import timezone
    import pyotp

    user = _pending_2fa_user(request)
    if user is None:
        return JsonResponse({'success': False, 'message': 'No pending login'}, status=400)

    # Every guess counts, right or wrong; too many and the sign-in must start over
    attempts = request.session.get('pending_2fa_attempts', 0) + 1
    request.session['pending_2fa_attempts'] = attempts
    if attempts > TWO_FA_MAX_ATTEMPTS:
        _clear_pending_2fa(request)
        return JsonResponse({'success': False, 'message': 'Too many incorrect codes. Please sign in again.', 'restart': True}, status=429)

    try:
        data = json.loads(request.body or b'{}')
    except (ValueError, TypeError):
        return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)

    code = str(data.get('code', '')).strip()
    method = data.get('method', 'email')
    if method not in ('email', 'authenticator'):
        return JsonResponse({'success': False, 'message': 'Unknown verification method'}, status=400)
    if not request.session.get('pending_2fa_email' if method == 'email' else 'pending_2fa_authenticator'):
        return JsonResponse({'success': False, 'message': 'This verification method is not enabled'}, status=400)
    if not (code.isdigit() and len(code) == 6):
        return JsonResponse({'success': False, 'message': 'Enter the 6-digit code'}, status=400)

    try:
        profile = user.profile
        if method == 'email':
            if not profile.email_2fa_code:
                return JsonResponse({'success': False, 'message': 'No verification code found. Please request a new one.'}, status=400)
            if profile.email_2fa_code_expires and profile.email_2fa_code_expires < timezone.now():
                return JsonResponse({'success': False, 'message': 'Verification code has expired. Please request a new one.'}, status=400)
            if not hmac.compare_digest(profile.email_2fa_code.encode(), code.encode()):
                return JsonResponse({'success': False, 'message': 'Invalid verification code'}, status=400)
            profile.email_2fa_code = ''
            profile.email_2fa_code_expires = None
            profile.save(update_fields=['email_2fa_code', 'email_2fa_code_expires'])
        else:
            if not profile.totp_secret:
                return JsonResponse({'success': False, 'message': 'Authenticator not configured'}, status=400)
            if not pyotp.TOTP(profile.totp_secret).verify(code, valid_window=1):
                return JsonResponse({'success': False, 'message': 'Invalid verification code'}, status=400)

        next_url = request.session.get('pending_2fa_next', '')
        _clear_pending_2fa(request)
        login(request, user, backend=AUTH_BACKEND)
        return JsonResponse({'success': True, 'redirect': _after_login_target(request, user, next_url)})
    except Exception:
        logger.exception('2FA verification failed')
        return JsonResponse({'success': False, 'message': 'Verification failed'}, status=500)


@login_required
@inertia('Reports')
def reports(request):
    """Reports and analytics page with comprehensive data."""
    from django.utils import timezone
    from django.db.models import Count, Avg, Q, F
    from django.db.models.functions import TruncDate, TruncMonth, TruncWeek
    from datetime import timedelta, datetime
    from modules.ticket.models import Ticket
    from modules.tasks.models import Task
    from modules.users.models import Group
    
    # Get report type and date filters from query params
    report_type = request.GET.get('type', 'tickets')
    date_range = request.GET.get('range', '30')  # days (preset)
    
    # Custom date range support
    custom_start = request.GET.get('start_date')
    custom_end = request.GET.get('end_date')
    
    # Filter params
    group_filter = request.GET.get('group')
    agent_filter = request.GET.get('agent')
    status_filter = request.GET.get('status')
    priority_filter = request.GET.get('priority')
    
    now = timezone.now()
    
    # Determine date range
    if custom_start and custom_end:
        try:
            start_date = timezone.make_aware(datetime.fromisoformat(custom_start.replace('Z', '')))
            end_date = timezone.make_aware(datetime.fromisoformat(custom_end.replace('Z', '')))
            date_range = 'custom'
        except:
            days = 30
            start_date = now - timedelta(days=days)
            end_date = now
    else:
        try:
            days = int(date_range)
        except:
            days = 30
        start_date = now - timedelta(days=days)
        end_date = now
    
    # Get filter options (groups and agents)
    groups_list = list(Group.objects.values('id', 'name').order_by('name'))
    agents_list = list(User.objects.filter(
        is_active=True, 
        profile__is_agent=True
    ).values('id', 'first_name', 'last_name', 'username').order_by('first_name', 'last_name'))
    
    # Format agent names
    for agent in agents_list:
        name = f"{agent['first_name']} {agent['last_name']}".strip()
        agent['name'] = name if name else agent['username']
    
    # Initialize response data
    data = {
        'report_type': report_type,
        'date_range': date_range,
        'filters': {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'group': group_filter,
            'agent': agent_filter,
            'status': status_filter,
            'priority': priority_filter,
        },
        'filter_options': {
            'groups': groups_list,
            'agents': agents_list,
            'statuses': [
                {'id': 'new', 'name': 'New'},
                {'id': 'open', 'name': 'Open'},
                {'id': 'in_progress', 'name': 'In Progress'},
                {'id': 'pending', 'name': 'Pending'},
                {'id': 'resolved', 'name': 'Resolved'},
                {'id': 'closed', 'name': 'Closed'},
            ],
            'priorities': [
                {'id': 'low', 'name': 'Low'},
                {'id': 'normal', 'name': 'Normal'},
                {'id': 'high', 'name': 'High'},
                {'id': 'urgent', 'name': 'Urgent'},
            ],
        },
    }
    
    # ========== TICKET REPORTS ==========
    if report_type == 'tickets':
        all_tickets = Ticket.objects.all()
        
        # Apply filters
        if group_filter:
            all_tickets = all_tickets.filter(group_id=group_filter)
        if agent_filter:
            all_tickets = all_tickets.filter(assignee_id=agent_filter)
        if status_filter:
            all_tickets = all_tickets.filter(status=status_filter)
        if priority_filter:
            all_tickets = all_tickets.filter(priority=priority_filter)
        
        period_tickets = all_tickets.filter(created_at__gte=start_date, created_at__lte=end_date)
        
        # Basic metrics
        total = all_tickets.count()
        period_total = period_tickets.count()
        
        # Status breakdown
        status_counts = all_tickets.values('status').annotate(count=Count('id')).order_by('-count')
        
        # Priority breakdown
        priority_counts = all_tickets.values('priority').annotate(count=Count('id')).order_by('-count')
        
        # Source breakdown
        source_counts = all_tickets.values('source').annotate(count=Count('id')).order_by('-count')
        
        # Type breakdown
        type_counts = all_tickets.values('type').annotate(count=Count('id')).order_by('-count')
        
        # Aging tickets (open tickets by age)
        aging_buckets = {
            '0-1 day': 0,
            '1-3 days': 0,
            '3-7 days': 0,
            '7-14 days': 0,
            '14-30 days': 0,
            '30+ days': 0,
        }
        
        open_statuses = ['new', 'open', 'in_progress', 'pending']
        open_tickets = all_tickets.filter(status__in=open_statuses)
        
        for ticket in open_tickets:
            age = (now - ticket.created_at).days
            if age < 1:
                aging_buckets['0-1 day'] += 1
            elif age < 3:
                aging_buckets['1-3 days'] += 1
            elif age < 7:
                aging_buckets['3-7 days'] += 1
            elif age < 14:
                aging_buckets['7-14 days'] += 1
            elif age < 30:
                aging_buckets['14-30 days'] += 1
            else:
                aging_buckets['30+ days'] += 1
        
        # SLA metrics
        sla_data = {
            'total_with_sla': 0,
            'response_breached': 0,
            'resolution_breached': 0,
            'on_track': 0,
            'compliance_rate': 0,
        }
        
        tickets_with_sla = all_tickets.filter(sla__isnull=False).select_related('sla')
        sla_data['total_with_sla'] = tickets_with_sla.count()
        
        if sla_data['total_with_sla'] > 0:
            sla_data['response_breached'] = tickets_with_sla.filter(sla__response_breached=True).count()
            sla_data['resolution_breached'] = tickets_with_sla.filter(sla__resolution_breached=True).count()
            sla_data['on_track'] = tickets_with_sla.filter(
                sla__response_breached=False, 
                sla__resolution_breached=False
            ).count()
            sla_data['compliance_rate'] = round(
                (sla_data['on_track'] / sla_data['total_with_sla']) * 100, 1
            )
        
        # Daily ticket volume for trend chart
        daily_volume = period_tickets.annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(count=Count('id')).order_by('date')
        
        # Resolution metrics
        resolved_tickets = all_tickets.filter(status__in=['resolved', 'closed'], resolved_at__isnull=False)
        
        # Group performance
        group_stats = all_tickets.filter(group__isnull=False).values(
            'group__name'
        ).annotate(
            total=Count('id'),
            open=Count('id', filter=Q(status__in=open_statuses)),
        ).order_by('-total')[:10]
        
        # Assignee performance
        assignee_stats = all_tickets.filter(assignee__isnull=False).values(
            'assignee__first_name', 'assignee__last_name', 'assignee__username'
        ).annotate(
            total=Count('id'),
            resolved=Count('id', filter=Q(status__in=['resolved', 'closed'])),
            open=Count('id', filter=Q(status__in=open_statuses)),
        ).order_by('-total')[:10]
        
        # Unassigned tickets count
        unassigned_count = all_tickets.filter(assignee__isnull=True).count()
        
        # On hold/pending tickets count
        on_hold_count = all_tickets.filter(status='pending').count()
        
        # Unassigned tickets list for report
        unassigned_tickets = list(all_tickets.filter(assignee__isnull=True).values(
            'id', 'ticket_number', 'title', 'priority', 'status', 'created_at', 
            'requester__first_name', 'requester__last_name', 'requester__email'
        ).order_by('-created_at')[:50])
        
        # On hold tickets list for report
        on_hold_tickets = list(all_tickets.filter(status='pending').values(
            'id', 'ticket_number', 'title', 'priority', 'created_at',
            'requester__first_name', 'requester__last_name', 'requester__email',
            'assignee__first_name', 'assignee__last_name'
        ).order_by('-created_at')[:50])
        
        # Tickets grouped by priority
        priority_tickets = {}
        for p in ['low', 'normal', 'high', 'urgent']:
            priority_tickets[p] = list(all_tickets.filter(priority=p).values(
                'id', 'ticket_number', 'title', 'status', 'created_at',
                'assignee__first_name', 'assignee__last_name',
                'group__name'
            ).order_by('-created_at')[:50])
        
        data['tickets'] = {
            'total': total,
            'period_total': period_total,
            'open_count': open_tickets.count(),
            'unassigned_count': unassigned_count,
            'on_hold_count': on_hold_count,
            'unassigned_tickets': unassigned_tickets,
            'on_hold_tickets': on_hold_tickets,
            'priority_tickets': priority_tickets,
            'status_breakdown': list(status_counts),
            'priority_breakdown': list(priority_counts),
            'source_breakdown': list(source_counts),
            'type_breakdown': list(type_counts),
            'aging': aging_buckets,
            'sla': sla_data,
            'daily_volume': list(daily_volume),
            'group_stats': list(group_stats),
            'assignee_stats': [{
                'name': f"{a['assignee__first_name']} {a['assignee__last_name']}".strip() or a['assignee__username'],
                'total': a['total'],
                'resolved': a['resolved'],
                'open': a['open'],
            } for a in assignee_stats],
        }
    
    # ========== TASK REPORTS ==========
    elif report_type == 'tasks':
        all_tasks = Task.objects.all()
        period_tasks = all_tasks.filter(created_at__gte=start_date)
        
        # Status breakdown
        status_counts = all_tasks.values('status').annotate(count=Count('id')).order_by('-count')
        
        # Priority breakdown
        priority_counts = all_tasks.values('priority').annotate(count=Count('id')).order_by('-count')
        
        # Overdue tasks
        overdue_count = all_tasks.filter(
            due_date__lt=now.date(),
            status__in=['todo', 'in_progress', 'review']
        ).count()
        
        # Assignee stats
        assignee_stats = all_tasks.filter(assignee__isnull=False).values(
            'assignee__first_name', 'assignee__last_name', 'assignee__username'
        ).annotate(
            total=Count('id'),
            completed=Count('id', filter=Q(status='done')),
            in_progress=Count('id', filter=Q(status='in_progress')),
        ).order_by('-total')[:10]
        
        # Daily volume
        daily_volume = period_tasks.annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(count=Count('id')).order_by('date')
        
        data['tasks'] = {
            'total': all_tasks.count(),
            'period_total': period_tasks.count(),
            'overdue': overdue_count,
            'status_breakdown': list(status_counts),
            'priority_breakdown': list(priority_counts),
            'daily_volume': list(daily_volume),
            'assignee_stats': [{
                'name': f"{a['assignee__first_name']} {a['assignee__last_name']}".strip() or a['assignee__username'],
                'total': a['total'],
                'completed': a['completed'],
                'in_progress': a['in_progress'],
            } for a in assignee_stats],
        }
    
    
    return data


@login_required
def export_reports(request):
    """Export report data to Excel."""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    from django.db.models import Count, Q, Avg
    from datetime import timedelta
    from django.utils import timezone
    
    report_type = request.GET.get('type', 'tickets')
    date_range = request.GET.get('range', '30')
    
    # Parse date range
    now = timezone.now()
    if date_range == 'custom':
        start_date_str = request.GET.get('start_date', '')
        end_date_str = request.GET.get('end_date', '')
        try:
            from datetime import datetime
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').replace(tzinfo=timezone.utc) if start_date_str else now - timedelta(days=30)
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').replace(hour=23, minute=59, second=59, tzinfo=timezone.utc) if end_date_str else now
        except:
            start_date = now - timedelta(days=30)
            end_date = now
    elif date_range == '7':
        start_date = now - timedelta(days=7)
        end_date = now
    elif date_range == '90':
        start_date = now - timedelta(days=90)
        end_date = now
    elif date_range == '365':
        start_date = now - timedelta(days=365)
        end_date = now
    else:
        start_date = now - timedelta(days=30)
        end_date = now
    
    # Get filters
    group_filter = request.GET.get('group', '')
    agent_filter = request.GET.get('agent', '')
    status_filter = request.GET.get('status', '')
    priority_filter = request.GET.get('priority', '')
    
    # Create workbook
    wb = Workbook()
    ws = wb.active
    
    # Styles
    header_font = Font(bold=True, color='FFFFFF')
    header_fill = PatternFill(start_color='4a154b', end_color='4a154b', fill_type='solid')
    header_alignment = Alignment(horizontal='center', vertical='center')
    thin_border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )
    
    def style_header_row(worksheet, num_cols):
        for col in range(1, num_cols + 1):
            cell = worksheet.cell(row=1, column=col)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = header_alignment
            cell.border = thin_border
    
    def auto_adjust_columns(worksheet):
        for column in worksheet.columns:
            max_length = 0
            column_letter = get_column_letter(column[0].column)
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            worksheet.column_dimensions[column_letter].width = adjusted_width
    
    if report_type == 'tickets':
        from modules.ticket.models import Ticket
        
        ws.title = 'Tickets Report'
        
        # Build queryset with filters
        tickets = Ticket.objects.filter(created_at__gte=start_date, created_at__lte=end_date)
        
        if group_filter:
            tickets = tickets.filter(group_id=group_filter)
        if agent_filter:
            tickets = tickets.filter(assignee_id=agent_filter)
        if status_filter:
            tickets = tickets.filter(status=status_filter)
        if priority_filter:
            tickets = tickets.filter(priority=priority_filter)
        
        tickets = tickets.select_related('requester', 'assignee', 'group').order_by('-created_at')
        
        # Headers
        headers = ['Ticket #', 'Title', 'Status', 'Priority', 'Type', 'Requester', 'Requester Email', 'Assignee', 'Group', 'Created', 'Updated']
        ws.append(headers)
        style_header_row(ws, len(headers))
        
        # Data
        for ticket in tickets:
            ws.append([
                ticket.ticket_number,
                ticket.title,
                ticket.get_status_display() if hasattr(ticket, 'get_status_display') else ticket.status,
                ticket.get_priority_display() if hasattr(ticket, 'get_priority_display') else ticket.priority,
                ticket.get_type_display() if hasattr(ticket, 'get_type_display') else (ticket.type or ''),
                f"{ticket.requester.first_name} {ticket.requester.last_name}".strip() if ticket.requester else '',
                ticket.requester.email if ticket.requester else '',
                f"{ticket.assignee.first_name} {ticket.assignee.last_name}".strip() if ticket.assignee else 'Unassigned',
                ticket.group.name if ticket.group else '',
                ticket.created_at.strftime('%Y-%m-%d %H:%M') if ticket.created_at else '',
                ticket.updated_at.strftime('%Y-%m-%d %H:%M') if ticket.updated_at else '',
            ])
        
        # Add summary sheet
        ws_summary = wb.create_sheet('Summary')
        ws_summary.append(['Metric', 'Value'])
        style_header_row(ws_summary, 2)
        
        total = tickets.count()
        status_counts = Ticket.objects.filter(created_at__gte=start_date, created_at__lte=end_date)
        if group_filter:
            status_counts = status_counts.filter(group_id=group_filter)
        if agent_filter:
            status_counts = status_counts.filter(assignee_id=agent_filter)
        if status_filter:
            status_counts = status_counts.filter(status=status_filter)
        if priority_filter:
            status_counts = status_counts.filter(priority=priority_filter)
        
        ws_summary.append(['Total Tickets', total])
        ws_summary.append(['Date Range', f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}"])
        ws_summary.append([''])
        ws_summary.append(['Applied Filters', ''])
        if group_filter:
            ws_summary.append(['Group', group_filter])
        if agent_filter:
            ws_summary.append(['Agent', agent_filter])
        if status_filter:
            ws_summary.append(['Status', status_filter])
        if priority_filter:
            ws_summary.append(['Priority', priority_filter])
        
        auto_adjust_columns(ws_summary)
        
    elif report_type == 'tasks':
        from modules.tasks.models import Task
        
        ws.title = 'Tasks Report'
        
        tasks = Task.objects.filter(created_at__gte=start_date, created_at__lte=end_date)
        
        if agent_filter:
            tasks = tasks.filter(assignee_id=agent_filter)
        if status_filter:
            tasks = tasks.filter(status=status_filter)
        if priority_filter:
            tasks = tasks.filter(priority=priority_filter)
        
        tasks = tasks.select_related('assignee', 'created_by').order_by('-created_at')
        
        headers = ['Title', 'Description', 'Status', 'Priority', 'Assignee', 'Due Date', 'Created By', 'Created', 'Updated']
        ws.append(headers)
        style_header_row(ws, len(headers))
        
        for task in tasks:
            ws.append([
                task.title,
                task.description[:100] if task.description else '',
                task.get_status_display() if hasattr(task, 'get_status_display') else task.status,
                task.get_priority_display() if hasattr(task, 'get_priority_display') else task.priority,
                f"{task.assignee.first_name} {task.assignee.last_name}".strip() if task.assignee else 'Unassigned',
                task.due_date.strftime('%Y-%m-%d') if task.due_date else '',
                f"{task.created_by.first_name} {task.created_by.last_name}".strip() if task.created_by else '',
                task.created_at.strftime('%Y-%m-%d %H:%M') if task.created_at else '',
                task.updated_at.strftime('%Y-%m-%d %H:%M') if task.updated_at else '',
            ])
        
    
    auto_adjust_columns(ws)
    
    # Prepare response
    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    filename = f"{report_type}_report_{now.strftime('%Y%m%d_%H%M%S')}.xlsx"
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    
    wb.save(response)
    return response


# ==================== GLOBAL SEARCH API ====================

@login_required
@require_http_methods(["GET"])
def global_search(request):
    """
    Global search endpoint for tickets, tasks, KB articles and users.
    
    Query params:
    - q: Search query string
    - type: Type of search (tickets, tasks, knowledge_base, users)
    - field: For tickets, which field to search (subject, public_message, private_message)
    - brand: Filter by brand ID
    - category: Filter by category ID
    - status: Filter by status
    """
    from django.db.models import Q
    from modules.ticket.models import Ticket
    from modules.tasks.models import Task
    from modules.kb.models import KBArticle
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    
    query = request.GET.get('q', '').strip()
    search_type = request.GET.get('type', 'tickets')
    # Commented out - will be used later
    # field = request.GET.get('field', 'subject')
    # brand = request.GET.get('brand', '')
    # category = request.GET.get('category', '')
    status = request.GET.get('status', '')
    
    results = []
    
    if not query:
        return JsonResponse({'results': []})
    
    # Limit results
    limit = 20
    
    if search_type == 'tickets':
        tickets_qs = Ticket.objects.exclude(status='draft')
        
        # Search in title, description, and ticket_number
        tickets_qs = tickets_qs.filter(
            Q(title__icontains=query) | 
            Q(description__icontains=query) |
            Q(ticket_number__icontains=query)
        )
        
        # Apply filters
        if status:
            tickets_qs = tickets_qs.filter(status=status)
        
        tickets = tickets_qs.select_related('requester').order_by('-created_at')[:limit]
        
        for ticket in tickets:
            requester_type = 'Individual'
            if hasattr(ticket, 'requester') and ticket.requester:
                try:
                    if hasattr(ticket.requester, 'profile') and ticket.requester.profile.organization:
                        requester_type = 'Organization'
                except:
                    pass
            
            results.append({
                'id': str(ticket.uuid),
                'type': 'ticket',
                'title': ticket.title,
                'subject': ticket.title,
                'ticket_number': ticket.ticket_number or ticket.id,
                'status': ticket.status,
                'requester_type': requester_type,
            })
    
    elif search_type == 'tasks':
        tasks_qs = Task.objects.filter(
            Q(title__icontains=query) | Q(description__icontains=query)
        ).exclude(status='draft')
        
        if status:
            tasks_qs = tasks_qs.filter(status=status)
        
        tasks = tasks_qs.select_related('assignee').order_by('-created_at')[:limit]
        
        for task in tasks:
            assignee_name = None
            if task.assignee:
                assignee_name = f"{task.assignee.first_name} {task.assignee.last_name}".strip() or task.assignee.username
            
            results.append({
                'id': str(task.uuid),
                'type': 'task',
                'title': task.title,
                'status': task.status,
                'assignee': assignee_name,
            })
    
    elif search_type == 'users':
        users = User.objects.filter(
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(email__icontains=query) |
            Q(username__icontains=query)
        ).filter(is_active=True)[:limit]
        
        for user in users:
            results.append({
                'id': user.id,
                'type': 'user',
                'name': f"{user.first_name} {user.last_name}".strip() or user.username,
                'email': user.email,
            })
    
    elif search_type == 'knowledge_base':
        articles = KBArticle.objects.filter(
            Q(title__icontains=query) |
            Q(content__icontains=query) |
            Q(summary__icontains=query)
        ).filter(status='published')[:limit]
        
        for article in articles:
            results.append({
                'id': str(article.uuid),
                'type': 'article',
                'title': article.title,
                'views': article.views,
            })
    
    
    return JsonResponse({'results': results})


@login_required
@require_http_methods(["GET"])
def recently_viewed(request):
    """
    Get recently viewed items for the current user.
    Returns tickets, articles, etc. that the user has recently viewed.
    """
    from modules.ticket.models import Ticket
    
    # For now, return recent tickets the user has interacted with
    # This could be enhanced with a proper RecentlyViewed model
    recent_tickets = Ticket.objects.exclude(status='draft').order_by('-updated_at')[:5]
    
    items = []
    for ticket in recent_tickets:
        requester_type = 'Individual'
        if hasattr(ticket, 'requester') and ticket.requester:
            try:
                if hasattr(ticket.requester, 'profile') and ticket.requester.profile.organization:
                    requester_type = 'Organization'
            except:
                pass
        
        items.append({
            'id': str(ticket.uuid),
            'type': 'ticket',
            'title': ticket.title,
            'subject': ticket.title,
            'ticket_number': ticket.ticket_number or ticket.id,
            'status': ticket.status,
            'requester_type': requester_type,
        })
    
    return JsonResponse({'items': items})


@ensure_csrf_cookie
@inertia('Onboarding')
def onboarding(request):
    """
    Onboarding page for first-time setup.
    Shows if no users exist in the system (fresh install).
    """
    from django.contrib.auth.models import User
    from shared.models import Client
    from django.core.management import call_command
    from modules.users.models import Group, Role, UserProfile


    # If any users already exist, redirect to login
    if User.objects.exists():
        return redirect('login')
    
    if request.method == 'POST':
        # Extract form data
        first_name = request.POST.get('first_name', '').strip()
        last_name = request.POST.get('last_name', '').strip()
        email = request.POST.get('email', '').strip()
        password = request.POST.get('password', '')
        workspace_name = request.POST.get('workspace_name', '').strip()
        business_type = request.POST.get('business_type', '')
        org_size = request.POST.get('org_size', '')
        
        # Validation
        errors = {}
        
        if not first_name:
            errors['first_name'] = 'First name is required'
        if not last_name:
            errors['last_name'] = 'Last name is required'
        if not email:
            errors['email'] = 'Email is required'
        if not password:
            errors['password'] = 'Password is required'
        elif len(password) < 8:
            errors['password'] = 'Password must be at least 8 characters'
        if not workspace_name:
            errors['workspace_name'] = 'Workspace name is required'
        
        # Check if email already exists
        if email and User.objects.filter(email=email).exists():
            errors['email'] = 'A user with this email already exists'
        
        if errors:
            return inertia_render(request, 'Onboarding', {'errors': errors})
        
        try:
            # Create the organization/client
            client = Client.objects.create(
                name=workspace_name,
                description=f"Workspace for {workspace_name}",
                is_active=True,
                is_verified=True,
                business_type=business_type,
                org_size=org_size,
                created_by_email=email,
                created_by_name=f"{first_name} {last_name}",
            )
            print(f"✓ Created organization: {workspace_name}")
            
            # Create default roles first
            DEFAULT_ROLES = [
                {
                    'name': 'Administrator',
                    'description': 'Full system access with all permissions',
                    'permissions': ['*'],  # All permissions
                    'is_system': True,
                },
                {
                    'name': 'Agent',
                    'description': 'Support agent with ticket management access',
                    'permissions': [
                        'tickets.view', 'tickets.create', 'tickets.edit', 'tickets.assign',
                        'kb.view', 'kb.create', 'kb.edit',
                        'customers.view',
                    ],
                    'is_system': True,
                },
            ]
            
            admin_role = None
            for role_data in DEFAULT_ROLES:
                role, created = Role.objects.get_or_create(
                    name=role_data['name'],
                    defaults={
                        'description': role_data['description'],
                        'permissions': role_data['permissions'],
                        'is_system': role_data['is_system'],
                    }
                )
                if role_data['name'] == 'Administrator':
                    admin_role = role
                if created:
                    print(f"✓ Created role: {role_data['name']}")
            
            # Create default groups
            DEFAULT_GROUPS = [
                {'name': 'Administrator', 'description': 'System administrators'},
                {'name': 'Support', 'description': 'General support team'},
                {'name': 'Technical', 'description': 'Technical support team'},
            ]
            
            admin_group = None
            for group_data in DEFAULT_GROUPS:
                group, created = Group.objects.get_or_create(
                    name=group_data['name'],
                    defaults={'description': group_data['description']}
                )
                if group_data['name'] == 'Administrator':
                    admin_group = group
                if created:
                    print(f"✓ Created group: {group_data['name']}")
            
            # Create admin user
            username = email.split('@')[0]
            # Ensure unique username
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1
            
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                is_staff=True,
                is_superuser=True,
            )
            print(f"✓ Created admin user: {email}")
            
            # Create user profile with Administrator role
            try:
                profile = UserProfile.objects.create(
                    user=user,
                    full_name=f"{first_name} {last_name}",
                    phone='',
                    timezone='UTC',
                    is_agent=True,  # Make user appear in Team > Users
                    is_customer=False,
                    role=admin_role,  # Assign Administrator role
                )
                # Add to Administrator group
                if admin_group:
                    profile.groups.add(admin_group)
                print(f"✓ Created user profile for: {email} (Administrator)")
            except Exception as e:
                print(f"Warning: Could not create user profile: {e}")
            
            # Run coredesk --init to seed initial data
            print("\n--- Running initial setup (coredesk --init) ---")
            try:
                call_command('coredesk', '--init')
                print("✓ Initial data seeded successfully")
            except Exception as e:
                print(f"Warning: Some seed data may have failed: {e}")
            
            print("\n" + "="*60)
            print("ONBOARDING COMPLETE")
            print("="*60)
            print(f"Organization: {workspace_name}")
            print(f"Admin Email:  {email}")
            print("="*60 + "\n")
            
            # Log the user in automatically
            login(request, user, backend=AUTH_BACKEND)
            
            # Create onboarding progress for the new user
            from modules.onboarding.models import OnboardingProgress
            OnboardingProgress.objects.get_or_create(user=user)
            
            # Redirect to quick start wizard
            return redirect('quick_start')
            
        except Exception:
            logger.exception('Onboarding failed')
            errors['general'] = 'Setup failed. Check the server logs for details.'
            return inertia_render(request, 'Onboarding', {'errors': errors})
    
    # GET request - show the onboarding form
    return {
        'errors': {},
    }


# Error handlers
def page_not_found(request, exception):
    """Custom 404 handler."""
    return render(request, '404.html', status=404)


def server_error(request):
    """Custom 500 handler."""
    return render(request, '500.html', status=500)

