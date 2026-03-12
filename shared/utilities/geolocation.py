"""
Geolocation utilities for IP address lookup.
Uses ip-api.com free API for geolocation data.
"""
import requests
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


def get_client_ip(request) -> Optional[str]:
    """
    Get the real client IP address from a request.
    Handles proxies and load balancers.
    """
    # Check for forwarded headers (in order of preference)
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        # Take the first IP in the chain (original client)
        ip = x_forwarded_for.split(',')[0].strip()
        return ip
    
    x_real_ip = request.META.get('HTTP_X_REAL_IP')
    if x_real_ip:
        return x_real_ip.strip()
    
    # Fallback to REMOTE_ADDR
    return request.META.get('REMOTE_ADDR')


def get_geolocation(ip_address: str) -> Optional[Dict[str, Any]]:
    """
    Get geolocation data for an IP address using ip-api.com.
    
    Returns dict with:
        - country: Country name
        - country_code: ISO country code
        - region: Region/State name  
        - region_code: Region code
        - city: City name
        - zip: Postal code
        - lat: Latitude
        - lon: Longitude
        - timezone: Timezone string
        - isp: Internet Service Provider
        - org: Organization
        - as: AS number and name
        - query: The IP queried
    
    Returns None if lookup fails or IP is private/localhost.
    """
    # Skip private/local IPs
    if not ip_address or ip_address in ('127.0.0.1', 'localhost', '::1'):
        return None
    
    # Check for private IP ranges
    if ip_address.startswith(('10.', '172.16.', '172.17.', '172.18.', '172.19.',
                              '172.20.', '172.21.', '172.22.', '172.23.', '172.24.',
                              '172.25.', '172.26.', '172.27.', '172.28.', '172.29.',
                              '172.30.', '172.31.', '192.168.')):
        return None
    
    try:
        # ip-api.com free endpoint (no API key needed, 45 requests/minute limit)
        response = requests.get(
            f'http://ip-api.com/json/{ip_address}',
            params={
                'fields': 'status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query'
            },
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get('status') == 'success':
                return {
                    'country': data.get('country'),
                    'country_code': data.get('countryCode'),
                    'region': data.get('regionName'),
                    'region_code': data.get('region'),
                    'city': data.get('city'),
                    'zip': data.get('zip'),
                    'lat': data.get('lat'),
                    'lon': data.get('lon'),
                    'timezone': data.get('timezone'),
                    'isp': data.get('isp'),
                    'org': data.get('org'),
                    'as': data.get('as'),
                    'ip': data.get('query'),
                }
            else:
                logger.warning(f"Geolocation lookup failed for {ip_address}: {data.get('message')}")
                return None
        else:
            logger.warning(f"Geolocation API returned status {response.status_code} for {ip_address}")
            return None
            
    except requests.Timeout:
        logger.warning(f"Geolocation lookup timed out for {ip_address}")
        return None
    except requests.RequestException as e:
        logger.warning(f"Geolocation lookup error for {ip_address}: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error in geolocation lookup for {ip_address}: {e}")
        return None


def format_location(geo_data: Optional[Dict[str, Any]]) -> str:
    """
    Format geolocation data into a readable location string.
    
    Returns formatted string like "New York, NY, United States" or "N/A".
    """
    if not geo_data:
        return "N/A"
    
    parts = []
    
    if geo_data.get('city'):
        parts.append(geo_data['city'])
    
    if geo_data.get('region_code'):
        parts.append(geo_data['region_code'])
    elif geo_data.get('region'):
        parts.append(geo_data['region'])
    
    if geo_data.get('country'):
        parts.append(geo_data['country'])
    
    return ', '.join(parts) if parts else "N/A"
