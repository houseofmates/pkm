#!/bin/bash
CONFIG_FILE="/etc/cloudflared/config.yml"
BACKUP_FILE="/etc/cloudflared/config.yml.bak"

echo "Backing up config to $BACKUP_FILE..."
sudo cp $CONFIG_FILE $BACKUP_FILE

echo "Updating pkm.houseofmates.space and app.houseofmates.space to port 3010..."
sudo sed -i 's/pkm.houseofmates.space\n    service: http:\/\/127.0.0.1:4173/pkm.houseofmates.space\n    service: http:\/\/127.0.0.1:3010/g' $CONFIG_FILE
# Simpler version if the above fails due to multi-line sed complexity:
sudo sed -i 's/:4173/:3010/g' $CONFIG_FILE

echo "Checking for any remaining 4173 refs..."
grep "4173" $CONFIG_FILE

echo "Restarting cloudflared..."
sudo systemctl restart cloudflared

echo "Done. Please check https://app.houseofmates.space in a minute."
