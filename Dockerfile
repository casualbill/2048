FROM python:3.11-alpine

# Set working directory
WORKDIR /app

# Copy server files
COPY server.py .

# Install dependencies
RUN pip install websockets

# Expose port
EXPOSE 8765

# Run the server
CMD ["python", "server.py"]