#!/bin/bash
# Deploy PKM web assets to nginx

echo "Deploying PKM to /var/www/html/..."
sudo cp -r /home/house/pkm/packages/core/dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html/
sudo chmod -R 755 /var/www/html/
echo "Deployment complete!"
