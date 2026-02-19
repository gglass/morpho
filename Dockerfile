# Build stage for frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Install build dependencies (tsc needs these)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY frontend/package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY frontend/ .

# Build the application
RUN npm run build

# Backend stage
FROM python:3.11-slim AS backend-builder

WORKDIR /app/backend

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY backend/ .

# Create a multi-stage final image
FROM python:3.11-slim

WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

ARG UID=1000
ARG GID=1000

RUN groupadd --gid ${GID} appgroup && \
    useradd --create-home --shell /bin/bash --uid ${UID} --gid ${GID} appuser

COPY --from=backend-builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=backend-builder /usr/local/bin/uvicorn /usr/local/bin/uvicorn
COPY --from=backend-builder /app/backend/app ./app
COPY --from=backend-builder /app/backend/models ./models
COPY --from=backend-builder /app/backend/routers ./routers
COPY --from=backend-builder /app/backend/services ./services
COPY --from=backend-builder /app/backend/requirements.txt .

COPY --from=frontend-builder /app/frontend/dist ./frontend

RUN mkdir -p /app/data && chmod 777 /app/data

USER appuser

# Expose frontend port
EXPOSE 8080

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PORT=8080

# Start the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
