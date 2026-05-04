"""
Celery tasks for ticket operations.

This module contains all ticket-related background tasks including:
- Email notifications (ticket created, assigned, comments, etc.)
- Survey sending to ticket callers

These are event-triggered tasks (called from signals/views),
not periodic cron jobs.
"""
import logging
from celery import shared_task
from shared.utilities.tenant_compat import schema_context
from shared.models import Client

logger = logging.getLogger(__name__)


# =============================================================================
# TICKET EMAIL NOTIFICATION TASKS
# =============================================================================

@shared_task(bind=True, name='modules.ticket.tasks.send_ticket_email_task', max_retries=3, default_retry_delay=60, rate_limit='10/m')
def send_ticket_email_task(self, schema_name, template_type, ticket_id, to_user_id=None, additional_context=None):
    """
    Send ticket-related email notification in background.
    
    Args:
        schema_name: Tenant schema name for database context
        template_type: Email template type (e.g., 'ticket_created', 'ticket_assigned')
        ticket_id: ID of the ticket
        to_user_id: ID of the recipient user (optional)
        additional_context: Additional context for the email template
    """
    from modules.ticket.models import Ticket
    from shared.utilities.Mailer import Mailer
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    
    try:
        with schema_context(schema_name):
            ticket = Ticket.objects.get(id=ticket_id)
            to_user = User.objects.get(id=to_user_id) if to_user_id else None
            
            mailer = Mailer()
            mailer.send_ticket_email(
                template_type=template_type,
                ticket=ticket,
                to_user=to_user,
                additional_context=additional_context or {}
            )
            logger.info(f"Sent {template_type} email for ticket {ticket.ticket_number}")
            return {'status': 'success', 'ticket': ticket.ticket_number}
        
    except Ticket.DoesNotExist:
        logger.error(f"Ticket {ticket_id} not found for email task")
        return {'status': 'error', 'message': 'Ticket not found'}
    except User.DoesNotExist:
        logger.error(f"User {to_user_id} not found for email task")
        return {'status': 'error', 'message': 'User not found'}
    except Exception as e:
        logger.error(f"Failed to send {template_type} email: {e}")
        raise self.retry(exc=e)


@shared_task(bind=True, name='modules.ticket.tasks.send_guest_email_task', max_retries=3, default_retry_delay=60)
def send_guest_email_task(self, schema_name, template_type, to_email, context):
    """
    Send email to guest (non-registered user) in background.
    
    Args:
        schema_name: Tenant schema name for database context
        template_type: Email template type
        to_email: Guest email address
        context: Email template context
    """
    from shared.utilities.Mailer import Mailer
    
    try:
        with schema_context(schema_name):
            mailer = Mailer()
            mailer.send_email(
                template_type=template_type,
                to_emails=[to_email],
                context=context
            )
            logger.info(f"Sent {template_type} email to guest {to_email}")
            return {'status': 'success', 'email': to_email}
        
    except Exception as e:
        logger.error(f"Failed to send {template_type} email to {to_email}: {e}")
        raise self.retry(exc=e)


