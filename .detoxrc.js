/**
 * Detox E2E Testing Configuration
 * 
 * NOTE: This is a blueprint configuration. To use Detox with Expo:
 * 
 * 1. You'll need to use Expo's development build (not Expo Go)
 *    - Run: npx expo prebuild
 *    - This generates native iOS/Android projects
 * 
 * 2. Install Detox CLI globally:
 *    npm install -g detox-cli
 * 
 * 3. Install Detox dependencies:
 *    npm install --save-dev detox
 * 
 * 4. For iOS: Install applesimutils
 *    brew tap wix/brew && brew install applesimutils
 * 
 * 5. For Android: Ensure Android SDK and emulator are set up
 * 
 * 6. Build the app:
 *    detox build --configuration ios.sim.debug
 *    detox build --configuration android.emu.debug
 * 
 * 7. Run tests:
 *    detox test --configuration ios.sim.debug
 */

module.exports = {
  testRunner: {
    args: {
      '$0': 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/Moment Roulette.app',
      build:
        'xcodebuild -workspace ios/MomentRoulette.xcworkspace -scheme MomentRoulette -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'ios.release': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Release-iphonesimulator/Moment Roulette.app',
      build:
        'xcodebuild -workspace ios/MomentRoulette.xcworkspace -scheme MomentRoulette -configuration Release -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build:
        'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
      reversePorts: [8081],
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
      build:
        'cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 15 Pro',
      },
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_5_API_33',
      },
    },
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
    'ios.sim.release': {
      device: 'simulator',
      app: 'ios.release',
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
    'android.emu.release': {
      device: 'emulator',
      app: 'android.release',
    },
  },
};

