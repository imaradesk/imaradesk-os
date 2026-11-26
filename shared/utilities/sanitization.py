"""
Input Sanitization Utilities

Utility functions for sanitizing user input in views and forms.
These provide additional sanitization beyond the middleware layer.
"""

import re
import html
import bleach
from bleach.css_sanitizer import CSSSanitizer
from typing import Any, List, Optional


# Allowed HTML tags for rich text content
ALLOWED_TAGS = [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'div', 'span',
    'hr',
]

# Allowed HTML attributes
ALLOWED_ATTRIBUTES = {
    '*': ['class', 'id', 'style'],
    'a': ['href', 'title', 'target', 'rel'],
    'img': ['src', 'alt', 'title', 'width', 'height'],
    'table': ['border', 'cellpadding', 'cellspacing'],
    'td': ['colspan', 'rowspan'],
    'th': ['colspan', 'rowspan'],
}

# Allowed protocols for URLs
ALLOWED_PROTOCOLS = ['http', 'https', 'mailto', 'tel']


def sanitize_html(content: str, extra_tags: Optional[List[str]] = None) -> str:
    """
    Sanitize HTML content, allowing only safe tags and attributes.
    
    Args:
        content: HTML content to sanitize
        extra_tags: Additional tags to allow beyond the default list
        
    Returns:
        Sanitized HTML string
    """
    if not content:
        return ''
    
    tags = ALLOWED_TAGS.copy()
    if extra_tags:
        tags.extend(extra_tags)
    
    # Clean HTML using bleach
    cleaned = bleach.clean(
        content,
        tags=tags,
        attributes=ALLOWED_ATTRIBUTES,
        protocols=ALLOWED_PROTOCOLS,
        strip=True,
    )
    
    return cleaned


def _rich_text_attribute(tag, name, value):
    """Attributes kept in user-written rich text (ticket descriptions and comments)."""
    if value.strip().lower().startswith('data:') and not (
        tag == 'img' and name == 'src' and re.match(r'data:image/(png|jpe?g|gif|webp);base64,', value.strip(), re.I)
    ):
        return False
    if name.startswith('data-') or name in ('class', 'style', 'title'):
        return True
    return name in ALLOWED_ATTRIBUTES.get(tag, [])


def sanitize_rich_text(content: str) -> str:
    """Strip scripts, event handlers and unsafe URLs from HTML that the UI renders as-is."""
    if not content:
        return content
    # Drop the whole content of script/style blocks, not just the tags
    content = re.sub(r'<(script|style)\b[^>]*>.*?</\1\s*>', '', content, flags=re.I | re.S)
    return bleach.clean(
        content,
        tags=ALLOWED_TAGS + ['font', 'sub', 'sup', 'mark', 'figure', 'figcaption'],
        attributes=_rich_text_attribute,
        protocols=ALLOWED_PROTOCOLS + ['cid', 'data'],
        css_sanitizer=CSSSanitizer(),
        strip=True,
        strip_comments=True,
    )


def sanitize_plain_text(text: str) -> str:
    """
    Sanitize plain text by escaping HTML entities.
    
    Args:
        text: Text to sanitize
        
    Returns:
        Text with HTML entities escaped
    """
    if not text:
        return ''
    
    return html.escape(text)


def sanitize_filename(filename: str) -> str:
    """
    Sanitize a filename to prevent path traversal and other attacks.
    
    Args:
        filename: Original filename
        
    Returns:
        Sanitized filename
    """
    if not filename:
        return ''
    
    # Remove path components
    filename = filename.replace('\\', '/').split('/')[-1]
    
    # Remove null bytes
    filename = filename.replace('\x00', '')
    
    # Remove dangerous characters
    filename = re.sub(r'[<>:"|?*]', '_', filename)
    
    # Remove leading/trailing dots and spaces
    filename = filename.strip('. ')
    
    # Limit length
    if len(filename) > 255:
        name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
        if ext:
            filename = name[:250] + '.' + ext
        else:
            filename = filename[:255]
    
    return filename or 'unnamed'


def sanitize_email(email: str) -> str:
    """
    Sanitize and validate email format.
    
    Args:
        email: Email address to sanitize
        
    Returns:
        Sanitized email or empty string if invalid
    """
    if not email:
        return ''
    
    email = email.strip().lower()
    
    # Basic email regex
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    
    if re.match(email_regex, email):
        return email
    
    return ''


