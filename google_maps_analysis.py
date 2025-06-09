"""
Google Maps Businesses Table Analysis for CareConnect Healthcare Provider Recommendations
Python script for comprehensive analysis in Databricks environment
"""

import pandas as pd
from pyspark.sql import SparkSession
from pyspark.sql.functions import *
from pyspark.sql.types import *
import matplotlib.pyplot as plt
import seaborn as sns

# Initialize Spark session (already available in Databricks)
# spark = SparkSession.builder.appName("GoogleMapsHealthcareAnalysis").getOrCreate()

class GoogleMapsHealthcareAnalyzer:
    def __init__(self, table_name="dais-hackathon-2025.bright_initiative.google_maps_businesses"):
        self.table_name = table_name
        self.df = None
        self.healthcare_keywords = [
            'health', 'medical', 'doctor', 'hospital', 'clinic', 'pharmacy',
            'dentist', 'specialist', 'care', 'physician', 'urgent', 'emergency',
            'therapy', 'rehabilitation', 'nursing', 'pediatric', 'cardiology',
            'dermatology', 'orthopedic', 'neurology', 'psychiatry', 'optometry'
        ]
        
    def load_data(self):
        """Load the Google Maps businesses table"""
        try:
            self.df = spark.table(self.table_name)
            print(f"Successfully loaded {self.table_name}")
            print(f"Total records: {self.df.count():,}")
            return True
        except Exception as e:
            print(f"Error loading table: {e}")
            return False
    
    def analyze_schema(self):
        """Analyze table schema and structure"""
        if self.df is None:
            print("No data loaded. Call load_data() first.")
            return
        
        print("\n=== TABLE SCHEMA ===")
        self.df.printSchema()
        
        print("\n=== COLUMN SUMMARY ===")
        columns_info = []
        for col_name in self.df.columns:
            col_type = dict(self.df.dtypes)[col_name]
            null_count = self.df.filter(col(col_name).isNull()).count()
            total_count = self.df.count()
            completeness = ((total_count - null_count) / total_count) * 100
            
            columns_info.append({
                'column': col_name,
                'type': col_type,
                'null_count': null_count,
                'completeness_pct': round(completeness, 2)
            })
        
        schema_df = pd.DataFrame(columns_info)
        print(schema_df.to_string(index=False))
        
        return schema_df
    
    def identify_healthcare_providers(self):
        """Identify healthcare-related businesses"""
        if self.df is None:
            print("No data loaded. Call load_data() first.")
            return None
        
        # Create healthcare filter conditions
        healthcare_conditions = None
        
        # Check category field
        if 'category' in self.df.columns:
            category_conditions = [
                lower(col('category')).contains(keyword) 
                for keyword in self.healthcare_keywords
            ]
            healthcare_conditions = category_conditions[0]
            for condition in category_conditions[1:]:
                healthcare_conditions = healthcare_conditions | condition
        
        # Check name field
        if 'name' in self.df.columns:
            name_conditions = [
                lower(col('name')).contains(keyword) 
                for keyword in self.healthcare_keywords
            ]
            name_healthcare = name_conditions[0]
            for condition in name_conditions[1:]:
                name_healthcare = name_healthcare | condition
            
            if healthcare_conditions is not None:
                healthcare_conditions = healthcare_conditions | name_healthcare
            else:
                healthcare_conditions = name_healthcare
        
        if healthcare_conditions is None:
            print("No category or name column found for healthcare identification")
            return None
        
        # Filter healthcare providers
        healthcare_df = self.df.filter(healthcare_conditions)
        healthcare_count = healthcare_df.count()
        total_count = self.df.count()
        
        print(f"\n=== HEALTHCARE PROVIDER IDENTIFICATION ===")
        print(f"Total healthcare providers found: {healthcare_count:,}")
        print(f"Percentage of total: {(healthcare_count/total_count)*100:.2f}%")
        
        return healthcare_df
    
    def analyze_healthcare_categories(self, healthcare_df):
        """Analyze healthcare provider categories"""
        if healthcare_df is None:
            return
        
        if 'category' not in healthcare_df.columns:
            print("No category column found")
            return
        
        print("\n=== HEALTHCARE CATEGORIES ANALYSIS ===")
        
        # Category distribution
        category_stats = (healthcare_df
                         .groupBy('category')
                         .agg(
                             count('*').alias('provider_count'),
                             avg('rating').alias('avg_rating'),
                             avg('reviews_count').alias('avg_reviews')
                         )
                         .orderBy(desc('provider_count')))
        
        category_stats.show(20, truncate=False)
        
        return category_stats
    
    def analyze_geographic_coverage(self, healthcare_df=None):
        """Analyze geographic distribution of providers"""
        df_to_analyze = healthcare_df if healthcare_df is not None else self.df
        
        if df_to_analyze is None:
            return
        
        print("\n=== GEOGRAPHIC COVERAGE ANALYSIS ===")
        
        # Check for coordinate columns
        coord_cols = [col for col in ['latitude', 'longitude', 'lat', 'lng'] 
                     if col in df_to_analyze.columns]
        
        if len(coord_cols) < 2:
            print("Insufficient coordinate data found")
            return
        
        lat_col, lng_col = coord_cols[0], coord_cols[1]
        
        # Geographic statistics
        geo_stats = (df_to_analyze
                    .filter((col(lat_col).isNotNull()) & (col(lng_col).isNotNull()))
                    .agg(
                        count('*').alias('records_with_coords'),
                        min(lat_col).alias('min_lat'),
                        max(lat_col).alias('max_lat'),
                        min(lng_col).alias('min_lng'),
                        max(lng_col).alias('max_lng'),
                        avg(lat_col).alias('avg_lat'),
                        avg(lng_col).alias('avg_lng')
                    ))
        
        geo_stats.show()
        
        return geo_stats
    
    def analyze_quality_metrics(self, healthcare_df=None):
        """Analyze rating and review quality metrics"""
        df_to_analyze = healthcare_df if healthcare_df is not None else self.df
        
        if df_to_analyze is None:
            return
        
        print("\n=== QUALITY METRICS ANALYSIS ===")
        
        # Rating distribution
        if 'rating' in df_to_analyze.columns:
            rating_dist = (df_to_analyze
                          .filter(col('rating').isNotNull())
                          .groupBy('rating')
                          .agg(count('*').alias('count'))
                          .orderBy('rating'))
            
            print("Rating Distribution:")
            rating_dist.show()
        
        # Review count statistics
        if 'reviews_count' in df_to_analyze.columns:
            review_stats = (df_to_analyze
                           .filter(col('reviews_count').isNotNull())
                           .agg(
                               min('reviews_count').alias('min_reviews'),
                               max('reviews_count').alias('max_reviews'),
                               avg('reviews_count').alias('avg_reviews'),
                               expr('percentile_approx(reviews_count, 0.5)').alias('median_reviews')
                           ))
            
            print("Review Count Statistics:")
            review_stats.show()
    
    def assess_data_completeness(self, healthcare_df=None):
        """Assess completeness of key fields for healthcare providers"""
        df_to_analyze = healthcare_df if healthcare_df is not None else self.df
        
        if df_to_analyze is None:
            return
        
        print("\n=== DATA COMPLETENESS ASSESSMENT ===")
        
        total_records = df_to_analyze.count()
        
        # Key fields for healthcare providers
        key_fields = ['name', 'category', 'address', 'rating', 'reviews_count', 
                     'latitude', 'longitude', 'phone', 'website']
        
        completeness_data = []
        
        for field in key_fields:
            if field in df_to_analyze.columns:
                non_null_count = df_to_analyze.filter(col(field).isNotNull()).count()
                completeness_pct = (non_null_count / total_records) * 100
                completeness_data.append({
                    'field': field,
                    'populated_count': non_null_count,
                    'total_count': total_records,
                    'completeness_pct': round(completeness_pct, 2)
                })
            else:
                completeness_data.append({
                    'field': field,
                    'populated_count': 0,
                    'total_count': total_records,
                    'completeness_pct': 0.0
                })
        
        completeness_df = pd.DataFrame(completeness_data)
        print(completeness_df.to_string(index=False))
        
        return completeness_df
    
    def generate_sample_providers(self, healthcare_df, n=25):
        """Generate sample of high-quality healthcare providers"""
        if healthcare_df is None:
            return
        
        print(f"\n=== SAMPLE HIGH-QUALITY HEALTHCARE PROVIDERS (TOP {n}) ===")
        
        # Filter for providers with complete data
        complete_providers = healthcare_df.filter(
            col('name').isNotNull() &
            col('category').isNotNull() &
            col('address').isNotNull() &
            col('rating').isNotNull() &
            col('latitude').isNotNull() &
            col('longitude').isNotNull()
        )
        
        # Order by rating and review count
        sample_providers = (complete_providers
                           .orderBy(desc('rating'), desc('reviews_count'))
                           .limit(n))
        
        sample_providers.show(n, truncate=False)
        
        return sample_providers
    
    def run_comprehensive_analysis(self):
        """Run complete analysis pipeline"""
        print("Starting comprehensive Google Maps healthcare provider analysis...")
        
        # Load data
        if not self.load_data():
            return
        
        # Analyze schema
        schema_info = self.analyze_schema()
        
        # Identify healthcare providers
        healthcare_df = self.identify_healthcare_providers()
        
        if healthcare_df is not None:
            # Analyze healthcare categories
            self.analyze_healthcare_categories(healthcare_df)
            
            # Geographic analysis
            self.analyze_geographic_coverage(healthcare_df)
            
            # Quality metrics
            self.analyze_quality_metrics(healthcare_df)
            
            # Data completeness
            completeness_info = self.assess_data_completeness(healthcare_df)
            
            # Sample providers
            self.generate_sample_providers(healthcare_df)
            
            print("\n=== ANALYSIS COMPLETE ===")
            print("Review the results above to assess the suitability of this dataset")
            print("for CareConnect's healthcare provider recommendation system.")
            
            return {
                'schema_info': schema_info,
                'healthcare_df': healthcare_df,
                'completeness_info': completeness_info
            }
        else:
            print("Could not identify healthcare providers in the dataset")
            return None

# Usage instructions for Databricks notebook:
"""
# In a Databricks notebook, run:

analyzer = GoogleMapsHealthcareAnalyzer()
results = analyzer.run_comprehensive_analysis()

# For custom analysis:
# analyzer.load_data()
# healthcare_providers = analyzer.identify_healthcare_providers()
# analyzer.analyze_healthcare_categories(healthcare_providers)

# To save results:
# healthcare_providers.write.mode('overwrite').saveAsTable('your_schema.healthcare_providers_subset')
"""

if __name__ == "__main__":
    # This will run in a Databricks notebook environment
    analyzer = GoogleMapsHealthcareAnalyzer()
    results = analyzer.run_comprehensive_analysis()