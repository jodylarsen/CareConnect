# Databricks Authentication Guide for Google Maps Analysis

## Authentication Options

### Option 1: CLI Authentication (Recommended)
```bash
# For dev environment
databricks auth login --host https://hertz-dev-dataplatform.cloud.databricks.com --profile dev

# For production analysis (if available in prod)
databricks auth login --host https://hertz-prod-dataplatform.cloud.databricks.com --profile prod
```

### Option 2: Personal Access Token
1. Go to Databricks workspace → User Settings → Access Tokens
2. Generate new token
3. Update `~/.databrickscfg`:
```ini
[dev]
host = https://hertz-dev-dataplatform.cloud.databricks.com
token = your_new_token_here
```

### Option 3: Azure AD Authentication (Enterprise SSO)
```bash
databricks auth login --host https://hertz-dev-dataplatform.cloud.databricks.com --azure-auth --profile dev
```

## Quick Access Commands

### Check Table Existence
```bash
databricks tables list --catalog dais-hackathon-2025 --schema bright_initiative --profile dev
```

### Get Table Schema
```bash
databricks tables get dais-hackathon-2025.bright_initiative.google_maps_businesses --profile dev
```

### Run SQL Query
```bash
databricks sql query "SELECT COUNT(*) FROM dais-hackathon-2025.bright_initiative.google_maps_businesses" --warehouse-id your_warehouse_id --profile dev
```

## Databricks Notebook Approach (Recommended)

1. Open Databricks workspace: https://hertz-dev-dataplatform.cloud.databricks.com
2. Create new notebook
3. Copy the provided SQL queries or Python script
4. Execute analysis directly in the notebook environment

## Troubleshooting

### Common Issues:
1. **Invalid Token**: Regenerate token in Databricks UI
2. **Permission Denied**: Contact Databricks admin for table access
3. **Schema Not Found**: Verify the exact schema name and your access permissions
4. **Network Issues**: Ensure VPN connection if required

### Verification Steps:
```bash
# Test connection
databricks workspace list --profile dev

# Check available catalogs
databricks tables list-catalogs --profile dev

# Check available schemas in catalog
databricks tables list --catalog dais-hackathon-2025 --profile dev
```

## Alternative: Direct SQL Access

If CLI access is limited, you can run the analysis directly in the Databricks SQL interface:
1. Navigate to Databricks SQL
2. Create new query
3. Paste SQL commands from `google_maps_businesses_analysis.sql`
4. Execute and review results

## Next Steps After Authentication

1. Run table schema analysis first
2. Execute data quality assessment queries
3. Identify healthcare provider subset
4. Generate comprehensive analysis report
5. Document findings for CareConnect integration planning