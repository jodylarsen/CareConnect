#!/usr/bin/env python3
"""
Databricks SQL CLI Tool for CareConnect
Allows executing SQL queries on Databricks and exploring datasets
"""

import os
import sys
import json
import requests
import argparse
from urllib.parse import urljoin
import pandas as pd
from tabulate import tabulate
from pathlib import Path

def load_env_file(env_path):
    """Load environment variables from .env file"""
    env_vars = {}
    if env_path.exists():
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip()
    return env_vars

class DatabricksSQL:
    def __init__(self, token=None, workspace=None):
        """Initialize Databricks SQL client"""
        # Load environment variables from frontend .env file
        project_root = Path(__file__).parent.parent
        env_file = project_root / 'frontend' / '.env'
        env_vars = load_env_file(env_file)
        
        # Set environment variables if not already set
        for key, value in env_vars.items():
            if key not in os.environ:
                os.environ[key] = value
        
        self.token = token or os.getenv('REACT_APP_DATABRICKS_TOKEN')
        self.workspace = workspace or os.getenv('REACT_APP_DATABRICKS_WORKSPACE')
        
        if not self.token or not self.workspace:
            print("❌ Error: Missing Databricks credentials")
            print(f"   Looked for .env file at: {env_file}")
            print("   Required variables: REACT_APP_DATABRICKS_TOKEN, REACT_APP_DATABRICKS_WORKSPACE")
            print("   Or provide --token and --workspace arguments")
            sys.exit(1)
            
        self.base_url = f"https://{self.workspace}"
        self.headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
        
    def execute_sql(self, query, warehouse_id=None):
        """Execute SQL query using Databricks SQL API"""
        # Use default warehouse if not specified
        if not warehouse_id:
            warehouses = self.list_warehouses()
            if warehouses:
                warehouse_id = warehouses[0]['id']
                print(f"ℹ️  Using warehouse: {warehouses[0]['name']} ({warehouse_id})")
            else:
                print("❌ No warehouses available")
                return None
        
        # Execute query
        url = f"{self.base_url}/api/2.0/sql/statements"
        payload = {
            "statement": query,
            "warehouse_id": warehouse_id,
            "wait_timeout": "30s"
        }
        
        try:
            print(f"🔍 Executing query...")
            response = requests.post(url, headers=self.headers, json=payload)
            
            if response.status_code == 200:
                result = response.json()
                return self.format_result(result)
            else:
                print(f"❌ SQL execution failed: {response.status_code}")
                print(f"Response: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Error executing SQL: {e}")
            return None
    
    def list_warehouses(self):
        """List available SQL warehouses"""
        url = f"{self.base_url}/api/2.0/sql/warehouses"
        try:
            response = requests.get(url, headers=self.headers)
            if response.status_code == 200:
                return response.json().get('warehouses', [])
            else:
                print(f"❌ Failed to list warehouses: {response.status_code}")
                return []
        except Exception as e:
            print(f"❌ Error listing warehouses: {e}")
            return []
    
    def format_result(self, result):
        """Format SQL query result for display"""
        if 'result' not in result:
            print("❌ No result data found")
            return None
            
        result_data = result['result']
        
        # Get column names from manifest
        manifest = result.get('manifest', {})
        schema = manifest.get('schema', {})
        columns = [col['name'] for col in schema.get('columns', [])]
        
        # Get data rows
        if 'data_array' in result_data and result_data['data_array']:
            rows = result_data['data_array']
            
            # Create DataFrame for better formatting
            if rows and columns:
                df = pd.DataFrame(rows, columns=columns)
                return df
            else:
                print("ℹ️  Query executed successfully but returned no data")
                return None
        else:
            print("ℹ️  Query executed successfully but returned no data")
            return None
    
    def explore_catalog(self, catalog_name="dais-hackathon-2025"):
        """Explore datasets in the specified catalog"""
        print(f"🔍 Exploring catalog: {catalog_name}")
        print("=" * 50)
        
        # List schemas in catalog
        schemas_query = f"SHOW SCHEMAS IN {catalog_name}"
        print(f"\n📁 Schemas in {catalog_name}:")
        schemas_result = self.execute_sql(schemas_query)
        
        if schemas_result is not None:
            print(tabulate(schemas_result, headers='keys', tablefmt='grid'))
            
            # Get schema names for further exploration
            schema_names = schemas_result['namespace'].tolist() if 'namespace' in schemas_result.columns else []
            
            # Explore each schema
            for schema in schema_names[:3]:  # Limit to first 3 schemas to avoid too much output
                print(f"\n📋 Tables in {catalog_name}.{schema}:")
                tables_query = f"SHOW TABLES IN {catalog_name}.{schema}"
                tables_result = self.execute_sql(tables_query)
                
                if tables_result is not None:
                    print(tabulate(tables_result, headers='keys', tablefmt='grid'))
                    
                    # Get table names
                    table_names = tables_result['tableName'].tolist() if 'tableName' in tables_result.columns else []
                    
                    # Describe first few tables
                    for table in table_names[:2]:  # Limit to first 2 tables per schema
                        print(f"\n📊 Schema for {catalog_name}.{schema}.{table}:")
                        describe_query = f"DESCRIBE {catalog_name}.{schema}.{table}"
                        describe_result = self.execute_sql(describe_query)
                        
                        if describe_result is not None:
                            print(tabulate(describe_result, headers='keys', tablefmt='grid'))
                            
                        # Sample data
                        print(f"\n📄 Sample data from {catalog_name}.{schema}.{table}:")
                        sample_query = f"SELECT * FROM {catalog_name}.{schema}.{table} LIMIT 5"
                        sample_result = self.execute_sql(sample_query)
                        
                        if sample_result is not None:
                            print(tabulate(sample_result, headers='keys', tablefmt='grid'))
                        
                        print("\n" + "-" * 80 + "\n")
    
    def find_healthcare_datasets(self, catalog_name="dais-hackathon-2025"):
        """Find datasets relevant to healthcare/medical applications"""
        print(f"🏥 Searching for healthcare-related datasets in {catalog_name}")
        print("=" * 60)
        
        # Keywords that might indicate healthcare data
        healthcare_keywords = [
            'health', 'medical', 'patient', 'hospital', 'clinic', 'drug', 
            'medicine', 'disease', 'symptom', 'diagnosis', 'treatment',
            'pharmacy', 'doctor', 'provider', 'care', 'wellness'
        ]
        
        # Get all schemas
        schemas_query = f"SHOW SCHEMAS IN {catalog_name}"
        schemas_result = self.execute_sql(schemas_query)
        
        if schemas_result is not None:
            schema_names = schemas_result['namespace'].tolist() if 'namespace' in schemas_result.columns else []
            
            healthcare_tables = []
            
            for schema in schema_names:
                # Get tables in schema
                tables_query = f"SHOW TABLES IN {catalog_name}.{schema}"
                tables_result = self.execute_sql(tables_query)
                
                if tables_result is not None:
                    table_names = tables_result['tableName'].tolist() if 'tableName' in tables_result.columns else []
                    
                    for table in table_names:
                        # Check if table name contains healthcare keywords
                        table_lower = table.lower()
                        schema_lower = schema.lower()
                        
                        for keyword in healthcare_keywords:
                            if keyword in table_lower or keyword in schema_lower:
                                healthcare_tables.append({
                                    'catalog': catalog_name,
                                    'schema': schema,
                                    'table': table,
                                    'full_name': f"{catalog_name}.{schema}.{table}",
                                    'keyword_match': keyword
                                })
                                break
            
            if healthcare_tables:
                print("🎯 Found potential healthcare datasets:")
                healthcare_df = pd.DataFrame(healthcare_tables)
                print(tabulate(healthcare_df, headers='keys', tablefmt='grid'))
                
                # Explore the most promising ones
                print(f"\n📊 Detailed exploration of top healthcare datasets:")
                for i, table_info in enumerate(healthcare_tables[:3]):  # Top 3
                    full_name = table_info['full_name']
                    print(f"\n{i+1}. {full_name}")
                    print(f"   Matched keyword: {table_info['keyword_match']}")
                    
                    # Describe table
                    describe_result = self.execute_sql(f"DESCRIBE {full_name}")
                    if describe_result is not None:
                        print(f"   Columns:")
                        print(tabulate(describe_result, headers='keys', tablefmt='grid'))
                    
                    # Sample data
                    sample_result = self.execute_sql(f"SELECT * FROM {full_name} LIMIT 3")
                    if sample_result is not None:
                        print(f"   Sample data:")
                        print(tabulate(sample_result, headers='keys', tablefmt='grid'))
                    
                    print("\n" + "-" * 60)
            else:
                print("❌ No healthcare-related datasets found with obvious naming patterns")
                print("💡 Try exploring the general catalog structure for other relevant data")

