# SafetyNet DevOps Deployment

This project is split into a Spring Boot API, a Vite React UI, and a PostGIS database.

## Local Git Setup

Initialize the repo from the project root:

```powershell
git init
git add .
git commit -m "Initial SafetyNet project"
```

If Git asks for your identity:

```powershell
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

## Production Files

- `docker-compose.prod.yml` runs the API, UI, PostGIS database, and Caddy.
- `Caddyfile` routes public HTTPS traffic to the UI and API.
- `.env.example` documents required production environment variables.
- `Jenkinsfile` runs CI/CD automation.

## Production Environment

Create a real `.env` file on the production server. Do not commit it.

```bash
cp .env.example .env
```

Edit the values:

```env
DOMAIN=yourdomain.com
POSTGRES_PASSWORD=use-a-strong-password
ANTHROPIC_API_KEY=your-key
GEMINI_API_KEY=your-key
TWILIO_AUTH_TOKEN=your-token
```

## Manual Production Deploy

Install Docker and the Compose plugin on the server, then run:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Check service status:

```bash
docker compose -f docker-compose.prod.yml ps
```

Follow logs:

```bash
docker compose -f docker-compose.prod.yml logs -f
```

## Jenkins Setup

Install these Jenkins tools/plugins:

- Git
- Pipeline
- Docker CLI available to the Jenkins agent

Create a Jenkins Pipeline job that points to this Git repository and uses:

```text
Jenkinsfile
```

The pipeline does this:

1. Builds and tests the Spring Boot API.
2. Installs and builds the React UI.
3. Builds Docker images for API and UI.
4. Deploys with Docker Compose when the branch is `main`.

## DNS

Point your domain to the production server:

```text
A  @    your-server-ip
A  www  your-server-ip
```

Caddy automatically requests and renews HTTPS certificates.

## Application URLs

After deployment:

```text
https://yourdomain.com
https://yourdomain.com/api/incidents
https://yourdomain.com/ws-connect
```

The UI uses `VITE_API_BASE_URL` during the Docker build, set by `docker-compose.prod.yml`.
