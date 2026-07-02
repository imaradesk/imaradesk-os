#!/bin/bash
set -e

echo "Starting ImaraDesk OS..."

# Create logs directory
mkdir -p /app/logs
echo "✓ Logs directory ready"

# Set default environment variables if not set
export GUNICORN_WORKERS=${GUNICORN_WORKERS:-3}
export CELERY_CONCURRENCY=${CELERY_CONCURRENCY:-2}

# Database connection check
echo ""
echo "============================================================"
echo "  Checking database connection..."
echo "============================================================"
python /app/check_db.py
echo "✓ Database connection verified"

# Run migrations
echo ""
echo "============================================================"
echo "  Running database migrations..."
echo "============================================================"
python manage.py migrate --noinput

# Collect static files
echo ""
echo "============================================================"
echo "  Collecting static files..."
echo "============================================================"
python manage.py collectstatic --noinput

# Initialize default data
echo ""
echo "============================================================"
echo "  Initializing default data..."
echo "============================================================"
python manage.py coredesk --init

# Start supervisord
echo ""
echo "============================================================"
echo "  Starting services..."
echo "============================================================"
exec supervisord -c /app/supervisord.conf
