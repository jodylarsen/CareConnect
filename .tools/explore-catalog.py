#!/usr/bin/env python3
"""
Alternative Databricks catalog explorer using REST API
"""

import os
import sys
import json
import requests
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

class DatabricksCatalogExplorer:
    def __init__(self, token=None, workspace=None):
        """Initialize Databricks catalog explorer"""
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
            sys.exit(1)
        
        self.base_url = f"https://{self.workspace}"
        self.headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
    
    def list_catalogs(self):
        """List all catalogs using Unity Catalog API"""
        url = f"{self.base_url}/api/2.1/unity-catalog/catalogs"
        try:
            print("🔍 Fetching catalogs...")
            response = requests.get(url, headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                catalogs = data.get('catalogs', [])
                
                if catalogs:
                    print(f"\n📊 Found {len(catalogs)} catalogs:")
                    catalog_data = []
                    for catalog in catalogs:
                        catalog_data.append({
                            'name': catalog.get('name', 'Unknown'),
                            'comment': catalog.get('comment', 'No description'),
                            'owner': catalog.get('owner', 'Unknown'),
                            'created_at': catalog.get('created_at', 'Unknown')
                        })
                    
                    print(tabulate(catalog_data, headers='keys', tablefmt='grid'))
                    return [c['name'] for c in catalog_data]
                else:
                    print("❌ No catalogs found")
                    return []
            else:
                print(f"❌ Failed to list catalogs: {response.status_code}")
                print(f"Response: {response.text}")
                return []
                
        except Exception as e:
            print(f"❌ Error listing catalogs: {e}")
            return []
    
    def list_schemas(self, catalog_name):
        """List schemas in a catalog"""
        url = f"{self.base_url}/api/2.1/unity-catalog/schemas"
        params = {'catalog_name': catalog_name}
        
        try:
            print(f"\n🔍 Fetching schemas for catalog '{catalog_name}'...")
            response = requests.get(url, headers=self.headers, params=params)
            
            if response.status_code == 200:
                data = response.json()
                schemas = data.get('schemas', [])
                
                if schemas:
                    print(f"\n📁 Found {len(schemas)} schemas in {catalog_name}:")
                    schema_data = []
                    for schema in schemas:
                        schema_data.append({
                            'name': schema.get('name', 'Unknown'),
                            'catalog_name': schema.get('catalog_name', 'Unknown'),
                            'comment': schema.get('comment', 'No description'),
                            'owner': schema.get('owner', 'Unknown')
                        })
                    
                    print(tabulate(schema_data, headers='keys', tablefmt='grid'))
                    return [s['name'] for s in schema_data]
                else:
                    print(f"❌ No schemas found in catalog '{catalog_name}'")
                    return []
            else:
                print(f"❌ Failed to list schemas: {response.status_code}")
                print(f"Response: {response.text}")
                return []
                
        except Exception as e:
            print(f"❌ Error listing schemas: {e}")
            return []
    
    def list_tables(self, catalog_name, schema_name):
        """List tables in a schema"""
        url = f"{self.base_url}/api/2.1/unity-catalog/tables"
        params = {
            'catalog_name': catalog_name,
            'schema_name': schema_name
        }
        
        try:
            print(f"\n🔍 Fetching tables for {catalog_name}.{schema_name}...")
            response = requests.get(url, headers=self.headers, params=params)
            
            if response.status_code == 200:
                data = response.json()
                tables = data.get('tables', [])
                
                if tables:
                    print(f"\n📋 Found {len(tables)} tables in {catalog_name}.{schema_name}:")
                    table_data = []
                    for table in tables:
                        table_data.append({
                            'name': table.get('name', 'Unknown'),
                            'catalog_name': table.get('catalog_name', 'Unknown'),
                            'schema_name': table.get('schema_name', 'Unknown'),
                            'table_type': table.get('table_type', 'Unknown'),
                            'comment': table.get('comment', 'No description')[:50] + '...' if table.get('comment', '') else 'No description'
                        })
                    
                    print(tabulate(table_data, headers='keys', tablefmt='grid'))
                    return table_data
                else:
                    print(f"❌ No tables found in {catalog_name}.{schema_name}")
                    return []
            else:
                print(f"❌ Failed to list tables: {response.status_code}")
                print(f"Response: {response.text}")
                return []
                
        except Exception as e:
            print(f"❌ Error listing tables: {e}")
            return []
    
    def get_table_info(self, catalog_name, schema_name, table_name):
        """Get detailed information about a table"""
        table_full_name = f"{catalog_name}.{schema_name}.{table_name}"
        url = f"{self.base_url}/api/2.1/unity-catalog/tables/{table_full_name}"
        
        try:
            print(f"\n🔍 Getting details for table {table_full_name}...")
            response = requests.get(url, headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                
                print(f"\n📊 Table Details: {table_full_name}")
                print(f"Type: {data.get('table_type', 'Unknown')}")
                print(f"Comment: {data.get('comment', 'No description')}")
                print(f"Owner: {data.get('owner', 'Unknown')}")
                
                # Show columns if available
                columns = data.get('columns', [])
                if columns:
                    print(f"\n📋 Columns ({len(columns)}):")
                    column_data = []
                    for col in columns:
                        column_data.append({
                            'name': col.get('name', 'Unknown'),
                            'type': col.get('type_name', 'Unknown'),
                            'comment': col.get('comment', 'No description')
                        })
                    
                    print(tabulate(column_data, headers='keys', tablefmt='grid'))
                
                return data
            else:
                print(f"❌ Failed to get table info: {response.status_code}")
                print(f"Response: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Error getting table info: {e}")
            return None
    
    def explore_hackathon_catalog(self):
        """Explore the dais-hackathon-2025 catalog specifically"""
        print("🏥 Exploring DAIS Hackathon 2025 Catalog for Healthcare Data")
        print("=" * 60)
        
        # Try to explore the hackathon catalog
        target_catalog = 'dais-hackathon-2025'
        
        # First list all catalogs to see what's available
        catalogs = self.list_catalogs()
        
        if target_catalog in catalogs:
            print(f"\n✅ Found target catalog: {target_catalog}")
            
            # List schemas in the catalog
            schemas = self.list_schemas(target_catalog)
            
            # Explore each schema
            healthcare_tables = []
            for schema in schemas[:5]:  # Limit to first 5 schemas
                tables = self.list_tables(target_catalog, schema)
                
                # Look for healthcare-related tables
                for table in tables:
                    table_name = table['name'].lower()
                    table_comment = table.get('comment', '').lower()
                    
                    healthcare_keywords = [
                        'health', 'medical', 'patient', 'hospital', 'clinic', 
                        'drug', 'medicine', 'disease', 'symptom', 'diagnosis', 
                        'treatment', 'pharmacy', 'doctor', 'provider', 'care'
                    ]
                    
                    for keyword in healthcare_keywords:
                        if keyword in table_name or keyword in table_comment:
                            healthcare_tables.append({
                                'catalog': target_catalog,
                                'schema': schema,
                                'table': table['name'],
                                'full_name': f"{target_catalog}.{schema}.{table['name']}",
                                'keyword_match': keyword,
                                'comment': table.get('comment', 'No description')
                            })
                            break
            
            if healthcare_tables:
                print(f"\n🎯 Found {len(healthcare_tables)} potential healthcare tables:")
                print(tabulate(healthcare_tables, headers='keys', tablefmt='grid'))
                
                # Get detailed info for top 3 tables
                for i, table_info in enumerate(healthcare_tables[:3]):
                    self.get_table_info(
                        table_info['catalog'], 
                        table_info['schema'], 
                        table_info['table']
                    )
                    print("\n" + "-" * 60)
            else:
                print("❌ No healthcare-related tables found with obvious naming patterns")
        else:
            print(f"❌ Target catalog '{target_catalog}' not found")
            if catalogs:
                print("Available catalogs:")
                for catalog in catalogs:
                    print(f"  - {catalog}")

def main():
    explorer = DatabricksCatalogExplorer()
    explorer.explore_hackathon_catalog()

if __name__ == '__main__':
    main()