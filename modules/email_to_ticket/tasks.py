"""
Celery tasks for email-to-ticket processing.
Single-tenant version.
"""
import logging
from celery import shared_task
from django.conf import settings
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)

_processing_lock = False


@shared_task(bind=True, name='modules.email_to_ticket.tasks.process_emails', max_retries=3, default_retry_delay=30)
def process_emails(self):
    """
    Main task to process emails from IMAP.
    Runs every 10 seconds via Celery Beat.
    """
    global _processing_lock

    if _processing_lock:
        logger.info("Email processing already in progress, skipping...")
        return {'status': 'skipped', 'reason': 'already_processing'}

    _processing_lock = True

    try:
        from modules.email_to_ticket.utils import EmailReader, group_emails_into_threads
        from modules.email_to_ticket.models import ProcessedEmail
        from modules.settings.models import Channel

        if not getattr(settings, 'EMAIL_HELP_HOST', None):
            logger.warning("EMAIL_HELP_HOST not configured")
            return {'status': 'error', 'reason': 'not_configured'}

        # Check if email channel is activated
        email_channel = Channel.objects.filter(channel_id='email').first()
        if not email_channel or not email_channel.is_activated:
            logger.info("Email channel is not activated, skipping processing")
            return {'status': 'skipped', 'reason': 'channel_inactive'}

        results = {
            'status': 'completed',
            'tickets_created': 0,
            'comments_added': 0,
            'errors': []
        }

        with EmailReader() as reader:
            if not reader.connection:
                logger.error("Failed to connect to IMAP server")
                return {'status': 'error', 'reason': 'connection_failed'}

            # Fetch unread emails from INBOX
            all_emails = reader.fetch_unread_emails(folder='INBOX', limit=100)

            if not all_emails:
                return {'status': 'completed', 'emails_found': 0}

            logger.info(f"Found {len(all_emails)} unread emails")

            # Group into threads
            threads = group_emails_into_threads(all_emails)

            for thread in threads:
                try:
                    result = _process_thread(thread, reader)
                    results['tickets_created'] += result.get('tickets_created', 0)
                    results['comments_added'] += result.get('comments_added', 0)
                    if result.get('errors'):
                        results['errors'].extend(result['errors'])
                except Exception as e:
                    logger.error(f"Error processing thread: {e}")
                    results['errors'].append(str(e))

        logger.info(f"Email processing completed: {results}")
        return results

    except Exception as e:
        logger.exception(f"Email processing failed: {e}")
        raise self.retry(exc=e)
    finally:
        _processing_lock = False


@shared_task(bind=True, name='modules.email_to_ticket.tasks.process_outlook_emails_task', max_retries=3, default_retry_delay=60)
def process_outlook_emails_task(self):
    """
    Process Outlook emails from connected mailboxes.
    Runs every 60 seconds via Celery Beat.
    """
    from modules.email_to_ticket.models import OutlookMailbox
    from modules.email_to_ticket.utils import OutlookEmailReader, group_outlook_emails_into_threads
    from modules.settings.models import Channel

    logger.info("Starting Outlook email processing task...")

    # Check if email channel is activated
    email_channel = Channel.objects.filter(channel_id='email').first()
    if not email_channel or not email_channel.is_activated:
        logger.info("Email channel is not activated, skipping Outlook processing")
        return {'status': 'skipped', 'reason': 'channel_inactive'}

    results = {
        'status': 'completed',
        'tickets_created': 0,
        'comments_added': 0,
        'errors': []
    }

    try:
        mailboxes = OutlookMailbox.objects.filter(is_active=True)
        if not mailboxes.exists():
            return {'status': 'completed', 'reason': 'no_mailboxes'}

        for mailbox in mailboxes:
            try:
                with OutlookEmailReader(mailbox) as reader:
                    if not reader.access_token:
                        results['errors'].append(f"Failed to auth: {mailbox.email_address}")
                        continue

                    folder = mailbox.folder_to_watch or 'Inbox'
                    emails = reader.fetch_unread_emails(folder=folder, limit=50)

                    if not emails:
                        mailbox.update_last_sync()
                        continue

                    threads = group_outlook_emails_into_threads(emails)

                    for thread in threads:
                        try:
                            result = _process_thread(thread, None)
                            results['tickets_created'] += result.get('tickets_created', 0)
                            results['comments_added'] += result.get('comments_added', 0)
                        except Exception as e:
                            results['errors'].append(str(e))

                    mailbox.update_last_sync()
            except Exception as e:
                logger.error(f"Error processing mailbox {mailbox.email_address}: {e}")
                results['errors'].append(str(e))

        return results

    except Exception as e:
        logger.error(f"Error in Outlook email processing task: {str(e)}")
        raise self.retry(exc=e)


