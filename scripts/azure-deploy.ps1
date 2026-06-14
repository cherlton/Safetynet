# SafetyNet Azure DevOps Provisioning Script
# This PowerShell script creates all necessary resources on Microsoft Azure.

$ErrorActionPreference = "Stop"

# Define variables - customize these if needed
$RG_NAME = "rg-safetynet"
$LOCATION = "eastus" # You can change this to your closest Azure region (e.g. westeurope, westus2)
$RANDOM_SUFFIX = Get-Random -Minimum 1000 -Maximum 9999
$ACR_NAME = "acrsafetynet$RANDOM_SUFFIX"
$PG_SERVER_NAME = "pg-safetynet-$RANDOM_SUFFIX"
$PG_DB_NAME = "crime"
$PG_USER = "postgres"
$PG_PASSWORD = "SafePassword$($RANDOM_SUFFIX)!"
$CAE_NAME = "cae-safetynet"
$API_APP_NAME = "safetynet-api"
$UI_APP_NAME = "safetynet-ui"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "SafetyNet Azure DevOps Setup Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Resource Group: $RG_NAME"
Write-Host "Location:       $LOCATION"
Write-Host "ACR Name:       $ACR_NAME"
Write-Host "PostgreSQL:     $PG_SERVER_NAME (User: $PG_USER)"
Write-Host "=========================================="

# 1. Verify Azure CLI is installed
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Error "Azure CLI ('az') is not installed. Please install it from https://aka.ms/installazurecliwindows and try again."
}

# 2. Login Check
Write-Host "Checking Azure login status..." -ForegroundColor Yellow
$loginStatus = az account show --query "name" -o tsv 2>$null
if ($null -eq $loginStatus) {
    Write-Host "Not logged in. Running 'az login'..." -ForegroundColor Yellow
    az login
}
else {
    Write-Host "Logged in as: $loginStatus" -ForegroundColor Green
}

# Get Subscription ID
$SUB_ID = az account show --query "id" -o tsv
Write-Host "Using Subscription ID: $SUB_ID" -ForegroundColor Green

# 3. Register required resource providers
Write-Host "Registering Azure resource providers..." -ForegroundColor Yellow
az provider register --namespace Microsoft.App --wait
az provider register --namespace Microsoft.OperationalInsights --wait

# 4. Create Resource Group
Write-Host "Creating Resource Group: $RG_NAME..." -ForegroundColor Yellow
az group create --name $RG_NAME --location $LOCATION --output table

# 5. Create Azure Container Registry (ACR)
Write-Host "Creating Azure Container Registry: $ACR_NAME..." -ForegroundColor Yellow
az acr create --resource-group $RG_NAME --name $ACR_NAME --sku Basic --admin-enabled true --output table

# 6. Create PostgreSQL Flexible Server with PostGIS
Write-Host "Creating PostgreSQL Flexible Server: $PG_SERVER_NAME..." -ForegroundColor Yellow
Write-Host "Note: This might take 3-5 minutes." -ForegroundColor Yellow
az postgres flexible-server create `
    --resource-group $RG_NAME `
    --name $PG_SERVER_NAME `
    --location $LOCATION `
    --admin-user $PG_USER `
    --admin-password $PG_PASSWORD `
    --sku-name Standard_B1ms `
    --tier Burstable `
    --yes `
    --output table

# 6b. Create the database separately (--database-name is not supported on flexible-server create)
Write-Host "Creating database: $PG_DB_NAME on $PG_SERVER_NAME..." -ForegroundColor Yellow
az postgres flexible-server db create `
    --resource-group $RG_NAME `
    --server-name $PG_SERVER_NAME `
    --database-name $PG_DB_NAME `
    --output table

# Configure PostGIS extension support on Azure
Write-Host "Enabling PostGIS extension capability on PostgreSQL..." -ForegroundColor Yellow
az postgres flexible-server parameter set `
    --resource-group $RG_NAME `
    --server-name $PG_SERVER_NAME `
    --name azure.extensions `
    --value POSTGIS `
    --output table

# Create firewall rule to allow all Azure internal services to connect
Write-Host "Creating PostgreSQL firewall rule for Azure services..." -ForegroundColor Yellow
az postgres flexible-server firewall-rule create `
    --resource-group $RG_NAME `
    --name $PG_SERVER_NAME `
    --rule-name AllowAllAzureIPs `
    --start-ip-address 0.0.0.0 `
    --end-ip-address 0.0.0.0 `
    --output table

# 7. Create Container Apps Environment
Write-Host "Creating Container Apps Environment: $CAE_NAME..." -ForegroundColor Yellow
az containerapp env create --name $CAE_NAME --resource-group $RG_NAME --location $LOCATION --output table

# 8. Create API Container App (with public ingress, using hello-world placeholder)
Write-Host "Creating API Container App: $API_APP_NAME..." -ForegroundColor Yellow
$DB_CONN_STR = "jdbc:postgresql://$PG_SERVER_NAME.postgres.database.azure.com:5432/$PG_DB_NAME?sslmode=require"

az containerapp create `
    --name $API_APP_NAME `
    --resource-group $RG_NAME `
    --environment $CAE_NAME `
    --image mcr.microsoft.com/azuredocs/aci-helloworld `
    --target-port 8080 `
    --ingress external `
    --env-vars `
    SPRING_DATASOURCE_URL="$DB_CONN_STR" `
    SPRING_DATASOURCE_USERNAME="$PG_USER" `
    SPRING_DATASOURCE_PASSWORD="$PG_PASSWORD" `
    ANTHROPIC_API_KEY="placeholder" `
    GEMINI_API_KEY="placeholder" `
    TWILIO_AUTH_TOKEN="placeholder" `
    TWILIO_VALIDATION_ENABLED="false" `
    --output table

# 9. Create UI Container App (with public ingress, using nginx placeholder)
Write-Host "Creating UI Container App: $UI_APP_NAME..." -ForegroundColor Yellow
az containerapp create `
    --name $UI_APP_NAME `
    --resource-group $RG_NAME `
    --environment $CAE_NAME `
    --image nginx `
    --target-port 80 `
    --ingress external `
    --output table

# 10. Generate Service Principal credentials for GitHub Actions
Write-Host "Generating Azure Service Principal for GitHub Actions..." -ForegroundColor Yellow
$SP_OUTPUT = az ad sp create-for-rbac `
    --name "sp-safetynet-github-$RANDOM_SUFFIX" `
    --role contributor `
    --scopes "/subscriptions/$SUB_ID/resourceGroups/$RG_NAME" `
    --sdk-auth

Write-Host "==========================================" -ForegroundColor Green
Write-Host "PROVISIONING COMPLETE!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Database Host:       $PG_SERVER_NAME.postgres.database.azure.com" -ForegroundColor Cyan
Write-Host "Database Username:   $PG_USER" -ForegroundColor Cyan
Write-Host "Database Password:   $PG_PASSWORD" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Green
Write-Host "ACTION REQUIRED: Create GitHub Secrets" -ForegroundColor Green
Write-Host "Please create a GitHub secret named 'AZURE_CREDENTIALS' in your repository and paste this JSON content:" -ForegroundColor Yellow
Write-Host $SP_OUTPUT -ForegroundColor Yellow
Write-Host "=========================================="
Write-Host "Please save your database details. You will need them if you want to inspect the DB directly." -ForegroundColor Yellow
Write-Host "The GitHub Actions workflow (.github/workflows/deploy.yml) will need the ACR Name: $ACR_NAME" -ForegroundColor Yellow
Write-Host "=========================================="
