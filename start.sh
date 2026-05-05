#!/bin/bash
set -e

echo "Starting ImaraDesk OS..."

# Create logs directory
mkdir -p /app/logs
echo "✓ Logs directory ready"

# Set default environment variables if not set
export GUNICORN_WORKERS=${GUNICORN_WORKERS:-3}
export CELERY_CONCURRENCY=${CELERY_CONCURRENCY:-2}

# Run migrations
echo "Running migrations..."
python manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Initialize default data
echo "Initializing default data..."
python manage.py coredesk --init

# Start supervisord
echo "Starting services..."
exec supervisord -c /app/supervisord.conf
