from django.db import models
from django.contrib.auth import get_user_model
from django.utils.text import slugify

User = get_user_model()


class Customer(models.Model):
    """
    Customer/Company in the customer portal
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('suspended', 'Suspended'),
    ]
    
    TIER_CHOICES = [
        ('free', 'Free'),
        ('basic', 'Basic'),
        ('professional', 'Professional'),
        ('enterprise', 'Enterprise'),
    ]
    
    name = models.CharField(max_length=255, help_text="Customer/Company name")
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    
    # Contact Information
    email = models.EmailField(help_text="Primary contact email")
    phone = models.CharField(max_length=50, blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    
    # Address
    address_line1 = models.CharField(max_length=255, blank=True, null=True)
    address_line2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    
    # Account Details
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    tier = models.CharField(max_length=20, choices=TIER_CHOICES, default='free')
    account_owner = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='owned_customers',
        help_text="Internal account manager"
    )
    
    # Portal Access
    portal_enabled = models.BooleanField(default=True, help_text="Enable customer portal access")
    allow_ticket_creation = models.BooleanField(default=True, help_text="Allow customers to create tickets")
    allow_kb_access = models.BooleanField(default=True, help_text="Allow access to knowledge base")
    
    # Billing
    billing_email = models.EmailField(blank=True, null=True, help_text="Separate billing contact email")
    tax_id = models.CharField(max_length=100, blank=True, null=True, help_text="VAT/Tax ID")
    
    # Notes and Custom Fields
    notes = models.TextField(blank=True, null=True, help_text="Internal notes about customer")
    custom_fields = models.JSONField(default=dict, blank=True, help_text="Custom data fields")
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Customer"
        verbose_name_plural = "Customers"
        ordering = ['-created_at']
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
            # Ensure unique slug
            original_slug = self.slug
            counter = 1
            while Customer.objects.filter(slug=self.slug).exists():
                self.slug = f"{original_slug}-{counter}"
                counter += 1
        super().save(*args, **kwargs)


class CustomerContact(models.Model):
    """
    Individual contacts associated with a customer
    """
    ROLE_CHOICES = [
        ('primary', 'Primary Contact'),
        ('billing', 'Billing Contact'),
        ('technical', 'Technical Contact'),
        ('other', 'Other'),
    ]
    
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='contacts')
    user = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='customer_contacts',
        help_text="Linked user account for portal access"
    )
    
    # Contact Information
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    job_title = models.CharField(max_length=100, blank=True, null=True)
    
    # Role and Access
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='other')
    is_primary = models.BooleanField(default=False, help_text="Primary contact for this customer")
    portal_access = models.BooleanField(default=True, help_text="Can access customer portal")
    receive_notifications = models.BooleanField(default=True, help_text="Receive email notifications")
    
    # Metadata
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Customer Contact"
        verbose_name_plural = "Customer Contacts"
        ordering = ['-is_primary', 'last_name', 'first_name']
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.customer.name})"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class CustomerTicket(models.Model):
    """
    Tickets submitted through customer portal
    """
    STATUS_CHOICES = [
        ('new', 'New'),
        ('open', 'Open'),
        ('pending', 'Pending Customer'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='tickets', null=True, blank=True)
    contact = models.ForeignKey(CustomerContact, on_delete=models.SET_NULL, null=True, blank=True, related_name='tickets')
    
    # Guest/External Requester Information (for tickets submitted via portal without login)
    requester_name = models.CharField(max_length=255, blank=True, null=True, help_text="Name of ticket requester")
    requester_email = models.EmailField(blank=True, null=True, help_text="Email of ticket requester")
    requester_phone = models.CharField(max_length=50, blank=True, null=True, help_text="Phone of ticket requester")
    is_guest_ticket = models.BooleanField(default=False, help_text="Ticket created by guest user")
    
    # Ticket Details
    ticket_number = models.CharField(max_length=20, unique=True, editable=False)
    subject = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    
    # Assignment
    assigned_to = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='assigned_customer_tickets'
    )
    
    # Tracking
    portal_visible = models.BooleanField(default=True, help_text="Visible in customer portal")
    customer_satisfaction_rating = models.IntegerField(
        null=True, 
        blank=True,
        help_text="1-5 rating from customer"
    )
    customer_feedback = models.TextField(blank=True, null=True, help_text="Customer feedback after resolution")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = "Customer Ticket"
        verbose_name_plural = "Customer Tickets"
        ordering = ['-created_at']
    
    def __str__(self):
        if self.is_guest_ticket:
            return f"{self.ticket_number} - {self.subject} (Guest: {self.requester_email})"
        return f"{self.ticket_number} - {self.subject}"
    
    def save(self, *args, **kwargs):
        if not self.ticket_number:
            # Generate ticket number: CP-YYYYMM-XXXXX
            from django.utils import timezone
            import random
            date_part = timezone.now().strftime('%Y%m')
            random_part = str(random.randint(10000, 99999))
            self.ticket_number = f"CP-{date_part}-{random_part}"
            
            # Ensure uniqueness
            while CustomerTicket.objects.filter(ticket_number=self.ticket_number).exists():
                random_part = str(random.randint(10000, 99999))
                self.ticket_number = f"CP-{date_part}-{random_part}"
        
        super().save(*args, **kwargs)


class CustomerTicketComment(models.Model):
    """
    Comments on customer portal tickets
    """
    ticket = models.ForeignKey(CustomerTicket, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='customer_ticket_comments')
    
    comment = models.TextField()
    is_internal = models.BooleanField(
        default=False, 
        help_text="Internal comment, not visible to customer"
    )
    
    # Attachments
    attachments = models.JSONField(default=list, blank=True, help_text="List of attachment file paths")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Customer Ticket Comment"
        verbose_name_plural = "Customer Ticket Comments"
        ordering = ['created_at']
    
    def __str__(self):
        return f"Comment on {self.ticket.ticket_number} by {self.author}"


class CustomerAsset(models.Model):
    """
    Assets/products owned by customers
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('expired', 'Expired'),
        ('maintenance', 'Under Maintenance'),
    ]
    
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='assets')
    
    # Asset Details
    name = models.CharField(max_length=255, help_text="Asset/Product name")
    asset_tag = models.CharField(max_length=100, unique=True, help_text="Unique asset identifier")
    serial_number = models.CharField(max_length=255, blank=True, null=True)
    model = models.CharField(max_length=255, blank=True, null=True)
    manufacturer = models.CharField(max_length=255, blank=True, null=True)
    
    # Status and Lifecycle
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    purchase_date = models.DateField(null=True, blank=True)
    warranty_expiry = models.DateField(null=True, blank=True)
    
    # Support Details
    support_level = models.CharField(
        max_length=50, 
        blank=True, 
        null=True,
        help_text="Support tier (e.g., Basic, Premium, Enterprise)"
    )
    support_expiry = models.DateField(null=True, blank=True)
    
    # Additional Info
    notes = models.TextField(blank=True, null=True)
    custom_fields = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Customer Asset"
        verbose_name_plural = "Customer Assets"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.asset_tag})"


