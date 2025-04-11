import os
import sys
import subprocess
import time

# Get the directory where this script is located
current_dir = os.path.dirname(os.path.abspath(__file__))

# Install dependencies
print("Installing dependencies...")
subprocess.check_call([sys.executable, "-m", "pip", "install", "--no-cache-dir", "-r", os.path.join(current_dir, "requirements.txt")])

# Start the application
print("Starting application...")
os.environ["PORT"] = os.environ.get("PORT", "8000")
os.environ["HOST"] = "0.0.0.0"

# Import and run the application
from app import app
import uvicorn

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ["PORT"])) 