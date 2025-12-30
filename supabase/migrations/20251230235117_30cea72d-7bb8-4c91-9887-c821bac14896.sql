-- Add Mapbox public token column to company_features for frontend map display
ALTER TABLE public.company_features 
ADD COLUMN mapbox_public_token text;