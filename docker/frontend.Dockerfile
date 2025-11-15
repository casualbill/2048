# Use Nginx as the base image for frontend
FROM nginx:alpine

# Copy the frontend files to Nginx's web root
COPY . /usr/share/nginx/html

# Copy custom Nginx configuration if needed
# COPY ./docker/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]