@shared_task(bind=True, name='modules.ticket.tasks.send_comment_notification_task', max_retries=3, default_retry_delay=60)
def send_comment_notification_task(self, schema_name, ticket_id, comment_id, notification_type):
    """
    Send comment-related email notification in background.
    
    Args:
        schema_name: Tenant schema name for database context
        ticket_id: ID of the ticket
        comment_id: ID of the comment
        notification_type: Type of notification ('internal', 'customer_to_agent', 'agent_to_customer')
    """
    from modules.ticket.models import Ticket, TicketComment
    from shared.utilities.Mailer import Mailer
    
    try:
        with schema_context(schema_name):
            ticket = Ticket.objects.get(id=ticket_id)
            comment = TicketComment.objects.get(id=comment_id)
            mailer = Mailer()
            
            comment_preview = comment.message[:200] + '...' if len(comment.message) > 200 else comment.message
            
            if notification_type == 'internal':
                if ticket.assignee and comment.author != ticket.assignee:
                    mailer.send_ticket_email(
                        template_type='internal_activity_alert',
                        ticket=ticket,
                        to_user=ticket.assignee,
                        additional_context={
                            'added_by': comment.author.get_full_name() if comment.author else 'Unknown',
                            'internal_note': comment_preview,
                        }
                    )
            elif notification_type == 'customer_to_agent':
                if ticket.assignee:
                    mailer.send_ticket_email(
                        template_type='new_message_alert',
                        ticket=ticket,
                        to_user=ticket.assignee,
                        additional_context={
                            'message_content': comment_preview,
                        }
                    )
            elif notification_type == 'agent_to_customer':
                if ticket.requester:
                    mailer.send_ticket_email(
                        template_type='response_reply_template',
                        ticket=ticket,
                        to_user=ticket.requester,
                        additional_context={
                            'response_message': comment_preview,
                            'agent_name': comment.author.get_full_name() if comment.author else 'Support Agent',
                        }
                    )
                elif ticket.is_guest_ticket and ticket.guest_email:
                    from django.conf import settings as django_settings
                    from django.db import connection
                    
                    # Get company name from current tenant
                    try:
                        company_name = Client.get_current().name
                    except Exception:
                        company_name = 'Support Team'
                    
                    base_url = getattr(django_settings, 'SITE_URL', '')
                    ticket_url = f"{base_url}/portal/track/{ticket.ticket_number}" if base_url else ''
                    
                    recipient_name = ticket.guest_name or ticket.guest_email.split('@')[0]
                    mailer.send_email(
                        template_type='response_reply_template',
                        to_emails=[ticket.guest_email],
                        context={
                            'customer_name': recipient_name,
                            'ticket_number': ticket.ticket_number,
                            'ticket_subject': ticket.title,
                            'response_message': comment_preview,
                            'agent_name': comment.author.get_full_name() if comment.author else 'Support Agent',
                            'ticket_url': ticket_url,
                            'company_name': company_name,
                        }
                    )
            
            logger.info(f"Sent {notification_type} comment notification for ticket {ticket.ticket_number}")
            return {'status': 'success', 'ticket': ticket.ticket_number}
        
    except (Ticket.DoesNotExist, TicketComment.DoesNotExist) as e:
        logger.error(f"Ticket or comment not found for notification task: {e}")
        return {'status': 'error', 'message': str(e)}
    except Exception as e:
        logger.error(f"Failed to send comment notification: {e}")
        raise self.retry(exc=e)


@shared_task(bind=True, name='modules.ticket.tasks.send_mention_notification_task', max_retries=3, default_retry_delay=60)
def send_mention_notification_task(self, schema_name, ticket_id, comment_id, mentioned_user_id):
    """
    Send mention notification email in background.
    
    Args:
        schema_name: Tenant schema name for database context
        ticket_id: ID of the ticket
        comment_id: ID of the comment containing the mention
        mentioned_user_id: ID of the mentioned user
    """
    from modules.ticket.models import Ticket, TicketComment
    from shared.utilities.Mailer import Mailer
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    
    try:
        with schema_context(schema_name):
            ticket = Ticket.objects.get(id=ticket_id)
            comment = TicketComment.objects.get(id=comment_id)
            mentioned_user = User.objects.get(id=mentioned_user_id)
            
            mailer = Mailer()
            mailer.send_ticket_email(
                template_type='user_mentioned',
                ticket=ticket,
                to_user=mentioned_user,
                additional_context={
                    'mentioned_by': comment.author.get_full_name() if comment.author else 'Someone',
                    'comment_text': comment.message[:200] + '...' if len(comment.message) > 200 else comment.message,
                    'is_internal': comment.is_internal,
                }
            )
            logger.info(f"Sent mention notification to {mentioned_user.username} for ticket {ticket.ticket_number}")
            return {'status': 'success', 'user': mentioned_user.username}
        
    except (Ticket.DoesNotExist, TicketComment.DoesNotExist, User.DoesNotExist) as e:
        logger.error(f"Object not found for mention notification: {e}")
        return {'status': 'error', 'message': str(e)}
    except Exception as e:
        logger.error(f"Failed to send mention notification: {e}")
        raise self.retry(exc=e)


