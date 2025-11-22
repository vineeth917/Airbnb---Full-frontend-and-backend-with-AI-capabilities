# Multi-stage build for Owner Service

# Stage 1: Builder
FROM python:3.9-slim as builder

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Stage 2: Runtime
FROM python:3.9-slim

# Create non-root user for security
RUN useradd -m -u 1000 appuser && \
    mkdir -p /app && \
    chown -R appuser:appuser /app

WORKDIR /app

# Copy dependencies from builder stage
COPY --from=builder /root/.local /home/appuser/.local

# Copy application code
COPY --chown=appuser:appuser app.py .

# Switch to non-root user
USER appuser

# Add .local/bin to PATH
ENV PATH=/home/appuser/.local/bin:$PATH

# Environment variables
ENV FLASK_APP=app.py \
    FLASK_ENV=production \
    PORT=5002 \
    MONGODB_URI=mongodb://mongodb:27017/airbnb_lab \
    KAFKA_BOOTSTRAP_SERVERS=kafka:9092 \
    JWT_SECRET_KEY=change-this-in-production

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:5002/health', timeout=3)"

# Expose port
EXPOSE 5002

# Run application with gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:5002", "--workers", "4", "--timeout", "120", "app:app"]

