FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install psycopg2-binary

# Create app directory
WORKDIR /app

# Copy the script
COPY generate_static_data.py .

# Make script executable
RUN chmod +x generate_static_data.py

# Create output directory
RUN mkdir -p /output

# Run the script
CMD ["python", "generate_static_data.py"]