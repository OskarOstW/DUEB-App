FROM python:3.12-slim@sha256:78387bc3881b8273120a12ebe6c1ab22b018ccc2c9adf565ae1ac9b536e184ea
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && useradd --uid 10001 --create-home dueb
COPY --chown=dueb:dueb . .
RUN mkdir -p /app/media /app/staticfiles && chown -R dueb:dueb /app/media /app/staticfiles && chmod +x /app/entrypoint.sh
USER dueb
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=5s --start-period=120s --retries=4 CMD ["python", "/app/healthcheck.py"]
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["gunicorn", "DUEB_backend_Projekt.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "120", "--access-logfile", "-"]
