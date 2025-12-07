/**
 * Debug Video URLs
 * Utility to check if video URLs are accessible and diagnose issues
 */

import { supabase } from '../services/supabaseClient';
import { getMomentPublicUrl } from '../services/moments';

/**
 * Debug a video URL to see if it's accessible
 */
export async function debugVideoUrl(storagePath: string): Promise<void> {
  console.log('🔍 Debugging video URL:', {
    storagePath,
  });

  // Generate URL using getMomentPublicUrl
  const publicUrl = getMomentPublicUrl(storagePath);
  console.log('Generated public URL:', publicUrl);

  // Check if file exists in storage
  const { data: fileData, error: fileError } = await supabase.storage
    .from('moments')
    .list(storagePath.split('/')[0], {
      search: storagePath.split('/').pop(),
    });

  if (fileError) {
    console.error('❌ Storage list error:', fileError);
  } else {
    console.log('✅ File found in storage:', fileData);
  }

  // Try to get file metadata
  const { data: metadata, error: metadataError } = await supabase.storage
    .from('moments')
    .list(storagePath.substring(0, storagePath.lastIndexOf('/')), {
      search: storagePath.split('/').pop(),
    });

  if (metadataError) {
    console.error('❌ Metadata error:', metadataError);
  } else {
    console.log('✅ File metadata:', metadata);
  }

  // Check bucket public access
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) {
    console.error('❌ Bucket list error:', bucketError);
  } else {
    const momentsBucket = buckets?.find((b) => b.name === 'moments');
    console.log('✅ Moments bucket:', {
      name: momentsBucket?.name,
      public: momentsBucket?.public,
      id: momentsBucket?.id,
    });
  }
}

/**
 * Check all moments in database and their storage paths
 */
export async function debugAllMoments(): Promise<void> {
  console.log('🔍 Debugging all moments...');

  const { data: moments, error } = await supabase
    .from('moments')
    .select('id, storage_path, created_at, user_id')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Failed to fetch moments:', error);
    return;
  }

  console.log(`✅ Found ${moments?.length || 0} moments`);

  for (const moment of moments || []) {
    console.log('\n--- Moment ---');
    console.log('ID:', moment.id);
    console.log('Storage Path:', moment.storage_path);
    console.log('Created At:', moment.created_at);

    if (moment.storage_path) {
      const publicUrl = getMomentPublicUrl(moment.storage_path);
      console.log('Generated URL:', publicUrl);

      // Check if file exists
      const pathParts = moment.storage_path.split('/');
      const folder = pathParts.slice(0, -1).join('/');
      const filename = pathParts[pathParts.length - 1];

      const { data: files, error: listError } = await supabase.storage
        .from('moments')
        .list(folder, {
          search: filename,
        });

      if (listError) {
        console.error('❌ File check error:', listError);
      } else if (files && files.length > 0) {
        console.log('✅ File exists in storage');
      } else {
        console.error('❌ File NOT found in storage!');
      }
    } else {
      console.error('❌ No storage_path!');
    }
  }
}

