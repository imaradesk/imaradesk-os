"""
Tenant compatibility utilities for single-tenant mode.

This module provides no-op replacements for django_tenants utilities,
allowing existing code to work without modification when running in
single-tenant mode.
"""
from contextlib import contextmanager
from shared.models import Client


@contextmanager
def schema_context(schema_name=None):
    """
    No-op context manager for single-tenant mode.
    In multi-tenant mode, this would switch database schemas.
    In single-tenant mode, it just yields without doing anything.
    """
    yield


@contextmanager  
def tenant_context(tenant):
    """
    No-op context manager for single-tenant mode.
    In multi-tenant mode, this would switch to the tenant's schema.
    In single-tenant mode, it just yields without doing anything.
    """
    yield


def get_tenant_model():
    """
    Return the Client model (organization model in single-tenant mode).
    """
    return Client


def get_public_schema_name():
    """
    Return 'public' for compatibility.
    In single-tenant mode, there's only one schema.
    """
    return 'public'


def get_tenant(request=None):
    """
    Get the current tenant/organization.
    In single-tenant mode, returns the single organization.
    """
    return Client.get_current()
