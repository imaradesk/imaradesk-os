from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from .models import SLAPolicy, BusinessHours, Holiday, SLASettings
from .forms import SLAPolicyForm, BusinessHoursForm, HolidayForm
import json
import pytz


@login_required
@require_http_methods(["GET"])
def get_timezones(request):
    """Get all available timezones."""
    timezones = [{'id': tz, 'name': tz} for tz in pytz.all_timezones]
    return JsonResponse({
        'success': True,
        'timezones': timezones
    })


@login_required
@require_http_methods(["GET"])
def get_sla_settings(request):
    """Get SLA settings."""
    settings = SLASettings.get_settings()
    return JsonResponse({
        'success': True,
        'settings': {
            'enabled': settings.enabled,
            'auto_pause_resolved': settings.auto_pause_resolved,
            'auto_resume_reopened': settings.auto_resume_reopened,
            'escalation_enabled': settings.escalation_enabled,
            'send_notifications': settings.send_notifications,
        }
    })


@login_required
@require_http_methods(["POST", "PUT", "PATCH"])
def update_sla_settings(request):
    """Update SLA settings."""
    try:
        data = json.loads(request.body)
        settings = SLASettings.get_settings()
        
        # Update fields
        if 'enabled' in data:
            settings.enabled = data['enabled']
        if 'auto_pause_resolved' in data:
            settings.auto_pause_resolved = data['auto_pause_resolved']
        if 'auto_resume_reopened' in data:
            settings.auto_resume_reopened = data['auto_resume_reopened']
        if 'escalation_enabled' in data:
            settings.escalation_enabled = data['escalation_enabled']
        if 'send_notifications' in data:
            settings.send_notifications = data['send_notifications']
        
        settings.save()
        
        return JsonResponse({
            'success': True,
            'message': 'SLA settings updated successfully',
            'settings': {
                'enabled': settings.enabled,
                'auto_pause_resolved': settings.auto_pause_resolved,
                'auto_resume_reopened': settings.auto_resume_reopened,
                'escalation_enabled': settings.escalation_enabled,
                'send_notifications': settings.send_notifications,
            }
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=500)


@login_required
@require_http_methods(["POST"])
def create_sla_policy(request):
    """Create a new SLA policy."""
    try:
        data = json.loads(request.body)
        
        # Map frontend field name to backend field name
        if 'escalate_on_breach' in data:
            data['send_escalation_emails'] = data.pop('escalate_on_breach')
        
        form = SLAPolicyForm(data)
        
        if form.is_valid():
            policy = form.save()
            return JsonResponse({
                'success': True,
                'message': 'SLA policy created successfully',
                'policy': {
                    'id': policy.id,
                    'name': policy.name,
                    'priority': policy.priority,
                    'first_response': policy.get_first_response_display(),
                    'first_response_minutes': policy.first_response_time,
                    'resolution_time': policy.get_resolution_time_display(),
                    'resolution_time_minutes': policy.resolution_time,
                    'status': policy.status,
                    'description': policy.description,
                    'apply_business_hours': policy.apply_business_hours,
                    'apply_holidays': policy.apply_holidays,
                    'apply_to_new_tickets': policy.apply_to_new_tickets,
                    'send_escalation_emails': policy.send_escalation_emails,
                    'auto_assign_on_breach': policy.auto_assign_on_breach,
                    'pause_on_pending': policy.pause_on_pending,
                    'notify_before_breach': policy.notify_before_breach,
                }
            })
        else:
            # Extract error messages from form.errors
            error_messages = []
            for field, errors in form.errors.items():
                if field == '__all__':
                    error_messages.extend(errors)
                else:
                    for error in errors:
                        error_messages.append(f"{field}: {error}")
            
            return JsonResponse({
                'success': False,
                'message': ' '.join(error_messages) if error_messages else 'Validation failed',
                'errors': form.errors
            }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=500)


@login_required
@require_http_methods(["PUT", "PATCH"])
def update_sla_policy(request, policy_id):
    """Update an existing SLA policy."""
    try:
        policy = SLAPolicy.objects.get(id=policy_id)
        data = json.loads(request.body)
        
        # Map frontend field name to backend field name
        if 'escalate_on_breach' in data:
            data['send_escalation_emails'] = data.pop('escalate_on_breach')
        
        form = SLAPolicyForm(data, instance=policy)
        
        if form.is_valid():
            policy = form.save()
            return JsonResponse({
                'success': True,
                'message': 'SLA policy updated successfully',
                'policy': {
                    'id': policy.id,
                    'name': policy.name,
                    'priority': policy.priority,
                    'first_response': policy.get_first_response_display(),
                    'first_response_minutes': policy.first_response_time,
                    'resolution_time': policy.get_resolution_time_display(),
                    'resolution_time_minutes': policy.resolution_time,
                    'status': policy.status,
                    'description': policy.description,
                    'apply_business_hours': policy.apply_business_hours,
                    'apply_holidays': policy.apply_holidays,
                    'apply_to_new_tickets': policy.apply_to_new_tickets,
                    'send_escalation_emails': policy.send_escalation_emails,
                    'auto_assign_on_breach': policy.auto_assign_on_breach,
                    'pause_on_pending': policy.pause_on_pending,
                    'notify_before_breach': policy.notify_before_breach,
                }
            })
        else:
            # Extract error messages from form.errors
            error_messages = []
            for field, errors in form.errors.items():
                if field == '__all__':
                    error_messages.extend(errors)
                else:
                    for error in errors:
                        error_messages.append(f"{field}: {error}")
            
            return JsonResponse({
                'success': False,
                'message': ' '.join(error_messages) if error_messages else 'Validation failed',
                'errors': form.errors
            }, status=400)
    except SLAPolicy.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'SLA policy not found'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=500)


