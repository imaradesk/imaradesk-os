#!/usr/bin/env python3
"""
Database Connection Checker for ImaraDesk OS.
Verifies the database is reachable and configured correctly before starting services.
Supports PostgreSQL and MySQL drivers.
"""
import os
import sys
import time

# Maximum retries
MAX_RETRIES = int(os.environ.get('DB_CONNECT_RETRIES', '30'))
RETRY_DELAY = int(os.environ.get('DB_CONNECT_RETRY_DELAY', '2'))


def get_db_config():
    """Read database config from environment variables (same as Django settings)."""
    engine = os.environ.get('DB_ENGINE', 'django.db.backends.postgresql')
    default_ports = {
        'django.db.backends.postgresql': 5432,
        'django.db.backends.mysql': 3306,
    }
    default_port = default_ports.get(engine, 5432)
    driver_name = 'PostgreSQL' if 'postgresql' in engine else 'MySQL'

    return {
        'engine': engine,
        'driver': driver_name.lower(),
        'name': os.environ.get('DB_NAME', 'imaradesk'),
        'user': os.environ.get('DB_USER', 'postgres'),
        'password': os.environ.get('DB_PASSWORD', ''),
        'host': os.environ.get('DB_HOST', '127.0.0.1'),
        'port': int(os.environ.get('DB_PORT', str(default_port))),
    }


def check_postgresql(cfg):
    """Test PostgreSQL connection."""
    import psycopg2
    conn = psycopg2.connect(
        dbname=cfg['name'],
        user=cfg['user'],
        password=cfg['password'],
        host=cfg['host'],
        port=cfg['port'],
        connect_timeout=5,
    )
    cur = conn.cursor()
    cur.execute('SELECT version();')
    version = cur.fetchone()[0]
    cur.close()
    conn.close()
    return version


def check_mysql(cfg):
    """Test MySQL/MariaDB connection."""
    import MySQLdb
    conn = MySQLdb.connect(
        db=cfg['name'],
        user=cfg['user'],
        passwd=cfg['password'],
        host=cfg['host'],
        port=cfg['port'],
        connect_timeout=5,
    )
    cur = conn.cursor()
    cur.execute('SELECT version();')
    version = cur.fetchone()[0]
    cur.close()
    conn.close()
    return version


def main():
    cfg = get_db_config()
    print(f"\n{'='*60}")
    print(f"  ImaraDesk OS — Database Connection Check")
    print(f"{'='*60}")
    print(f"  Driver  : {cfg['driver']}")
    print(f"  Engine  : {cfg['engine']}")
    print(f"  Host    : {cfg['host']}")
    print(f"  Port    : {cfg['port']}")
    print(f"  Database: {cfg['name']}")
    print(f"  User    : {cfg['user']}")
    print(f"{'='*60}\n")

    # Determine which checker to use
    if 'postgresql' in cfg['engine']:
        check_fn = check_postgresql
        display_name = 'PostgreSQL'
    elif 'mysql' in cfg['engine']:
        check_fn = check_mysql
        display_name = 'MySQL/MariaDB'
    else:
        print(f"[ERROR] Unsupported database engine: {cfg['engine']}")
        print("  Supported engines: django.db.backends.postgresql, django.db.backends.mysql")
        sys.exit(1)

    # Try to connect with retries
    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            print(f"[{attempt}/{MAX_RETRIES}] Attempting to connect to {display_name} on {cfg['host']}:{cfg['port']}...")
            version = check_fn(cfg)
            print(f"  ✓ Connected successfully!")
            print(f"  ✓ Server version: {version}")
            print(f"\n{'='*60}")
            print(f"  Database connection OK — continuing startup")
            print(f"{'='*60}\n")
            return 0
        except Exception as e:
            last_error = e
            print(f"  ✗ Connection failed: {e}")
            if attempt < MAX_RETRIES:
                print(f"  Retrying in {RETRY_DELAY}s...\n")
                time.sleep(RETRY_DELAY)
            else:
                print(f"\n[ERROR] Could not connect to database after {MAX_RETRIES} attempts.")
                print(f"  Last error: {last_error}")
                print(f"\n  Troubleshooting tips:")
                print(f"    • Is the database server running on {cfg['host']}:{cfg['port']}?")
                print(f"    • Are the credentials in .env correct?")
                print(f"    • Does the database '{cfg['name']}' exist?")
                print(f"    • For Docker: use -e DB_HOST=host.docker.internal and --add-host=host.docker.internal:host-gateway")
                print(f"    • Check firewall/network rules\n")
                sys.exit(1)


if __name__ == '__main__':
    sys.exit(main())
