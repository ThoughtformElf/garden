# Deploying Servers to Fly.io

This guide covers deploying the WebSocket signaling server and AI content proxy server to Fly.io from the same repository.

## Architecture

The production setup uses **two separate Fly apps** for better resource isolation and cost optimization:

1. **WebSocket Signaling Server** (`garden-summer-rain-983`) - Lightweight, always-on tracker for P2P mesh
2. **AI Content Proxy Server** (`garden-proxy`) - Heavy (uses Puppeteer), auto-suspends when idle

Both apps deploy from the same repository using different configuration files.

## Prerequisites

1. [Install Fly.io CLI](https://fly.io/docs/hands-on/install-flyctl/)
2. Login: `fly auth login`
3. Ensure you have a Fly.io account (free tier works perfectly)

## Initial Setup (One-Time)

### 1. WebSocket Server (Already Configured)

Your existing app `garden-summer-rain-983` is already deployed. To update:

```
fly deploy
# or
npm run deploy:ws
```

### 2. Proxy Server (New Deployment)

The proxy app may already exist from following this guide. Check with:

```
fly apps list
```

If `garden-proxy` (or your chosen name) doesn't exist, create it:

```
fly apps create garden-proxy
```

If the name is taken globally, choose a unique one:

```
fly apps create thoughtform-garden-proxy
# or
fly apps create your-unique-name-proxy
```

Then update `fly.proxy.toml` with your app name:

```
app = 'your-chosen-app-name'
```

## Deployment

### Deploy Both Servers

```
# Deploy everything at once
npm run deploy:all

# Or deploy individually:
npm run deploy:ws      # WebSocket server
npm run deploy:proxy   # Proxy server
```

### Access Your Services

After deployment:
- WebSocket: `wss://garden-summer-rain-983.fly.dev` (or your app name)
- Proxy: `https://garden-proxy.fly.dev` (or your app name)

## Custom Domain Setup (Optional)

### Add SSL Certificate for Custom Domain

```
# For WebSocket server
fly certs add socket.thoughtform.garden -a garden-summer-rain-983

# For Proxy server
fly certs add proxy.thoughtform.garden -a garden-proxy
```

Each command outputs a CNAME target like `abc123x.your-app.fly.dev`.

### Configure DNS

In your DNS provider (Namecheap, Cloudflare, etc.), add CNAME records:

| Type | Host | Value |
|------|------|-------|
| CNAME | socket | abc123x.garden-summer-rain-983.fly.dev. |
| CNAME | proxy | xyz789p.garden-proxy.fly.dev. |

Replace `abc123x` and `xyz789p` with the actual prefixes from the `fly certs add` command output.

### Verify Certificate

Wait 5-15 minutes for DNS propagation, then check:

```
fly certs check socket.thoughtform.garden -a garden-summer-rain-983
fly certs check proxy.thoughtform.garden -a garden-proxy
```

Once both show as "configured", your custom domains are live!

---

## Local Git Server for Backup & Collaboration

This section explains how to use the built-in Git server to create a local backup of your gardens. This is ideal for keeping a secure copy of your data on your own machine or for collaborating across devices on your local network.

**Step 1: Create a Backups Folder**

First, create a `backups` folder in your user's home directory. The Git server is pre-configured to look here.

```bash
# On macOS or Linux
mkdir ~/backups
```
On Windows, you can create a `backups` folder in your `C:\Users\YourUsername` directory.

**Step 2: Create a Bare Repository**

Navigate into your new backups folder and create a "bare" repository. This will act as the central remote for your garden.

```bash
# Navigate to the backups folder
cd ~/backups

# Create the bare repository (you can name it anything)
git init --bare my-garden.git
```

**Step 3: Run the Local Git Server**

Navigate back to the root directory of the Thoughtform Garden project and use the built-in script to start the server.

```bash
# From the project root of thoughtform.garden
npm run git
```

The server will start and log a message like `Git server running on http://localhost:8081`.

**Step 4: Connect from Thoughtform Garden**

1.  In the Thoughtform Garden app, open the **Git** tab in the sidebar.
2.  In the "Remote URL" field, combine the server address with your repository name. For example:
    `http://localhost:8081/my-garden.git`
3.  If you are connecting from another device on the same network, replace `localhost` with your computer's local IP address (e.g., `http://192.168.1.5:8081/my-garden.git`).
4.  Leave the "Username or Token" field blank.
5.  Click **Push** to save your garden to your local backup.

---

## Configuration Files

### fly.toml (WebSocket Server)

Runs on port 8080, minimal resources (256MB RAM), always-on.

### fly.proxy.toml (Proxy Server)

Runs on port 8082, more resources (512MB RAM) for Puppeteer, auto-suspends when idle to save costs.

### Dockerfile (WebSocket)

Lightweight Node.js image with minimal dependencies.

### Dockerfile.proxy (Proxy)

Includes Chromium and all dependencies for Puppeteer/headless browsing.

## Monitoring & Debugging

### View Logs

```# WebSocket server
fly logs -a garden-summer-rain-983

# Proxy server
fly logs -a garden-proxy
```

### Check App Status

```
fly status -a garden-summer-rain-983
fly status -a garden-proxy
```

### SSH into Running Machine

```
fly ssh console -a garden-summer-rain-983
fly ssh console -a garden-proxy
```

## Cost Optimization

### Free Tier Coverage

Both servers run comfortably within Fly.io's free tier:
- Shared IPv4/IPv6 (free, auto-assigned)
- 3 shared-cpu-1x VMs with 256MB RAM (free)
- 160GB outbound data transfer (free)

### Proxy Auto-Suspend

The proxy server is configured to auto-suspend after inactivity:
- `auto_stop_machines = "suspend"` - Stops when idle
- `auto_start_machines = true` - Wakes on request
- `min_machines_running = 0` - No minimum (saves resources)

This means the proxy only runs (and counts toward usage) when actively processing requests.

## Updating Deployments

### Update Code and Redeploy

```
git add .
git commit -m "Update server code"
npm run deploy:all
```

### Update Configuration Only

Edit `fly.toml` or `fly.proxy.toml`, then:

```
fly deploy -a garden-summer-rain-983  # For WebSocket
fly deploy -a garden-proxy            # For Proxy
```

## Troubleshooting

### "Name already taken" Error

App names are globally unique. Choose a different name or check if you already own it:

```
fly apps list
```

### Certificate Not Validating

1. Verify DNS record is correct: `dig proxy.thoughtform.garden CNAME`
2. Wait 15 minutes for propagation
3. Check again: `fly certs check proxy.thoughtform.garden -a garden-proxy`

### Proxy Server Out of Memory

Increase memory in `fly.proxy.toml`:

```
[[vm]]
  size = "shared-cpu-1x"
  memory = "1024mb"  # Increased from 512mb
```

Then redeploy: `npm run deploy:proxy`

### WebSocket Connection Failures

1. Check logs: `fly logs -a garden-summer-rain-983`
2. Verify app is running: `fly status -a garden-summer-rain-983`
3. Test connection: `wscat -c wss://socket.thoughtform.garden` (or your domain)

## Scaling (If Needed)

### Increase Resources

Edit the `[[vm]]` section in `fly.toml` or `fly.proxy.toml`:

```
[[vm]]
  size = "shared-cpu-2x"  # More CPU
  memory = "1024mb"        # More RAM
```

### Add More Regions

```
fly regions add lax sjc -a garden-proxy
```

### Scale Machine Count

```
fly scale count 2 -a garden-summer-rain-983
```

## Support

- [Fly.io Documentation](https://fly.io/docs/)
- [Fly.io Community Forum](https://community.fly.io/)
- [Thoughtform Garden Issues](https://github.com/thoughtforms/garden/issues)