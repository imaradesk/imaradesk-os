"""
Team invitation helpers shared by the admin endpoints (send / resend / revoke)
and the public accept page at /invite/<token>/.
"""
import logging

from django.contrib.auth import get_user_model
from django.utils import timezone

from shared.utilities.organization import absolute_url, organization_name
from .models import UserInvitation, UserProfile

logger = logging.getLogger(__name__)

User = get_user_model()


def is_agent_role(role):
    """Every role except Customer, including custom ones, belongs to the team."""
    return bool(role) and role.name.lower() != 'customer'


INVITE_EXPIRY_DAYS = 7


def display_name(user):
    if not user:
        return 'A teammate'
    profile = getattr(user, 'profile', None)
    return (profile and profile.full_name) or user.get_full_name() or user.email or user.username


def find_user(email):
    return User.objects.filter(email__iexact=email).select_related('profile').first()


def is_team_member(user):
    """A user already on the team: an agent, or anyone with a role assigned."""
    profile = getattr(user, 'profile', None) if user else None
    return bool(profile and (profile.is_agent or profile.role_id))


def invite_url(request, invitation):
    return absolute_url(request, f'/invite/{invitation.token}/')


def send_invitation_email(request, invitation):
    """Email the invite link. Returns True when the mail went out."""
    from shared.utilities.Mailer import Mailer
    from shared.utilities.templates import GlobalEmailTemplates

    template = GlobalEmailTemplates.TEAM_INVITATION
    try:
        return bool(Mailer().send_raw_email(
            to_email=invitation.email,
            subject=template['subject'],
            body_html=template['body_html'],
            body_text=template['body_text'],
            context={
                'inviter_name': display_name(invitation.invited_by),
                'workspace_name': organization_name('your help desk'),
                'role_name': invitation.role.name if invitation.role else 'a team member',
                'invite_url': invite_url(request, invitation),
                'invite_email': invitation.email,
                'expiry_days': INVITE_EXPIRY_DAYS,
            },
            fail_silently=True,
        ))
    except Exception:
        logger.exception('Failed to send invitation email to %s', invitation.email)
        return False


class InvitationRoleMissing(Exception):
    """The role this invitation was for has since been deleted."""


def apply_invitation(user, invitation):
    """Give the user the invited role and mark the invitation accepted.

    Raises InvitationRoleMissing when the invited role no longer exists, and
    never demotes an existing Administrator to a lower role."""
    role = invitation.role
    if role is None:
        raise InvitationRoleMissing()

    profile, _ = UserProfile.objects.get_or_create(user=user)
    current = profile.role
    if current and current.name == 'Administrator' and role.name != 'Administrator':
        role = current  # already on the team with more access: keep it
    is_agent = is_agent_role(role)
    profile.role = role
    profile.is_agent = is_agent
    profile.is_customer = not is_agent
    if not profile.organization_id:
        inviter_profile = getattr(invitation.invited_by, 'profile', None) if invitation.invited_by else None
        if inviter_profile and inviter_profile.organization_id:
            profile.organization_id = inviter_profile.organization_id
    profile.save()

    invitation.status = UserInvitation.Status.ACCEPTED
    invitation.accepted_at = timezone.now()
    invitation.accepted_by = user
    invitation.save(update_fields=['status', 'accepted_at', 'accepted_by'])

    # Any other open invites for this address are now moot
    UserInvitation.objects.filter(
        email__iexact=invitation.email, status=UserInvitation.Status.PENDING,
    ).exclude(pk=invitation.pk).update(status=UserInvitation.Status.REVOKED)
    return profile


def serialize_invitation(invitation):
    return {
        'id': invitation.id,
        'email': invitation.email,
        'role': invitation.role.name if invitation.role else None,
        'role_id': invitation.role_id,
        'invited_by': display_name(invitation.invited_by) if invitation.invited_by else None,
        'created_at': invitation.created_at.isoformat(),
        'expires_at': invitation.expires_at.isoformat(),
        'is_expired': invitation.is_expired,
    }
