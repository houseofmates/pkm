# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Dependency Install (production-only in builder to keep image lean)
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Source Copy
COPY . .

# Build
RUN npm run build

# Production Stage (Nginx)
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config with security headers
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Run nginx as non-root user for security
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

USER nginx

# Expose Port
EXPOSE 3000

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
