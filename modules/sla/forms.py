from django import forms
from .models import SLAPolicy, BusinessHours, Holiday


class SLAPolicyForm(forms.ModelForm):
    """Form for creating and editing SLA policies."""
    
    class Meta:
        model = SLAPolicy
        fields = [
            'name',
            'priority',
            'description',
            'first_response_time',
            'resolution_time',
            'status',
            'apply_business_hours',
            'apply_holidays',
            'send_escalation_emails',
            'auto_assign_on_breach',
            'pause_on_pending',
            'notify_before_breach',
            'use_custom_rules',
            'custom_rules',
            'rules_logic',
        ]
        widgets = {
            'description': forms.Textarea(attrs={'rows': 3}),
        }
        help_texts = {
            'first_response_time': 'Time in minutes for first response',
            'resolution_time': 'Time in minutes for ticket resolution',
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Legacy rows may store the priority/status in uppercase. Normalise the
        # incoming data before choice validation runs so updates don't fail.
        if self.is_bound:
            self.data = self.data.copy()
            for key in ('priority', 'status'):
                value = self.data.get(key)
                if isinstance(value, str):
                    self.data[key] = value.lower()

    def clean_priority(self):
        """Store the canonical lowercase priority, even if legacy rows used uppercase."""
        value = self.cleaned_data.get('priority')
        return value.lower() if isinstance(value, str) else value

    def clean_status(self):
        value = self.cleaned_data.get('status')
        return value.lower() if isinstance(value, str) else value

    def clean(self):
        cleaned_data = super().clean()
        first_response = cleaned_data.get('first_response_time')
        resolution = cleaned_data.get('resolution_time')
        priority = cleaned_data.get('priority')
        status = cleaned_data.get('status')
        use_custom_rules = cleaned_data.get('use_custom_rules')
        custom_rules = cleaned_data.get('custom_rules')
        
        # Ensure custom_rules is never None (database has NOT NULL constraint)
        if custom_rules is None:
            cleaned_data['custom_rules'] = []
        
        if first_response and resolution and first_response >= resolution:
            raise forms.ValidationError(
                'First response time must be less than resolution time.'
            )
        
        if use_custom_rules:
            # Validate custom rules structure
            if custom_rules:
                if not isinstance(custom_rules, list):
                    raise forms.ValidationError('Custom rules must be a list.')
                
                for rule in custom_rules:
                    if not isinstance(rule, dict):
                        raise forms.ValidationError('Each rule must be an object.')
                    
                    required_fields = ['field', 'operator']
                    for field in required_fields:
                        if field not in rule:
                            raise forms.ValidationError(f'Each rule must have a "{field}" field.')
        
        # Only one active simple-mode policy can exist per priority, otherwise
        # it would be ambiguous which one a ticket gets.
        if status == 'active' and priority and not use_custom_rules:
            existing_query = SLAPolicy.objects.filter(
                priority__iexact=priority,
                status='active',
                use_custom_rules=False,
            )
            # Exclude current instance if updating
            if self.instance.pk:
                existing_query = existing_query.exclude(pk=self.instance.pk)
            
            if existing_query.exists():
                existing_policy = existing_query.first()
                raise forms.ValidationError(
                    f'Another active policy "{existing_policy.name}" already applies to {priority} priority tickets. '
                    f'Deactivate it first, or use custom rules for this policy.'
                )
        
        return cleaned_data


class BusinessHoursForm(forms.ModelForm):
    """Form for configuring business hours."""
    
    class Meta:
        model = BusinessHours
        fields = [
            'name',
            'timezone',
            'monday_enabled', 'monday_start', 'monday_end',
            'tuesday_enabled', 'tuesday_start', 'tuesday_end',
            'wednesday_enabled', 'wednesday_start', 'wednesday_end',
            'thursday_enabled', 'thursday_start', 'thursday_end',
            'friday_enabled', 'friday_start', 'friday_end',
            'saturday_enabled', 'saturday_start', 'saturday_end',
            'sunday_enabled', 'sunday_start', 'sunday_end',
            'pause_outside_hours',
            'exclude_holidays',
            'is_active',
        ]
        widgets = {
            'monday_start': forms.TimeInput(attrs={'type': 'time'}),
            'monday_end': forms.TimeInput(attrs={'type': 'time'}),
            'tuesday_start': forms.TimeInput(attrs={'type': 'time'}),
            'tuesday_end': forms.TimeInput(attrs={'type': 'time'}),
            'wednesday_start': forms.TimeInput(attrs={'type': 'time'}),
            'wednesday_end': forms.TimeInput(attrs={'type': 'time'}),
            'thursday_start': forms.TimeInput(attrs={'type': 'time'}),
            'thursday_end': forms.TimeInput(attrs={'type': 'time'}),
            'friday_start': forms.TimeInput(attrs={'type': 'time'}),
            'friday_end': forms.TimeInput(attrs={'type': 'time'}),
            'saturday_start': forms.TimeInput(attrs={'type': 'time'}),
            'saturday_end': forms.TimeInput(attrs={'type': 'time'}),
            'sunday_start': forms.TimeInput(attrs={'type': 'time'}),
            'sunday_end': forms.TimeInput(attrs={'type': 'time'}),
        }
    
    def clean(self):
        cleaned_data = super().clean()
        
        # Validate that for each enabled day, start time is before end time
        days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        for day in days:
            enabled = cleaned_data.get(f'{day}_enabled')
            start = cleaned_data.get(f'{day}_start')
            end = cleaned_data.get(f'{day}_end')
            
            if enabled and start and end and start >= end:
                raise forms.ValidationError(
                    f'{day.capitalize()}: Start time must be before end time.'
                )
        
        return cleaned_data


class HolidayForm(forms.ModelForm):
    """Form for adding and editing holidays."""
    
    class Meta:
        model = Holiday
        fields = ['name', 'date', 'recurring', 'status']
        widgets = {
            'date': forms.DateInput(attrs={'type': 'date'}),
        }
