-- SQL Queries to Analyze google_maps_businesses Table for CareConnect Healthcare Provider Recommendations
-- Schema: dais-hackathon-2025.bright_initiative
-- Table: google_maps_businesses

-- 1. Get Table Schema and Column Information
DESCRIBE TABLE dais-hackathon-2025.bright_initiative.google_maps_businesses;

-- Alternative schema query
SHOW COLUMNS IN dais-hackathon-2025.bright_initiative.google_maps_businesses;

-- 2. Get Sample Data to Understand Structure
SELECT * 
FROM dais-hackathon-2025.bright_initiative.google_maps_businesses 
LIMIT 10;

-- 3. Check Row Count and Table Statistics
SELECT COUNT(*) as total_rows 
FROM dais-hackathon-2025.bright_initiative.google_maps_businesses;

-- 4. Analyze Business Categories for Healthcare Providers
-- Look for healthcare-related categories
SELECT 
    category,
    COUNT(*) as count
FROM dais-hackathon-2025.bright_initiative.google_maps_businesses 
WHERE LOWER(category) LIKE '%health%' 
   OR LOWER(category) LIKE '%medical%'
   OR LOWER(category) LIKE '%doctor%'
   OR LOWER(category) LIKE '%hospital%'
   OR LOWER(category) LIKE '%clinic%'
   OR LOWER(category) LIKE '%pharmacy%'
   OR LOWER(category) LIKE '%dentist%'
   OR LOWER(category) LIKE '%specialist%'
   OR LOWER(category) LIKE '%care%'
GROUP BY category
ORDER BY count DESC;

-- 5. Check for Business Name Patterns (Healthcare Keywords)
SELECT 
    name,
    category,
    address,
    rating,
    reviews_count
FROM dais-hackathon-2025.bright_initiative.google_maps_businesses 
WHERE LOWER(name) LIKE '%medical%' 
   OR LOWER(name) LIKE '%health%'
   OR LOWER(name) LIKE '%hospital%'
   OR LOWER(name) LIKE '%clinic%'
   OR LOWER(name) LIKE '%care%'
   OR LOWER(name) LIKE '%doctor%'
   OR LOWER(name) LIKE '%physician%'
LIMIT 20;

-- 6. Geographic Distribution Analysis
-- Check if location data is available
SELECT 
    COUNT(*) as total_with_coordinates,
    AVG(latitude) as avg_lat,
    AVG(longitude) as avg_lng,
    MIN(latitude) as min_lat,
    MAX(latitude) as max_lat,
    MIN(longitude) as min_lng,
    MAX(longitude) as max_lng
FROM dais-hackathon-2025.bright_initiative.google_maps_businesses 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 7. Quality Metrics Analysis
-- Check rating and review distributions
SELECT 
    ROUND(rating, 1) as rating_bucket,
    COUNT(*) as count,
    AVG(reviews_count) as avg_reviews
FROM dais-hackathon-2025.bright_initiative.google_maps_businesses 
WHERE rating IS NOT NULL
GROUP BY ROUND(rating, 1)
ORDER BY rating_bucket;

-- 8. Address/Location Analysis
-- Check address completeness and formats
SELECT 
    COUNT(*) as total_records,
    COUNT(address) as records_with_address,
    COUNT(CASE WHEN address LIKE '%,%' THEN 1 END) as addresses_with_city,
    COUNT(CASE WHEN address LIKE '%[0-9][0-9][0-9][0-9][0-9]%' THEN 1 END) as addresses_with_zip
FROM dais-hackathon-2025.bright_initiative.google_maps_businesses;

-- 9. Potential Healthcare Provider Categories
-- Get all unique categories to identify healthcare-related ones
SELECT DISTINCT category 
FROM dais-hackathon-2025.bright_initiative.google_maps_businesses 
ORDER BY category;

-- 10. Data Quality Assessment
-- Check for null values in key fields
SELECT 
    COUNT(*) as total_records,
    COUNT(name) as name_populated,
    COUNT(category) as category_populated,
    COUNT(address) as address_populated,
    COUNT(rating) as rating_populated,
    COUNT(reviews_count) as reviews_populated,
    COUNT(latitude) as latitude_populated,
    COUNT(longitude) as longitude_populated,
    COUNT(phone) as phone_populated,
    COUNT(website) as website_populated
FROM dais-hackathon-2025.bright_initiative.google_maps_businesses;

-- 11. Specific Healthcare Categories Search
-- More comprehensive healthcare category analysis
SELECT 
    category,
    COUNT(*) as provider_count,
    AVG(rating) as avg_rating,
    AVG(reviews_count) as avg_review_count
FROM dais-hackathon-2025.bright_initiative.google_maps_businesses 
WHERE LOWER(category) IN (
    'doctor',
    'hospital',
    'medical center',
    'clinic',
    'urgent care',
    'family medicine',
    'internal medicine',
    'pediatrician',
    'cardiologist',
    'dermatologist',
    'orthopedic surgeon',
    'physical therapy',
    'pharmacy',
    'dentist',
    'optometrist',
    'mental health',
    'psychiatrist',
    'psychologist',
    'medical clinic',
    'walk-in clinic',
    'emergency room',
    'diagnostic center',
    'medical laboratory',
    'imaging center'
)
GROUP BY category
ORDER BY provider_count DESC;

-- 12. Sample Healthcare Providers with Complete Data
-- Get examples of healthcare providers with all key fields populated
SELECT 
    name,
    category,
    address,
    rating,
    reviews_count,
    latitude,
    longitude,
    phone,
    website
FROM dais-hackathon-2025.bright_initiative.google_maps_businesses 
WHERE LOWER(category) LIKE '%health%' 
   OR LOWER(category) LIKE '%medical%'
   OR LOWER(category) LIKE '%doctor%'
   OR LOWER(category) LIKE '%hospital%'
   OR LOWER(category) LIKE '%clinic%'
AND rating IS NOT NULL 
AND latitude IS NOT NULL 
AND longitude IS NOT NULL
ORDER BY rating DESC, reviews_count DESC
LIMIT 25;