@login_required
@require_http_methods(["DELETE"])
def delete_sla_policy(request, policy_id):
    """Delete an SLA policy."""
    try:
        policy = SLAPolicy.objects.get(id=policy_id)
        policy.delete()
        return JsonResponse({
            'success': True,
            'message': 'SLA policy deleted successfully'
        })
    except SLAPolicy.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'SLA policy not found'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=500)


@login_required
@require_http_methods(["POST"])
def create_holiday(request):
    """Create a new holiday."""
    try:
        data = json.loads(request.body)
        form = HolidayForm(data)
        
        if form.is_valid():
            holiday = form.save()
            return JsonResponse({
                'success': True,
                'message': 'Holiday created successfully',
                'holiday': {
                    'id': holiday.id,
                    'name': holiday.name,
                    'date': holiday.date.strftime('%Y-%m-%d'),
                    'recurring': holiday.recurring,
                    'status': holiday.status,
                }
            })
        else:
            return JsonResponse({
                'success': False,
                'errors': form.errors
            }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=500)


@login_required
@require_http_methods(["PUT", "PATCH"])
def update_holiday(request, holiday_id):
    """Update an existing holiday."""
    try:
        holiday = Holiday.objects.get(id=holiday_id)
        data = json.loads(request.body)
        form = HolidayForm(data, instance=holiday)
        
        if form.is_valid():
            holiday = form.save()
            return JsonResponse({
                'success': True,
                'message': 'Holiday updated successfully',
                'holiday': {
                    'id': holiday.id,
                    'name': holiday.name,
                    'date': holiday.date.strftime('%Y-%m-%d'),
                    'recurring': holiday.recurring,
                    'status': holiday.status,
                }
            })
        else:
            return JsonResponse({
                'success': False,
                'errors': form.errors
            }, status=400)
    except Holiday.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'Holiday not found'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=500)


@login_required
@require_http_methods(["DELETE"])
def delete_holiday(request, holiday_id):
    """Delete a holiday."""
    try:
        holiday = Holiday.objects.get(id=holiday_id)
        holiday.delete()
        return JsonResponse({
            'success': True,
            'message': 'Holiday deleted successfully'
        })
    except Holiday.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'Holiday not found'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=500)


@login_required
@require_http_methods(["POST", "PUT", "PATCH"])
def save_business_hours(request):
    """Create or update business hours configuration."""
    try:
        data = json.loads(request.body)
        
        # Get active business hours or create new
        business_hours = BusinessHours.objects.filter(is_active=True).first()
        
        if business_hours:
            form = BusinessHoursForm(data, instance=business_hours)
        else:
            form = BusinessHoursForm(data)
        
        if form.is_valid():
            bh = form.save()
            return JsonResponse({
                'success': True,
                'message': 'Business hours saved successfully',
                'business_hours': {
                    'id': bh.id,
                    'name': bh.name,
                    'timezone': bh.timezone,
                }
            })
        else:
            return JsonResponse({
                'success': False,
                'errors': form.errors
            }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=500)


@login_required
@require_http_methods(["POST"])
def hold_sla(request, ticket_id):
    """Put SLA timer on hold for a ticket."""
    try:
        from modules.ticket.models import Ticket
        
        ticket = Ticket.objects.get(id=ticket_id)
        
        # Check if ticket has SLA
        if not hasattr(ticket, 'sla'):
            return JsonResponse({
                'success': False,
                'message': 'This ticket does not have an SLA policy'
            }, status=404)
        
        data = json.loads(request.body)
        reason = data.get('reason', '').strip()
        
        if not reason:
            return JsonResponse({
                'success': False,
                'message': 'Hold reason is required'
            }, status=400)
        
        # Put SLA on hold
        ticket.sla.hold(reason)
        
        return JsonResponse({
            'success': True,
            'message': 'SLA timer has been put on hold',
            'sla': {
                'is_on_hold': ticket.sla.is_on_hold,
                'hold_reason': ticket.sla.hold_reason,
                'hold_started_at': ticket.sla.hold_started_at.strftime('%Y-%m-%d %H:%M:%S') if ticket.sla.hold_started_at else None
            }
        })
    except Ticket.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'Ticket not found'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=500)


@login_required
@require_http_methods(["POST"])
def resume_sla(request, ticket_id):
    """Resume SLA timer from hold."""
    try:
        from modules.ticket.models import Ticket
        
        ticket = Ticket.objects.get(id=ticket_id)
        
        # Check if ticket has SLA
        if not hasattr(ticket, 'sla'):
            return JsonResponse({
                'success': False,
                'message': 'This ticket does not have an SLA policy'
            }, status=404)
        
        # Resume SLA
        ticket.sla.resume()
        
        return JsonResponse({
            'success': True,
            'message': 'SLA timer has been resumed',
            'sla': {
                'is_on_hold': ticket.sla.is_on_hold,
                'total_hold_time': ticket.sla.total_hold_time,
                'response_due_at': ticket.sla.response_due_at.strftime('%Y-%m-%d %H:%M:%S') if ticket.sla.response_due_at else None,
                'resolution_due_at': ticket.sla.resolution_due_at.strftime('%Y-%m-%d %H:%M:%S') if ticket.sla.resolution_due_at else None
            }
        })
    except Ticket.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'Ticket not found'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=500)
