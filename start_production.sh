#!/bin/bash

# Load production environment variables
export $(grep -v '^#' .env.production | xargs)

# Create database tables if they don't exist
echo "Initializing database..."
python -c "
from app.services.database import engine
from app.models import Base
Base.metadata.create_all(bind=engine)
print('Database tables created successfully')
"

# Start the production server
echo "Starting production server..."
uvicorn app.main:app --host $APP_HOST --port $APP_PORT --workers 4