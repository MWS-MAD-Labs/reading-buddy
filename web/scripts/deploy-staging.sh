#!/bin/bash

# Deployment script for staging database
# Usage: ./deploy-staging.sh <db_host> <db_password> <db_user> <db_name>

if [ "$#" -ne 4 ]; then
    echo "Usage: $0 <db_host> <db_password> <db_user> <db_name>"
    echo "Example: $0 db.staging.com mypassword reading_buddy_staging reading_buddy_staging"
    exit 1
fi

DB_HOST=$1
DB_PASSWORD=$2
DB_USER=$3
DB_NAME=$4

echo "🚀 Deploying to staging database at $DB_HOST..."

# Run the setup script with staging credentials
DB_HOST=$DB_HOST \
DB_PORT=5432 \
DB_USER=$DB_USER \
DB_PASSWORD=$DB_PASSWORD \
DB_NAME=$DB_NAME \
DB_SSL=true \
npm run db:setup

echo "✅ Deployment complete!"
