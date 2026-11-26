"""
User signals for tracking logins, logouts, and device management.
"""
import hashlib
import logging
from django.contrib.auth.signals import user_logged_in, user_logged_out, user_login_failed
from django.dispatch import receiver
from user_agents import parse

logger = logging.getLogger(__name__)


def get_client_ip(request):
    """Get client IP address from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def get_device_info(request):
    """Parse user agent string to get device information."""
    user_agent_string = request.META.get('HTTP_USER_AGENT', '')
    
    try:
        user_agent = parse(user_agent_string)
        
        # Determine device type
        if user_agent.is_mobile:
            device_type = 'mobile'
        elif user_agent.is_tablet:
            device_type = 'tablet'
        else:
            device_type = 'desktop'
        
        return {
            'user_agent': user_agent_string,
            'device_type': device_type,
            'browser': user_agent.browser.family,
            'browser_version': user_agent.browser.version_string,
            'os': user_agent.os.family,
            'os_version': user_agent.os.version_string,
            'device_name': f"{user_agent.os.family} - {user_agent.browser.family}",
        }
    except Exception as e:
        logger.warning(f"Error parsing user agent: {e}")
        return {
            'user_agent': user_agent_string,
            'device_type': 'desktop',
            'browser': 'Unknown',
            'browser_version': '',
            'os': 'Unknown',
            'os_version': '',
            'device_name': 'Unknown Device',
        }


def generate_device_id(user, request):
    """Generate a unique device identifier based on user agent and other factors."""
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    ip = get_client_ip(request)
    
    # Create a hash based on user ID, user agent, and some browser characteristics
    raw_string = f"{user.id}:{user_agent}"
    return hashlib.sha256(raw_string.encode()).hexdigest()[:32]


@receiver(user_logged_in)
def track_user_login(sender, request, user, **kwargs):
    """Track user login and update/create device record."""
    from .models import AuditLog, UserDevice
    
    try:
        ip_address = get_client_ip(request)
        device_info = get_device_info(request)
        device_id = generate_device_id(user, request)
        
        # Create audit log entry
        AuditLog.objects.create(
            user=user,
            action=AuditLog.ActionType.LOGIN,
            description=f"User logged in from {device_info['browser']} on {device_info['os']}",
            ip_address=ip_address,
            user_agent=device_info['user_agent'],
            device_type=device_info['device_type'],
            browser=f"{device_info['browser']} {device_info['browser_version']}",
            os=f"{device_info['os']} {device_info['os_version']}",
            status='success',
        )
        
        # Mark all user's devices as not current
        UserDevice.objects.filter(user=user).update(is_current=False)
        
        # Update or create device record
        device, created = UserDevice.objects.update_or_create(
            user=user,
            device_id=device_id,
            defaults={
                'device_name': device_info['device_name'],
                'device_type': device_info['device_type'],
                'browser': device_info['browser'],
                'browser_version': device_info['browser_version'],
                'os': device_info['os'],
                'os_version': device_info['os_version'],
                'ip_address': ip_address,
                'is_current': True,
                'session_key': request.session.session_key or '',
            }
        )
        
        logger.info(f"User {user.email} logged in from {device_info['browser']} ({ip_address})")
        
    except Exception as e:
        logger.error(f"Error tracking user login: {e}")


@receiver(user_logged_out)
def track_user_logout(sender, request, user, **kwargs):
    """Track user logout."""
    from .models import AuditLog, UserDevice
    
    if user is None:
        return
    
    try:
        ip_address = get_client_ip(request)
        device_info = get_device_info(request)
        
        # Create audit log entry
        AuditLog.objects.create(
            user=user,
            action=AuditLog.ActionType.LOGOUT,
            description=f"User logged out from {device_info['browser']} on {device_info['os']}",
            ip_address=ip_address,
            user_agent=device_info['user_agent'],
            device_type=device_info['device_type'],
            browser=f"{device_info['browser']} {device_info['browser_version']}",
            os=f"{device_info['os']} {device_info['os_version']}",
            status='success',
        )
        
        # Mark the current device as not current
        device_id = generate_device_id(user, request)
        UserDevice.objects.filter(
            user=user,
            device_id=device_id
        ).update(is_current=False, session_key='')
        
        logger.info(f"User {user.email} logged out")
        
    except Exception as e:
        logger.error(f"Error tracking user logout: {e}")


@receiver(user_login_failed)
def track_login_failed(sender, credentials, request, **kwargs):
    """Track failed login attempts."""
    from .models import AuditLog
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    
    try:
        ip_address = get_client_ip(request)
        device_info = get_device_info(request)
        
        # Try to find the user by email (if provided)
        email = credentials.get('username') or credentials.get('email', '')
        user = None
        
        if email:
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                try:
                    user = User.objects.get(username=email)
                except User.DoesNotExist:
                    pass
        
        if user:
            # Create audit log entry for the user
            AuditLog.objects.create(
                user=user,
                action=AuditLog.ActionType.LOGIN_FAILED,
                description=f"Failed login attempt from {device_info['browser']} on {device_info['os']}",
                ip_address=ip_address,
                user_agent=device_info['user_agent'],
                device_type=device_info['device_type'],
                browser=f"{device_info['browser']} {device_info['browser_version']}",
                os=f"{device_info['os']} {device_info['os_version']}",
                status='failed',
            )
            logger.warning(f"Failed login attempt for user {email} from {ip_address}")
        else:
            logger.warning(f"Failed login attempt for unknown user {email} from {ip_address}")
        
    except Exception as e:
        logger.error(f"Error tracking failed login: {e}")


def log_password_change(user, request=None):
    """Log password change action. Call this manually when password is changed."""
    from .models import AuditLog
    
    try:
        ip_address = None
        device_info = {
            'user_agent': '',
            'device_type': '',
            'browser': '',
            'os': '',
        }
        
        if request:
            ip_address = get_client_ip(request)
            device_info = get_device_info(request)
        
        AuditLog.objects.create(
            user=user,
            action=AuditLog.ActionType.PASSWORD_CHANGE,
            description="Password changed successfully",
            ip_address=ip_address,
            user_agent=device_info.get('user_agent', ''),
            device_type=device_info.get('device_type', ''),
            browser=f"{device_info.get('browser', '')} {device_info.get('browser_version', '')}".strip(),
            os=f"{device_info.get('os', '')} {device_info.get('os_version', '')}".strip(),
            status='success',
        )
        
        logger.info(f"Password changed for user {user.email}")
        
    except Exception as e:
        logger.error(f"Error logging password change: {e}")


def log_2fa_change(user, enabled, method, request=None):
    """Log 2FA enable/disable action."""
    from .models import AuditLog
    
    try:
        ip_address = None
        device_info = {
            'user_agent': '',
            'device_type': '',
            'browser': '',
            'os': '',
        }
        
        if request:
            ip_address = get_client_ip(request)
            device_info = get_device_info(request)
        
        action = AuditLog.ActionType.TWO_FA_ENABLED if enabled else AuditLog.ActionType.TWO_FA_DISABLED
        description = f"2FA ({method}) {'enabled' if enabled else 'disabled'}"
        
        AuditLog.objects.create(
            user=user,
            action=action,
            description=description,
            ip_address=ip_address,
            user_agent=device_info.get('user_agent', ''),
            device_type=device_info.get('device_type', ''),
            browser=f"{device_info.get('browser', '')} {device_info.get('browser_version', '')}".strip(),
            os=f"{device_info.get('os', '')} {device_info.get('os_version', '')}".strip(),
            status='success',
            metadata={'method': method},
        )
        
        logger.info(f"2FA ({method}) {'enabled' if enabled else 'disabled'} for user {user.email}")
        
    except Exception as e:
        logger.error(f"Error logging 2FA change: {e}")