def sanitize_url(url: str) -> str:
    """
    Sanitize URL, ensuring it uses safe protocols.
    
    Args:
        url: URL to sanitize
        
    Returns:
        Sanitized URL or empty string if unsafe
    """
    if not url:
        return ''
    
    url = url.strip()
    
    # Check for javascript: and other dangerous protocols
    dangerous_protocols = ['javascript:', 'vbscript:', 'data:', 'file:']
    url_lower = url.lower()
    
    for protocol in dangerous_protocols:
        if url_lower.startswith(protocol):
            return ''
    
    # If no protocol, assume https
    if not url.startswith(('http://', 'https://', '//', '/')):
        url = 'https://' + url
    
    return url


def sanitize_integer(value: Any, default: int = 0, min_val: Optional[int] = None, max_val: Optional[int] = None) -> int:
    """
    Safely convert value to integer with bounds checking.
    
    Args:
        value: Value to convert
        default: Default value if conversion fails
        min_val: Minimum allowed value
        max_val: Maximum allowed value
        
    Returns:
        Sanitized integer value
    """
    try:
        result = int(value)
    except (ValueError, TypeError):
        return default
    
    if min_val is not None:
        result = max(result, min_val)
    if max_val is not None:
        result = min(result, max_val)
    
    return result


def sanitize_string(value: str, max_length: int = 255, strip: bool = True) -> str:
    """
    Sanitize string with length limit and optional stripping.
    
    Args:
        value: String to sanitize
        max_length: Maximum allowed length
        strip: Whether to strip whitespace
        
    Returns:
        Sanitized string
    """
    if not value:
        return ''
    
    if strip:
        value = value.strip()
    
    # Remove null bytes
    value = value.replace('\x00', '')
    
    # Limit length
    if len(value) > max_length:
        value = value[:max_length]
    
    return value


def sanitize_search_query(query: str) -> str:
    """
    Sanitize a search query, removing SQL-like operators.
    
    Args:
        query: Search query to sanitize
        
    Returns:
        Sanitized search query
    """
    if not query:
        return ''
    
    query = query.strip()
    
    # Remove SQL operators
    dangerous_patterns = [
        r'\bOR\b\s+\d+\s*=\s*\d+',
        r'\bAND\b\s+\d+\s*=\s*\d+',
        r"'\s*(OR|AND)\s+'",
        r'--',
        r';',
        r'/\*',
        r'\*/',
    ]
    
    for pattern in dangerous_patterns:
        query = re.sub(pattern, '', query, flags=re.IGNORECASE)
    
    # Limit length
    if len(query) > 200:
        query = query[:200]
    
    return query


def sanitize_json_field(value: Any) -> Any:
    """
    Recursively sanitize a JSON-serializable value.
    
    Args:
        value: Value to sanitize (dict, list, str, int, etc.)
        
    Returns:
        Sanitized value
    """
    if isinstance(value, dict):
        return {k: sanitize_json_field(v) for k, v in value.items()}
    elif isinstance(value, list):
        return [sanitize_json_field(item) for item in value]
    elif isinstance(value, str):
        # Escape HTML entities in strings
        return html.escape(value)
    else:
        return value


def is_safe_redirect_url(url: str, allowed_hosts: Optional[List[str]] = None) -> bool:
    """
    Check if a URL is safe for redirect (not an open redirect vulnerability).
    
    Args:
        url: URL to check
        allowed_hosts: List of allowed hosts (defaults to same-site only)
        
    Returns:
        True if URL is safe for redirect
    """
    if not url:
        return False
    
    url = url.strip()
    
    # Relative URLs are safe
    if url.startswith('/') and not url.startswith('//'):
        return True
    
    # Check for dangerous protocols
    url_lower = url.lower()
    dangerous = ['javascript:', 'vbscript:', 'data:']
    if any(url_lower.startswith(p) for p in dangerous):
        return False
    
    # Check host if absolute URL
    if url.startswith(('http://', 'https://', '//')):
        from urllib.parse import urlparse
        try:
            parsed = urlparse(url)
            if allowed_hosts:
                return parsed.netloc in allowed_hosts
            return False  # Disallow external redirects by default
        except Exception:
            return False
    
    return False
