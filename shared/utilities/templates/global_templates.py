from .email_base import (
    MONO_STACK,
    PRIMARY_COLOR,
    button,
    code_box,
    details,
    global_base,
    greeting,
    link_fallback,
    note,
    paragraph,
)


class GlobalEmailTemplates:
    """System e-mails: password reset, team invitations and 2FA codes."""

    FORGOT_PASSWORD = {
        'template_type': 'forgot_password',
        'subject': 'Reset Your Imaradesk Password',
        'body_html': global_base(
            "Reset your password",
            greeting("Hi {{user_name}},")
            + paragraph("We got a request to reset the password for your Imaradesk account. "
                        "If that was you, use the button below to choose a new one. The link works for 24 hours.")
            + button("{{reset_url}}", "Reset password")
            + link_fallback("{{reset_url}}")
            + paragraph("If you didn't ask for this, you can ignore this email and your password won't change. "
                        "If you think someone else is trying to get into your account, contact support right away.")
            + note("Never share this link or your password with anyone. "
                   "We will never ask for your password by email.", tone="warning"),
            preheader="Use this link within 24 hours to choose a new password.",
        ),
        'body_text': '''Hi {{user_name}},

We received a request to reset your password for your Imaradesk account. If you didn't make this request, you can safely ignore this email.

Reset Your Password
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Click the link below to reset your password. This link will expire in 24 hours.

{{reset_url}}

SECURITY TIP: Never share your password or reset link with anyone. Imaradesk will never ask for your password via email.

If you didn't request this password reset, please contact our support team immediately.

Best regards,
The Imaradesk Team

  Imaradesk. All rights reserved.
        ''',
    }

    TEAM_INVITATION = {
        'template_type': 'team_invitation',
        'subject': '{{inviter_name}} invited you to join {{workspace_name}} on Imaradesk',
        'body_html': global_base(
            "You're invited to join {{workspace_name}}",
            greeting("Hi there,")
            + paragraph("<strong>{{inviter_name}}</strong> has invited you to join the "
                        "<strong>{{workspace_name}}</strong> helpdesk on Imaradesk as <strong>{{role_name}}</strong>.")
            + paragraph("Accept with the button below. If you already have an account, you'll be asked to sign in. "
                        "If not, setting one up takes about a minute. The invitation expires in {{expiry_days}} days.")
            + button("{{invite_url}}", "Accept invitation")
            + link_fallback("{{invite_url}}")
            + paragraph("We sent this invitation to {{invite_email}}. If you weren't expecting it, "
                        "you can ignore this email.", muted=True, small=True),
            preheader="{{inviter_name}} added you to {{workspace_name}} as {{role_name}}.",
        ),
        'body_text': '''Hi there,

{{inviter_name}} has invited you to join the {{workspace_name}} helpdesk as {{role_name}}.

Accept Your Invitation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Open the link below to accept. If you already have an account you'll be asked to sign in, otherwise you can set one up in under a minute. This invitation expires in {{expiry_days}} days.

{{invite_url}}

This invitation was sent to {{invite_email}}. If you weren't expecting it, you can safely ignore this email.

Best regards,
The Imaradesk Team

  Imaradesk. All rights reserved.
        ''',
    }

    TWO_FA_ENABLE_CODE = {
        'template_type': '2fa_enable_code',
        'subject': 'Your Verification Code - Enable Two-Factor Authentication',
        'body_html': global_base(
            "Your verification code",
            greeting("Hi {{user_name}},")
            + paragraph("Here's the code to finish turning on two-factor authentication for your account.")
            + code_box("{{code}}", caption="Expires in 10 minutes")
            + paragraph("Once it's on, we'll ask for a code like this when you sign in, "
                        "so a stolen password on its own isn't enough to get into your account.")
            + paragraph("If you didn't ask for this code, you can ignore this email. "
                        "If you're worried about your account's security, contact support."),
            preheader="Use this code to turn on two-factor authentication. It expires in 10 minutes.",
        ),
        'body_text': '''Hi {{user_name}},

You requested to enable two-factor authentication on your account. Use the code below to complete the setup.

Your Verification Code
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{{code}}

This code expires in 10 minutes.

SECURITY BENEFITS: Two-factor authentication adds an extra layer of security to your account, protecting you from unauthorized access.

If you didn't request this code, please ignore this email or contact support if you're concerned about your account security.

Best regards,
The Imaradesk Team

  Imaradesk. All rights reserved.
        ''',
    }

    TWO_FA_DISABLE_CODE = {
        'template_type': '2fa_disable_code',
        'subject': 'Confirm: Disable Two-Factor Authentication',
        'body_html': global_base(
            "Confirm turning off two-factor authentication",
            greeting("Hi {{user_name}},")
            + paragraph("We got a request to turn off two-factor authentication on your account. "
                        "If that was you, enter this code to confirm.")
            + code_box("{{code}}", caption="Expires in 10 minutes")
            + note("Turning off two-factor authentication makes your account less secure. "
                   "Only go ahead if you're sure.", tone="warning")
            + paragraph("<strong>Didn't ask for this?</strong> Someone may have access to your account. "
                        "Change your password now and contact support."),
            preheader="Only use this code if you asked to turn off two-factor authentication.",
        ),
        'body_text': '''Hi {{user_name}},

We received a request to DISABLE two-factor authentication on your account. If you made this request, use the code below to confirm.

Your Confirmation Code
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{{code}}

This code expires in 10 minutes.

WARNING: Disabling 2FA will make your account less secure. Only proceed if you're sure.

DIDN'T REQUEST THIS? If you didn't make this request, your account may be compromised. Please change your password immediately and contact support.

Best regards,
The Imaradesk Team

  Imaradesk. All rights reserved.
        ''',
    }

    TWO_FA_LOGIN_CODE = {
        'template_type': '2fa_login_code',
        'subject': 'Your Login Verification Code - Imaradesk',
        'body_html': global_base(
            "Your sign-in code",
            greeting("Hi {{user_name}},")
            + paragraph("Someone is signing in to your account and we need to check it's you. "
                        "Enter this code to finish signing in.")
            + code_box("{{code}}", caption="Expires in 10 minutes")
            + details([
                ("Time", "{{login_time}}"),
                ("Device", "{{device_info}}"),
            ], title="Sign-in attempt")
            + note("If this wasn't you, someone may be trying to get into your account. "
                   "Don't share this code, and consider changing your password.", tone="warning"),
            preheader="Enter this code to finish signing in. It expires in 10 minutes.",
        ),
        'body_text': '''Hi {{user_name}},

A sign-in attempt requires verification. Use the code below to complete your login.

Your Login Code
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{{code}}

This code expires in 10 minutes.

Login attempt details:
Time: {{login_time}}
Device: {{device_info}}

SECURITY TIP: If you didn't attempt to sign in, someone may be trying to access your account. Consider changing your password.

Best regards,
The Imaradesk Team

  Imaradesk. All rights reserved.
        ''',
    }
