# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Dependency Install
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

# Source Copy
COPY . .

# Environment Variables for Build
# (If API URL is baked in, set it here or via build args in compose)
# ENV VITE_API_BASE_URL=... 

# Build
RUN npm run build

# Production Stage (Nginx)
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom Nginx Config for SPA Routing
RUN echo 'server { \
    listen 3000; \
    location / { \
    root /usr/share/nginx/html; \
    index index.html index.htm; \
    try_files $uri $uri/ /index.html; \
    } \
    }' > /etc/nginx/conf.d/default.conf

# Expose Port
EXPOSE 3000

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
