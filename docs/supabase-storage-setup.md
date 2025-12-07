# Supabase Storage Setup Guide

This guide helps you set up the Supabase Storage bucket for video moments.

## Error: "Bucket not found"

If you see this error, it means the `moments` storage bucket hasn't been created in your Supabase project yet.

## Quick Setup Steps

### 1. Create the Storage Bucket

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **"New bucket"** or **"Create bucket"**
5. Configure the bucket:
   - **Name**: `moments` (must match exactly)
   - **Public bucket**: ✅ **Check this** (allows public read access to videos)
   - **File size limit**: Set to a reasonable limit (e.g., 50 MB for videos)
   - **Allowed MIME types**: `video/mp4`, `video/*` (or leave empty for all types)
6. Click **"Create bucket"**

### 2. Set Up Storage Policies (RLS)

After creating the bucket, you need to set up Row Level Security (RLS) policies:

1. In Supabase Dashboard, go to **Storage** → **Policies**
2. Select the `moments` bucket
3. Click **"New Policy"** or use the SQL Editor

#### Policy 1: Allow Authenticated Users to Upload

```sql
-- Allow authenticated users to upload files to their own folder
-- The path structure is: moments/{user_id}/{filename}

-- OPTION 1: Using string_to_array (RECOMMENDED - More reliable)
-- This splits the path by '/' and gets the user_id folder (index [2])
CREATE POLICY "Users can upload their own moments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'moments' AND
  (string_to_array(name, '/'))[2] = (auth.uid())::text
);

-- OPTION 2: Using storage.foldername() (Alternative)
-- If Option 1 doesn't work, try this:
-- CREATE POLICY "Users can upload their own moments"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   bucket_id = 'moments' AND
--   (storage.foldername(name))[1] = auth.uid()::text
-- );

-- OPTION 3: Temporary - Allow all authenticated users (for testing only)
-- Remove this after confirming uploads work, then use Option 1 or 2
-- CREATE POLICY "Users can upload their own moments"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'moments');
```

#### Policy 2: Allow Public Read Access

```sql
-- Allow public read access to all moments
CREATE POLICY "Public can read moments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'moments');
```

#### Policy 3: Allow Users to Delete Their Own Files

```sql
-- Allow users to delete their own moments
CREATE POLICY "Users can delete their own moments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'moments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### 3. Verify Setup

After creating the bucket and policies:

1. Try uploading a moment in the app
2. Check Storage → `moments` bucket to see if files appear
3. Verify files are in folders like `moments/{user_id}/{uuid}.mp4`

## Storage Structure

The app stores videos in this structure:
```
moments/
  {user_id}/
    {uuid}.mp4
    {uuid}.mp4
    ...
```

Example:
```
moments/
  abc123-def456-ghi789/
    video1-uuid.mp4
    video2-uuid.mp4
```

## Troubleshooting

### Bucket Still Not Found

- ✅ Verify bucket name is exactly `moments` (case-sensitive)
- ✅ Check you're using the correct Supabase project
- ✅ Ensure bucket was created successfully (check Storage → Buckets list)

### Upload Permission Denied

- ✅ Check RLS policies are created correctly
- ✅ Verify user is authenticated (`auth.uid()` exists)
- ✅ Ensure INSERT policy allows uploads to user's folder

### Public URLs Not Working

- ✅ Verify bucket is set to "Public bucket"
- ✅ Check SELECT policy allows public read access
- ✅ Ensure file path matches: `moments/{user_id}/{filename}.mp4`

### File Size Too Large

- ✅ Check bucket file size limit
- ✅ Verify video is under the limit (default is often 50MB)
- ✅ Consider compressing videos before upload

## SQL Script for Complete Setup

Run this in Supabase SQL Editor to set up everything at once:

```sql
-- Create the moments bucket (if it doesn't exist)
-- Note: Buckets must be created via Dashboard UI, but policies can be set via SQL

-- Policy 1: Allow authenticated users to upload
CREATE POLICY IF NOT EXISTS "Users can upload their own moments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'moments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Allow public read access
CREATE POLICY IF NOT EXISTS "Public can read moments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'moments');

-- Policy 3: Allow users to delete their own files
CREATE POLICY IF NOT EXISTS "Users can delete their own moments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'moments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Allow users to update their own files (optional)
CREATE POLICY IF NOT EXISTS "Users can update their own moments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'moments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

## Next Steps

After setting up storage:

1. ✅ Create the bucket via Dashboard
2. ✅ Run the SQL policies above
3. ✅ Test video upload in the app
4. ✅ Verify files appear in Storage → `moments` bucket
5. ✅ Check that public URLs work (try opening a video URL in browser)

## Related Documentation

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Storage RLS Policies](https://supabase.com/docs/guides/storage/security/access-control)
- [File Upload Best Practices](https://supabase.com/docs/guides/storage/uploads)

