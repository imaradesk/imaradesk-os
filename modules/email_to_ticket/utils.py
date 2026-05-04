"""
Email utility functions for reading emails via IMAP and Microsoft Graph API.
Single-tenant version.
"""
import imaplib
import email
import re
import requests
import logging
from email.header import decode_header
from email.utils import parseaddr, parsedate_to_datetime
from typing import List, Dict, Optional, Tuple
from django.conf import settings
from django.utils import timezone
import ssl

logger = logging.getLogger(__name__)


class OutlookEmailReader:
    """
    Class to read emails from Microsoft Outlook using Microsoft Graph API.
    Uses OAuth tokens stored in OutlookMailbox model.
    """
    GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0'

    def __init__(self, mailbox):
        self.mailbox = mailbox
        self.access_token = None

    def _get_headers(self) -> Dict:
        return {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json',
        }

    def connect(self) -> bool:
        self.access_token = self.mailbox.get_valid_token()
        if not self.access_token:
            logger.error(f"Failed to get valid token for mailbox: {self.mailbox.email_address}")
            return False
        return True

    def disconnect(self):
        self.access_token = None

    def list_folders(self) -> List[Dict]:
        if not self.access_token:
            return []
        try:
            url = f"{self.GRAPH_API_BASE}/me/mailFolders"
            response = requests.get(url, headers=self._get_headers())
            if not response.ok:
                logger.error(f"Failed to list folders: {response.text}")
                return []
            data = response.json()
            return data.get('value', [])
        except Exception as e:
            logger.error(f"Error listing folders: {e}")
            return []

    def get_folder_id(self, folder_name: str) -> Optional[str]:
        folders = self.list_folders()
        for folder in folders:
            if folder.get('displayName', '').lower() == folder_name.lower():
                return folder.get('id')
        return None

    def _parse_email(self, message_data: Dict) -> Dict:
        from_data = message_data.get('from', {}).get('emailAddress', {})
        from_email = from_data.get('address', '').lower()
        from_name = from_data.get('name', '')

        to_addresses = []
        for recipient in message_data.get('toRecipients', []):
            addr = recipient.get('emailAddress', {}).get('address', '')
            if addr:
                to_addresses.append(addr.lower())

        cc_addresses = []
        for recipient in message_data.get('ccRecipients', []):
            addr = recipient.get('emailAddress', {}).get('address', '')
            if addr:
                cc_addresses.append(addr.lower())

        received_at = None
        received_str = message_data.get('receivedDateTime')
        if received_str:
            try:
                from dateutil.parser import parse as parse_datetime
                received_at = parse_datetime(received_str)
            except Exception:
                pass

        body_data = message_data.get('body', {})
        body_type = body_data.get('contentType', 'text')
        body_content = body_data.get('content', '')

        plain_body = ''
        html_body = ''
        if body_type.lower() == 'html':
            html_body = body_content
            from html import unescape
            plain_body = re.sub(r'<[^>]+>', '', body_content)
            plain_body = unescape(plain_body).strip()
        else:
            plain_body = body_content

        conversation_id = message_data.get('conversationId', '')
        internet_message_id = message_data.get('internetMessageId', '')

        return {
            'message_id': internet_message_id or message_data.get('id', ''),
            'graph_id': message_data.get('id', ''),
            'subject': message_data.get('subject', ''),
            'from_email': from_email,
            'from_name': from_name,
            'to_addresses': to_addresses,
            'to_header': ', '.join(to_addresses),
            'cc_addresses': cc_addresses,
            'cc_header': ', '.join(cc_addresses),
            'received_at': received_at,
            'plain_body': plain_body,
            'html_body': html_body,
            'attachments': [],
            'has_attachments': message_data.get('hasAttachments', False),
            'conversation_id': conversation_id,
            'is_read': message_data.get('isRead', False),
            'importance': message_data.get('importance', 'normal'),
            'in_reply_to': '',
            'references': conversation_id,
        }

    def fetch_unread_emails(self, folder: str = 'Inbox', limit: int = 50) -> List[Dict]:
        if not self.access_token:
            if not self.connect():
                return []
        try:
            folder_id = folder
            if not folder.startswith('AAM'):
                folder_id = self.get_folder_id(folder)
                if not folder_id:
                    folder_id = folder.lower()

            url = f"{self.GRAPH_API_BASE}/me/mailFolders/{folder_id}/messages"
            params = {
                '$filter': 'isRead eq false',
                '$top': limit,
                '$orderby': 'receivedDateTime desc',
                '$select': 'id,subject,from,toRecipients,ccRecipients,body,receivedDateTime,hasAttachments,isRead,importance,conversationId,internetMessageId',
            }

            response = requests.get(url, headers=self._get_headers(), params=params)
            if not response.ok:
                logger.error(f"Failed to fetch emails: {response.text}")
                return []

            data = response.json()
            messages = data.get('value', [])

            emails = []
            for msg in messages:
                parsed = self._parse_email(msg)
                parsed['_folder'] = folder
                parsed['_folder_id'] = folder_id
                emails.append(parsed)

            return emails
        except Exception as e:
            logger.error(f"Error fetching unread emails: {e}")
            return []

    def fetch_all_emails(self, folder: str = 'Inbox', limit: int = 50) -> List[Dict]:
        if not self.access_token:
            if not self.connect():
                return []
        try:
            folder_id = folder
            if not folder.startswith('AAM'):
                folder_id = self.get_folder_id(folder)
                if not folder_id:
                    folder_id = folder.lower()

            url = f"{self.GRAPH_API_BASE}/me/mailFolders/{folder_id}/messages"
            params = {
                '$top': limit,
                '$orderby': 'receivedDateTime desc',
                '$select': 'id,subject,from,toRecipients,ccRecipients,body,receivedDateTime,hasAttachments,isRead,importance,conversationId,internetMessageId',
            }

            response = requests.get(url, headers=self._get_headers(), params=params)
            if not response.ok:
                logger.error(f"Failed to fetch emails: {response.text}")
                return []

            data = response.json()
            messages = data.get('value', [])

            emails = []
            for msg in messages:
                parsed = self._parse_email(msg)
                parsed['_folder'] = folder
                parsed['_folder_id'] = folder_id
                emails.append(parsed)

            return emails
        except Exception as e:
            logger.error(f"Error fetching all emails: {e}")
            return []

    def mark_as_read(self, message_id: str) -> bool:
        if not self.access_token:
            return False
        try:
            url = f"{self.GRAPH_API_BASE}/me/messages/{message_id}"
            data = {'isRead': True}
            response = requests.patch(url, headers=self._get_headers(), json=data)
            return response.ok
        except Exception as e:
            logger.error(f"Error marking email as read: {e}")
            return False

    def move_to_folder(self, message_id: str, destination_folder: str) -> bool:
        if not self.access_token:
            return False
        try:
            folder_id = destination_folder
            if not destination_folder.startswith('AAM'):
                folder_id = self.get_folder_id(destination_folder)
                if not folder_id:
                    logger.error(f"Destination folder not found: {destination_folder}")
                    return False

            url = f"{self.GRAPH_API_BASE}/me/messages/{message_id}/move"
            data = {'destinationId': folder_id}
            response = requests.post(url, headers=self._get_headers(), json=data)
            return response.ok
        except Exception as e:
            logger.error(f"Error moving email: {e}")
            return False

    def get_attachments(self, message_id: str) -> List[Dict]:
        if not self.access_token:
            return []
        try:
            url = f"{self.GRAPH_API_BASE}/me/messages/{message_id}/attachments"
            response = requests.get(url, headers=self._get_headers())
            if not response.ok:
                return []

            data = response.json()
            attachments = []
            for att in data.get('value', []):
                if att.get('@odata.type') == '#microsoft.graph.fileAttachment':
                    attachments.append({
                        'filename': att.get('name', ''),
                        'content_type': att.get('contentType', ''),
                        'size': att.get('size', 0),
                        'payload': att.get('contentBytes'),
                    })
            return attachments
        except Exception as e:
            logger.error(f"Error getting attachments: {e}")
            return []

    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.disconnect()
        return False


