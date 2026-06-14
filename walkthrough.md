# Walkthrough - Deploying SafetyNet to Azure

I have created the provisioning scripts and GitHub Actions workflow files to establish a modern DevOps lifecycle for your React UI, Spring Boot API, and PostgreSQL database using **Azure Container Apps**.

Here are the changes that have been added:
1.  **Azure Resource Provisioning Script**: [azure-deploy.ps1](file:///c:/Users/User/Documents/Crime/safetynet/scripts/azure-deploy.ps1) (A PowerShell script that sets up the database, registry, environment, and container apps).
2.  **GitHub Actions Workflow**: [deploy.yml](file:///c:/Users/User/Documents/Crime/safetynet/.github/workflows/deploy.yml) (Builds code, pushes containers to ACR, and updates the container apps when you push to the `main` branch).

---

## Guide: Setting up DevOps step-by-step

### Step 1: Run the Azure Provisioning Script
You will run the PowerShell script on your local machine to create the resources in your Azure subscription.

1.  Open your terminal in the workspace root directory `c:\Users\User\Documents\Crime\safetynet`.
2.  Run the script by typing:
    ```powershell
    .\scripts\azure-deploy.ps1
    ```
    *   *If you get a permission error about running scripts, run:* `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` *and try again.*
3.  The script will prompt you to log into Azure via a browser window if you aren't already.
4.  It will output:
    *   **PostgreSQL details** (Database Host, Username, Password).
    *   **ACR Name** (e.g. `acrsafetynet1234`).
    *   **JSON output** containing credentials for GitHub.

---

### Step 2: Configure GitHub Secrets & Variables
You do **not** need to split your frontend and backend into separate repositories. We are using a **monorepo layout** (a single repository containing both directories).

1.  Create a repository on GitHub (e.g. `safetynet`) if you haven't already.
2.  Navigate to your GitHub repository in your web browser.
3.  Go to **Settings** > **Secrets and variables** > **Actions**.
4.  Add a new **Repository Secret**:
    *   **Name**: `AZURE_CREDENTIALS`
    *   **Value**: Paste the exact JSON block printed at the end of the PowerShell script (the `az ad sp create-for-rbac` output).
5.  Click the **Variables** tab (next to Secrets), and add a new **Repository Variable**:
    *   **Name**: `AZURE_ACR_NAME`
    *   **Value**: Paste your ACR Name (e.g. `acrsafetynet1234`).

---

### Step 3: Git Push to Deploy
Now, you will push your repository to GitHub, which triggers the automated deployment pipeline!

1.  Initialize git, commit, and push the code:
    ```powershell
    # Initialize Git (if not already done)
    git init
    
    # Stage and commit the files
    git add .
    git commit -m "Configure Azure DevOps and provisioning scripts"
    
    # Rename default branch to main
    git branch -M main
    
    # Add your GitHub repository as a remote
    git remote add origin https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPOSITORY_NAME.git
    
    # Push the changes
    git push -u origin main
    ```
2.  Go to the **Actions** tab of your repository on GitHub. You will see a workflow running named `SafetyNet CI/CD - Build & Deploy to Azure`.
3.  Once the workflow completes (takes ~5-8 minutes to compile Java, build React, build Docker images, and deploy):
    *   Navigate to your Azure Portal.
    *   Go to your **Resource Group** (`rg-safetynet`).
    *   Open the UI Container App (`safetynet-ui`) and click its **Application Url** (e.g. `https://safetynet-ui.xyz.azurecontainerapps.io`) to open the app!

---

### How updates work in the future:
Every time you make any change locally (e.g. modify UI code or update a backend class):
1.  Run:
    ```bash
    git add .
    git commit -m "Update message"
    git push origin main
    ```
2.  GitHub Actions automatically triggers, rebuilds the changed components, pushes the new Docker image version to ACR, and instructs Azure Container Apps to update.
3.  Azure Container Apps does a **zero-downtime rolling update**: it spins up the new container version, tests its health, routes users to the new version, and shuts down the old version automatically.
