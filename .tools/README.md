# CareConnect Databricks SQL CLI Tool

A command-line tool for exploring and querying the `dais-hackathon-2025` catalog in Databricks to find healthcare-related datasets for the CareConnect project.

## Setup

1. **Install Python dependencies:**
   ```bash
   pip install -r .tools/requirements.txt
   ```

2. **Set environment variables:**
   The tool uses the same Databricks credentials as the project:
   ```bash
   export REACT_APP_DATABRICKS_TOKEN="dapi31ca55209e41ef026b748e45e35a005e"
   export REACT_APP_DATABRICKS_WORKSPACE="dbc-c1176c62-ee6c.cloud.databricks.com"
   ```

3. **Make executable:**
   ```bash
   chmod +x .tools/databricks-sql-cli.py
   ```

## Usage

### List Available Warehouses
```bash
python .tools/databricks-sql-cli.py warehouses
```

### Explore Catalog Structure
```bash
python .tools/databricks-sql-cli.py explore --catalog dais-hackathon-2025
```

### Find Healthcare Datasets
```bash
python .tools/databricks-sql-cli.py healthcare --catalog dais-hackathon-2025
```

### Execute Custom SQL
```bash
python .tools/databricks-sql-cli.py sql "SHOW SCHEMAS IN \`dais-hackathon-2025\`"
```

### Specific Healthcare Queries
```bash
# Look for tables with healthcare keywords
python .tools/databricks-sql-cli.py sql "SHOW TABLES IN \`dais-hackathon-2025\`.default"

# Explore a specific table
python .tools/databricks-sql-cli.py sql "DESCRIBE \`dais-hackathon-2025\`.default.table_name"

# Sample data from a healthcare table
python .tools/databricks-sql-cli.py sql "SELECT * FROM \`dais-hackathon-2025\`.schema.table LIMIT 10"
```

## Features

- **Warehouse Discovery**: Automatically finds and uses available SQL warehouses
- **Catalog Exploration**: Systematically explores schemas and tables
- **Healthcare Focus**: Searches for datasets with healthcare-related keywords
- **Data Sampling**: Shows table schemas and sample data
- **Formatted Output**: Uses tables for easy reading
- **Error Handling**: Graceful handling of API errors and missing data

## Healthcare Keywords Searched

The tool looks for tables/schemas containing:
- health, medical, patient, hospital, clinic
- drug, medicine, disease, symptom, diagnosis, treatment
- pharmacy, doctor, provider, care, wellness

## Output Format

The tool provides structured output with:
- 📊 Formatted tables using `tabulate`
- 🔍 Clear section headers and progress indicators
- ❌ Error messages with actionable guidance
- 💡 Helpful tips and suggestions

## Use Cases for CareConnect

1. **Provider Data**: Find hospital, clinic, and healthcare provider datasets
2. **Medical Data**: Locate disease, symptom, and treatment information
3. **Geographic Data**: Healthcare facilities by location
4. **Drug/Pharmacy Data**: Medication and pharmacy information
5. **Health Metrics**: Population health and wellness data

This tool helps identify relevant datasets in the hackathon catalog that can enhance CareConnect's AI-powered healthcare recommendations.