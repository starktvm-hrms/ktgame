# Hosting the game on a VPS at ktgame.starkpeople.in

The VPS serves the game's files with nginx over HTTPS. Accounts, saved
progress, chat, groups and multiplayer keep running on Supabase, exactly
as for the GitHub Pages copy, so players keep their saves on both.
Every push to the game branch copies the latest files to the VPS
(`.github/workflows/vps.yml`).

## One-time setup (about 10 minutes)

1. **DNS.** In the DNS zone of `starkpeople.in` (Hostinger hPanel →
   Domains → starkpeople.in → DNS / Nameservers), add:

   | Type | Name   | Points to          | TTL  |
   |------|--------|--------------------|------|
   | A    | ktgame | *your VPS's IPv4*  | 3600 |

   The VPS's IP is on hPanel → VPS → Overview. Wait until
   `ping ktgame.starkpeople.in` answers with that IP.

2. **Set up the VPS.** Log in to the VPS as root (hPanel → VPS → Browser
   terminal, or `ssh root@<VPS IP>`), copy `deploy/vps-setup.sh` there and
   run it with your e-mail (for certificate expiry notices):

   ```bash
   sudo bash vps-setup.sh you@example.com
   ```

   It installs nginx and certbot, creates a `deploy` user that owns only
   `/var/www/ktgame`, writes the nginx site and gets the HTTPS certificate.

3. **A key for GitHub.** On your own computer (not the VPS):

   ```bash
   ssh-keygen -t ed25519 -f ktgame_deploy -N "" -C "github-deploy"
   ```

   Put the contents of `ktgame_deploy.pub` on its own line in
   `/home/deploy/.ssh/authorized_keys` on the VPS.

4. **GitHub secrets.** In the repository: Settings → Secrets and
   variables → Actions → New repository secret:

   - `VPS_HOST`: the VPS's IP address
   - `VPS_USER`: `deploy`
   - `VPS_SSH_KEY`: the whole contents of the private key file `ktgame_deploy`
   - `VPS_PORT`: only if SSH is not on port 22

5. **Deploy.** Actions → "Deploy game to the VPS" → Run workflow (or just
   push). Then open https://ktgame.starkpeople.in.

## Optional: the game's own Node server

`server/` can replace Supabase with a self-hosted server (accounts,
progress and real-time play on the VPS itself; see `server/README.md`).
That would start a separate player database, so it is not set up by
default.
