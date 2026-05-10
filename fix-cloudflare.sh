#!/bin/bash
echo "house" | sudo -S sed -i 's|path: /apk\*|path: /apk/.*|g' /etc/cloudflared/config.yml
echo "house" | sudo -S systemctl restart cloudflared
