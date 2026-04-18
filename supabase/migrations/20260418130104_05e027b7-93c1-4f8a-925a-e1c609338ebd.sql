
-- Note: public buckets serve files directly via CDN URLs; we don't need a SELECT policy
-- on storage.objects for the public CDN to work. Removing the broad SELECT policy
-- prevents listing/enumeration via the API while keeping files accessible by URL.
DROP POLICY IF EXISTS "Hostel images public read" ON storage.objects;
DROP POLICY IF EXISTS "Avatars public read" ON storage.objects;
