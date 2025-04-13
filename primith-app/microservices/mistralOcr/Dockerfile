# mistralOcr/Dockerfile

FROM python:3.13-slim

WORKDIR /app

# Copy only requirements first to leverage Docker cache
COPY requirements.txt .

# Install dependencies
# Consider adding build tools if mistralai or dependencies need compilation
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Create the temporary directory within the container image
# Ensure the directory exists and the app user can write to it
RUN mkdir -p /app/temp_ocr_files && chown -R nobody:nogroup /app/temp_ocr_files
# Note: If your base image uses a different user, adjust chown accordingly.
# The default user for python:slim might be root, so permissions might be fine,
# but explicitly creating it is safer. Adjust TEMP_DIR in app.py if needed.

EXPOSE 8000

# Define environment variable for the API key (value will be provided by Azure)
ENV MISTRAL_API_KEY=""

# Command to run the application using Uvicorn
# Adjust workers based on your target Azure plan (e.g., 3 for P1v3)
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "3"]