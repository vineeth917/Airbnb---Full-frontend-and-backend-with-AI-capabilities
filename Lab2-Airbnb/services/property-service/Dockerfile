# Multi-stage build for Property Service

# Stage 1: Builder
FROM python:3.9-slim as builder

WORKDIR /app
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Stage 2: Runtime
FROM python:3.9-slim

RUN useradd -m -u 1000 appuser && \
    mkdir -p /app && \
    chown -R appuser:appuser /app

WORKDIR /app

COPY --from=builder /root/.local /home/appuser/.local
COPY --chown=appuser:appuser app.py .

USER appuser

ENV PATH=/home/appuser/.local/bin:$PATH \
    FLASK_APP=app.py \
    FLASK_ENV=production \
    PORT=5003 \
    MONGODB_URI=mongodb://mongodb:27017/airbnb_lab \
    JWT_SECRET_KEY=change-this-in-production

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:5003/health', timeout=3)"

EXPOSE 5003

CMD ["gunicorn", "--bind", "0.0.0.0:5003", "--workers", "4", "--timeout", "120", "app:app"]

