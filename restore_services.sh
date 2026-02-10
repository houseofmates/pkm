#!/bin/bash
echo "house" | sudo -S systemctl enable pkm-backend pkm-frontend
echo "house" | sudo -S systemctl start pkm-backend pkm-frontend
echo "house" | sudo -S systemctl status pkm-backend pkm-frontend
