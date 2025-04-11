FROM python:3.13-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Use UvicornWorker and reference correct file name (adjust 'app' if needed)
CMD exec gunicorn app:app --bind 0.0.0.0:${PORT:-8000} -k uvicorn.workers.UvicornWorker
