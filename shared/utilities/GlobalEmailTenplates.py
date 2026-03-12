class GlobalEmailTemplates:
    """
    Global email templates for system-level emails (not tenant-specific).
    These templates are used for registration, account creation, and password reset.
    """
    
    # Account Creation with Credentials
    ACCOUNT_CREATION = {
        'template_type': 'account_creation',
        'subject': 'Welcome to ImaraDesk - Your Account Credentials',
        'body_html': '''
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; padding: 0;">
        <!-- Header -->
        <div style="padding: 30px 20px; text-align: center; border-bottom: 1px solid #e0e0e0;">
            <img src="https://imaradesk.com/static/assets/imaradesk-logo.png" alt="ImaraDesk" style="height: 40px; margin-bottom: 10px;">
            <h1 style="color: #333; margin: 0; font-size: 28px; font-weight: 600;">Welcome to ImaraDesk</h1>
            <p style="color: #666; margin: 10px 0 0 0; font-size: 16px;">Your workspace is ready!</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px; background-color: #ffffff;">
            <p style="font-size: 16px; margin: 0 0 20px 0;">Hi {{user_name}},</p>
            
            <p style="font-size: 16px; margin: 0 0 20px 0; line-height: 1.8;">
                Great news! Your ImaraDesk workspace <strong>{{workspace_name}}</strong> has been created successfully. 
                You can now access your helpdesk and start managing your support operations.
            </p>
            
            <!-- Credentials Box -->
            <div style="background-color: #f9f9f9; border-left: 4px solid #4a154b; padding: 25px; margin: 30px 0;">
                <h3 style="color: #4a154b; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">Your Login Credentials</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 10px 0; font-weight: 600; color: #555; width: 120px;">Email:</td>
                        <td style="padding: 10px 0; color: #333;">{{user_email}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; font-weight: 600; color: #555;">Username:</td>
                        <td style="padding: 10px 0; color: #333;">{{username}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; font-weight: 600; color: #555;">Password:</td>
                        <td style="padding: 10px 0; color: #4a154b; font-family: 'Courier New', monospace; font-size: 15px; font-weight: 600;">{{password}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; font-weight: 600; color: #555;">Your URL:</td>
                        <td style="padding: 10px 0;"><a href="{{login_url}}" style="color: #4a154b; text-decoration: none;">{{login_url}}</a></td>
                    </tr>
                </table>
            </div>
            
            <!-- Security Notice -->
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px;  margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #856404;">
                    <strong>Security Reminder:</strong> For your security, please change your password after your first login.
                </p>
            </div>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 35px 0;">
                <a href="{{login_url}}" style="background-color: #4a154b; color: white; padding: 15px 40px; text-decoration: none;  display: inline-block; font-weight: 600; font-size: 16px; ">
                    Access Your Workspace
                </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin: 30px 0 0 0; line-height: 1.6;">
                If you have any questions or need assistance, our support team is here to help.
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f5f5f5; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                Best regards,<br>
                <strong style="color: #4a154b;">The ImaraDesk Team</strong>
            </p>
            <p style="margin: 15px 0 0 0; color: #999; font-size: 12px;">
                  ImaraDesk. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
        ''',
        'body_text': '''Hi {{user_name}},

Great news! Your ImaraDesk workspace "{{workspace_name}}" has been created successfully. You can now access your helpdesk and start managing your support operations.

Your Login Credentials:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email:    {{user_email}}
Username: {{username}}
Password: {{password}}
Your URL: {{login_url}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECURITY REMINDER: For your security, please change your password after your first login.

Access Your Workspace: {{login_url}}

If you have any questions or need assistance, our support team is here to help.

Best regards,
The ImaraDesk Team

  ImaraDesk. All rights reserved.
        ''',
    }
    
    # Welcome Email (Marketing)
    WELCOME_BUSINESS = {
        'template_type': 'welcome_business',
        'subject': 'Welcome to ImaraDesk - Let\'s Get Started!',
        'body_html': '''
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; padding: 0;">
        <!-- Header -->
        <div style="padding: 30px 20px; text-align: center; border-bottom: 1px solid #e0e0e0;">
            <img src="https://imaradesk.com/static/assets/imaradesk-logo.png" alt="ImaraDesk" style="height: 40px; margin-bottom: 10px;">
            <h1 style="color: #333; margin: 0; font-size: 32px; font-weight: 700;">Welcome to ImaraDesk!</h1>
            <p style="color: #666; margin: 15px 0 0 0; font-size: 18px;">Your all-in-one helpdesk solution</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px; background-color: #ffffff;">
            <p style="font-size: 16px; margin: 0 0 20px 0;">Hi {{user_name}},</p>
            
            <p style="font-size: 16px; margin: 0 0 25px 0; line-height: 1.8;">
                Welcome aboard! We're thrilled to have <strong>{{workspace_name}}</strong> join the ImaraDesk family. 
                You've taken the first step toward delivering exceptional customer support.
            </p>
            
            <!-- What to Expect Section -->
            <h2 style="color: #4a154b; font-size: 22px; margin: 35px 0 20px 0; font-weight: 600;">What You Can Do with ImaraDesk</h2>
            
            <div style="margin: 20px 0;">
                <!-- Feature 1 -->
                <div style="display: flex; margin-bottom: 20px;">
                    
                    <div>
                        <h3 style="color: #4a154b; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">Ticket Management</h3>
                        <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">
                            Track, prioritize, and resolve customer issues with our powerful ticketing system. Never miss a support request.
                        </p>
                    </div>
                </div>
                
                <!-- Feature 2 -->
                <div style="display: flex; margin-bottom: 20px;">
                    
                    <div>
                        <h3 style="color: #4a154b; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">Knowledge Base</h3>
                        <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">
                            Build a comprehensive help center. Empower customers to find answers and reduce support volume.
                        </p>
                    </div>
                </div>
                
                <!-- Feature 3 -->
                <div style="display: flex; margin-bottom: 20px;">
                    
                    <div>
                        <h3 style="color: #4a154b; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">Team Collaboration</h3>
                        <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">
                            Work together seamlessly with your team. Assign tickets, share notes, and deliver better support.
                        </p>
                    </div>
                </div>
                
                <!-- Feature 4 -->
                <div style="display: flex; margin-bottom: 20px;">
                    
                    <div>
                        <h3 style="color: #4a154b; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">Analytics & Reports</h3>
                        <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">
                            Track performance metrics, SLA compliance, and team productivity with detailed insights.
                        </p>
                    </div>
                </div>
                
                <!-- Feature 5 -->
                <div style="display: flex; margin-bottom: 20px;">
                    
                    <div>
                        <h3 style="color: #4a154b; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">AI-Powered Assistant</h3>
                        <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">
                            Get intelligent suggestions and automate responses with our built-in AI assistant.
                        </p>
                    </div>
                </div>
            </div>
            
            <!-- Quick Start -->
            <div style="background-color: #f9f9f9; border-left: 4px solid #4a154b; padding: 25px; margin: 30px 0;">
                <h3 style="color: #4a154b; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">Quick Start Guide</h3>
                <ol style="margin: 0; padding-left: 20px; color: #666; font-size: 14px; line-height: 2;">
                    <li>Invite your team members to collaborate</li>
                    <li>Set up your first support groups</li>
                    <li>Create knowledge base articles</li>
                    <li>Configure your email notifications</li>
                    <li>Start receiving and managing tickets!</li>
                </ol>
            </div>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 40px 0;">
                <a href="{{login_url}}" style="background-color: #4a154b; color: white; padding: 16px 45px; text-decoration: none;  display: inline-block; font-weight: 600; font-size: 17px; ">
                    Get Started Now →
                </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin: 30px 0 0 0; line-height: 1.6; text-align: center;">
                Need help? Check out our <a href="{{docs_url}}" style="color: #4a154b; text-decoration: none; font-weight: 600;">documentation</a> 
                or <a href="{{support_url}}" style="color: #4a154b; text-decoration: none; font-weight: 600;">contact support</a>.
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f5f5f5; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                Happy supporting!<br>
                <strong style="color: #4a154b;">The ImaraDesk Team</strong>
            </p>
            <p style="margin: 15px 0 0 0; color: #999; font-size: 12px;">
                  ImaraDesk. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
        ''',
        'body_text': '''Hi {{user_name}},

Welcome aboard! We're thrilled to have {{workspace_name}} join the ImaraDesk family. You've taken the first step toward delivering exceptional customer support.

What You Can Do with ImaraDesk
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TICKET MANAGEMENT
Track, prioritize, and resolve customer issues with our powerful ticketing system. Never miss a support request.

KNOWLEDGE BASE
Build a comprehensive help center. Empower customers to find answers and reduce support volume.

TEAM COLLABORATION
Work together seamlessly with your team. Assign tickets, share notes, and deliver better support.

ANALYTICS & REPORTS
Track performance metrics, SLA compliance, and team productivity with detailed insights.

AI-POWERED ASSISTANT
Get intelligent suggestions and automate responses with our built-in AI assistant.

Quick Start Guide
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Invite your team members to collaborate
2. Set up your first support groups
3. Create knowledge base articles
4. Configure your email notifications
5. Start receiving and managing tickets!

Get Started: {{login_url}}

Need help? Check out our documentation at {{docs_url}} or contact support at {{support_url}}.

Happy supporting!
The ImaraDesk Team

  ImaraDesk. All rights reserved.
        ''',
    }
    
    # Forgot Password
    FORGOT_PASSWORD = {
        'template_type': 'forgot_password',
        'subject': 'Reset Your ImaraDesk Password',
        'body_html': '''
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; padding: 0;">
        <!-- Header -->
        <div style="padding: 30px 20px; text-align: center; border-bottom: 1px solid #e0e0e0;">
            <img src="https://imaradesk.com/static/assets/imaradesk-logo.png" alt="ImaraDesk" style="height: 40px; margin-bottom: 10px;">
            <h1 style="color: #333; margin: 0; font-size: 28px; font-weight: 600;">Password Reset Request</h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px; background-color: #ffffff;">
            <p style="font-size: 16px; margin: 0 0 20px 0;">Hi {{user_name}},</p>
            
            <p style="font-size: 16px; margin: 0 0 20px 0; line-height: 1.8;">
                We received a request to reset your password for your ImaraDesk account. If you didn't make this request, 
                you can safely ignore this email.
            </p>
            
            <!-- Reset Link Box -->
            <div style="background-color: #f9f9f9; border-left: 4px solid #4a154b; padding: 25px; margin: 30px 0;">
                <p style="margin: 0 0 15px 0; font-size: 14px; color: #666;">
                    Click the button below to reset your password. This link will expire in <strong>24 hours</strong>.
                </p>
                
                <div style="text-align: center; margin: 25px 0;">
                    <a href="{{reset_url}}" style="background-color: #4a154b; color: white; padding: 14px 35px; text-decoration: none;  display: inline-block; font-weight: 600; font-size: 16px; ">
                        Reset My Password
                    </a>
                </div>
                
                <p style="margin: 20px 0 0 0; font-size: 13px; color: #999; line-height: 1.6;">
                    Or copy and paste this link into your browser:<br>
                    <a href="{{reset_url}}" style="color: #4a154b; word-break: break-all;">{{reset_url}}</a>
                </p>
            </div>
            
            <!-- Security Notice -->
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px;  margin: 25px 0;">
                <p style="margin: 0; font-size: 14px; color: #856404;">
                    <strong>Security Tip:</strong> Never share your password or reset link with anyone. 
                    ImaraDesk will never ask for your password via email.
                </p>
            </div>
            
            <p style="font-size: 14px; color: #666; margin: 25px 0 0 0; line-height: 1.6;">
                If you didn't request this password reset, please contact our support team immediately.
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f5f5f5; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                Best regards,<br>
                <strong style="color: #4a154b;">The ImaraDesk Team</strong>
            </p>
            <p style="margin: 15px 0 0 0; color: #999; font-size: 12px;">
                  ImaraDesk. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
        ''',
        'body_text': '''Hi {{user_name}},

We received a request to reset your password for your ImaraDesk account. If you didn't make this request, you can safely ignore this email.

Reset Your Password
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Click the link below to reset your password. This link will expire in 24 hours.

{{reset_url}}

SECURITY TIP: Never share your password or reset link with anyone. ImaraDesk will never ask for your password via email.

If you didn't request this password reset, please contact our support team immediately.

Best regards,
The ImaraDesk Team

  ImaraDesk. All rights reserved.
        ''',
    }

    # 2FA Enable Verification Code
    TWO_FA_ENABLE_CODE = {
        'template_type': '2fa_enable_code',
        'subject': 'Your Verification Code - Enable Two-Factor Authentication',
        'body_html': '''
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; padding: 0;">
        <!-- Header -->
        <div style="padding: 30px 20px; text-align: center; border-bottom: 1px solid #e0e0e0;">
            <img src="https://imaradesk.com/static/assets/imaradesk-logo.png" alt="ImaraDesk" style="height: 40px; margin-bottom: 10px;">
            <h1 style="color: #333; margin: 0; font-size: 28px; font-weight: 600;">Verification Code</h1>
            <p style="color: #666; margin: 10px 0 0 0; font-size: 16px;">Enable Two-Factor Authentication</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px; background-color: #ffffff;">
            <p style="font-size: 16px; margin: 0 0 20px 0;">Hi {{user_name}},</p>
            
            <p style="font-size: 16px; margin: 0 0 20px 0; line-height: 1.8;">
                You requested to enable two-factor authentication on your account. Use the code below to complete the setup.
            </p>
            
            <!-- Code Box -->
            <div style="background: #f9f9f9; padding: 30px; margin: 30px 0; text-align: center; border: 1px solid #e0e0e0;">
                <p style="margin: 0 0 15px 0; font-size: 14px; color: #666;">Your verification code is:</p>
                <div style="background-color: #ffffff; border: 2px solid #4a154b;  padding: 20px; display: inline-block;">
                    <span style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #4a154b; font-family: 'Courier New', monospace;">{{code}}</span>
                </div>
                <p style="margin: 20px 0 0 0; font-size: 13px; color: #999;">
                    This code expires in <strong>10 minutes</strong>
                </p>
            </div>
            
            <!-- Security Notice -->
            <div style="background-color: #e8f5f2; border-left: 4px solid #4a154b; padding: 15px;  margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #333;">
                    <strong>Security Benefits:</strong> Two-factor authentication adds an extra layer of security to your account, protecting you from unauthorized access.
                </p>
            </div>
            
            <p style="font-size: 14px; color: #666; margin: 30px 0 0 0; line-height: 1.6;">
                If you didn't request this code, please ignore this email or contact support if you're concerned about your account security.
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f5f5f5; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                Best regards,<br>
                <strong style="color: #4a154b;">The ImaraDesk Team</strong>
            </p>
            <p style="margin: 15px 0 0 0; color: #999; font-size: 12px;">
                  ImaraDesk. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
        ''',
        'body_text': '''Hi {{user_name}},

You requested to enable two-factor authentication on your account. Use the code below to complete the setup.

Your Verification Code
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{{code}}

This code expires in 10 minutes.

SECURITY BENEFITS: Two-factor authentication adds an extra layer of security to your account, protecting you from unauthorized access.

If you didn't request this code, please ignore this email or contact support if you're concerned about your account security.

Best regards,
The ImaraDesk Team

  ImaraDesk. All rights reserved.
        ''',
    }

    # 2FA Disable Verification Code
    TWO_FA_DISABLE_CODE = {
        'template_type': '2fa_disable_code',
        'subject': 'Confirm: Disable Two-Factor Authentication',
        'body_html': '''
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; padding: 0;">
        <!-- Header -->
        <div style="padding: 30px 20px; text-align: center; border-bottom: 1px solid #e0e0e0;">
            <img src="https://imaradesk.com/static/assets/imaradesk-logo.png" alt="ImaraDesk" style="height: 40px; margin-bottom: 10px;">
            <h1 style="color: #333; margin: 0; font-size: 28px; font-weight: 600;">Security Alert</h1>
            <p style="color: #666; margin: 10px 0 0 0; font-size: 16px;">Request to Disable Two-Factor Authentication</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px; background-color: #ffffff;">
            <p style="font-size: 16px; margin: 0 0 20px 0;">Hi {{user_name}},</p>
            
            <p style="font-size: 16px; margin: 0 0 20px 0; line-height: 1.8;">
                We received a request to <strong>disable</strong> two-factor authentication on your account. 
                If you made this request, use the code below to confirm.
            </p>
            
            <!-- Code Box -->
            <div style="background: #f9f9f9; padding: 30px; margin: 30px 0; text-align: center; border: 1px solid #e0e0e0;">
                <p style="margin: 0 0 15px 0; font-size: 14px; color: #666;">Your confirmation code is:</p>
                <div style="background-color: #ffffff; border: 2px solid #dc3545;  padding: 20px; display: inline-block;">
                    <span style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #dc3545; font-family: 'Courier New', monospace;">{{code}}</span>
                </div>
                <p style="margin: 20px 0 0 0; font-size: 13px; color: #999;">
                    This code expires in <strong>10 minutes</strong>
                </p>
            </div>
            
            <!-- Warning Notice -->
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px;  margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #856404;">
                    <strong>Warning:</strong> Disabling 2FA will make your account less secure. Only proceed if you're sure.
                </p>
            </div>
            
            <!-- Security Notice -->
            <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px;  margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #721c24;">
                    <strong>Didn't request this?</strong> If you didn't make this request, your account may be compromised. 
                    Please change your password immediately and contact support.
                </p>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f5f5f5; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                Best regards,<br>
                <strong style="color: #4a154b;">The ImaraDesk Team</strong>
            </p>
            <p style="margin: 15px 0 0 0; color: #999; font-size: 12px;">
                  ImaraDesk. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
        ''',
        'body_text': '''Hi {{user_name}},

We received a request to DISABLE two-factor authentication on your account. If you made this request, use the code below to confirm.

Your Confirmation Code
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{{code}}

This code expires in 10 minutes.

WARNING: Disabling 2FA will make your account less secure. Only proceed if you're sure.

DIDN'T REQUEST THIS? If you didn't make this request, your account may be compromised. Please change your password immediately and contact support.

Best regards,
The ImaraDesk Team

  ImaraDesk. All rights reserved.
        ''',
    }

    # 2FA Login Verification Code
    TWO_FA_LOGIN_CODE = {
        'template_type': '2fa_login_code',
        'subject': 'Your Login Verification Code - ImaraDesk',
        'body_html': '''
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; padding: 0;">
        <!-- Header -->
        <div style="padding: 30px 20px; text-align: center; border-bottom: 1px solid #e0e0e0;">
            <img src="https://imaradesk.com/static/assets/imaradesk-logo.png" alt="ImaraDesk" style="height: 40px; margin-bottom: 10px;">
            <h1 style="color: #333; margin: 0; font-size: 28px; font-weight: 600;">Login Verification</h1>
            <p style="color: #666; margin: 10px 0 0 0; font-size: 16px;">Confirm your identity</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px; background-color: #ffffff;">
            <p style="font-size: 16px; margin: 0 0 20px 0;">Hi {{user_name}},</p>
            
            <p style="font-size: 16px; margin: 0 0 20px 0; line-height: 1.8;">
                A sign-in attempt requires verification. Use the code below to complete your login.
            </p>
            
            <!-- Code Box -->
            <div style="background: #f9f9f9; padding: 30px; margin: 30px 0; text-align: center; border: 1px solid #e0e0e0;">
                <p style="margin: 0 0 15px 0; font-size: 14px; color: #666;">Your login code is:</p>
                <div style="background-color: #ffffff; border: 2px solid #4a154b;  padding: 20px; display: inline-block;">
                    <span style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #4a154b; font-family: 'Courier New', monospace;">{{code}}</span>
                </div>
                <p style="margin: 20px 0 0 0; font-size: 13px; color: #999;">
                    This code expires in <strong>10 minutes</strong>
                </p>
            </div>
            
            <!-- Login Details -->
            <div style="background-color: #f5f5f5; padding: 15px;  margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #666;">
                    <strong>Login attempt details:</strong><br>
                    Time: {{login_time}}<br>
                    Device: {{device_info}}
                </p>
            </div>
            
            <!-- Security Notice -->
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px;  margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #856404;">
                    <strong>Security Tip:</strong> If you didn't attempt to sign in, someone may be trying to access your account. 
                    Consider changing your password.
                </p>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f5f5f5; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                Best regards,<br>
                <strong style="color: #4a154b;">The ImaraDesk Team</strong>
            </p>
            <p style="margin: 15px 0 0 0; color: #999; font-size: 12px;">
                  ImaraDesk. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
        ''',
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
The ImaraDesk Team

  ImaraDesk. All rights reserved.
        ''',
    }

    # Email Verification for New Registration
    EMAIL_VERIFICATION = {
        'template_type': 'email_verification',
        'subject': 'Verify Your Email - ImaraDesk',
        'body_html': '''
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; padding: 0;">
        <!-- Header -->
        <div style="padding: 30px 20px; text-align: center; border-bottom: 1px solid #e0e0e0;">
            <img src="https://imaradesk.com/static/assets/imaradesk-logo.png" alt="ImaraDesk" style="height: 40px; margin-bottom: 10px;">
            <h1 style="color: #333; margin: 0; font-size: 28px; font-weight: 600;">Verify Your Email</h1>
            <p style="color: #666; margin: 10px 0 0 0; font-size: 16px;">One click to activate your workspace</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px; background-color: #ffffff;">
            <p style="font-size: 16px; margin: 0 0 20px 0;">Hi {{user_name}},</p>
            
            <p style="font-size: 16px; margin: 0 0 20px 0; line-height: 1.8;">
                Thanks for registering your workspace <strong>{{workspace_name}}</strong> with ImaraDesk! 
                To complete your registration and activate your account, please verify your email address.
            </p>
            
            <!-- Verification Box -->
            <div style="background-color: #f9f9f9; border-left: 4px solid #4a154b; padding: 25px; margin: 30px 0;">
                <p style="margin: 0 0 20px 0; font-size: 14px; color: #666;">
                    Click the button below to verify your email and activate your workspace.
                </p>
                
                <a href="{{verification_url}}" style="background-color: #4a154b; color: white; padding: 16px 45px; text-decoration: none;  display: inline-block; font-weight: 600; font-size: 17px; ">
                    Verify Email Address
                </a>
                
                <p style="margin: 25px 0 0 0; font-size: 13px; color: #999;">
                    This link expires in <strong>24 hours</strong>
                </p>
            </div>
            
            <!-- Link Fallback -->
            <p style="font-size: 13px; color: #999; margin: 20px 0; line-height: 1.6; word-break: break-all;">
                Or copy and paste this link into your browser:<br>
                <a href="{{verification_url}}" style="color: #4a154b;">{{verification_url}}</a>
            </p>
            
            <!-- Security Notice -->
            <div style="background-color: #e8f5f2; border-left: 4px solid #4a154b; padding: 15px;  margin: 25px 0;">
                <p style="margin: 0; font-size: 14px; color: #333;">
                    <strong>Security Note:</strong> This verification link can only be used once. 
                    If you didn't create an account with ImaraDesk, please ignore this email.
                </p>
            </div>
            
            <p style="font-size: 14px; color: #666; margin: 25px 0 0 0; line-height: 1.6;">
                Once verified, you'll receive your login credentials and can start using ImaraDesk right away!
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f5f5f5; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                Best regards,<br>
                <strong style="color: #4a154b;">The ImaraDesk Team</strong>
            </p>
            <p style="margin: 15px 0 0 0; color: #999; font-size: 12px;">
                  ImaraDesk. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
        ''',
        'body_text': '''Hi {{user_name}},

Thanks for registering your workspace "{{workspace_name}}" with ImaraDesk! To complete your registration and activate your account, please verify your email address.

Verify Your Email
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Click the link below to verify your email and activate your workspace:

{{verification_url}}

This link expires in 24 hours.

SECURITY NOTE: This verification link can only be used once. If you didn't create an account with ImaraDesk, please ignore this email.

Once verified, you'll receive your login credentials and can start using ImaraDesk right away!

Best regards,
The ImaraDesk Team

  ImaraDesk. All rights reserved.
        ''',
    }