@shared_task(bind=True, name='modules.ticket.tasks.send_ticket_merged_notification_task', max_retries=3, default_retry_delay=60)
def send_ticket_merged_notification_task(self, schema_name, primary_ticket_id, merged_ticket_id, merged_by_id=None):
    """
    Send notification when tickets are merged (background task).
    
    Args:
        schema_name: Tenant schema name for database context
        primary_ticket_id: ID of the primary (destination) ticket
        merged_ticket_id: ID of the ticket that was merged
        merged_by_id: ID of the user who performed the merge (optional)
    """
    from modules.ticket.models import Ticket
    from shared.utilities.Mailer import Mailer
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    
    try:
        with schema_context(schema_name):
            primary_ticket = Ticket.objects.get(id=primary_ticket_id)
            merged_ticket = Ticket.objects.get(id=merged_ticket_id)
            merged_by = User.objects.get(id=merged_by_id) if merged_by_id else None
            
            mailer = Mailer()
            
            if merged_ticket.requester:
                mailer.send_ticket_email(
                    template_type='ticket_merged',
                    ticket=primary_ticket,
                    to_user=merged_ticket.requester,
                    additional_context={
                        'merged_ticket_number': merged_ticket.ticket_number,
                        'primary_ticket_number': primary_ticket.ticket_number,
                        'merged_by': merged_by.get_full_name() if merged_by else 'System',
                    }
                )
            elif merged_ticket.is_guest_ticket and merged_ticket.guest_email:
                recipient_name = merged_ticket.guest_name or merged_ticket.guest_email.split('@')[0]
                mailer.send_email(
                    template_type='ticket_merged',
                    to_emails=[merged_ticket.guest_email],
                    context={
                        'customer_name': recipient_name,
                        'merged_ticket_number': merged_ticket.ticket_number,
                        'primary_ticket_number': primary_ticket.ticket_number,
                        'ticket_number': primary_ticket.ticket_number,
                        'ticket_subject': primary_ticket.title,
                    }
                )
            
            logger.info(f"Sent merge notification for ticket {merged_ticket.ticket_number} -> {primary_ticket.ticket_number}")
            return {'status': 'success', 'merged_ticket': merged_ticket.ticket_number}
        
    except Ticket.DoesNotExist as e:
        logger.error(f"Ticket not found for merge notification: {e}")
        return {'status': 'error', 'message': str(e)}
    except Exception as e:
        logger.error(f"Failed to send ticket merged notification: {e}")
        raise self.retry(exc=e)


@shared_task(bind=True, name='modules.ticket.tasks.send_group_assignment_notification_task', max_retries=3, default_retry_delay=60, rate_limit='10/m')
def send_group_assignment_notification_task(self, schema_name, ticket_id, group_id):
    """
    Send notification to all members of a group when a ticket is assigned to their group.
    
    Args:
        schema_name: Tenant schema name for database context
        ticket_id: ID of the ticket
        group_id: ID of the group the ticket was assigned to
    """
    from modules.ticket.models import Ticket
    from modules.users.models import Group
    from shared.utilities.Mailer import Mailer
    
    try:
        with schema_context(schema_name):
            ticket = Ticket.objects.get(id=ticket_id)
            group = Group.objects.get(id=group_id)
            
            logger.info(f"[GroupNotify] Processing ticket {ticket.ticket_number} for group {group.name} (ID: {group_id})")
            
            # Get all members of the group (UserProfile objects)
            all_members = group.members.all()
            logger.info(f"[GroupNotify] Total members in group: {all_members.count()}")
            
            group_members = group.members.filter(is_agent=True).select_related('user')
            logger.info(f"[GroupNotify] Agent members in group: {group_members.count()}")
            
            if not group_members.exists():
                logger.info(f"[GroupNotify] No agent members in group {group.name} for ticket {ticket.ticket_number}")
                return {'status': 'success', 'emails_sent': 0, 'reason': 'no_agent_members'}
            
            mailer = Mailer()
            emails_sent = 0
            
            for member_profile in group_members:
                user = member_profile.user
                logger.info(f"[GroupNotify] Processing member: {user.email} (is_agent={member_profile.is_agent})")
                
                # Skip if this is the ticket's current assignee (they already get a direct notification)
                if ticket.assignee and ticket.assignee.id == user.id:
                    logger.info(f"[GroupNotify] Skipping {user.email} - already assignee")
                    continue
                
                try:
                    result = mailer.send_ticket_email(
                        template_type='ticket_group_assigned',
                        ticket=ticket,
                        to_user=user,
                        additional_context={
                            'group_name': group.name,
                        }
                    )
                    if result:
                        emails_sent += 1
                        logger.info(f"[GroupNotify] Email sent to {user.email}")
                    else:
                        logger.warning(f"[GroupNotify] Failed to send to {user.email} - mailer returned False")
                except Exception as e:
                    logger.warning(f"[GroupNotify] Failed to send group notification to {user.email}: {e}")
            
            logger.info(f"[GroupNotify] Sent {emails_sent} group assignment notifications for ticket {ticket.ticket_number} to group {group.name}")
            return {'status': 'success', 'emails_sent': emails_sent, 'group': group.name}
        
    except Ticket.DoesNotExist:
        logger.error(f"Ticket {ticket_id} not found for group assignment notification")
        return {'status': 'error', 'message': 'Ticket not found'}
    except Group.DoesNotExist:
        logger.error(f"Group {group_id} not found for group assignment notification")
        return {'status': 'error', 'message': 'Group not found'}
    except Exception as e:
        logger.error(f"Failed to send group assignment notification: {e}")
        raise self.retry(exc=e)


# =============================================================================
# SURVEY TASKS
# =============================================================================

