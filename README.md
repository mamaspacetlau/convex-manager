# Convex Manager

A self-hosted project manager for [Convex](https://convex.dev/). This tool allows you to spin up multiple local Convex instances using Docker Compose, each with its own backend, dashboard, and database.

<p align="center">
  <img src="screenshots/08-manager_multiple-projects.png" alt="Convex Manager Home" width="800">
  <br>
  <img src="screenshots/08-manager_multiple-projects-light.png" alt="Convex Manager Home Light Mode" width="800">
</p>

## Features

- **Project Management**: Create, start, stop, and delete isolated Convex instances.
- **Role-Based Access Control**: Admin and User roles with invite-based or open registration.
- **Port Management**: Automatically assigns unique ports for each project's backend, site, and dashboard.
- **Dashboard Integration**: One-click access to the Convex Dashboard for each instance.
- **Real-time Status**: Live status updates and log streaming.
- **Configuration Overrides**: Customize Convex instance environment variables (e.g., Auth, Auth0, Clerk integration).
- **Reverse Proxy Support**: Expose projects on your own domains through [Traefik](#using-a-reverse-proxy-traefik) or [Pangolin](#using-pangolin).

## Screenshots

<details>
<summary>Click to view more screenshots</summary>

### Authentication

<p align="center">
  <img src="screenshots/03-manager_login.png" alt="Login" width="400">
  <img src="screenshots/01-manager_register.png" alt="Register" width="400">
</p>

### Creating Projects

<p align="center">
  <img src="screenshots/05-manager_new-project.png" alt="New Project Modal" width="600">
</p>

### Project Settings & Configuration

<p align="center">
  <img src="screenshots/07-manager_project-settings.png" alt="Project Settings" width="600">
</p>

</details>

## Architecture

- **Backend**: Node.js + Express + PostgreSQL. Handles Docker Compose commands (`up`, `down`, `logs`) via `child_process` and stores user/project data.
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui.
- **Data Persistence**: Project configurations are stored in the PostgreSQL database and synced to the local filesystem (`projects/` directory). Convex instance data is persisted using Docker named volumes.

***

## 🛠️ Local Development

To run the application locally for development and contribution:

### Prerequisites

- **Node.js** (v18+)
- **Docker** and **Docker Compose** running on your machine.
- **PostgreSQL** (Optional: A Docker compose file is provided to spin up a local DB).

### Setup Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mamaspacetlau/convex-manager.git
   cd convex-manager
   ```
2. **Install Dependencies**:
   This command installs dependencies for the root, backend, and frontend concurrently.
   ```bash
   npm run install:all
   ```
3. **Start the Database (Optional but recommended)**:
   If you don't have a local PostgreSQL instance running, you can start the provided dev database:
   ```bash
   docker compose up manager-db -d
   ```
4. **Environment Variables**:
   In the `backend` directory, create a `.env` file based on `.env.example` (or use defaults if running the local dev DB):
   ```env
   # backend/.env
   PORT=3001
   DB_HOST=localhost
   DB_PORT=5433  # 5433 if using the provided docker-compose db, 5432 if local
   DB_USER=postgres
   DB_PASSWORD=convex_manager_secret
   DB_NAME=convex_manager_db
   JWT_SECRET=your_super_secret_key_here
   ALLOW_REGISTRATION=true
   ```
5. **Start the Application**:
   Run both the backend and frontend concurrently:
   ```bash
   npm start
   ```
   - **Backend API**: `http://localhost:3001`
   - **Frontend UI**: `http://localhost:5173`
6. **First Login**:
   - Open `http://localhost:5173` in your browser.
   - Since the database is empty, the first user to register will automatically become the **Admin**.

***

## 🐳 Docker Deployment (Production)

For deploying Convex Manager on a server (e.g., VPS, EC2, Raspberry Pi):

### Prerequisites

- **Docker** and **Docker Compose** installed on your server.

### Quick Start with Pre-built Images

We provide pre-built Docker images hosted on Docker Hub. This is the fastest way to get up and running.

1. **Download the configuration**:
   Create a directory for your Convex Manager and download the production compose file:
   ```bash
   mkdir convex-manager && cd convex-manager
   curl -O https://raw.githubusercontent.com/mamaspacetlau/convex-manager/main/docker-compose.prod.yml
   ```
2. **Configure Environment (Optional)**:
   By default, the compose file uses secure defaults. To customize (e.g., setting a custom JWT secret or Email SMTP settings), create an `.env` file in the same directory:
   ```env
   JWT_SECRET=generate_a_random_secure_string
   ALLOW_REGISTRATION=false
   APP_URL=http://your-server-ip:8080
   # SMTP Settings for email invites/resets
   SMTP_HOST=smtp.yourprovider.com
   SMTP_PORT=587
   SMTP_USER=your_email@domain.com
   SMTP_PASS=your_email_password
   EMAIL_FROM="Convex Manager" <noreply@domain.com>
   ```
3. **Start the Stack**:
   Rename the file to `docker-compose.yml` or specify it directly:
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```
4. **Access the Manager**:
   Navigate to `http://<your-server-ip>:8080` in your browser. 
   - *Note: It may take a few seconds for the database to initialize on the first run.*

### Using a Reverse Proxy (Traefik)

If you already have Traefik running on your VPS, you can easily expose Convex Manager by adding labels to the `manager-frontend` service in your `docker-compose.prod.yml`:

```yaml
  manager-frontend:
    image: motionninja/convex-manager-frontend:latest
    container_name: convex-manager-frontend
    # Remove the 'ports' section if using Traefik
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.convex-manager.rule=Host(`manager.yourdomain.com`)"
      - "traefik.http.routers.convex-manager.entrypoints=websecure"
      - "traefik.http.routers.convex-manager.tls.certresolver=myresolver" # Change to your resolver name
      - "traefik.http.services.convex-manager.loadbalancer.server.port=80"
    networks:
      - convex-manager
      - traefik_proxy # Your external Traefik network
```
*Don't forget to declare the external `traefik_proxy` network at the bottom of the compose file if you use this method.*

#### Exposing Individual Convex Projects via Traefik

Convex Manager allows you to dynamically generate Traefik routing labels for the individual Convex instances you create. 

When creating or editing a project in the Convex Manager UI, add the following keys to the **Configuration Overrides** JSON:

```json
{
  "traefik_enabled": "true",
  "traefik_network": "traefik_proxy",
  "traefik_certresolver": "myresolver",
  "traefik_backend_rule": "api.myproject.yourdomain.com",
  "traefik_site_rule": "site.myproject.yourdomain.com",
  "traefik_dashboard_rule": "dashboard.myproject.yourdomain.com"
}
```
*Note: You only need to provide the raw domain names. The backend automatically wraps them in `Host()` rules. You do not need to provide all three rules. Only the services you specify a rule for will be exposed via Traefik.*

### Using Pangolin

If you run [Pangolin](https://pangolin.net/) (self-hosted) on the same server, use `docker-compose.pangolin.yml`. Everything joins Pangolin's `pangolin` Docker network, so **no host ports are published**: Pangolin reaches the manager and every Convex project by container name.

The manager creates each project's Pangolin resources for you through the Pangolin Integration API. This works with any site type, including the **local** site of a self-hosted install.

#### 1. Enable the Pangolin Integration API

The Integration API is off by default on self-hosted Pangolin. In Pangolin's `config/config.yml`, add (or extend your existing `flags:` section):

```yaml
flags:
  enable_integration_api: true
```

Then restart Pangolin:

```bash
docker compose restart pangolin
```

You do **not** need to expose the API publicly. The manager calls it directly over the Docker network at `http://pangolin:3003`.

#### 2. Collect the values you need

You need six values. Run the commands below **on the server that hosts Pangolin**, from the folder where Pangolin's `docker-compose.yml` lives (usually the folder the installer created).

##### a) Pangolin container name → `PANGOLIN_API_URL`

The manager reaches the API at `http://<pangolin container name>:3003`. Find the container name:

```bash
docker ps --format '{{.Names}}  {{.Image}}' | grep fosrl/pangolin
# pangolin  docker.io/fosrl/pangolin:1.21.1
```

The first column is the name. With the default installer it is `pangolin`, so:

```env
PANGOLIN_API_URL=http://pangolin:3003
```

Use `http` (traffic stays inside Docker), and do **not** add `/v1`; the manager adds it.

To confirm the port, check Pangolin's `config/config.yml`. The API listens on `server.integration_port`, which defaults to `3003` when the key is absent:

```bash
grep -n "integration_port\|enable_integration_api" config/config.yml
```

Test the URL from inside the `pangolin` network. Any HTTP response (even `401`) means the URL is right:

```bash
docker run --rm --network pangolin alpine wget -qO- http://pangolin:3003/v1/docs >/dev/null && echo "API reachable"
```

| Output | Meaning |
|---|---|
| `API reachable` or an HTTP error code | URL is correct. |
| `bad address 'pangolin'` | Wrong container name, or the container is on another network (see [b](#b-docker-network--pangolin-network-in-the-compose-file)). |
| `Connection refused` | Wrong port, or `enable_integration_api` isn't active yet (restart Pangolin after step 1). |

**Manager on a different server than Pangolin?** It can't use the Docker network, so expose the API publicly as described in [Pangolin's Integration API docs](https://docs.pangolin.net/self-host/advanced/integration-api) (a Traefik route such as `https://api.yourdomain.com`). Then use that address, still without `/v1`:

```env
PANGOLIN_API_URL=https://api.yourdomain.com
```

For Pangolin Cloud, use `https://api.pangolin.net`.

##### b) Docker network → `pangolin` network in the compose file

The manager, its projects and Pangolin's proxy must share a Docker network. Find the network Pangolin is on:

```bash
docker inspect pangolin --format '{{range $name, $_ := .NetworkSettings.Networks}}{{$name}} {{end}}'
# pangolin
```

The default installer creates a network named `pangolin`, which is what `docker-compose.pangolin.yml` uses. If yours has a different name (e.g. `pangolin_default`), change **both** places in `docker-compose.pangolin.yml`:

```yaml
    environment:
      - PROJECTS_NETWORK=pangolin_default   # network Convex projects join
...
networks:
  pangolin:
    name: pangolin_default                  # network the manager joins
    external: true
```

##### c) Organization ID → `PANGOLIN_ORG_ID`

Log in to the Pangolin dashboard and open your organization. The org ID is the first part of the URL path:

```
https://pangolin.yourdomain.com/my-org/settings/resources
                                └org ID┘
```

It is also shown in **Settings → General**.

##### d) API key → `PANGOLIN_API_KEY`

1. In the Pangolin dashboard, go to your organization's **Settings → API Keys**.
2. Click **Generate API Key**, give it a name (e.g. `convex-manager`).
3. Grant it at least the permissions for **Blueprints** (apply), **Resources** (get, list, delete) and **Sites** (get, list). Granting all permissions also works.
4. Copy the key immediately. It is shown only once and looks like `<id>.<secret>`:
   ```env
   PANGOLIN_API_KEY=abc123def456ghi.jkl789mno012pqr345...
   ```

Keep it private: anyone with this key can change your Pangolin resources.

##### e) Site identifier → `PANGOLIN_SITE`

The site is the Pangolin connector whose proxy can reach the Convex containers. On a self-hosted install where the manager runs on the Pangolin server, this is the **local** site.

**From the dashboard:** go to **Sites**, open the site, and copy its **Identifier**. It is an auto-generated slug such as `brave-otter-kestrel`. It is *not* the site's display name, its numeric ID, or a domain.

**From the API** (once the API is enabled and you have a key):

```bash
KEY=<your api key>
docker run --rm --network pangolin alpine wget -qO- \
  --header "Authorization: Bearer $KEY" \
  http://pangolin:3003/v1/org/<orgId>/sites \
  | grep -o '"\(niceId\|name\|type\)":"[^"]*"' | paste - - -
# "niceId":"brave-otter-kestrel"  "name":"my-server"  "type":"local"
# "niceId":"quiet-marmot-falcon"  "name":"remote-box"  "type":"newt"
```

Use the `niceId` of the `local` site (or of a `newt` site that is on the same Docker network as the manager).

##### f) Manager URL → `APP_URL`

This is the public address where people will open Convex Manager. It is used to build the links in invitation emails, so it must be reachable from outside, over `https`:

```env
APP_URL=https://manager.yourdomain.com
```

Pick a hostname under a domain configured in Pangolin (**Settings → Domains**). You create the matching Pangolin resource in [step 5](#5-expose-the-manager-itself).

#### 3. Configure and start Convex Manager

```bash
git clone https://github.com/mamaspacetlau/convex-manager.git
cd convex-manager
cp .env.example .env
```

Add the values from step 2 to `.env` (alongside `JWT_SECRET`, SMTP settings, etc.):

```env
APP_URL=https://manager.yourdomain.com

# Pangolin container name + integration port (no /v1)
PANGOLIN_API_URL=http://pangolin:3003
PANGOLIN_API_KEY=<id>.<secret>
PANGOLIN_ORG_ID=<orgId>
PANGOLIN_SITE=<site identifier>
```

Start the stack:

```bash
docker compose -f docker-compose.pangolin.yml up -d
docker exec convex-manager-backend env | grep PANGOLIN_ | cut -c1-40   # all four should be listed
```

#### 4. Verify the connection

This checks the API, key, org and site in one request. It should print JSON with `"success":true`:

```bash
KEY=$(grep '^PANGOLIN_API_KEY=' .env | cut -d= -f2)
docker exec convex-manager-backend wget -qO- \
  --header "Authorization: Bearer $KEY" \
  "http://pangolin:3003/v1/org/<orgId>/site/<site identifier>"
```

| Result | Meaning |
|---|---|
| `bad address 'pangolin'` | The manager isn't on the same Docker network as Pangolin, or the container has a different name. |
| Connection refused | `enable_integration_api` is not active. Check `config.yml` and restart Pangolin. |
| `401` / `403` | The API key is wrong or missing permissions. |
| `404` | Wrong org ID or site identifier. List your sites with `.../v1/org/<orgId>/sites`. |

#### 5. Expose the manager itself

In the Pangolin dashboard, create an HTTP resource for the manager UI (for example `manager.yourdomain.com`) on your site, targeting `convex-manager-frontend` port `80`.

#### 6. Expose Convex projects

When creating a project (or later in **Project Settings**), enable **Pangolin Reverse Proxy** and enter the domains you want:

| Field | Pangolin resource | Target |
|---|---|---|
| Backend Domain | `<project> (Convex backend)` | `backend-<project>:3210` |
| Site Domain | `<project> (Convex site)` | `backend-<project>:3211` |
| Dashboard Domain | `<project> (Convex dashboard)` | `dashboard-<project>:6791` |

- Only the domains you fill in become resources, and the Convex origin URLs are set to `https://<domain>` automatically.
- Backend and site resources are always public, because Convex clients and HTTP actions must reach them. Tick **Protect dashboard with Pangolin SSO** to put the dashboard behind Pangolin login.
- Domains must be under a base domain configured in Pangolin, and must be unique per project (e.g. `myproject-api.yourdomain.com`, not a shared `api.yourdomain.com`).

The manager keeps Pangolin in sync:

- **Create project**: resources are created.
- **Save settings**: resources are updated. Clearing a domain or disabling Pangolin deletes the matching resource.
- **Delete project**: its resources are deleted.

If a sync fails, the project action still completes, the UI shows a `Pangolin sync failed` alert, and details are logged:

```bash
docker logs convex-manager-backend 2>&1 | grep Pangolin
```

A successful sync logs `[Pangolin] <project>: applied [...]`.

#### Alternative: container labels (Newt sites)

If you leave the `PANGOLIN_API_*` variables empty, the manager instead adds Pangolin blueprint labels (`pangolin.public-resources.*`) to each project's containers. These are only read by a **Newt** site that has Docker socket access and shares the `pangolin` network:

```yaml
    # in your Newt service
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      - DOCKER_SOCKET=/var/run/docker.sock
```

Local sites ignore labels, so a Pangolin **404 page not found** on a project domain usually means the labels were never picked up. Use the Integration API instead.

#### Configuration reference

| Variable | Default | Description |
|---|---|---|
| `PANGOLIN_API_URL` | *(empty)* | Pangolin Integration API base URL, without `/v1`. |
| `PANGOLIN_API_KEY` | *(empty)* | Integration API key (`<id>.<secret>`). |
| `PANGOLIN_ORG_ID` | *(empty)* | Pangolin organization ID. |
| `PANGOLIN_SITE` | *(empty)* | Identifier of the site whose targets reach the project containers. |
| `PROJECTS_NETWORK` | `convex-manager` | Docker network that project containers join. Set to `pangolin` in `docker-compose.pangolin.yml`. |

The API is used only when all four `PANGOLIN_*` variables are set.

### Managing the Stack

- **View Logs**: `docker compose logs -f`
- **Stop**: `docker compose down`
- **Update to latest version**:
  ```bash
  docker compose pull
  docker compose up -d
  ```

***

## 🏗️ Building from Source (Docker)

If you prefer to build the Docker images yourself locally:

1. Clone the repository.
2. Build and start the stack:
   ```bash
   docker compose up -d --build
   ```

## Security Considerations

- **Docker Socket**: The `manager-backend` container requires access to `/var/run/docker.sock` to spin up Convex instances. Ensure your host server is secure.
- **Exposed Ports**: Convex Manager dynamically allocates ports starting from `3210`, `3310`, and `6791`. If you have a firewall (like UFW), ensure these port ranges are open if you intend to access individual Convex projects from external machines.
- **Admin Keys**: Project Admin Keys are stored in the database. Protect your database credentials.

## License

MIT
