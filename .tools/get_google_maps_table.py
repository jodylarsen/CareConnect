#!/usr/bin/env python3
"""
Get detailed information about the Google Maps businesses table
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

def main():
    explorer = DatabricksCatalogExplorer()
    print("📊 Getting detailed information for Google Maps businesses table...")
    explorer.get_table_info('dais-hackathon-2025', 'bright_initiative', 'google_maps_businesses')

if __name__ == '__main__':
    main()