class EmailReader:
    """
    Class to read emails from an IMAP server.
    Uses the EMAIL_HELP_* settings for connection.
    """

    def __init__(self):
        self.host = getattr(settings, 'EMAIL_HELP_HOST', '')
        self.port = int(getattr(settings, 'EMAIL_HELP_IMAP_PORT', 993))
        self.username = getattr(settings, 'EMAIL_HELP_HOST_USER', '')
        self.password = getattr(settings, 'EMAIL_HELP_HOST_PASSWORD', '')
        self.use_ssl = getattr(settings, 'EMAIL_HELP_USE_SSL', True)
        self.connection = None

    def connect(self) -> bool:
        try:
            if self.use_ssl:
                context = ssl.create_default_context()
                self.connection = imaplib.IMAP4_SSL(self.host, self.port, ssl_context=context)
            else:
                self.connection = imaplib.IMAP4(self.host, self.port)
            self.connection.login(self.username, self.password)
            return True
        except Exception as e:
            logger.error(f"Failed to connect to IMAP server: {e}")
            return False

    def disconnect(self):
        if self.connection:
            try:
                self.connection.logout()
            except Exception:
                pass
            self.connection = None

    def list_folders(self) -> List[str]:
        if not self.connection:
            if not self.connect():
                return []
        folders = []
        try:
            status, folder_list = self.connection.list()
            if status == 'OK':
                for folder_data in folder_list:
                    if isinstance(folder_data, bytes):
                        folder_str = folder_data.decode('utf-8', errors='replace')
                        match = re.search(r'"([^"]+)"$', folder_str)
                        if match:
                            folders.append(match.group(1))
                        else:
                            parts = folder_str.strip().split()
                            if parts:
                                folders.append(parts[-1])
        except Exception as e:
            logger.error(f"Error listing folders: {e}")
        return folders

    def _decode_header_value(self, value: str) -> str:
        if not value:
            return ""
        decoded_parts = []
        for part, encoding in decode_header(value):
            if isinstance(part, bytes):
                try:
                    decoded_parts.append(part.decode(encoding or 'utf-8', errors='replace'))
                except Exception:
                    decoded_parts.append(part.decode('utf-8', errors='replace'))
            else:
                decoded_parts.append(part)
        return ' '.join(decoded_parts)

    def _get_email_body(self, msg) -> Tuple[str, str]:
        plain_body = ""
        html_body = ""

        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get("Content-Disposition", ""))
                if "attachment" in content_disposition:
                    continue
                try:
                    body = part.get_payload(decode=True)
                    if body:
                        charset = part.get_content_charset() or 'utf-8'
                        body = body.decode(charset, errors='replace')
                        if content_type == "text/plain":
                            plain_body = body
                        elif content_type == "text/html":
                            html_body = body
                except Exception as e:
                    logger.error(f"Error decoding email part: {e}")
        else:
            content_type = msg.get_content_type()
            try:
                body = msg.get_payload(decode=True)
                if body:
                    charset = msg.get_content_charset() or 'utf-8'
                    body = body.decode(charset, errors='replace')
                    if content_type == "text/plain":
                        plain_body = body
                    elif content_type == "text/html":
                        html_body = body
            except Exception as e:
                logger.error(f"Error decoding email body: {e}")

        return plain_body, html_body

    def _get_attachments(self, msg) -> List[Dict]:
        attachments = []
        if msg.is_multipart():
            for part in msg.walk():
                content_disposition = str(part.get("Content-Disposition", ""))
                if "attachment" in content_disposition:
                    filename = part.get_filename()
                    if filename:
                        filename = self._decode_header_value(filename)
                        content_type = part.get_content_type()
                        size = len(part.get_payload(decode=True) or b'')
                        attachments.append({
                            'filename': filename,
                            'content_type': content_type,
                            'size': size,
                            'payload': part.get_payload(decode=True)
                        })
        return attachments

    def _parse_email(self, msg) -> Dict:
        message_id = msg.get('Message-ID', '')
        subject = self._decode_header_value(msg.get('Subject', ''))
        from_header = msg.get('From', '')
        to_header = msg.get('To', '')
        cc_header = msg.get('Cc', '')
        date_header = msg.get('Date', '')
        in_reply_to = msg.get('In-Reply-To', '')
        references = msg.get('References', '')

        from_name, from_email = parseaddr(from_header)
        from_name = self._decode_header_value(from_name)

        received_at = None
        if date_header:
            try:
                received_at = parsedate_to_datetime(date_header)
            except Exception:
                pass

        plain_body, html_body = self._get_email_body(msg)
        attachments = self._get_attachments(msg)

        to_addresses = []
        if to_header:
            for addr in to_header.split(','):
                _, to_email_addr = parseaddr(addr.strip())
                if to_email_addr:
                    to_addresses.append(to_email_addr.lower())

        return {
            'message_id': message_id,
            'subject': subject,
            'from_email': from_email.lower() if from_email else '',
            'from_name': from_name,
            'to_addresses': to_addresses,
            'to_header': to_header,
            'cc_header': cc_header,
            'received_at': received_at,
            'plain_body': plain_body,
            'html_body': html_body,
            'attachments': attachments,
            'in_reply_to': in_reply_to.strip() if in_reply_to else '',
            'references': references.strip() if references else '',
            'raw_message': msg,
        }

    def fetch_unread_emails(self, folder: str = 'INBOX', limit: int = 50) -> List[Dict]:
        if not self.connection:
            if not self.connect():
                return []
        emails = []
        try:
            status, data = self.connection.select(folder)
            if status != 'OK':
                return []

            status, message_ids = self.connection.search(None, 'UNSEEN')
            if status != 'OK':
                return []

            id_list = message_ids[0].split()
            id_list = id_list[:limit] if len(id_list) > limit else id_list

            for msg_id in id_list:
                try:
                    status, msg_data = self.connection.fetch(msg_id, '(RFC822)')
                    if status != 'OK':
                        continue
                    raw_email = msg_data[0][1]
                    msg = email.message_from_bytes(raw_email)
                    parsed = self._parse_email(msg)
                    parsed['uid'] = msg_id.decode() if isinstance(msg_id, bytes) else msg_id
                    emails.append(parsed)
                except Exception as e:
                    logger.error(f"Error fetching email {msg_id}: {e}")
            return emails
        except Exception as e:
            logger.error(f"Error fetching emails: {e}")
            return []

    def fetch_all_emails(self, folder: str = 'INBOX', limit: int = 50) -> List[Dict]:
        if not self.connection:
            if not self.connect():
                return []
        emails = []
        try:
            status, data = self.connection.select(folder)
            if status != 'OK':
                return []

            status, message_ids = self.connection.search(None, 'ALL')
            if status != 'OK':
                return []

            id_list = message_ids[0].split()
            id_list = id_list[-limit:] if len(id_list) > limit else id_list
            id_list = list(reversed(id_list))

            for msg_id in id_list:
                try:
                    status, msg_data = self.connection.fetch(msg_id, '(RFC822)')
                    if status != 'OK':
                        continue
                    raw_email = msg_data[0][1]
                    msg = email.message_from_bytes(raw_email)
                    parsed = self._parse_email(msg)
                    parsed['uid'] = msg_id.decode() if isinstance(msg_id, bytes) else msg_id
                    emails.append(parsed)
                except Exception as e:
                    logger.error(f"Error fetching email {msg_id}: {e}")
            return emails
        except Exception as e:
            logger.error(f"Error fetching emails: {e}")
            return []

    def mark_as_seen(self, uid: str, folder: str = None):
        if self.connection:
            try:
                if folder:
                    self.connection.select(folder)
                self.connection.store(uid.encode() if isinstance(uid, str) else uid, '+FLAGS', '\\Seen')
            except Exception as e:
                logger.error(f"Error marking email as seen: {e}")

    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.disconnect()
        return False


