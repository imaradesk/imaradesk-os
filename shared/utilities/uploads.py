"""
File upload validation and storage.

Files go to the external files service when FILES_SERVICE_URL is set, otherwise
they are stored with Django's default storage under MEDIA_ROOT.
"""
import base64
import binascii
import logging
import os
import re
import uuid

import requests
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile

from shared.utilities.organization import site_url

logger = logging.getLogger(__name__)

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'}

# Deliberately an allow-list: anything a browser would execute (html, svg, js, ...)
# or an operating system would run (exe, sh, bat, ...) is left out.
ALLOWED_EXTENSIONS = IMAGE_EXTENSIONS | {
    '.heic', '.tif', '.tiff',
    '.pdf', '.txt', '.log', '.csv', '.md', '.rtf', '.json', '.xml',
    '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp',
    '.zip', '.gz', '.tar', '.7z', '.rar',
    '.eml', '.msg', '.ics', '.vcf',
    '.mp3', '.wav', '.ogg', '.m4a', '.mp4', '.mov', '.webm', '.avi', '.mkv',
}

DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024


class UploadError(Exception):
    """A rejected or failed upload. The message is safe to show to the client."""

    def __init__(self, message, status=400):
        super().__init__(message)
        self.message = message
        self.status = status


def max_upload_bytes():
    return getattr(settings, 'MAX_UPLOAD_BYTES', DEFAULT_MAX_UPLOAD_BYTES)


def validate_upload(file, allowed_extensions=None, max_bytes=None):
    """Raise UploadError unless the file passes the type and size checks."""
    allowed = allowed_extensions or ALLOWED_EXTENSIONS
    limit = max_bytes or max_upload_bytes()
    extension = os.path.splitext(file.name or '')[1].lower()
    if extension not in allowed:
        raise UploadError('This file type is not allowed')
    if file.size > limit:
        raise UploadError(f'File is too large (maximum {limit // (1024 * 1024)} MB)')
    if extension in IMAGE_EXTENSIONS:
        head = file.read(16)
        file.seek(0)
        signatures = (b'\xff\xd8\xff', b'\x89PNG\r\n\x1a\n', b'GIF87a', b'GIF89a', b'BM', b'RIFF')
        if not head.startswith(signatures):
            raise UploadError('The file is not a valid image')
    return extension


def _safe_folder(category):
    return re.sub(r'[^a-z0-9_-]', '', str(category or '').lower())[:40] or 'attachments'


def store_upload(file, category='attachments', allowed_extensions=None, max_bytes=None):
    """
    Validate and store an uploaded file.

    Returns a dict with url, original_name, size, mime_type and file_id.
    """
    extension = validate_upload(file, allowed_extensions, max_bytes)
    folder = _safe_folder(category)
    files_service_url = getattr(settings, 'FILES_SERVICE_URL', '')

    if not files_service_url:
        try:
            file_id = uuid.uuid4().hex
            path = default_storage.save(f'uploads/{folder}/{file_id}{extension}', file)
        except OSError:
            logger.exception('Failed to store upload')
            raise UploadError('Failed to upload file', status=500)
        return {
            'url': site_url(default_storage.url(path)),
            'original_name': os.path.basename(file.name),
            'size': file.size,
            'mime_type': file.content_type,
            'file_id': file_id,
        }

    try:
        response = requests.post(
            f"{files_service_url.rstrip('/')}/api/upload",
            files={'file': (file.name, file.read(), file.content_type)},
            data={'category': folder, 'org': 'default'},
            timeout=60,
        )
        result = response.json()
    except (requests.exceptions.RequestException, ValueError):
        logger.exception('Files service upload failed')
        raise UploadError('Failed to upload file', status=502)

    uploaded = (result.get('data') or {}).get('uploaded') or []
    if response.status_code != 201 or not result.get('success') or not uploaded:
        logger.error('Files service rejected upload: %s', result.get('error'))
        raise UploadError('Failed to upload file')
    return uploaded[0]


def store_image_data(data_url, name, category, max_bytes=5 * 1024 * 1024):
    """Store a base64 (data URL) image and return its URL."""
    header, _, encoded = str(data_url).rpartition(',')
    header = header.lower()
    ext, content_type = ('png', 'image/png') if 'png' in header else (
        ('gif', 'image/gif') if 'gif' in header else ('jpg', 'image/jpeg'))
    try:
        raw = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError):
        raise UploadError('Invalid image data')
    file = SimpleUploadedFile(f'{name}.{ext}', raw, content_type=content_type)
    return store_upload(file, category, IMAGE_EXTENSIONS, max_bytes)['url']