@shared_task(bind=True, name='modules.email_to_ticket.tasks.process_custom_imap_emails_task', max_retries=3, default_retry_delay=60)
def process_custom_imap_emails_task(self):
    """
    Process Custom IMAP emails from connected mailboxes.
    Runs every 60 seconds via Celery Beat.
    """
    from modules.email_to_ticket.models import CustomIMAPMailbox
    from modules.email_to_ticket.utils import EmailReader, group_emails_into_threads
    from modules.settings.models import Channel

    logger.info("Starting Custom IMAP email processing task...")

    # Check if email channel is activated
    email_channel = Channel.objects.filter(channel_id='email').first()
    if not email_channel or not email_channel.is_activated:
        logger.info("Email channel is not activated, skipping Custom IMAP processing")
        return {'status': 'skipped', 'reason': 'channel_inactive'}

    results = {
        'status': 'completed',
        'tickets_created': 0,
        'comments_added': 0,
        'errors': []
    }

    try:
        mailboxes = CustomIMAPMailbox.objects.filter(is_active=True)
        if not mailboxes.exists():
            return {'status': 'completed', 'reason': 'no_mailboxes'}

        for mailbox in mailboxes:
            try:
                import imaplib
                import ssl

                if mailbox.imap_use_ssl:
                    context = ssl.create_default_context()
                    conn = imaplib.IMAP4_SSL(mailbox.imap_host, mailbox.imap_port, ssl_context=context)
                else:
                    conn = imaplib.IMAP4(mailbox.imap_host, mailbox.imap_port)

                conn.login(mailbox.username, mailbox.password)

                # Create a temporary reader-like object
                reader = EmailReader()
                reader.connection = conn

                emails = reader.fetch_unread_emails(folder=mailbox.folder_to_watch, limit=50)

                if emails:
                    threads = group_emails_into_threads(emails)
                    for thread in threads:
                        try:
                            result = _process_thread(thread, reader)
                            results['tickets_created'] += result.get('tickets_created', 0)
                            results['comments_added'] += result.get('comments_added', 0)
                        except Exception as e:
                            results['errors'].append(str(e))

                mailbox.update_last_sync()
                reader.disconnect()

            except Exception as e:
                logger.error(f"Error processing custom mailbox {mailbox.email_address}: {e}")
                results['errors'].append(str(e))

        return results

    except Exception as e:
        logger.error(f"Error in Custom IMAP email processing task: {str(e)}")
        raise self.retry(exc=e)


def _process_thread(thread: dict, reader) -> dict:
    """
    Process a single email thread: first email creates ticket, replies become comments.
    """
    from modules.email_to_ticket.models import ProcessedEmail
    from modules.ticket.models import Ticket, TicketComment
    from modules.settings.models import Channel

    User = get_user_model()

    result = {
        'tickets_created': 0,
        'comments_added': 0,
        'errors': []
    }

    thread_emails = thread['emails']
    if not thread_emails:
        return result

    first_email = thread_emails[0]
    subject = first_email.get('subject', '').strip() or '(No Subject)'
    from_email = first_email.get('from_email', '')
    from_name = first_email.get('from_name', '')
    body = first_email.get('plain_body', '') or first_email.get('html_body', '')
    message_id = first_email.get('message_id', '')

    # Check if already processed
    if message_id and ProcessedEmail.objects.filter(message_id=message_id).exists():
        return result

    try:
        # Find or create requester
        requester = None
        try:
            requester = User.objects.filter(email__iexact=from_email).first()
        except Exception:
            pass

        email_channel = Channel.objects.filter(channel_id='email').first()

        ticket = Ticket.objects.create(
            title=subject,
            description=body or f"Email from {from_name} <{from_email}>",
            source='email',
            channel=email_channel,
            status='new',
            priority='normal',
            type='incident',
            requester=requester,
            is_guest_ticket=requester is None,
            guest_name=from_name if requester is None else None,
            guest_email=from_email if requester is None else None,
        )

        result['tickets_created'] += 1
        logger.info(f"Created ticket {ticket.ticket_number} from email")

        ProcessedEmail.objects.create(
            message_id=message_id or f"no-id-{ticket.ticket_number}",
            from_address=from_email,
            to_address=first_email.get('to_header', ''),
            subject=subject,
            received_at=first_email.get('received_at'),
            ticket_created=True,
            ticket_number=ticket.ticket_number,
        )

        # Mark as read
        if reader and first_email.get('uid'):
            folder = first_email.get('_folder')
            reader.mark_as_seen(first_email['uid'], folder)

        # Process replies as comments
        for reply_email in thread_emails[1:]:
            reply_message_id = reply_email.get('message_id', '')

            if reply_message_id and ProcessedEmail.objects.filter(message_id=reply_message_id).exists():
                continue

            reply_from_email = reply_email.get('from_email', '')
            reply_from_name = reply_email.get('from_name', '')
            reply_body = reply_email.get('plain_body', '') or reply_email.get('html_body', '')
            reply_subject = reply_email.get('subject', '')

            reply_author = None
            try:
                reply_author = User.objects.filter(email__iexact=reply_from_email).first()
            except Exception:
                pass

            comment_message = reply_body
            if not reply_author:
                comment_message = f"**From:** {reply_from_name} <{reply_from_email}>\n\n{reply_body}"

            TicketComment.objects.create(
                ticket=ticket,
                author=reply_author,
                message=comment_message,
                is_internal=False,
            )

            result['comments_added'] += 1

            ProcessedEmail.objects.create(
                message_id=reply_message_id or f"reply-{ticket.ticket_number}-{result['comments_added']}",
                from_address=reply_from_email,
                to_address=reply_email.get('to_header', ''),
                subject=reply_subject,
                received_at=reply_email.get('received_at'),
                ticket_created=False,
                ticket_number=ticket.ticket_number,
            )

            # Mark reply as read
            if reader and reply_email.get('uid'):
                reply_folder = reply_email.get('_folder')
                reader.mark_as_seen(reply_email['uid'], reply_folder)

    except Exception as e:
        logger.error(f"Error creating ticket from email: {e}")
        result['errors'].append(f"Email '{subject[:30]}...': {str(e)}")

    return result
