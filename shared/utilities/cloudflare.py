"""
Cloudflare API utilities for custom domain SSL provisioning.

Uses Cloudflare for SaaS (Custom Hostnames) to automatically provision
SSL certificates for customer custom domains.

Requirements:
- CLOUDFLARE_API_TOKEN: API token with Zone:SSL and DNS:Edit permissions
- CLOUDFLARE_ZONE_ID: Your zone ID (coredesk.pro)

Docs: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/
"""
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4"


def get_headers():
    """Get Cloudflare API headers."""
    return {
        "Authorization": f"Bearer {settings.CLOUDFLARE_API_TOKEN}",
        "Content-Type": "application/json",
    }


def add_custom_hostname(domain: str) -> dict:
    """
    Add a custom hostname to Cloudflare for SaaS.
    This provisions SSL automatically for the customer's domain.
    
    Args:
        domain: The customer's custom domain (e.g., support.customer.com)
        
    Returns:
        dict with 'success', 'hostname_id', 'ssl_status', 'error'
    """
    zone_id = settings.CLOUDFLARE_ZONE_ID
    
    if not zone_id or not settings.CLOUDFLARE_API_TOKEN:
        logger.error("[Cloudflare] Missing CLOUDFLARE_ZONE_ID or CLOUDFLARE_API_TOKEN")
        return {
            "success": False,
            "error": "Cloudflare API not configured"
        }
    
    url = f"{CLOUDFLARE_API_BASE}/zones/{zone_id}/custom_hostnames"
    
    payload = {
        "hostname": domain,
        "ssl": {
            "method": "http",  # HTTP DCV (Domain Control Validation)
            "type": "dv",      # Domain Validated certificate
            "settings": {
                "min_tls_version": "1.2",
                "http2": "on"
            }
        }
    }
    
    logger.info(f"[Cloudflare] Adding custom hostname: {domain}")
    
    try:
        response = requests.post(url, json=payload, headers=get_headers(), timeout=30)
        data = response.json()
        
        if data.get("success"):
            result = data.get("result", {})
            hostname_id = result.get("id")
            ssl_status = result.get("ssl", {}).get("status", "pending")
            
            logger.info(f"[Cloudflare] Custom hostname added: {domain}, ID: {hostname_id}, SSL: {ssl_status}")
            
            return {
                "success": True,
                "hostname_id": hostname_id,
                "ssl_status": ssl_status,
                "ownership_verification": result.get("ownership_verification", {}),
                "ssl_validation": result.get("ssl", {}).get("validation_records", [])
            }
        else:
            errors = data.get("errors", [])
            error_msg = errors[0].get("message") if errors else "Unknown error"
            
            # Check if hostname already exists
            if "already exists" in error_msg.lower():
                logger.warning(f"[Cloudflare] Hostname already exists: {domain}")
                # Try to get existing hostname
                existing = get_custom_hostname(domain)
                if existing.get("success"):
                    return existing
            
            logger.error(f"[Cloudflare] Failed to add hostname {domain}: {error_msg}")
            return {
                "success": False,
                "error": error_msg
            }
            
    except requests.RequestException as e:
        logger.error(f"[Cloudflare] Request failed for {domain}: {str(e)}")
        return {
            "success": False,
            "error": f"API request failed: {str(e)}"
        }


def get_custom_hostname(domain: str) -> dict:
    """
    Get custom hostname details from Cloudflare.
    
    Args:
        domain: The custom domain to look up
        
    Returns:
        dict with hostname details
    """
    zone_id = settings.CLOUDFLARE_ZONE_ID
    
    if not zone_id or not settings.CLOUDFLARE_API_TOKEN:
        return {"success": False, "error": "Cloudflare API not configured"}
    
    url = f"{CLOUDFLARE_API_BASE}/zones/{zone_id}/custom_hostnames"
    params = {"hostname": domain}
    
    try:
        response = requests.get(url, params=params, headers=get_headers(), timeout=30)
        data = response.json()
        
        if data.get("success") and data.get("result"):
            result = data["result"][0] if data["result"] else None
            if result:
                return {
                    "success": True,
                    "hostname_id": result.get("id"),
                    "ssl_status": result.get("ssl", {}).get("status", "unknown"),
                    "status": result.get("status"),
                    "ownership_verification": result.get("ownership_verification", {}),
                }
        
        return {"success": False, "error": "Hostname not found"}
        
    except requests.RequestException as e:
        return {"success": False, "error": str(e)}