def main():
    parser = argparse.ArgumentParser(description='Databricks SQL CLI for CareConnect')
    parser.add_argument('--token', help='Databricks personal access token')
    parser.add_argument('--workspace', help='Databricks workspace URL')
    parser.add_argument('--catalog', default='dais-hackathon-2025', help='Catalog to explore')
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # SQL command
    sql_parser = subparsers.add_parser('sql', help='Execute SQL query')
    sql_parser.add_argument('query', help='SQL query to execute')
    sql_parser.add_argument('--warehouse', help='Warehouse ID to use')
    
    # Explore command
    explore_parser = subparsers.add_parser('explore', help='Explore catalog structure')
    explore_parser.add_argument('--catalog', default='dais-hackathon-2025', help='Catalog to explore')
    
    # Healthcare command
    healthcare_parser = subparsers.add_parser('healthcare', help='Find healthcare datasets')
    healthcare_parser.add_argument('--catalog', default='dais-hackathon-2025', help='Catalog to search')
    
    # Warehouses command
    warehouses_parser = subparsers.add_parser('warehouses', help='List available warehouses')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # Initialize client
    client = DatabricksSQL(token=args.token, workspace=args.workspace)
    
    if args.command == 'sql':
        result = client.execute_sql(args.query, args.warehouse)
        if result is not None:
            print("\n📋 Query Results:")
            print(tabulate(result, headers='keys', tablefmt='grid'))
    
    elif args.command == 'explore':
        catalog = getattr(args, 'catalog', 'dais-hackathon-2025')
        client.explore_catalog(catalog)
    
    elif args.command == 'healthcare':
        catalog = getattr(args, 'catalog', 'dais-hackathon-2025')
        client.find_healthcare_datasets(catalog)
    
    elif args.command == 'warehouses':
        warehouses = client.list_warehouses()
        if warehouses:
            print("📊 Available Warehouses:")
            warehouses_df = pd.DataFrame(warehouses)
            print(tabulate(warehouses_df[['id', 'name', 'state']], headers='keys', tablefmt='grid'))
        else:
            print("❌ No warehouses found")

if __name__ == '__main__':
    main()