class CustomerPortalSettings(models.Model):
    """
    Customer portal configuration settings
    """
    # Portal Branding
    portal_title = models.CharField(
        max_length=255, 
        default='Customer Portal',
        help_text="Portal title displayed to customers"
    )
    portal_logo = models.CharField(
        max_length=500, 
        blank=True, 
        null=True,
        help_text="URL or path to portal logo"
    )
    portal_welcome_message = models.TextField(
        blank=True,
        null=True,
        help_text="Welcome message shown on portal homepage"
    )
    
    # Portal Features
    enable_portal = models.BooleanField(default=True, help_text="Enable customer portal")
    allow_guest_tickets = models.BooleanField(
        default=False, 
        help_text="Allow ticket submission without login"
    )
    require_approval_for_new_contacts = models.BooleanField(
        default=True,
        help_text="New contact registrations require approval"
    )
    
    # Ticket Settings
    default_ticket_priority = models.CharField(
        max_length=20,
        choices=CustomerTicket.PRIORITY_CHOICES,
        default='medium'
    )
    auto_assign_tickets = models.BooleanField(
        default=False,
        help_text="Automatically assign tickets to account owner"
    )
    notify_on_new_ticket = models.BooleanField(
        default=True,
        help_text="Email notification on new ticket submission"
    )
    notify_customer_on_update = models.BooleanField(
        default=True,
        help_text="Notify customer when ticket is updated"
    )
    
    # Knowledge Base Integration
    show_kb_in_portal = models.BooleanField(
        default=True,
        help_text="Show knowledge base articles in portal"
    )
    suggest_kb_before_ticket = models.BooleanField(
        default=True,
        help_text="Suggest KB articles before allowing ticket creation"
    )
    
    # Customer Satisfaction
    enable_satisfaction_survey = models.BooleanField(
        default=True,
        help_text="Request satisfaction rating after ticket resolution"
    )
    survey_delay_hours = models.IntegerField(
        default=24,
        help_text="Hours to wait before sending survey after resolution"
    )
    
    # Asset Management
    show_assets_in_portal = models.BooleanField(
        default=True,
        help_text="Show customer assets in portal"
    )
    allow_customers_to_add_assets = models.BooleanField(
        default=False,
        help_text="Allow customers to register their own assets"
    )
    
    # Security
    require_2fa_for_portal = models.BooleanField(
        default=False,
        help_text="Require 2FA for customer portal access"
    )
    session_timeout_minutes = models.IntegerField(
        default=480,
        help_text="Portal session timeout in minutes"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Customer Portal Settings"
        verbose_name_plural = "Customer Portal Settings"
    
    def __str__(self):
        return "Customer Portal Settings"
    
    def save(self, *args, **kwargs):
        # Singleton pattern
        if not self.pk and CustomerPortalSettings.objects.exists():
            existing = CustomerPortalSettings.objects.first()
            self.pk = existing.pk
        super().save(*args, **kwargs)
    
    @classmethod
    def get_settings(cls):
        """Get or create the settings instance"""
        settings, created = cls.objects.get_or_create(pk=1)
        return settings
