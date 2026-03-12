from django.shortcuts import redirect
from django.core.paginator import Paginator
from django.contrib.auth.decorators import login_required
from inertia import inertia, render as inertia_render
from django.contrib.auth import get_user_model
from .models import UserProfile, Organization, Role, Group
from .permissions import Permission

User = get_user_model()


@login_required
@inertia('People')
def user_list(request):
    qs = UserProfile.objects.select_related('user', 'organization', 'role').prefetch_related('groups').order_by('user__username')
    page_num = int(request.GET.get('page', 1))
    paginator = Paginator(qs, 10)
    page = paginator.get_page(page_num)

    users = [
        {
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
            'groups': [{'id': g.id, 'name': g.name} for g in up.groups.all()],
        }
        for up in page.object_list
    ]

    orgs = list(Organization.objects.all().values('id', 'name'))
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
        'activeTab': 'users',
        'users': users,
        'orgs': orgs,
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
@inertia('People')
def role_list(request):
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
    
    # Include orgs and groups for user drawer
    orgs = list(Organization.objects.all().values('id', 'name'))
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
        'activeTab': 'roles',
        'roles': roles,
        'permissions': permissions_grouped,
        'orgs': orgs,
        'groups': groups,
    }


@login_required
@inertia('People')
def group_list(request):
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
    
    # Include orgs for user drawer
    orgs = list(Organization.objects.all().values('id', 'name'))

    return {
        'activeTab': 'groups',
        'groups': groups,
        'orgs': orgs,
    }


@login_required
@inertia('People')
def permission_list(request):
    permissions_grouped = Permission.get_grouped()
    
    # Include orgs and groups for user drawer
    orgs = list(Organization.objects.all().values('id', 'name'))
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
        'activeTab': 'permissions',
        'permissions': permissions_grouped,
        'orgs': orgs,
        'groups': groups,
    }


@login_required
@inertia('UserForm')
def user_create(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        email = request.POST.get('email')
        password = request.POST.get('password')
        full_name = request.POST.get('full_name')
        is_agent = request.POST.get('is_agent') == 'true'
        org_id = request.POST.get('organization')
        group_ids = request.POST.getlist('groups')

        errors = {}
        if not username:
            errors['username'] = 'Username is required'
        if not email:
            errors['email'] = 'Email is required'
        if not password:
            errors['password'] = 'Password is required'
        if User.objects.filter(username=username).exists():
            errors['username'] = 'Username already exists'

        if errors:
            orgs = list(Organization.objects.all().values('id', 'name'))
            groups_qs = Group.objects.all()
            groups = [
                {
                    'id': g.id,
                    'name': g.name,
                    'description': g.description,
                }
                for g in groups_qs
            ]
            return {
                'mode': 'create',
                'errors': errors,
                'orgs': orgs,
                'groups': groups,
            }

        user = User.objects.create_user(username=username, email=email, password=password)
        org = None
        if org_id:
            try:
                org = Organization.objects.get(id=org_id)
            except Organization.DoesNotExist:
                org = None
        profile = UserProfile.objects.create(user=user, full_name=full_name or '', is_agent=is_agent, organization=org)
        
        # Add user to groups
        if group_ids:
            groups = Group.objects.filter(id__in=group_ids)
            profile.groups.set(groups)
        
        return redirect('user_list')
    orgs = list(Organization.objects.all().values('id', 'name'))
    print("Organizations:", orgs)  # Debug print
    groups_qs = Group.objects.all()
    groups = [
        {
            'id': g.id,
            'name': g.name,
            'description': g.description,
        }
        for g in groups_qs
    ]
    return {
        'mode': 'create',
        'orgs': orgs,
        'groups': groups,
    }


@login_required
@inertia('UserForm')
def user_edit(request, id: int):
    try:
        user = User.objects.get(id=id)
        profile = user.profile
    except (User.DoesNotExist, UserProfile.DoesNotExist):
        return redirect('user_list')

    if request.method == 'POST':
        full_name = request.POST.get('full_name')
        email = request.POST.get('email')
        is_agent = request.POST.get('is_agent') == 'true'
        org_id = request.POST.get('organization')
        group_ids = request.POST.getlist('groups')

        user.email = email or user.email
        profile.full_name = full_name or profile.full_name
        profile.is_agent = is_agent
        if org_id:
            try:
                profile.organization = Organization.objects.get(id=org_id)
            except Organization.DoesNotExist:
                pass
        else:
            profile.organization = None
        
        # Update groups
        if group_ids:
            groups = Group.objects.filter(id__in=group_ids)
            profile.groups.set(groups)
        else:
            profile.groups.clear()
        
        profile.save()
        user.save(update_fields=['email'])
        return redirect('user_list')
    
    # GET request - show form with existing data
    orgs = list(Organization.objects.all().values('id', 'name'))
    groups_qs = Group.objects.all()
    groups = [
        {
            'id': g.id,
            'name': g.name,
            'description': g.description,
        }
        for g in groups_qs
    ]
    
    return {
        'mode': 'edit',
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': profile.full_name,
            'is_agent': profile.is_agent,
            'organization': profile.organization.id if profile.organization else '',
            'groups': [g.id for g in profile.groups.all()],
        },
        'orgs': orgs,
        'groups': groups,
    }


