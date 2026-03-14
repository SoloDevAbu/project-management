#!/bin/sh
set -e

echo "Checking DATABASE_URL..."
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL is not set!"
    exit 1
fi

echo "DATABASE_URL is set"

echo "Verifying Prisma files..."
if [ ! -f "prisma/schema.prisma" ]; then
    echo "ERROR: prisma/schema.prisma not found!"
    exit 1
fi

echo "Running database migrations..."
npx prisma migrate deploy

echo "Database setup complete!"

echo "Starting Next.js application..."
exec "$@"