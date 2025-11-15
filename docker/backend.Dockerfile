# Use Go 1.21 as the base image for building the backend
FROM golang:1.21-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy go.mod and go.sum files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy the entire backend directory
COPY . .

# Build the Go application
RUN go build -o 2048-backend ./main.go

# Use a minimal base image for running the application
FROM alpine:latest

# Set the working directory
WORKDIR /root/

# Copy the built binary from the builder stage
COPY --from=builder /app/2048-backend .

# Copy the configuration file
COPY --from=builder /app/config.yaml.example ./config.yaml

# Expose port 8080
EXPOSE 8080

# Run the application
CMD ["./2048-backend"]