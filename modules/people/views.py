"""
People views - Users management
"""
import secrets
import string
from urllib.parse import urlparse

from django.core.paginator import Paginator
from django.shortcuts import redirect
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.conf import settings
from inertia import inertia, render as inertia_render

from modules.users.models import Group, Organization, Role, UserProfile
from modules.users.permissions import Permission
from modules.ticket.models import Ticket
from modules.settings.models import EmailTemplate
from shared.utilities.Mailer import Mailer
from shared.utilities.organization import organization_name, site_url


def generate_strong_password(length=16):
    """Generate a strong random password."""
    # Ensure at least one of each: uppercase, lowercase, digit, special
    uppercase = secrets.choice(string.ascii_uppercase)
    lowercase = secrets.choice(string.ascii_lowercase)
    digit = secrets.choice(string.digits)
    special = secrets.choice('!@#$%^&*')
    
    # Fill the rest with a mix
    remaining_length = length - 4
    all_chars = string.ascii_letters + string.digits + '!@#$%^&*'
    remaining = ''.join(secrets.choice(all_chars) for _ in range(remaining_length))
    
    # Combine and shuffle
    password_list = list(uppercase + lowercase + digit + special + remaining)
    secrets.SystemRandom().shuffle(password_list)
    
    return ''.join(password_list)


def _people_props(request):
    """Everything the People page needs for its users tab and drawers."""
    users = User.objects.select_related(
        'profile', 'profile__organization', 'profile__role'
    ).prefetch_related('profile__groups').order_by('first_name', 'last_name', 'id')
    page = Paginator(users, 10).get_page(request.GET.get('page', 1))

    users_data = []
    for user in page.object_list:
        profile = getattr(user, 'profile', None)
        role = profile.role if profile else None
        is_agent = profile.is_agent if profile else False
        users_data.append({
            'id': user.id,
            'name': f"{user.first_name} {user.last_name}".strip() or user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'username': user.username,
            'organization': profile.organization.name if profile and profile.organization else None,
            'role': role.name if role else ('Agent' if is_agent else 'User'),
            'role_id': role.id if role else None,
            'custom_permissions': profile.custom_permissions if profile else [],
            'groups': [{'id': g.id, 'name': g.name} for g in profile.groups.all()] if profile else [],
            'tickets': Ticket.objects.filter(assignee=user).count(),
            'is_active': user.is_active,
            'is_agent': is_agent,
            'date_joined': user.date_joined.strftime('%Y-%m-%d'),
        })

    return {
        'activeTab': 'users',
        'users': users_data,
        'pagination': {
            'page': page.number,
            'pages': page.paginator.num_pages,
            'count': page.paginator.count,
            'total': page.paginator.count,
            'has_next': page.has_next(),
            'has_prev': page.has_previous(),
        },
        'orgs': list(Organization.objects.values('id', 'name')),
        'roles': list(Role.objects.values('id', 'name', 'description')),
        'groups': [
            {'id': g.id, 'name': g.name, 'description': g.description, 'member_count': g.members.count()}
            for g in Group.objects.all()
        ],
        'permissions': Permission.get_grouped(),
    }


@login_required
@inertia('People')
def people(request):
    """People/users management page."""
    return _people_props(request)


