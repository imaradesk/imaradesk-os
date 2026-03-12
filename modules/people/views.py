"""
People views - Users and Organizations management
"""
from django.shortcuts import redirect
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from inertia import inertia, render as inertia_render

from modules.users.models import UserProfile, Organization


@login_required
@inertia('People')
def people(request):
    """People/users management page."""
    users = User.objects.select_related('profile', 'profile__organization').all().order_by('first_name', 'last_name')

    users_data = [
        {
            'id': user.id,
            'name': f"{user.first_name} {user.last_name}".strip() or user.username,
            'email': user.email,
            'username': user.username,
            'organization': user.profile.organization.name if hasattr(user, 'profile') and user.profile.organization else 'N/A',
            'role': ', '.join([group.name for group in user.groups.all()]) or 'User',
            'is_active': user.is_active,
            'is_agent': user.profile.is_agent if hasattr(user, 'profile') else False,
            'date_joined': user.date_joined.strftime('%Y-%m-%d'),
        }
        for user in users
    ]

    return {
        'users': users_data,
    }


@login_required
def user_create(request):
    """Create a new user."""
    if request.method == 'POST':
        username = request.POST.get('username')
        email = request.POST.get('email')
        first_name = request.POST.get('first_name')
        last_name = request.POST.get('last_name')
        password = request.POST.get('password', 'TempPass123!')
        is_agent = request.POST.get('is_agent') == 'true'

        errors = {}
        if not username:
            errors['username'] = 'Username is required'
        elif User.objects.filter(username=username).exists():
            errors['username'] = 'Username already exists'
        if not email:
            errors['email'] = 'Email is required'
        elif User.objects.filter(email=email).exists():
            errors['email'] = 'Email already exists'
        if not first_name:
            errors['first_name'] = 'First name is required'
        if not last_name:
            errors['last_name'] = 'Last name is required'

        if errors:
            return inertia_render(request, 'People', {
                'errors': errors,
            })

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
            organization=request.user.profile.organization if hasattr(request.user, 'profile') else None,
            is_agent=is_agent,
            is_customer=not is_agent,
        )

        return redirect('people')

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
        is_active = request.POST.get('is_active') == 'true'
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
            return inertia_render(request, 'People', {
                'errors': errors,
            })

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


@login_required
@inertia('Organizations')
def organizations(request):
    """Organizations management page."""
    orgs = Organization.objects.all().order_by('name')

    organizations_data = [
        {
            'id': org.id,
            'name': org.name,
            'domain': org.domain,
            'plan': org.get_plan_display(),
            'plan_value': org.plan,
            'members': org.members.count(),
            'tickets': 0,  # TODO: Count tickets when implemented
            'created_at': org.created_at.strftime('%Y-%m-%d'),
        }
        for org in orgs
    ]

    return {
        'organizations': organizations_data,
    }


@login_required
def organization_create(request):
    """Create a new organization."""
    if request.method == 'POST':
        name = request.POST.get('name')
        domain = request.POST.get('domain')
        plan = request.POST.get('plan', 'basic')

        errors = {}
        if not name:
            errors['name'] = 'Organization name is required'
        if not domain:
            errors['domain'] = 'Domain is required'
        elif Organization.objects.filter(domain=domain).exists():
            errors['domain'] = 'Domain already exists'

        if errors:
            return inertia_render(request, 'Organizations', {
                'errors': errors,
            })

        Organization.objects.create(
            name=name,
            domain=domain,
            plan=plan,
        )
        return redirect('organizations')

    return redirect('organizations')


@login_required
def organization_edit(request, id: int):
    """Edit an existing organization."""
    try:
        org = Organization.objects.get(id=id)
    except Organization.DoesNotExist:
        return redirect('organizations')

    if request.method == 'POST':
        name = request.POST.get('name')
        domain = request.POST.get('domain')
        plan = request.POST.get('plan')

        errors = {}
        if not name:
            errors['name'] = 'Organization name is required'
        if not domain:
            errors['domain'] = 'Domain is required'
        elif Organization.objects.filter(domain=domain).exclude(id=id).exists():
            errors['domain'] = 'Domain already exists'

        if errors:
            return inertia_render(request, 'Organizations', {
                'errors': errors,
            })

        org.name = name
        org.domain = domain
        org.plan = plan
        org.save()
        return redirect('organizations')

    return redirect('organizations')


@login_required
def organization_delete(request, id: int):
    """Delete an organization."""
    if request.method == 'POST':
        try:
            org = Organization.objects.get(id=id)
            org.delete()
        except Organization.DoesNotExist:
            pass
    return redirect('organizations')

