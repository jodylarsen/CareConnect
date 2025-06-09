# CareConnect Databricks App Deployment Guide

This guide explains how to deploy CareConnect as a Databricks App using the automated deployment system.

## Overview

The CareConnect frontend can be deployed as a Databricks App, allowing it to run natively within your Databricks workspace and leverage Databricks services seamlessly.

## Prerequisites

1. **Databricks Workspace**: Access to a Databricks workspace with Apps feature enabled
2. **Personal Access Token**: Generated in Databricks User Settings → Access Tokens
3. **Python & pip**: Required for installing Databricks CLI
4. **Make**: Command-line tool for running build tasks

## Quick Start

### 1. Initial Setup

Run the setup command to install and configure the Databricks CLI:

```bash
make publish-setup
```

This will:
- Install/update the Databricks CLI
- Provide instructions for configuring your workspace connection

### 2. Configure Databricks CLI

Follow the prompts to configure your workspace:

```bash
databricks configure --token
```

Provide:
- **Databricks Host**: `https://your-workspace.cloud.databricks.com`
- **Personal Access Token**: Your token from User Settings → Access Tokens

### 3. Deploy the App

```bash
make publish
```

This automated process will:
1. Build the production React frontend
2. Validate configuration files
3. Check CLI connectivity
4. Upload application files to Databricks workspace
5. Create and start the Databricks App

## Configuration Files

### app.yaml

The main configuration file defines:
- **Command**: Python HTTP server to serve React build files
- **Environment Variables**: Runtime configuration
- **Secrets**: Integration with Databricks secrets for API keys
- **Resources**: Memory and CPU requirements
- **Health Checks**: Application monitoring

### requirements.txt

Python dependencies for the app runtime environment:
- Minimal dependencies since we're serving static files
- Optional enhanced serving capabilities

## Deployment Commands

| Command | Description |
|---------|-------------|
| `make publish-setup` | Install and configure Databricks CLI |
| `make publish` | Deploy the complete application |
| `make publish-status` | Check app deployment status |
| `make publish-stop` | Stop the running app |
| `make publish-clean` | Remove app completely |
| `make databricks-credits` | Check remaining trial credits and usage |

## Post-Deployment

### Accessing Your App

Once deployed, your app will be available at:
```
https://your-workspace.cloud.databricks.com/apps/careconnect
```

### Monitoring

Check app status and logs:
```bash
# Status
databricks apps get careconnect

# Logs
databricks apps logs careconnect

# Or using make commands
make publish-status
```

### Configuration Updates

To update configuration or redeploy:
```bash
# Make changes to app.yaml or code
# Then redeploy
make publish
```

## Environment Variables and Secrets

### Required Secrets

Configure these secrets in your Databricks workspace:

1. **google-client-id-secret**: Google OAuth Client ID
2. **google-maps-api-key-secret**: Google Maps API Key  
3. **databricks-token-secret**: Databricks API token for ML endpoints

### Creating Secrets

```bash
# Example secret creation
databricks secrets create-scope careconnect-secrets
databricks secrets put-secret careconnect-secrets google-client-id-secret
databricks secrets put-secret careconnect-secrets google-maps-api-key-secret
databricks secrets put-secret careconnect-secrets databricks-token-secret
```

## Architecture

### Deployment Structure

```
/Apps/CareConnect/
├── app.yaml                    # App configuration
├── requirements.txt            # Python dependencies
├── deploy-app.py              # Deployment script
└── frontend/
    └── build/                 # React production build
        ├── index.html
        ├── static/
        └── ...
```

### Runtime Environment

- **Python**: 3.11.0 in isolated virtual environment
- **Port**: 8080 (configurable in app.yaml)
- **Server**: Python http.server module
- **Resources**: 512Mi memory, 0.5 CPU (configurable)

## Troubleshooting

### Common Issues

1. **CLI Not Configured**
   ```bash
   make publish-setup
   databricks configure --token
   ```

2. **App Already Exists**
   - The deployment automatically handles updates
   - Use `make publish-clean` to remove and redeploy if needed

3. **Build Failures**
   - Ensure `npm install` completed successfully
   - Check that `frontend/build/` directory exists

4. **Permission Errors**
   - Verify your access token has sufficient permissions
   - Check workspace Apps feature is enabled

### Logs and Debugging

```bash
# View detailed app logs
databricks apps logs careconnect

# Check app configuration
databricks apps get careconnect

# Test CLI connection
databricks workspace list
```

## Credit Monitoring

### Quick Credit Check

Use the built-in command to monitor your trial credits:

```bash
make databricks-credits
```

This command will:
- Attempt to fetch usage data via CLI
- Provide alternative methods if CLI access is limited
- Show tips for credit management

### Manual Credit Monitoring

**Account Console Method (Most Reliable):**
1. Go to your Databricks workspace
2. Click profile icon → "Manage Account"
3. Navigate to "Billing & Usage"
4. View current balance and usage breakdown

**Workspace Admin Method:**
1. In workspace, click settings gear (⚙️)
2. Go to "Admin Console" → "Billing"
3. Check usage metrics and remaining credits

### Credit Usage Tips

- **Static Apps**: CareConnect frontend uses minimal credits
- **ML Endpoints**: AI/Databricks API calls consume more credits
- **Monitoring**: Set up alerts at 50%, 75%, 90% usage
- **Conservation**: Stop unused clusters and apps
- **Optimization**: Monitor billing dashboard regularly

## Security Considerations

1. **Secrets Management**: Never commit API keys to source code
2. **Access Controls**: Configure appropriate workspace permissions
3. **Token Security**: Rotate access tokens regularly
4. **CORS Settings**: Review and adjust CORS configuration as needed

## Production Recommendations

1. **Resource Scaling**: Adjust memory/CPU in app.yaml based on usage
2. **Health Monitoring**: Set up alerts for app health checks
3. **Backup Strategy**: Keep configuration files in version control
4. **Update Process**: Establish process for regular updates and security patches

## Support

For deployment issues:
1. Check this documentation
2. Review Databricks Apps documentation
3. Verify workspace configuration and permissions
4. Check application logs for runtime errors