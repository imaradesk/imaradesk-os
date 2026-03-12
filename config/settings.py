from pathlib import Path
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY', default='django-insecure-change-this-in-production-please')

DEBUG = config('DEBUG', default=True, cast=bool)

# Application name for single-tenant mode
APP_NAME = config('APP_NAME', default='ImaraDesk')

ALLOWED_HOSTS = ["*"]
# =========================
# CORS CONFIGURATION
# =========================

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='http://localhost:8000,http://127.0.0.1:8000', cast=lambda v: [s.strip() for s in v.split(',') if s.strip()])


# =========================
# CSRF CONFIGURATION
# =========================

# CSRF trusted origins - configure via .env
CSRF_TRUSTED_ORIGINS = config('CSRF_TRUSTED_ORIGINS', default='http://localhost:8000,http://127.0.0.1:8000', cast=lambda v: [s.strip() for s in v.split(',') if s.strip()])

# Session and CSRF cookie settings
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'

if not DEBUG:
    # Production: Enable secure cookies
    SESSION_COOKIE_DOMAIN = config('SESSION_COOKIE_DOMAIN', default=None)
    CSRF_COOKIE_DOMAIN = config('CSRF_COOKIE_DOMAIN', default=None)
    CSRF_COOKIE_SECURE = True
    SESSION_COOKIE_SECURE = True

# Session timeout settings
# Session expires after 10 minutes (600 seconds) of inactivity
SESSION_COOKIE_AGE = 1200  # 20 minutes in seconds
SESSION_SAVE_EVERY_REQUEST = True  # Refresh session on each request (resets timeout)
SESSION_EXPIRE_AT_BROWSER_CLOSE = False  # Keep using cookie age instead of browser close

# Proxy SSL header for production (when behind reverse proxy)
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Primary domain for the application
PRIMARY_DOMAIN = config('PRIMARY_DOMAIN', default='localhost:8000')

# For debug context processor
INTERNAL_IPS = ['127.0.0.1', 'localhost']

# Single-tenant application - all apps in one list
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',  # Required for email notifications
    # Third-party apps
    'corsheaders',
    'django_celery_beat',  # Celery Beat scheduler
    'django_celery_results',  # Celery task results
    'inertia',
    # Shared/Core apps
    'shared',
    'modules.crons',  # Centralized scheduled tasks (crons)
    # Core modules
    'modules.core',
    'modules.tickets',
    'modules.people',
    # Data modules
    'modules.users',
    'modules.kb',
    'modules.settings',
    'modules.ticket',
    'modules.sla',
    'modules.customer_portal',
]

SITE_ID = 1 

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    # 'shared.middlewares.CsrfMiddleware.InertiaCSRFMiddleware',
    # 'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'shared.middlewares.OnboardingMiddleware.OnboardingMiddleware',
    'inertia.middleware.InertiaMiddleware',
    'shared.middlewares.InertiaMiddleware.inertia_share',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.template.context_processors.csrf',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': config('DB_ENGINE'),
        'NAME': config('DB_NAME'),
        'USER': config('DB_USER'),
        'PASSWORD': config('DB_PASSWORD'),
        'HOST': config('DB_HOST'),
        'PORT': config('DB_PORT'),
        'OPTIONS': {
            'init_command': config('DB_OPTIONS_INIT_COMMAND'),
        },
    }
}

# imanidesk_90009

# =========================
# CACHE CONFIGURATION
# =========================
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
        'TIMEOUT': 300,  # 5 minutes default timeout
        'OPTIONS': {
            'MAX_ENTRIES': 1000
        }
    }
}

# Cache key prefixes
VIEWS_CACHE_TIMEOUT = 300  # 5 minutes for ticket views

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Only add frontend dist if it exists
FRONTEND_DIST = BASE_DIR / 'frontend' / 'dist'
STATIC_DIR = BASE_DIR / 'static'

STATICFILES_DIRS = []
if FRONTEND_DIST.exists():
    STATICFILES_DIRS.append(FRONTEND_DIST)
if STATIC_DIR.exists():
    STATICFILES_DIRS.append(STATIC_DIR)

# Media files (uploads)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# WhiteNoise configuration - only use manifest storage in production
if not DEBUG:
    MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
    STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Inertia configuration
INERTIA_LAYOUT = 'base.html'
INERTIA_SSR_ENABLED = False

# Login settings
LOGIN_URL = '/login/'
LOGIN_REDIRECT_URL = '/dashboard/'
LOGOUT_REDIRECT_URL = '/'

# CSRF settings for JavaScript/AJAX
CSRF_COOKIE_HTTPONLY = False  # Allow JavaScript to read CSRF cookie
CSRF_USE_SESSIONS = False  # Use cookie-based CSRF tokens

# Logging configuration
# LOGGING = {
#     'version': 1,
#     'disable_existing_loggers': False,
#     'formatters': {
#         'verbose': {
#             'format': '{levelname} {asctime} {module} {message}',
#             'style': '{',
#         },
#     },
#     'handlers': {
#         'console': {
#             'class': 'logging.StreamHandler',
#             'formatter': 'verbose',
#         },
#     },
#     'root': {
#         'handlers': ['console'],
#         'level': 'DEBUG',  # Changed to DEBUG
#     },
#     'loggers': {
#         'django': {
#             'handlers': ['console'],
#             'level': 'INFO',
#             'propagate': False,
#         },
#         'django.request': {
#             'handlers': ['console'],
#             'level': 'DEBUG',  # Changed to DEBUG to see full errors
#             'propagate': False,
#         },
#         'django_tenants': {
#             'handlers': ['console'],
#             'level': 'DEBUG',
#             'propagate': False,
#         },
#     },
# }


# Email hosting
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'

EMAIL_HOST = config('EMAIL_HOST')
EMAIL_PORT = config('EMAIL_PORT', cast=int)
EMAIL_USE_SSL = config('EMAIL_USE_SSL', cast=bool)
EMAIL_USE_TLS = False
EMAIL_HOST_USER = config('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL')
DEFAULT_FROM_NAME = config('DEFAULT_FROM_NAME', default='ImaraDesk')

# =========================
# CELERY CONFIGURATION
# =========================

# Redis as message broker
CELERY_BROKER_URL = config('REDIS_URL', default='redis://localhost:6379/0')

# Celery settings
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 300  # 5 minutes max per task
CELERY_WORKER_HIJACK_ROOT_LOGGER = False

# Store task results in Django database
CELERY_RESULT_BACKEND = 'django-db'
CELERY_CACHE_BACKEND = 'default'
