/**
 * Debug Storage Upload Issues
 * 
 * Use this to debug why storage uploads are failing
 */

import { supabase } from '../services/supabaseClient';

export async function debugStorageUpload(userId: string) {
  console.log('🔍 Debugging storage upload...');
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  console.log('Current user:', {
    id: user?.id,
    email: user?.email,
    expectedUserId: userId,
    match: user?.id === userId,
  });
  
  if (authError) {
    console.error('Auth error:', authError);
    return;
  }
  
  if (!user) {
    console.error('❌ No authenticated user');
    return;
  }
  
  // Check bucket access
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  console.log('Available buckets:', buckets?.map(b => b.name));
  
  if (bucketError) {
    console.error('Bucket list error:', bucketError);
  }
  
  // Check if moments bucket exists
  const momentsBucket = buckets?.find(b => b.name.toLowerCase() === 'moments');
  console.log('Moments bucket:', {
    exists: !!momentsBucket,
    name: momentsBucket?.name,
    public: momentsBucket?.public,
  });
  
  // Try a test upload (small file)
  const testPath = `moments/${userId}/test.txt`;
  const testContent = new Blob(['test'], { type: 'text/plain' });
  
  console.log('Attempting test upload to:', testPath);
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('moments')
    .upload(testPath, testContent, {
      contentType: 'text/plain',
      upsert: false,
    });
  
  if (uploadError) {
    console.error('❌ Upload error:', {
      message: uploadError.message,
      statusCode: uploadError.statusCode,
      error: uploadError,
    });
  } else {
    console.log('✅ Test upload successful:', uploadData);
    
    // Clean up test file
    await supabase.storage.from('moments').remove([testPath]);
  }
}