@login_required
def user_create(request):
    """Create a new user."""
    if request.method == 'POST':
        email = request.POST.get('email')
        first_name = request.POST.get('first_name')
        last_name = request.POST.get('last_name')
        is_agent = request.POST.get('is_agent') == 'true'
        
        # Use email as username
        username = email
        
        # Auto-generate a strong password
        password = generate_strong_password()

        errors = {}
        if not email:
            errors['email'] = 'Email is required'
        elif User.objects.filter(email=email).exists():
            errors['email'] = 'Email already exists'
        elif User.objects.filter(username=email).exists():
            errors['email'] = 'A user with this email already exists'
        if not first_name:
            errors['first_name'] = 'First name is required'
        if not last_name:
            errors['last_name'] = 'Last name is required'


        if errors:
            if urlparse(request.headers.get('Referer', '')).path == '/people/add/':
                return inertia_render(request, 'AddUser', {
                    'organization': _current_organization(request),
                    'errors': errors,
                    'old': {
                        'email': email or '',
                        'first_name': first_name or '',
                        'last_name': last_name or '',
                        'is_agent': is_agent,
                    },
                })
            return inertia_render(request, 'People', {**_people_props(request), 'errors': errors})

        # Get organization from current user
        organization = None
        if hasattr(request.user, 'profile') and request.user.profile.organization:
            organization = request.user.profile.organization

        # Create user
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
        )

        # Create user profile
        UserProfile.objects.create(
            user=user,
            full_name=f"{first_name} {last_name}",
            organization=organization,
            is_agent=is_agent,
            is_customer=not is_agent,
        ).groups.set(Group.objects.filter(id__in=request.POST.getlist('groups')))
        
        # Send welcome email with credentials
        _send_welcome_email(user, password)

        return redirect('people')

    # GET request - render the AddUser page
    return inertia_render(request, 'AddUser', {
        'organization': _current_organization(request),
    })


def _current_organization(request):
    profile = getattr(request.user, 'profile', None)
    org = profile.organization if profile else None
    return {'id': org.id, 'name': org.name} if org else None


def _send_welcome_email(user, password):
    """Send welcome email with login credentials to new user."""
    try:
        template = EmailTemplate.objects.get(
            template_type='welcome_user',
            status='active'
        )
    except EmailTemplate.DoesNotExist:
        return
    
    company_name = organization_name('Support')
    login_url = site_url('/login/')
    
    # Use first name for greeting, fallback to full name or email prefix
    greeting_name = user.first_name or f"{user.first_name} {user.last_name}".strip() or user.email.split('@')[0]
    
    context = {
        'user_name': greeting_name,
        'user_email': user.email,
        'password': password,
        'login_url': login_url,
        'company_name': company_name,
    }
    
    rendered_subject, rendered_html, rendered_text = template.render(context)
    
    mailer = Mailer()
    mailer.send_raw_email(
        to_email=user.email,
        subject=rendered_subject or f'Welcome to {company_name}',
        body_html=rendered_html or '',
        body_text=rendered_text or '',
    )

    return redirect('people')


@login_required
def user_edit(request, id: int):
    """Edit an existing user."""
    try:
        user = User.objects.get(id=id)
    except User.DoesNotExist:
        return redirect('people')

    if request.method == 'POST':
        first_name = request.POST.get('first_name')
        last_name = request.POST.get('last_name')
        email = request.POST.get('email')
        # The edit drawer doesn't send is_active; leave it unchanged unless it is posted
        is_active = request.POST.get('is_active', 'true' if user.is_active else 'false') == 'true'
        is_agent = request.POST.get('is_agent') == 'true'

        errors = {}
        if not first_name:
            errors['first_name'] = 'First name is required'
        if not last_name:
            errors['last_name'] = 'Last name is required'
        if not email:
            errors['email'] = 'Email is required'
        elif User.objects.filter(email=email).exclude(id=id).exists():
            errors['email'] = 'Email already exists'

        if errors:
            return inertia_render(request, 'People', {**_people_props(request), 'errors': errors})

        user.first_name = first_name
        user.last_name = last_name
        user.email = email
        user.is_active = is_active
        user.save()

        if hasattr(user, 'profile'):
            user.profile.full_name = f"{first_name} {last_name}"
            user.profile.is_agent = is_agent
            user.profile.is_customer = not is_agent
            user.profile.save()
            user.profile.groups.set(Group.objects.filter(id__in=request.POST.getlist('groups')))

        return redirect('people')

    return redirect('people')


@login_required
def user_delete(request, id: int):
    """Delete a user."""
    if request.method == 'POST':
        try:
            user = User.objects.get(id=id)
            # Don't allow deleting yourself
            if user.id != request.user.id:
                user.delete()
        except User.DoesNotExist:
            pass
    return redirect('people')
