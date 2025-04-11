FROM python:3.13-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose the port your app runs on
EXPOSE 8000

# Command to run your application
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:8000"]