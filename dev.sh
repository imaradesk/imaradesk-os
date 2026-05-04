#!/bin/bash
# Local development script to run all services
# Usage: ./start_dev.sh

set -e

echo "=============================================="
echo "  ImaraDesk Development Environment"
echo "=============================================="

# Check if Redis is running
if ! command -v redis-cli &> /dev/null; then
    echo "Warning: redis-cli not found. Make sure Redis is installed and running."
    echo "  Install: sudo apt install redis-server"
    echo "  Start: sudo systemctl start redis"
fi

if redis-cli ping &> /dev/null; then
    echo "✓ Redis is running"
else
    echo "✗ Redis is not running. Please start Redis first:"
    echo "  sudo systemctl start redis"
    echo "  or: redis-server"
    exit 1
fi

# Activate virtual environment
if [ -f "env/bin/activate" ]; then
    source env/bin/activate
    echo "✓ Virtual environment activated"
else
    echo "✗ Virtual environment not found. Run: python -m venv env"
    exit 1
fi

# Export settings
export DJANGO_SETTINGS_MODULE=config.settings
export REDIS_URL=${REDIS_URL:-redis://localhost:6379/0}

echo ""
echo "Starting services..."
echo "  - Django (http://localhost:8000)"
echo "  - Celery Worker"
echo "  - Celery Beat (email polling every 10s)"
echo "  - Frontend (Vite dev server)"
echo ""
echo "Press Ctrl+C to stop all services"
echo "=============================================="

# Track all running child PIDs
PIDS=()

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping all services..."
    # Kill all tracked child processes and their process groups
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill -TERM -- -"$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null
        fi
    done
    # Kill any remaining background jobs
    kill $(jobs -p) 2>/dev/null
    # Wait briefly then force kill anything still alive
    sleep 1
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill -9 -- -"$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null
        fi
    done
    wait 2>/dev/null
    echo "All services stopped."
}
trap cleanup SIGINT SIGTERM EXIT

# Start Django development server
echo "[Django] Starting..."
set -m
python manage.py runserver 0.0.0.0:8000 &
PIDS+=($!)

# Wait for Django to start
sleep 2

# Start Celery worker
echo "[Celery Worker] Starting..."
celery -A config worker --loglevel=info --concurrency=2 -Q celery,email_processing,sla_notifications,reports,asset_management &
PIDS+=($!)

# Wait for worker to start
sleep 2

# Start Celery Beat scheduler
echo "[Celery Beat] Starting..."
celery -A config beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler &
PIDS+=($!)

# Start Frontend dev server
echo "[Frontend] Starting..."
cd frontend && npm run dev &
PIDS+=($!)
cd ..

# Wait for all background processes
wait