def check_ssl_status(hostname_id: str) -> dict:
    """
    Check SSL provisioning status for a custom hostname.
    
    Args:
        hostname_id: Cloudflare hostname ID
        
    Returns:
        dict with 'ssl_status' (pending, active, etc.)
    """
    zone_id = settings.CLOUDFLARE_ZONE_ID
    
    if not zone_id or not settings.CLOUDFLARE_API_TOKEN:
        return {"success": False, "error": "Cloudflare API not configured"}
    
    url = f"{CLOUDFLARE_API_BASE}/zones/{zone_id}/custom_hostnames/{hostname_id}"
    
    try:
        response = requests.get(url, headers=get_headers(), timeout=30)
        data = response.json()
        
        if data.get("success"):
            result = data.get("result", {})
            ssl_info = result.get("ssl", {})
            
            return {
                "success": True,
                "hostname_id": hostname_id,
                "ssl_status": ssl_info.get("status", "unknown"),
                "ssl_type": ssl_info.get("type"),
                "certificate_authority": ssl_info.get("certificate_authority"),
                "validation_records": ssl_info.get("validation_records", []),
                "status": result.get("status"),
            }
        else:
            errors = data.get("errors", [])
            return {
                "success": False,
                "error": errors[0].get("message") if errors else "Unknown error"
            }
            
    except requests.RequestException as e:
        return {"success": False, "error": str(e)}


def delete_custom_hostname(hostname_id: str) -> dict:
    """
    Delete a custom hostname from Cloudflare.
    
    Args:
        hostname_id: Cloudflare hostname ID
        
    Returns:
        dict with 'success' status
    """
    zone_id = settings.CLOUDFLARE_ZONE_ID
    
    if not zone_id or not settings.CLOUDFLARE_API_TOKEN:
        return {"success": False, "error": "Cloudflare API not configured"}
    
    url = f"{CLOUDFLARE_API_BASE}/zones/{zone_id}/custom_hostnames/{hostname_id}"
    
    try:
        response = requests.delete(url, headers=get_headers(), timeout=30)
        data = response.json()
        
        if data.get("success"):
            logger.info(f"[Cloudflare] Deleted custom hostname: {hostname_id}")
            return {"success": True}
        else:
            errors = data.get("errors", [])
            return {
                "success": False,
                "error": errors[0].get("message") if errors else "Unknown error"
            }
            
    except requests.RequestException as e:
        return {"success": False, "error": str(e)}


def refresh_ssl(hostname_id: str) -> dict:
    """
    Refresh/retry SSL provisioning for a custom hostname.
    
    Args:
        hostname_id: Cloudflare hostname ID
        
    Returns:
        dict with refresh status
    """
    zone_id = settings.CLOUDFLARE_ZONE_ID
    
    if not zone_id or not settings.CLOUDFLARE_API_TOKEN:
        return {"success": False, "error": "Cloudflare API not configured"}
    
    url = f"{CLOUDFLARE_API_BASE}/zones/{zone_id}/custom_hostnames/{hostname_id}"
    
    payload = {
        "ssl": {
            "method": "http",
            "type": "dv"
        }
    }
    
    try:
        response = requests.patch(url, json=payload, headers=get_headers(), timeout=30)
        data = response.json()
        
        if data.get("success"):
            result = data.get("result", {})
            return {
                "success": True,
                "ssl_status": result.get("ssl", {}).get("status", "pending")
            }
        else:
            errors = data.get("errors", [])
            return {
                "success": False,
                "error": errors[0].get("message") if errors else "Unknown error"
            }
            
    except requests.RequestException as e:
        return {"success": False, "error": str(e)}
