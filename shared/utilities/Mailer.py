from django.core.mail import get_connection, EmailMultiAlternatives
from django.conf import settings
from django.utils.html import strip_tags
import logging
import re
from typing import Dict, Optional, Tuple, List

logger = logging.getLogger(__name__)

class Mailer:

    def get_smtp_connection(self):
        """
            Returns a tuple: (
                SMTP connection,
                from_email string
                )
            Uses Django default EMAIL_* settings and DEFAULT_FROM_NAME.
        """
        # Use default Django settings
        try:
            connection = get_connection(
                host=settings.EMAIL_HOST,
                port=settings.EMAIL_PORT,
                username=settings.EMAIL_HOST_USER,
                password=settings.EMAIL_HOST_PASSWORD,
                use_tls=getattr(settings, 'EMAIL_USE_TLS', False),
                use_ssl=getattr(settings, 'EMAIL_USE_SSL', True),
            )
            default_name = getattr(settings, 'DEFAULT_FROM_NAME', None)
            default_email = settings.DEFAULT_FROM_EMAIL
            from_email = f"{default_name} <{default_email}>" if default_name else default_email
            return connection, from_email
        except Exception as e:
            logger.error(f"[Mailer] Failed to load SMTP config: {e}")
            return get_connection(), settings.DEFAULT_FROM_EMAIL
    
    def get_template(self, template_type: str):
        """
        Get email template from database by type.
        
        Args:
            template_type: Template type (e.g., 'ticket_created', 'NEW_ACTIVITY_NOTICE')
        
        Returns:
            EmailTemplate instance or None if not found
        """
        try:
            from modules.settings.models import EmailTemplate
            # Try lowercase first (database format)
            return EmailTemplate.objects.get(
                template_type=template_type.lower(),
                status='active'
            )
        except Exception as e:
            logger.warning(f"[Mailer] Template '{template_type}' not found or error: {e}")
            return None
    
    def validate_template(self, template, context: Dict) -> Tuple[bool, List[str]]:
        """
        Validate template has all required variables.
        
        Args:
            template: EmailTemplate instance
            context: Dictionary of variables to replace
        
        Returns:
            Tuple of (is_valid, list_of_missing_variables)
        """
        if not template:
            return False, ["Template is None"]
        
        # Extract all placeholders from subject and body
        placeholders = set()
        for text in [template.subject, template.body_html, template.body_text]:
            if text:
                placeholders.update(re.findall(r'{{\s*([^}]+)\s*}}', text))
        
        # Check which placeholders are missing from context
        missing = [p for p in placeholders if p not in context]
        
        return len(missing) == 0, missing
    
    def sanitize_context(self, context: Dict) -> Dict:
        """
        Sanitize context variables to prevent injection attacks.
        
        Args:
            context: Dictionary of variables
        
        Returns:
            Sanitized context dictionary
        """
        sanitized = {}
        for key, value in context.items():
            if value is None:
                sanitized[key] = ''
            elif isinstance(value, (str, int, float, bool)):
                sanitized[key] = str(value)
            else:
                # For complex objects, convert to string safely
                sanitized[key] = str(value)
        
        return sanitized
    
    def replace_tokens(self, text: str, context: Dict) -> str:
        """
        Replace {{tokens}} in text with context values.
        
        Args:
            text: Text containing {{variable}} placeholders
            context: Dictionary of variables
        
        Returns:
            Text with placeholders replaced
        """
        if not text:
            return ''
        
        def replacer(match):
            var_name = match.group(1).strip()
            return str(context.get(var_name, match.group(0)))
        
        return re.sub(r'{{\s*([^}]+)\s*}}', replacer, text)
    
    def render_template(self, template, context: Dict) -> Tuple[str, str, str]:
        """
        Render template with context variables.
        
        Args:
            template: EmailTemplate instance
            context: Dictionary of variables to replace
        
        Returns:
            Tuple of (subject, html_body, text_body)
        """
        # Sanitize context first
        safe_context = self.sanitize_context(context)
        
        # Render using template's built-in method
        subject, html_body, text_body = template.render(safe_context)
        
        # If no text body, strip HTML to create one
        if not text_body and html_body:
            text_body = strip_tags(html_body)
        
        return subject, html_body, text_body
    
    def send_email(
        self,
        template_type: Optional[str] = None,
        template_id: Optional[int] = None,
        to_emails: Optional[List[str]] = None,
        to_email: Optional[str] = None,
        context: Dict = None,
        cc_emails: Optional[List[str]] = None,
        bcc_emails: Optional[List[str]] = None,
        attachments: Optional[List[Tuple[str, bytes, str]]] = None,
        subject_prefix: str = '',
        fail_silently: bool = True
    ) -> bool:
        """
        Send email using template from database.
        
        Args:
            template_type: Template type (e.g., 'ticket_created', 'NEW_ACTIVITY_NOTICE')
            template_id: Template ID (alternative to template_type)
            to_emails: List of recipient email addresses
            to_email: Single recipient email address (alternative to to_emails)
            context: Dictionary of variables to replace in template
            cc_emails: Optional list of CC recipients
            bcc_emails: Optional list of BCC recipients
            attachments: Optional list of (filename, content, mimetype) tuples
            subject_prefix: Optional prefix to add to subject (e.g., '[TEST] ')
            fail_silently: If True, don't raise exceptions on send failure
        
        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            # Handle to_email vs to_emails
            if to_email and not to_emails:
                to_emails = [to_email]
            elif not to_emails:
                logger.error("[Mailer] No recipient email address provided")
                return False
            
            # Get template by ID or type
            template = None
            if template_id:
                try:
                    from modules.settings.models import EmailTemplate
                    template = EmailTemplate.objects.get(id=template_id, status='active')
                except Exception:
                    logger.error(f"[Mailer] Template with ID '{template_id}' not found or not active")
                    return False
            elif template_type:
                template = self.get_template(template_type)
            else:
                logger.error("[Mailer] No template_type or template_id provided")
                return False
            
            if not template:
                logger.error(f"[Mailer] Template not found")
                return False
            
            # Ensure context is provided
            if context is None:
                context = {}
            
            # Validate template has all required variables
            is_valid, missing_vars = self.validate_template(template, context)
            if not is_valid:
                logger.warning(
                    f"[Mailer] Template '{template.template_type}' missing variables: {missing_vars}. "
                    "Placeholders will remain unreplaced."
                )
            
            # Render template
            subject, html_body, text_body = self.render_template(template, context)
            
            # Add subject prefix if provided
            if subject_prefix:
                subject = f"{subject_prefix}{subject}"
            
            # Get SMTP connection
            connection, from_email = self.get_smtp_connection()
            
            # Create email message
            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_body,
                from_email=from_email,
                to=to_emails,
                cc=cc_emails,
                bcc=bcc_emails,
                connection=connection
            )
            
            # Attach HTML version
            if html_body:
                msg.attach_alternative(html_body, "text/html")
            
            # Add attachments if provided
            if attachments:
                for filename, content, mimetype in attachments:
                    msg.attach(filename, content, mimetype)
            
            # Send email
            msg.send(fail_silently=fail_silently)
            
            logger.info(
                f"[Mailer] Email sent successfully: "
                f"template='{template.template_type}', to={to_emails}, subject='{subject}'"
            )
            return True
            
        except Exception as e:
            logger.error(f"[Mailer] Failed to send email: {e}")
            if not fail_silently:
                raise
            return False
    
    def send_ticket_email(
        self,
        template_type: str,
        ticket,
        to_user=None,
        additional_context: Optional[Dict] = None,
        **kwargs
    ) -> bool:
        """
        Send ticket-related email with automatic context building.
        
        Args:
            template_type: Template type
            ticket: Ticket instance
            to_user: User instance to send email to (uses ticket.requester if None)
            additional_context: Additional context variables
            **kwargs: Additional arguments passed to send_email
        
        Returns:
            True if sent successfully
        """
        from django.urls import reverse
        from django.contrib.sites.models import Site
        
        # Determine recipient - can be a user or guest
        if to_user:
            recipient_email = to_user.email
            customer_name = to_user.get_full_name() or to_user.username
        else:
            # Use ticket.caller property which handles both requester and guest
            caller = ticket.caller
            recipient_email = caller['email']
            customer_name = caller['name']
        
        if not recipient_email:
            logger.warning(f"[Mailer] No recipient email for ticket {ticket.ticket_number}")
            return False
        
        # Build ticket context
        context = {
            'ticket_number': ticket.ticket_number,
            'ticket_subject': ticket.title,
            'ticket_priority': ticket.get_priority_display(),
            'ticket_status': ticket.get_status_display(),
            'customer_name': customer_name,
            'agent_name': ticket.assignee.get_full_name() if ticket.assignee else 'Support Team',
            'ticket_url': self._build_absolute_url(f'/tickets/{ticket.id}/'),
            'company_name': getattr(settings, 'COMPANY_NAME', 'Support Team'),
        }
        
        # Add additional context
        if additional_context:
            context.update(additional_context)
        
        return self.send_email(
            template_type=template_type,
            to_emails=[recipient_email],
            context=context,
            **kwargs
        )
    
    def send_task_email(
        self,
        template_type: str,
        task,
        to_user,
        additional_context: Optional[Dict] = None,
        **kwargs
    ) -> bool:
        """
        Send task-related email with automatic context building.
        
        Args:
            template_type: Template type
            task: Task instance
            to_user: User instance to send email to
            additional_context: Additional context variables
            **kwargs: Additional arguments passed to send_email
        
        Returns:
            True if sent successfully
        """
        if not to_user or not to_user.email:
            logger.warning(f"[Mailer] No recipient email for task {task.id}")
            return False
        
        # Build task context
        context = {
            'task_number': getattr(task, 'task_number', task.id),
            'task_title': getattr(task, 'title', task.name) if hasattr(task, 'title') else task.name,
            'task_priority': task.get_priority_display() if hasattr(task, 'get_priority_display') else 'Normal',
            'task_status': task.get_status_display() if hasattr(task, 'get_status_display') else task.status,
            'user_name': to_user.get_full_name(),
            'agent_name': to_user.get_full_name(),
            'task_url': self._build_absolute_url(f'/tasks/{task.id}/'),
            'company_name': getattr(settings, 'COMPANY_NAME', 'Support Team'),
        }
        
        # Add additional context
        if additional_context:
            context.update(additional_context)
        
        return self.send_email(
            template_type=template_type,
            to_emails=[to_user.email],
            context=context,
            **kwargs
        )
    
    def _build_absolute_url(self, path: str) -> str:
        """
        Build absolute URL from relative path.
        
        Args:
            path: Relative URL path
        
        Returns:
            Absolute URL
        """
        try:
            from django.contrib.sites.models import Site
            site = Site.objects.get_current()
            protocol = 'https' if getattr(settings, 'USE_HTTPS', True) else 'http'
            return f"{protocol}://{site.domain}{path}"
        except Exception:
            # Fallback
            base_url = getattr(settings, 'BASE_URL', 'http://localhost:8000')
            return f"{base_url}{path}"
    
    def send_raw_email(
        self,
        to_emails: Optional[List[str]] = None,
        to_email: Optional[str] = None,
        subject: str = '',
        body_html: str = '',
        body_text: str = '',
        context: Dict = None,
        cc_emails: Optional[List[str]] = None,
        bcc_emails: Optional[List[str]] = None,
        attachments: Optional[List[Tuple[str, bytes, str]]] = None,
        fail_silently: bool = True
    ) -> bool:
        """
        Send email with raw HTML/text content (for global templates).
        
        Args:
            to_emails: List of recipient email addresses
            to_email: Single recipient email address (alternative to to_emails)
            subject: Email subject line
            body_html: HTML body content with {{variable}} placeholders
            body_text: Plain text body content with {{variable}} placeholders
            context: Dictionary of variables to replace in subject and body
            cc_emails: Optional list of CC recipients
            bcc_emails: Optional list of BCC recipients
            attachments: Optional list of (filename, content, mimetype) tuples
            fail_silently: If True, don't raise exceptions on send failure
        
        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            logger.info(f"[Mailer] Starting send_raw_email to {to_email or to_emails}")
            
            # Handle to_email vs to_emails
            if to_email and not to_emails:
                to_emails = [to_email]
            elif not to_emails:
                logger.error("[Mailer] No recipient email address provided")
                return False
            
            if not subject:
                logger.error("[Mailer] No subject provided")
                return False
            
            if not body_html and not body_text:
                logger.error("[Mailer] No email body provided")
                return False
            
            # Sanitize and replace context variables
            if context is None:
                context = {}
            
            safe_context = self.sanitize_context(context)
            
            # Replace tokens in subject and body
            rendered_subject = self.replace_tokens(subject, safe_context)
            rendered_html = self.replace_tokens(body_html, safe_context) if body_html else ''
            rendered_text = self.replace_tokens(body_text, safe_context) if body_text else ''
            
            # If no text body provided, strip HTML to create one
            if not rendered_text and rendered_html:
                rendered_text = strip_tags(rendered_html)
            
            logger.info(f"[Mailer] Rendered email - Subject: {rendered_subject[:50]}...")
            
            # Get SMTP connection
            logger.info("[Mailer] Getting SMTP connection...")
            connection, from_email = self.get_smtp_connection()
            logger.info(f"[Mailer] SMTP connection obtained - From: {from_email}")
            
            # Create email message
            logger.info(f"[Mailer] Creating email message to {to_emails}")
            msg = EmailMultiAlternatives(
                subject=rendered_subject,
                body=rendered_text,
                from_email=from_email,
                to=to_emails,
                cc=cc_emails,
                bcc=bcc_emails,
                connection=connection
            )
            
            # Attach HTML version
            if rendered_html:
                msg.attach_alternative(rendered_html, "text/html")
                logger.info("[Mailer] HTML alternative attached")
            
            # Add attachments if provided
            if attachments:
                for filename, content, mimetype in attachments:
                    msg.attach(filename, content, mimetype)
                logger.info(f"[Mailer] {len(attachments)} attachment(s) added")
            
            # Send email
            logger.info("[Mailer] Sending email...")
            msg.send(fail_silently=fail_silently)
            
            logger.info(
                f"[Mailer] ✓ Email sent successfully: "
                f"to={to_emails}, subject='{rendered_subject}'"
            )
            print(f"[Mailer] ✓ Email sent successfully to {to_emails[0]}: '{rendered_subject}'")
            return True
            
        except Exception as e:
            logger.error(f"[Mailer] ✗ Failed to send email: {e}", exc_info=True)
            print(f"[Mailer] ✗ Failed to send email: {e}")
            if not fail_silently:
                raise
            return False