def normalize_subject(subject: str) -> str:
    """Normalize email subject for threading by removing Re:, Fwd:, etc."""
    normalized = re.sub(r'^(re|fwd|fw|aw|sv|vs|antw):\s*', '', subject.lower().strip(), flags=re.IGNORECASE)
    normalized = re.sub(r'\s+', ' ', normalized)
    return normalized.strip()


def group_emails_into_threads(emails: List[Dict]) -> List[Dict]:
    """
    Group emails into conversation threads based on:
    1. In-Reply-To / References headers
    2. Normalized subject line
    """
    if not emails:
        return []

    email_by_id = {}
    for email_data in emails:
        msg_id = email_data.get('message_id', '').strip()
        if msg_id:
            email_by_id[msg_id] = email_data

    threads = {}
    email_to_thread = {}

    sorted_emails = sorted(
        emails,
        key=lambda e: e.get('received_at') or e.get('date') or ''
    )

    for email_data in sorted_emails:
        msg_id = email_data.get('message_id', '').strip()
        in_reply_to = email_data.get('in_reply_to', '').strip()
        references = email_data.get('references', '').split()
        subject = email_data.get('subject', '')
        normalized_subj = normalize_subject(subject)

        thread_id = None

        if in_reply_to and in_reply_to in email_to_thread:
            thread_id = email_to_thread[in_reply_to]

        if not thread_id:
            for ref in references:
                ref = ref.strip()
                if ref in email_to_thread:
                    thread_id = email_to_thread[ref]
                    break

        if not thread_id and normalized_subj in threads:
            thread_id = normalized_subj

        if not thread_id:
            thread_id = normalized_subj or msg_id or f"thread_{len(threads)}"
            threads[thread_id] = {
                'thread_id': thread_id,
                'subject': subject,
                'emails': [],
                'from_email': email_data.get('from_email', ''),
                'from_name': email_data.get('from_name', ''),
            }

        threads[thread_id]['emails'].append(email_data)
        if msg_id:
            email_to_thread[msg_id] = thread_id

    result = []
    for thread_id, thread in threads.items():
        thread['emails'] = sorted(
            thread['emails'],
            key=lambda e: e.get('received_at') or ''
        )
        thread['email_count'] = len(thread['emails'])
        if thread['emails']:
            first_email = thread['emails'][0]
            thread['subject'] = first_email.get('subject', '')
            thread['from_email'] = first_email.get('from_email', '')
            thread['from_name'] = first_email.get('from_name', '')
            thread['started_at'] = first_email.get('received_at')
            if len(thread['emails']) > 1:
                thread['last_reply_at'] = thread['emails'][-1].get('received_at')
        result.append(thread)

    result = sorted(
        result,
        key=lambda t: t.get('last_reply_at') or t.get('started_at') or '',
        reverse=True
    )
    return result


