# Jenkins For SafetyNet

This folder defines a local Jenkins controller for the SafetyNet CI/CD pipeline.

## Start Jenkins

From the project root:

```powershell
docker compose -f docker-compose.jenkins.yml up -d --build
```

Open Jenkins:

```text
http://localhost:8081
```

Get the initial admin password:

```powershell
docker exec safetynet-jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

## Create The Pipeline Job

1. Select `New Item`.
2. Enter `safetynet-pipeline`.
3. Select `Pipeline`.
4. Under `Pipeline`, choose `Pipeline script from SCM`.
5. Select `Git`.
6. For a local Docker-mounted repo, use:

```text
file:///workspace/safetynet
```

7. Set branch to:

```text
*/feature/docker-devops
```

8. Set script path to:

```text
Jenkinsfile
```

9. Save, then click `Build Now`.

## Important

This local Jenkins setup mounts the host Docker socket so Jenkins can build and run containers.

For a production Jenkins server, prefer one of these:

- A dedicated Linux VM with Docker installed.
- Jenkins agents with Docker access.
- A private Docker registry and SSH-based deployment to production.

Do not store production secrets in Git. Store them in Jenkins credentials or a `.env` file on the production server.
