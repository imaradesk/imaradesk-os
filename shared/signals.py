"""Signals for shared app."""
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Client


# NOTE: Signal disabled - roles are now created in app/views.py during registration
