#!/bin/sh
# wait-for-db.sh

set -e

host="$1"
shift

# This line uses the environment variables to check the database
until PGPASSWORD=$POSTGRES_PASSWORD psql -h "$host" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q'; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

>&2 echo "Postgres is up - executing command"
# This line starts the main application
exec uvicorn app.main:app --host 0.0.0.0 --port 8000