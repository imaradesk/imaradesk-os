# ImaraDesk

An open-source helpdesk and ticket management system built with Django and React.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.10+-green.svg)
![Django](https://img.shields.io/badge/django-5.0+-green.svg)

## Features

- **Ticket Management** - Create, assign, and track support tickets with customizable statuses and priorities
- **Email-to-Ticket** - Automatically convert incoming emails into support tickets with IMAP/POP3 polling
- **SLA Tracking** - Define service level agreements and monitor response/resolution times with auto-apply triggers
- **Knowledge Base** - Build a self-service knowledge base with categories, approvals, and versioning
- **Customer Portal** - Allow customers to submit tickets, track progress, view ticket details, and search KB articles
- **Task Management** - Create and manage tasks linked to tickets with status tracking
- **Team Management** - Organize agents into teams with roles and permissions
- **Email Notifications** - Automated email notifications with customizable templates
- **Reports & Analytics** - Track team performance and ticket metrics with visual charts
- **Guided Onboarding** - Step-by-step Quick Start wizard for initial setup (modules, channels, users, SLA, SMTP, notifications)
- **Channels** - Web and Email support channels with configuration UI
- **Two-Factor Authentication** - Secure your account with 2FA
- **Surveys** - Collect customer feedback after ticket resolution

## Requirements

- Python 3.10 or higher
- MySQL 8.0+ or PostgreSQL 12+
- Redis 6.0+ (for Celery background tasks)
- Node.js 18+ (for frontend development)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/imaradesk/imaradesk-os.git
cd imaradesk-os
```

### 2. Create Virtual Environment

```bash
python -m venv env
source env/bin/activate  # On Windows: env\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment

Copy the example environment file and update the values:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Django
SECRET_KEY=your-secret-key-here
DEBUG=True

# Database (MySQL)
DB_ENGINE=django.db.backends.mysql
DB_NAME=imaradesk
DB_USER=root
DB_PASSWORD=your-password
DB_HOST=127.0.0.1
DB_PORT=3306
DB_OPTIONS_INIT_COMMAND=SET sql_mode='STRICT_TRANS_TABLES'

# Redis
REDIS_URL=redis://localhost:6379/0

# Email
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USE_SSL=False
EMAIL_HOST_USER=your-email@example.com
EMAIL_HOST_PASSWORD=your-password
DEFAULT_FROM_EMAIL=noreply@example.com
DEFAULT_FROM_NAME=ImaraDesk
```

### 5. Create Database

**MySQL:**
```sql
CREATE DATABASE imaradesk CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**PostgreSQL:**
```sql
CREATE DATABASE imaradesk;
```

### 6. Run Migrations

```bash
python manage.py migrate
```

### 7. Build Frontend

```bash
cd frontend
npm install
npm run build
cd ..
```

### 8. Collect Static Files

```bash
python manage.py collectstatic --noinput
```

### 9. Start the Server

**Development:**
```bash
python manage.py runserver
```

**Production (with Gunicorn):**
```bash
gunicorn config.wsgi:application --bind 0.0.0.0:8000
```

### 10. Start Celery Worker (for background tasks)

In a separate terminal:

```bash
celery -A config worker -l info
```

For scheduled tasks (SLA checks, etc.):

```bash
celery -A config beat -l info
```

### Quick Start (All Services at Once)

Use the included dev script to start Django, Celery worker, Celery beat, and Vite dev server in one command:

```bash
chmod +x dev.sh
./dev.sh
```

## First-Time Setup

1. Open your browser and go to `http://localhost:8000`
2. Complete the onboarding wizard to:
   - Create your business/organization
   - Set up your first admin user
   - Configure basic settings

## Project Structure

```
imaradesk-os/
├── config/             # Django project configuration
│   ├── settings.py     # Main settings file
│   ├── urls.py         # URL routing
│   ├── celery.py       # Celery configuration
│   └── wsgi.py         # WSGI entry point
├── modules/            # Application modules
│   ├── core/           # Core functionality
│   ├── tickets/        # Ticket management (views/routing)
│   ├── ticket/         # Ticket model and signals
│   ├── people/         # Contacts and customers
│   ├── users/          # User management
│   ├── kb/             # Knowledge base
│   ├── sla/            # SLA management
│   ├── settings/       # App settings, channels, marketplace
│   ├── customer_portal/# Customer portal
│   ├── email_to_ticket/# Email-to-ticket conversion (IMAP/POP3)
│   ├── onboarding/     # Guided onboarding wizard
│   ├── tasks/          # Task management
│   └── crons/          # Scheduled tasks
├── shared/             # Shared utilities and middleware
├── frontend/           # React frontend (Vite)
├── templates/          # Django templates
├── static/             # Static files
└── media/              # User uploads
```

## Development

### Frontend Development

```bash
cd frontend
npm run dev
```

This starts Vite in development mode with hot reload.

### Running Tests

```bash
python manage.py test
```

## Production Deployment

### Using Gunicorn + Nginx

1. Install Gunicorn (already in requirements.txt)
2. Configure Nginx as reverse proxy
3. Set `DEBUG=False` in `.env`
4. Configure proper `ALLOWED_HOSTS` and `CSRF_TRUSTED_ORIGINS`
5. Use process manager (systemd, supervisor) for Gunicorn and Celery

### Environment Variables for Production

```env
DEBUG=False
SECRET_KEY=<generate-a-long-random-key>
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com
CSRF_TRUSTED_ORIGINS=https://yourdomain.com
SESSION_COOKIE_DOMAIN=.yourdomain.com
```

### Using Docker (Coming Soon)

Docker support is planned for future releases.

## Configuration Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | Django secret key | Required |
| `DEBUG` | Debug mode | `True` |
| `ALLOWED_HOSTS` | Comma-separated hosts | `localhost,127.0.0.1` |
| `DB_ENGINE` | Database engine | `django.db.backends.mysql` |
| `DB_NAME` | Database name | Required |
| `DB_USER` | Database user | Required |
| `DB_PASSWORD` | Database password | Required |
| `DB_HOST` | Database host | `127.0.0.1` |
| `DB_PORT` | Database port | `3306` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379/0` |
| `EMAIL_HOST` | SMTP server | Required |
| `EMAIL_PORT` | SMTP port | `587` |
| `EMAIL_USE_SSL` | Use SSL for SMTP | `False` |
| `EMAIL_HOST_USER` | SMTP username | Required |
| `EMAIL_HOST_PASSWORD` | SMTP password | Required |
| `DEFAULT_FROM_EMAIL` | Default sender email | Required |
| `DEFAULT_FROM_NAME` | Default sender name | `ImaraDesk` |

## Support

- **Documentation**: [docs.imaradesk.com](https://docs.imaradesk.com) (coming soon)
- **Issues**: [GitHub Issues](https://github.com/imaradesk/imaradesk-os/issues)
- **Discussions**: [GitHub Discussions](https://github.com/imaradesk/imaradesk-os/discussions)
- **Email**: support@imaradesk.com

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Django](https://www.djangoproject.com/) - The web framework
- [React](https://reactjs.org/) - Frontend library
- [Inertia.js](https://inertiajs.com/) - Modern monolith approach
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Celery](https://celeryproject.org/) - Distributed task queue