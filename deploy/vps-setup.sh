#!/bin/bash
# One-time setup of a VPS (Ubuntu/Debian) to serve the game at
# https://ktgame.starkpeople.in with nginx and a free Let's Encrypt
# certificate. Run it as root on the VPS:
#
#   curl -fsSL https://raw.githubusercontent.com/starktvm-hrms/ktgame/claude/kerala-tourism-game-v9zd80/deploy/vps-setup.sh -o vps-setup.sh
#   sudo bash vps-setup.sh you@example.com      # e-mail for certificate notices
#
# (or copy the file over by hand if the repository is private).
# Before running it, the DNS A record for ktgame.starkpeople.in must point
# at this VPS, or the certificate step fails (it can be re-run later).
# The files themselves are copied in by .github/workflows/vps.yml.
set -euo pipefail
DOMAIN=${DOMAIN:-ktgame.starkpeople.in}
ROOT=/var/www/ktgame
EMAIL=${1:-}
DEPLOY_USER=${DEPLOY_USER:-deploy}

# a third-party package source that is out of date (e.g. one without a
# release for this Ubuntu version) must not stop the setup
apt-get update || echo "apt-get update reported errors; continuing with the sources that worked"
apt-get install -y nginx rsync certbot python3-certbot-nginx

# a user the GitHub workflow logs in as; it owns only the game folder
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi
mkdir -p "$ROOT" "/home/$DEPLOY_USER/.ssh"
chown -R "$DEPLOY_USER":"$DEPLOY_USER" "$ROOT"
touch "/home/$DEPLOY_USER/.ssh/authorized_keys"
chmod 700 "/home/$DEPLOY_USER/.ssh"; chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"
chown -R "$DEPLOY_USER":"$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
[ -f "$ROOT/index.html" ] || echo '<!doctype html><title>Kerala Explorer</title><p>Deploying soon.</p>' > "$ROOT/index.html"

cat > /etc/nginx/sites-available/ktgame <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    root $ROOT;
    index index.html;

    gzip on;
    gzip_types text/css application/javascript application/json application/octet-stream image/svg+xml;
    gzip_min_length 1024;

    # scripts and assets are stamped ?v=<commit> on each deploy, so they
    # can be cached for long; the page itself is always fetched fresh
    location = /index.html { add_header Cache-Control "no-cache"; }
    location ~* \.(js|css|png|jpg|jpeg|webp|glb|mp3|ogg|wav|svg|ico|woff2?)$ {
        add_header Cache-Control "public, max-age=604800";
    }
    location / { try_files \$uri \$uri/ /index.html; }
}
EOF
ln -sf /etc/nginx/sites-available/ktgame /etc/nginx/sites-enabled/ktgame
nginx -t
systemctl reload nginx

if [ -n "$EMAIL" ]; then
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect
else
  certbot --nginx -d "$DOMAIN" --redirect
fi

echo
echo "Done. Now add the GitHub Actions public key to /home/$DEPLOY_USER/.ssh/authorized_keys"
echo "(see deploy/README.md), then push or run the 'Deploy game to the VPS' workflow."