def group_outlook_emails_into_threads(emails: List[Dict]) -> List[Dict]:
    """
    Group Outlook emails into conversation threads using Microsoft's conversationId.
    """
    if not emails:
        return []

    threads = {}

    for email_data in emails:
        conversation_id = email_data.get('conversation_id', '')
        subject = email_data.get('subject', '')

        if not conversation_id:
            conversation_id = normalize_subject(subject) or email_data.get('message_id', '')

        if conversation_id not in threads:
            threads[conversation_id] = {
                'thread_id': conversation_id,
                'subject': subject,
                'emails': [],
                'from_email': email_data.get('from_email', ''),
                'from_name': email_data.get('from_name', ''),
            }

        threads[conversation_id]['emails'].append(email_data)

    result = []
    for conversation_id, thread in threads.items():
        thread['emails'] = sorted(
            thread['emails'],
            key=lambda e: e.get('received_at') or ''
        )
        thread['email_count'] = len(thread['emails'])
        if thread['emails']:
            first_email = thread['emails'][0]
            thread['subject'] = first_email.get('subject', '')
            thread['from_email'] = first_email.get('from_email', '')
            thread['from_name'] = first_email.get('from_name', '')
            thread['started_at'] = first_email.get('received_at')
            if len(thread['emails']) > 1:
                thread['last_reply_at'] = thread['emails'][-1].get('received_at')
        result.append(thread)

    result = sorted(
        result,
        key=lambda t: t.get('last_reply_at') or t.get('started_at') or '',
        reverse=True
    )
    return result
