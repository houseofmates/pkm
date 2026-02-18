
#!/bin/bash

# house of mates - wildcard subdomain provisioner
# usage: sudo ./setup-wildcard.sh
# purpose: create nginx config for *.houseofmates.space and guide dns/certbot steps

DOMAIN="houseofmates.space"
EMAIL="admin@houseofmates.space" 
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"
WEB_ROOT="/home/house/pkm/dist"

echo "setting up wildcard subdomain configuration..."

# 1. Install Certbot (if missing)
if ! command -v certbot &> /dev/null; then
    echo "Installing Certbot..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
fi

# 2. generate Nginx Block for Wildcard
echo "Generating Nginx Config for *.$DOMAIN..."

cat > wildcard_nginx.conf <<EOF
server {
    server_name $DOMAIN *.$DOMAIN;
    root $WEB_ROOT;
    index index.html;

    # React Router handling
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API Proxy (NocoBase)
    location /api/ {
        proxy_pass http://localhost:1337/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Move to sites-available (simulated path for this environment, user will move it manually if needed)
# In real deploy: sudo mv wildcard_nginx.conf $NGINX_CONF
echo "Config generated at ./wildcard_nginx.conf"

# 3. Certbot Instructions
echo ">>> VISUAL CONFIRMATION REQUIRED"
echo "To finalize the wildcard certificate, you must use DNS validation (required for wildcards)."
echo "Run this command:"
echo ""
echo "    sudo certbot certonly --manual --preferred-challenges=dns -d *.$DOMAIN -d $DOMAIN"
echo ""
echo "After obtaining the certs, update the Nginx config to point to them."
echo "Protocol Complete."
