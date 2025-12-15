FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install only postgresql-client and libgl1 (for Pillow)
RUN apt-get update && apt-get install -y \
    postgresql-client \
    libgl1 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Make the wait script executable
RUN chmod +x wait-for-db.sh