@shared_task(bind=True, name='modules.ticket.tasks.send_survey_to_ticket_caller_task', max_retries=3, default_retry_delay=60, rate_limit='10/m')
def send_survey_to_ticket_caller_task(self, schema_name, ticket_id, survey_id=None):
    """
    Send survey email to ticket caller when ticket is resolved.
    Uses token-based URL for anonymous access (no authentication required).
    
    Args:
        schema_name: Tenant schema name for database context
        ticket_id: ID of the resolved ticket
        survey_id: Optional specific survey ID (if None, picks from surveys with trigger_event='resolved')
    """
    import secrets
    import random
    from django.utils import timezone
    from django.conf import settings
    from django.db import connection
    from modules.ticket.models import Ticket
    from modules.surveys.models import Survey, SurveyInvitation
    from shared.utilities.Mailer import Mailer
    from shared.models import Client, Domain
    
    try:
        with schema_context(schema_name):
            ticket = Ticket.objects.select_related('requester').get(id=ticket_id)
            
            # Get caller info (works for both registered users and guests)
            caller = ticket.caller
            if not caller or not caller.get('email'):
                logger.warning(f"No valid caller email for ticket {ticket.ticket_number}")
                return {'status': 'skipped', 'reason': 'no_caller_email'}
            
            # Get the survey - either specified or pick randomly from 'resolved' trigger surveys
            if survey_id:
                survey = Survey.objects.get(id=survey_id, is_active=True)
            else:
                # Get all active surveys with trigger_event='resolved' (After Ticket Resolved)
                resolved_surveys = list(Survey.objects.filter(
                    is_active=True,
                    trigger_event='resolved'
                ))
                
                if not resolved_surveys:
                    logger.warning(f"No active surveys with trigger 'After Ticket Resolved' for ticket {ticket.ticket_number}")
                    return {'status': 'skipped', 'reason': 'no_resolved_trigger_survey'}
                
                # Pick one randomly
                survey = random.choice(resolved_surveys)
                logger.info(f"Selected survey '{survey.name}' (ID: {survey.id}) from {len(resolved_surveys)} available")
            
            # Generate unique token and create invitation for URL access
            token = secrets.token_urlsafe(48)
            now = timezone.now()
            expiry_days = getattr(survey, 'expiry_days', 7) or 7
            expires_at = now + timezone.timedelta(days=expiry_days)
            
            # Create invitation record for token-based access
            invitation = SurveyInvitation.objects.create(
                survey=survey,
                ticket=ticket,
                email=caller['email'],
                user_name=caller['name'],
                user=ticket.requester if ticket.requester else None,
                agent=ticket.assignee,
                token=token,
                status='sent',
                scheduled_at=now,
                sent_at=now,
                expires_at=expires_at,
            )
            
            # Build survey URL using tenant domain
            try:
                tenant = Client.objects.get(schema_name=schema_name)
                primary_domain = Domain.objects.filter(tenant=tenant, is_primary=True).first()
                if primary_domain:
                    tenant_domain = primary_domain.domain
                else:
                    primary_domain_setting = getattr(settings, 'PRIMARY_DOMAIN', '127.0.0.1:8000')
                    tenant_domain = f"{schema_name}.{primary_domain_setting}"
            except Client.DoesNotExist:
                primary_domain_setting = getattr(settings, 'PRIMARY_DOMAIN', '127.0.0.1:8000')
                tenant_domain = f"{schema_name}.{primary_domain_setting}"
            
            # Determine protocol
            use_ssl = getattr(settings, 'USE_SSL', False) or getattr(settings, 'SECURE_SSL_REDIRECT', False)
            protocol = 'https' if use_ssl else 'http'
            
            # URL uses token for anonymous access (matches public_survey_view)
            survey_url = f"{protocol}://{tenant_domain}/survey/{token}/"
            
            # Get company name
            try:
                company_name = Client.get_current().name
            except Exception:
                company_name = 'Support Team'
            
            # Send the survey email
            mailer = Mailer()
            mailer.send_email(
                template_type='survey_invitation',
                to_emails=[caller['email']],
                context={
                    'customer_name': caller['name'],
                    'survey_url': survey_url,
                    'ticket_number': ticket.ticket_number,
                    'ticket_subject': ticket.title,
                    'company_name': company_name,
                }
            )
            
            logger.info(f"Sent survey '{survey.name}' email to {caller['email']} for ticket {ticket.ticket_number}")
            return {'status': 'success', 'email': caller['email'], 'survey_id': survey.id}
        
    except Ticket.DoesNotExist:
        logger.error(f"Ticket {ticket_id} not found for survey")
        return {'status': 'error', 'message': 'ticket_not_found'}
    except Survey.DoesNotExist:
        logger.error(f"Survey {survey_id} not found")
        return {'status': 'error', 'message': 'survey_not_found'}
    except Exception as e:
        logger.error(f"Failed to send survey email: {e}")
        raise self.retry(exc=e)