@login_required
def user_delete(request, id: int):
    if request.method == 'POST':
        try:
            user = User.objects.get(id=id)
            user.delete()
        except User.DoesNotExist:
            pass
    return redirect('user_list')


# Role CRUD views
@login_required
def role_create(request):
    """Create a new role."""
    if request.method == 'POST':
        name = request.POST.get('name')
        description = request.POST.get('description', '')
        permissions = request.POST.getlist('permissions')
        
        errors = {}
        if not name:
            errors['name'] = 'Role name is required'
        elif Role.objects.filter(name=name).exists():
            errors['name'] = 'Role name already exists'
        
        if errors:
            return inertia_render(request, 'People', {
                'errors': errors,
            })
        
        Role.objects.create(
            name=name,
            description=description,
            permissions=permissions,
        )
        return redirect('role_list')
    
    return redirect('role_list')


@login_required
def role_edit(request, id: int):
    """Edit an existing role."""
    try:
        role = Role.objects.get(id=id)
    except Role.DoesNotExist:
        return redirect('user_list')
    
    if request.method == 'POST':
        name = request.POST.get('name')
        description = request.POST.get('description', '')
        permissions = request.POST.getlist('permissions')
        
        errors = {}
        if not name:
            errors['name'] = 'Role name is required'
        elif Role.objects.filter(name=name).exclude(id=id).exists():
            errors['name'] = 'Role name already exists'
        
        if role.is_system:
            errors['name'] = 'System roles cannot be edited'
        
        if errors:
            return inertia_render(request, 'People', {
                'errors': errors,
            })
        
        role.name = name
        role.description = description
        role.permissions = permissions
        role.save()
        return redirect('role_list')
    
    return redirect('role_list')


@login_required
def role_delete(request, id: int):
    """Delete a role."""
    if request.method == 'POST':
        try:
            role = Role.objects.get(id=id)
            if role.is_system:
                return redirect('role_list')
            role.delete()
        except Role.DoesNotExist:
            pass
    return redirect('role_list')

@login_required
@inertia('UserPermissions')
def user_assign_permissions(request, id: int):
    """Assign custom permissions to a user."""
    try:
        user = User.objects.get(id=id)
        profile = user.profile
    except (User.DoesNotExist, UserProfile.DoesNotExist):
        return redirect('user_list')
    
    if request.method == 'POST':
        permissions = request.POST.getlist('permissions')
        role_id = request.POST.get('role')
        
        if role_id:
            try:
                profile.role = Role.objects.get(id=role_id)
            except Role.DoesNotExist:
                profile.role = None
        else:
            profile.role = None
        
        profile.custom_permissions = permissions
        profile.save()
        return redirect('user_list')
    
    # GET request - show permission form
    roles_qs = Role.objects.all()
    roles = [
        {
            'id': r.id,
            'name': r.name,
            'description': r.description,
        }
        for r in roles_qs
    ]
    permissions_grouped = Permission.get_grouped()
    
    return {
        'user': {
            'id': user.id,
            'name': profile.full_name or user.username,
            'role_id': profile.role.id if profile.role else '',
            'custom_permissions': profile.custom_permissions,
        },
        'roles': roles,
        'permissions': permissions_grouped,
    }

# Group CRUD views
@login_required
def group_create(request):
    """Create a new group."""
    if request.method == 'POST':
        name = request.POST.get('name')
        description = request.POST.get('description', '')
        
        errors = {}
        if not name:
            errors['name'] = 'Group name is required'
        elif Group.objects.filter(name=name).exists():
            errors['name'] = 'Group name already exists'
        
        if errors:
            return inertia_render(request, 'People', {
                'errors': errors,
            })
        
        Group.objects.create(
            name=name,
            description=description,
        )
        return redirect('group_list')
    
    return redirect('group_list')


@login_required
def group_edit(request, id: int):
    """Edit an existing group."""
    try:
        group = Group.objects.get(id=id)
    except Group.DoesNotExist:
        return redirect('user_list')
    
    if request.method == 'POST':
        name = request.POST.get('name')
        description = request.POST.get('description', '')
        
        errors = {}
        if not name:
            errors['name'] = 'Group name is required'
        elif Group.objects.filter(name=name).exclude(id=id).exists():
            errors['name'] = 'Group name already exists'
        
        if errors:
            return inertia_render(request, 'People', {
                'errors': errors,
            })
        
        group.name = name
        group.description = description
        group.save()
        return redirect('group_list')
    
    return redirect('group_list')


@login_required
def group_delete(request, id: int):
    """Delete a group."""
    if request.method == 'POST':
        try:
            group = Group.objects.get(id=id)
            group.delete()
        except Group.DoesNotExist:
            pass
    return redirect('group_list')


# Create your views here.
