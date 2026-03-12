"""
Default email templates for initial seeding.
Templates use plain text body that will be wrapped in the base HTML template.
"""

DEFAULT_EMAIL_TEMPLATES = [
    # =============================================================================
    # Ticket Templates
    # =============================================================================
    {
        'name': 'Ticket Created',
        'template_type': 'ticket_created',
        'subject': 'New Ticket Created #{{ticket_number}}',
        'body_text': '''Hi {{customer_name}},

Your support ticket has been created successfully.

Ticket Number: #{{ticket_number}}
Subject: {{ticket_subject}}
Priority: {{ticket_priority}}
Status: {{ticket_status}}

We will respond to your ticket as soon as possible.

Thank you,
{{company_name}} Support Team''',
        'status': 'active',
        'available_variables': {
            'customer_name': 'Customer name',
            'ticket_number': 'Ticket number',
            'ticket_subject': 'Ticket subject',
            'ticket_priority': 'Ticket priority',
            'ticket_status': 'Ticket status',
            'company_name': 'Company name',
        }
    },
    {
        'name': 'Ticket Assigned',
        'template_type': 'ticket_assigned',
        'subject': 'Ticket #{{ticket_number}} Assigned to You',
        'body_text': '''Hi {{agent_name}},

A new ticket has been assigned to you.

Ticket Number: #{{ticket_number}}
Subject: {{ticket_subject}}
Priority: {{ticket_priority}}
Customer: {{customer_name}}



{{company_name}} Support System''',
        'status': 'active',
        'available_variables': {
            'agent_name': 'Agent name',
            'ticket_number': 'Ticket number',
            'ticket_subject': 'Ticket subject',
            'ticket_priority': 'Ticket priority',
            'customer_name': 'Customer name',
            'ticket_url': 'Ticket URL',
            'company_name': 'Company name',
        }
    },
    {
        'name': 'Ticket Resolved',
        'template_type': 'ticket_resolved',
        'subject': 'Ticket #{{ticket_number}} Has Been Resolved',
        'body_text': '''Hi {{customer_name}},

Great news! Your support ticket has been resolved.

Ticket Number: #{{ticket_number}}
Subject: {{ticket_subject}}

If you have any further questions or if the issue persists, please reopen the ticket or create a new one.

Thank you,
{{company_name}} Support Team''',
        'status': 'active',
        'available_variables': {
            'customer_name': 'Customer name',
            'ticket_number': 'Ticket number',
            'ticket_subject': 'Ticket subject',
            'agent_name': 'Agent name',
            'company_name': 'Company name',
        }
    },
    {
        'name': 'New Activity on Ticket',
        'template_type': 'new_activity_notice',
        'subject': 'New Activity on Ticket #{{ticket_number}}',
        'body_text': '''Hi {{customer_name}},

There has been new activity on your ticket.

Ticket Number: #{{ticket_number}}
Subject: {{ticket_subject}}
Activity: {{activity_type}}
By: {{updated_by}}



{{company_name}} Support Team''',
        'status': 'active',
        'available_variables': {
            'customer_name': 'Customer name',
            'ticket_number': 'Ticket number',
            'ticket_subject': 'Ticket subject',
            'activity_type': 'Type of activity',
            'updated_by': 'Person who made the update',
            'ticket_url': 'Ticket URL',
            'company_name': 'Company name',
        }
    },
    {
        'name': 'Message Received Auto-Response',
        'template_type': 'new_message_auto_response',
        'subject': 'Re: Your Message Regarding Ticket #{{ticket_number}}',
        'body_text': '''Hi {{customer_name}},

Thank you for your message. We have received your update on ticket #{{ticket_number}}.

Ticket Number: #{{ticket_number}}
Subject: {{ticket_subject}}

Our team will review your message and respond as soon as possible.

{{company_name}} Support Team''',
        'status': 'active',
        'available_variables': {
            'customer_name': 'Customer name',
            'ticket_number': 'Ticket number',
            'ticket_subject': 'Ticket subject',
            'company_name': 'Company name',
        }
    },
    {
        'name': 'New Ticket Notice (Agent)',
        'template_type': 'new_ticket_notice',
        'subject': 'New Ticket Created: #{{ticket_number}} - {{ticket_subject}}',
        'body_text': '''Hi Team,

A new ticket has been created in the system.

Ticket Number: #{{ticket_number}}
Subject: {{ticket_subject}}
Customer: {{customer_name}}
Priority: {{ticket_priority}}
Status: {{ticket_status}}



{{company_name}} Support System''',
        'status': 'active',
        'available_variables': {
            'ticket_number': 'Ticket number',
            'ticket_subject': 'Ticket subject',
            'customer_name': 'Customer name',
            'ticket_priority': 'Ticket priority',
            'ticket_status': 'Ticket status',
            'ticket_url': 'Ticket URL',
            'company_name': 'Company name',
        }
    },
    {
        'name': 'Agent Response Reply',
        'template_type': 'response_reply_template',
        'subject': 'Re: Ticket #{{ticket_number}} - {{ticket_subject}}',
        'body_text': '''Hi {{customer_name}},

{{agent_name}} has responded to your ticket.

Ticket Number: #{{ticket_number}}
Subject: {{ticket_subject}}

Response:
{{response_message}}



{{company_name}} Support Team''',
        'status': 'active',
        'available_variables': {
            'customer_name': 'Customer name',
            'agent_name': 'Agent name',
            'ticket_number': 'Ticket number',
            'ticket_subject': 'Ticket subject',
            'response_message': 'Response message content',
            'ticket_url': 'Ticket URL',
            'company_name': 'Company name',
        }
    },
    {
        'name': 'Internal Activity Alert',
        'template_type': 'internal_activity_alert',
        'subject': 'Internal Activity on Ticket #{{ticket_number}}',
        'body_text': '''Hi {{agent_name}},

An internal note or activity has been added to a ticket.

Ticket Number: #{{ticket_number}}
Subject: {{ticket_subject}}
Added By: {{added_by}}

Note:
{{internal_note}}



{{company_name}} Support System''',
        'status': 'active',
        'available_variables': {
            'agent_name': 'Agent name',
            'ticket_number': 'Ticket number',
            'ticket_subject': 'Ticket subject',
            'added_by': 'Person who added the note',
            'internal_note': 'Internal note content',
            'ticket_url': 'Ticket URL',
            'company_name': 'Company name',
        }
    },
    {
        'name': 'New Message Alert (Agent)',
        'template_type': 'new_message_alert',
        'subject': 'New Message on Ticket #{{ticket_number}}: {{ticket_subject}}',
        'body_text': '''Hi {{agent_name}},

{{customer_name}} has sent a new message on a ticket.

Ticket Number: #{{ticket_number}}
Subject: {{ticket_subject}}
Customer: {{customer_name}}

Message:
{{message_content}}



{{company_name}} Support System''',
        'status': 'active',
        'available_variables': {
            'agent_name': 'Agent name',
            'customer_name': 'Customer name',
            'ticket_number': 'Ticket number',
            'ticket_subject': 'Ticket subject',
            'message_content': 'Message content',
            'ticket_url': 'Ticket URL',
            'company_name': 'Company name',
        }
    },
    {
        'name': 'Ticket Transfer Alert',
        'template_type': 'ticket_transfer_alert',
        'subject': 'Ticket #{{ticket_number}} Transferred to You',
        'body_text': '''Hi {{agent_name}},

A ticket has been transferred to you.

Ticket Number: #{{ticket_number}}
Subject: {{ticket_subject}}
Priority: {{ticket_priority}}
Customer: {{customer_name}}
Transferred From: {{transferred_from}}



{{company_name}} Support System''',
        'status': 'active',
        'available_variables': {
            'agent_name': 'Agent name',
            'ticket_number': 'Ticket number',
            'ticket_subject': 'Ticket subject',
            'ticket_priority': 'Ticket priority',
            'customer_name': 'Customer name',
            'transferred_from': 'Previous assignee',
            'ticket_url': 'Ticket URL',
            'company_name': 'Company name',
        }
    },
    {
        'name': 'Ticket Assigned to Group',
        'template_type': 'ticket_group_assigned',
        'subject': 'New Ticket Assigned to Your Group: #{{ticket_number}}',
        'body_text': '''Hi {{agent_name}},

A new ticket has been assigned to your group.

Ticket Number: #{{ticket_number}}
Subject: {{ticket_subject}}
Priority: {{ticket_priority}}
Customer: {{customer_name}}
Group: {{group_name}}



{{company_name}} Support System''',
        'status': 'active',
        'available_variables': {
            'agent_name': 'Agent name',
            'ticket_number': 'Ticket number',
            'ticket_subject': 'Ticket subject',
            'ticket_priority': 'Ticket priority',
            'customer_name': 'Customer name',
            'group_name': 'Assignment group name',
            'ticket_url': 'Ticket URL',
            'company_name': 'Company name',
        }
    },
    # =============================================================================
    # SLA Templates
    # =============================================================================
    {
        'name': 'SLA Breach Warning',
        'template_type': 'sla_breach_warning',
        'subject': 'SLA Breach Warning - Ticket #{{ticket_number}}',
        'body_text': '''Hi {{agent_name}},

A ticket is approaching SLA breach!

Ticket Number: #{{ticket_number}}
Subject: {{ticket_subject}}
Priority: {{ticket_priority}}
Time Remaining: {{time_remaining}}


{{company_name}} Support System''',
        'status': 'active',
        'available_variables': {
            'agent_name': 'Agent name',
            'ticket_number': 'Ticket number',
            'ticket_subject': 'Ticket subject',
            'ticket_priority': 'Ticket priority',
            'time_remaining': 'Time remaining before breach',
            'ticket_url': 'Ticket URL',
            'company_name': 'Company name',
        }
    },
    {
        'name': 'SLA Breached',
        'template_type': 'sla_breached',
        'subject': 'SLA Breached - Ticket #{{ticket_number}}',
        'body_text': '''Hi {{agent_name}},

A ticket has breached its SLA!

Ticket Number: #{{ticket_number}}
Subject: {{ticket_subject}}
Priority: {{ticket_priority}}
SLA Policy: {{policy_name}}
Overdue: {{overdue_time}}

Please take immediate action to resolve this ticket.



{{company_name}} Support System''',
        'status': 'active',
        'available_variables': {
            'agent_name': 'Agent name',
            'ticket_number': 'Ticket number',
            'ticket_subject': 'Ticket subject',
            'ticket_priority': 'Ticket priority',
            'policy_name': 'SLA policy name',
            'overdue_time': 'How long overdue',
            'ticket_url': 'Ticket URL',
            'company_name': 'Company name',
        }
    },
    {
        'name': 'SLA Escalation Alert',
        'template_type': 'sla_escalation_alert',
        'subject': 'SLA Escalation - Ticket #{{ticket_number}} Requires Attention',
        'body_text': '''Hi {{escalation_contact}},

A ticket has been escalated due to SLA breach.

Ticket Number: #{{ticket_number}}
Subject: {{ticket_subject}}
Priority: {{ticket_priority}}
SLA Policy: {{policy_name}}
Breach Type: {{breach_type}}
Overdue: {{overdue_time}}

This ticket requires immediate attention.



{{company_name}} Support System''',
        'status': 'active',
        'available_variables': {
            'escalation_contact': 'Escalation contact name',
            'ticket_number': 'Ticket number',
            'ticket_subject': 'Ticket subject',
            'ticket_priority': 'Ticket priority',
            'policy_name': 'SLA policy name',
            'breach_type': 'Type of SLA breach',
            'overdue_time': 'Time overdue',
            'ticket_url': 'Ticket URL',
            'company_name': 'Company name',
        }
    },
]
