/**
 * Check Local Storage
 * 
 * Shows what's stored in AsyncStorage on your device
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

async function checkLocalStorage() {
  console.log('📱 Checking local storage...\n');

  try {
    // Check moments
    const momentsJson = await AsyncStorage.getItem('moments');
    if (momentsJson) {
      const moments = JSON.parse(momentsJson);
      console.log(`✅ Found ${moments.length} moments in local storage`);
      moments.forEach((moment: any, index: number) => {
        console.log(`\n  Moment ${index + 1}:`);
        console.log(`    ID: ${moment.id}`);
        console.log(`    URI: ${moment.uri?.substring(0, 60)}...`);
        console.log(`    Created: ${moment.createdAt}`);
        console.log(`    Description: ${moment.description || '(none)'}`);
      });
    } else {
      console.log('ℹ️  No moments in local storage');
    }

    // Check other keys
    const allKeys = await AsyncStorage.getAllKeys();
    console.log(`\n📋 All AsyncStorage keys: ${allKeys.join(', ')}`);
  } catch (error) {
    console.error('❌ Error reading local storage:', error);
  }
}

checkLocalStorage().catch(console.error);

