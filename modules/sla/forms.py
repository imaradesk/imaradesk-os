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
            'apply_to_new_tickets',
            'send_escalation_emails',
            'auto_assign_on_breach',
            'pause_on_pending',
            'notify_before_breach',
        ]
        widgets = {
            'description': forms.Textarea(attrs={'rows': 3}),
        }
        help_texts = {
            'first_response_time': 'Time in minutes for first response',
            'resolution_time': 'Time in minutes for ticket resolution',
        }
    
    def clean(self):
        cleaned_data = super().clean()
        first_response = cleaned_data.get('first_response_time')
        resolution = cleaned_data.get('resolution_time')
        apply_to_new_tickets = cleaned_data.get('apply_to_new_tickets')
        priority = cleaned_data.get('priority')
        
        # Debug logging
        print(f"DEBUG - Form clean() called")
        print(f"DEBUG - apply_to_new_tickets: {apply_to_new_tickets} (type: {type(apply_to_new_tickets)})")
        print(f"DEBUG - priority: {priority}")
        
        if first_response and resolution and first_response >= resolution:
            raise forms.ValidationError(
                'First response time must be less than resolution time.'
            )
        
        # Validate that only one policy can have apply_to_new_tickets enabled per priority
        if apply_to_new_tickets and priority:
            print(f"DEBUG - Checking for existing policies with apply_to_new_tickets=True and priority={priority}")
            existing_query = SLAPolicy.objects.filter(
                priority=priority,
                apply_to_new_tickets=True
            )
            # Exclude current instance if updating
            if self.instance.pk:
                existing_query = existing_query.exclude(pk=self.instance.pk)
            
            existing_count = existing_query.count()
            print(f"DEBUG - Found {existing_count} existing policies")
            
            if existing_query.exists():
                existing_policy = existing_query.first()
                error_msg = (
                    f'Another policy "{existing_policy.name}" is already set to apply to new {priority} priority tickets. '
                    f'Please disable it first before enabling this option on another policy.'
                )
                print(f"DEBUG - Raising validation error: {error_msg}")
                raise forms.ValidationError(error_msg)
        
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
