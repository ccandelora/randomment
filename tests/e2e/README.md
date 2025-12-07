# E2E Testing Blueprint for Moment Roulette

This directory contains the End-to-End (E2E) testing strategy and configuration for the Moment Roulette app.

## Overview

E2E tests verify complete user workflows by testing the app as a real user would interact with it. These tests run on actual devices/emulators and exercise the full app stack, including native modules, navigation, and user interactions.

## Testing Tool: Detox

We're using [Detox](https://github.com/wix/Detox) as our primary E2E testing framework because:
- **Native Performance**: Tests run on real devices/emulators, not in a JavaScript environment
- **Synchronization**: Automatically waits for UI to be ready, reducing flakiness
- **React Native Support**: Built specifically for React Native apps
- **Cross-platform**: Supports both iOS and Android

### Alternative: Maestro

For Expo managed workflow, [Maestro](https://maestro.mobile.dev/) is an excellent alternative:
- Works with Expo Go (no native build required)
- Simpler setup for Expo projects
- YAML-based test definitions
- See `maestro/` directory for Maestro examples (if implemented)

## Prerequisites

### For Detox:

1. **Development Build Required**: Detox requires a native build, so you cannot use Expo Go
   ```bash
   npx expo prebuild
   ```

2. **Install Detox CLI**:
   ```bash
   npm install -g detox-cli
   ```

3. **Install Detox**:
   ```bash
   npm install --save-dev detox
   ```

4. **iOS Setup**:
   ```bash
   brew tap wix/brew && brew install applesimutils
   ```

5. **Android Setup**:
   - Android SDK and emulator configured
   - `ANDROID_HOME` environment variable set

## Test Scenarios

### 1. Camera Permission Flow

**Objective**: Verify that the app correctly requests and handles camera permissions.

**Test Steps**:
```typescript
// tests/e2e/camera-permission.e2e.test.ts
describe('Camera Permission Flow', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should request camera permission on first launch', async () => {
    // 1. Launch app and navigate to Capture tab
    await element(by.id('tab-capture')).tap();
    
    // 2. Verify permission request dialog appears
    // Note: Actual dialog text depends on iOS/Android
    await expect(element(by.text('Camera'))).toBeVisible();
    
    // 3. Grant permission
    await element(by.text('Allow')).tap();
    
    // 4. Verify camera preview is visible
    await expect(element(by.id('camera-preview'))).toBeVisible();
  });

  it('should handle permission denial gracefully', async () => {
    // 1. Deny camera permission
    await element(by.id('tab-capture')).tap();
    await element(by.text('Don\'t Allow')).tap();
    
    // 2. Verify friendly error message is shown
    await expect(element(by.text('Camera access is required'))).toBeVisible();
    
    // 3. Verify "Open Settings" button is present
    await expect(element(by.id('open-settings-button'))).toBeVisible();
  });

  it('should detect already-granted permissions', async () => {
    // Pre-condition: Permission already granted in previous test
    
    // 1. Navigate to Capture tab
    await element(by.id('tab-capture')).tap();
    
    // 2. Camera should appear immediately (no dialog)
    await expect(element(by.id('camera-preview'))).toBeVisible();
  });
});
```

**Key Test Points**:
- Permission dialog appears at correct time
- App handles both grant and deny scenarios
- Error messaging is user-friendly
- Settings deep link works (if implemented)
- App state persists correctly after permission changes

---

### 2. Capture → Review → Approve Flow

**Objective**: Verify the complete moment capture workflow from recording to approval.

**Test Steps**:
```typescript
// tests/e2e/capture-flow.e2e.test.ts
describe('Capture → Review → Approve Flow', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
    // Ensure we start with camera permissions granted
    // (This might require a helper function or test setup)
  });

  it('should complete full capture workflow', async () => {
    // === STEP 1: Navigate to Capture Screen ===
    await element(by.id('tab-capture')).tap();
    await expect(element(by.id('camera-preview'))).toBeVisible();
    
    // === STEP 2: Start Recording ===
    // Verify "Record 10s" button is visible
    await expect(element(by.id('record-button'))).toBeVisible();
    await expect(element(by.text('Record 10s'))).toBeVisible();
    
    // Tap record button
    await element(by.id('record-button')).tap();
    
    // Verify recording state (button text changes, timer appears)
    await expect(element(by.text('Stop Recording'))).toBeVisible();
    await expect(element(by.id('recording-timer'))).toBeVisible();
    
    // === STEP 3: Wait for Recording (or Stop Early) ===
    // Option A: Wait full 10 seconds
    await waitFor(element(by.id('review-screen')))
      .toBeVisible()
      .withTimeout(11000);
    
    // Option B: Stop early (if implemented)
    // await element(by.id('stop-recording-button')).tap();
    
    // === STEP 4: Review Screen Appears ===
    await expect(element(by.text('Review your Moment'))).toBeVisible();
    await expect(element(by.id('video-player'))).toBeVisible();
    
    // Verify video is playing/previewing
    // (Detox can't verify video playback, but we can check UI elements)
    await expect(element(by.id('video-player'))).toBeVisible();
    
    // === STEP 5: Add Optional Description ===
    const descriptionInput = element(by.id('description-input'));
    await descriptionInput.tap();
    await descriptionInput.typeText('My first moment!');
    
    // === STEP 6: Approve Moment ===
    await element(by.id('approve-button')).tap();
    
    // === STEP 7: Verify Navigation Back ===
    // Should navigate back to Capture screen root
    await expect(element(by.id('camera-preview'))).toBeVisible();
    
    // === STEP 8: Verify Moment Appears in Feed ===
    await element(by.id('tab-feed')).tap();
    
    // Verify new moment appears in feed
    await expect(element(by.id('moment-item-0'))).toBeVisible();
    await expect(element(by.text('My first moment!'))).toBeVisible();
    
    // Verify video player is present in feed item
    await expect(element(by.id('feed-video-player-0'))).toBeVisible();
  });

  it('should allow discarding a captured moment', async () => {
    // Record a moment (reuse steps 1-3 from above)
    await element(by.id('tab-capture')).tap();
    await element(by.id('record-button')).tap();
    await waitFor(element(by.id('review-screen')))
      .toBeVisible()
      .withTimeout(11000);
    
    // On review screen, tap discard
    await element(by.id('discard-button')).tap();
    
    // Should navigate back to Capture screen
    await expect(element(by.id('camera-preview'))).toBeVisible();
    
    // Moment should NOT appear in feed
    await element(by.id('tab-feed')).tap();
    // Feed should be empty or not contain the discarded moment
    // (Implementation depends on your empty state)
  });

  it('should enforce 10-second recording limit', async () => {
    await element(by.id('tab-capture')).tap();
    await element(by.id('record-button')).tap();
    
    // Wait for automatic stop at 10 seconds
    await waitFor(element(by.id('review-screen')))
      .toBeVisible()
      .withTimeout(11000);
    
    // Verify recording stopped automatically
    await expect(element(by.id('review-screen'))).toBeVisible();
  });
});
```

**Key Test Points**:
- Recording starts on explicit button tap (not automatically)
- Recording timer/counter updates correctly
- Recording stops at 10 seconds or on manual stop
- Review screen receives correct video URI
- Video preview/player loads correctly
- Description input works and persists
- Approve saves moment and navigates correctly
- Discard removes moment and navigates correctly
- Moment appears in feed after approval
- Moment does NOT appear after discard

---

### 3. Feed Display of New Moment

**Objective**: Verify that approved moments appear correctly in the feed.

**Test Steps**:
```typescript
// tests/e2e/feed-display.e2e.test.ts
describe('Feed Display', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
    // Optionally: Clear AsyncStorage to start fresh
    // This might require a helper function
  });

  it('should display empty state when no moments exist', async () => {
    await element(by.id('tab-feed')).tap();
    
    // Verify empty state message
    await expect(element(by.text('No moments yet'))).toBeVisible();
    await expect(element(by.text('Capture your first moment'))).toBeVisible();
    
    // Verify CTA button to navigate to Capture
    await expect(element(by.id('empty-state-cta'))).toBeVisible();
  });

  it('should display moments in reverse chronological order', async () => {
    // Pre-condition: Create multiple moments via capture flow
    // (This might require helper functions or API mocking)
    
    await element(by.id('tab-feed')).tap();
    
    // Verify moments are displayed (newest first)
    await expect(element(by.id('moment-item-0'))).toBeVisible();
    await expect(element(by.id('moment-item-1'))).toBeVisible();
    
    // Verify timestamps are in descending order
    // (This requires checking timestamp text, format depends on implementation)
  });

  it('should display video player for each moment', async () => {
    // Pre-condition: At least one moment exists
    
    await element(by.id('tab-feed')).tap();
    
    // Verify video player is present
    await expect(element(by.id('feed-video-player-0'))).toBeVisible();
    
    // Verify video player has controls (if visible)
    // Note: Detox can't verify video playback, but can check UI elements
  });

  it('should display moment description when present', async () => {
    // Pre-condition: Create moment with description via capture flow
    
    await element(by.id('tab-feed')).tap();
    
    // Verify description text is visible
    await expect(element(by.text('My first moment!'))).toBeVisible();
  });

  it('should display formatted timestamp', async () => {
    // Pre-condition: Moment exists
    
    await element(by.id('tab-feed')).tap();
    
    // Verify timestamp is displayed in human-readable format
    // Examples: "2 minutes ago", "Just now", "Today at 3:45 PM"
    // Exact format depends on your implementation
    await expect(element(by.id('moment-timestamp-0'))).toBeVisible();
  });

  it('should handle video playback controls', async () => {
    // Pre-condition: Moment exists with video
    
    await element(by.id('tab-feed')).tap();
    
    // Tap video to play (if controls are visible)
    await element(by.id('feed-video-player-0')).tap();
    
    // Verify play state (if UI indicates this)
    // Note: Actual video playback verification is limited in Detox
  });

  it('should scroll through feed when many moments exist', async () => {
    // Pre-condition: Create multiple moments (5+)
    
    await element(by.id('tab-feed')).tap();
    
    // Scroll down
    await element(by.id('feed-list')).scroll(200, 'down');
    
    // Verify later moments are visible
    await expect(element(by.id('moment-item-4'))).toBeVisible();
  });
});
```

**Key Test Points**:
- Empty state displays correctly
- Moments appear in correct order (newest first)
- Video players render correctly
- Descriptions display when present
- Timestamps are formatted correctly
- Scrolling works smoothly
- Video controls are accessible (if visible)
- Moment count matches expectations

---

## Test Helpers & Utilities

### Recommended Helper Functions

Create `tests/e2e/helpers/` directory with utilities:

```typescript
// tests/e2e/helpers/permissions.ts
/**
 * Grant camera permissions before tests
 * Platform-specific implementation required
 */
export async function grantCameraPermission() {
  // iOS: Use device.setPermissions
  // Android: Use adb commands or device.setPermissions
}

// tests/e2e/helpers/navigation.ts
/**
 * Navigate to specific screen
 */
export async function navigateToCapture() {
  await element(by.id('tab-capture')).tap();
}

// tests/e2e/helpers/moments.ts
/**
 * Create a test moment via capture flow
 */
export async function createTestMoment(description?: string) {
  await navigateToCapture();
  await element(by.id('record-button')).tap();
  await waitFor(element(by.id('review-screen'))).toBeVisible().withTimeout(11000);
  
  if (description) {
    await element(by.id('description-input')).typeText(description);
  }
  
  await element(by.id('approve-button')).tap();
}

// tests/e2e/helpers/storage.ts
/**
 * Clear AsyncStorage before tests
 */
export async function clearStorage() {
  // Implementation depends on Detox capabilities
  // Might require native module or app restart
}
```

---

## Test Data Management

### Test IDs

Ensure all interactive elements have `testID` props:

```typescript
// Example from CaptureScreen.tsx
<View testID="camera-preview">
  <CameraView ... />
</View>

<Button testID="record-button" title="Record 10s" />

// Example from ReviewScreen.tsx
<Text testID="review-title">Review your Moment</Text>
<Video testID="video-player" ... />
<TextInput testID="description-input" ... />
<Button testID="approve-button" title="Approve" />
<Button testID="discard-button" title="Discard" />

// Example from FeedScreen.tsx
<FlatList testID="feed-list" ... />
<View testID="moment-item-0" ... />
<Video testID="feed-video-player-0" ... />
```

### Test Data Isolation

- Each test should be independent
- Clear app state between tests (`device.reloadReactNative()`)
- Use unique test data (timestamps, IDs)
- Consider mocking backend API calls for faster tests

---

## Running Tests

### Build and Run

```bash
# Build app for iOS
detox build --configuration ios.sim.debug

# Run tests
detox test --configuration ios.sim.debug

# Build and run Android
detox build --configuration android.emu.debug
detox test --configuration android.emu.debug
```

### Watch Mode

```bash
detox test --configuration ios.sim.debug --watch
```

### Specific Test File

```bash
detox test --configuration ios.sim.debug tests/e2e/capture-flow.e2e.test.ts
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npx expo prebuild
      - run: detox build --configuration ios.sim.debug
      - run: detox test --configuration ios.sim.debug --headless
```

---

## Limitations & Considerations

1. **Video Playback**: Detox cannot verify actual video playback. Focus on UI elements and state.

2. **Camera Preview**: Camera preview visibility can be verified, but actual camera functionality requires real device testing.

3. **Permissions**: Permission dialogs vary by platform. Use platform-specific selectors.

4. **Timing**: E2E tests are slower than unit tests. Use appropriate timeouts and parallelization carefully.

5. **Flakiness**: Network conditions, device performance, and timing can cause flaky tests. Use `waitFor` and proper synchronization.

6. **Test Data**: Consider using test-specific backend endpoints or mocking API calls for faster, more reliable tests.

---

## Next Steps

1. **Add Test IDs**: Add `testID` props to all interactive elements
2. **Implement Helpers**: Create helper functions for common operations
3. **Write First Test**: Start with camera permission flow (simplest)
4. **Expand Coverage**: Gradually add more complex scenarios
5. **CI Integration**: Set up automated E2E tests in CI/CD pipeline
6. **Device Testing**: Run tests on real devices periodically

---

## Resources

- [Detox Documentation](https://wix.github.io/Detox/)
- [Detox + Expo Guide](https://docs.expo.dev/guides/testing-with-jest/#detox)
- [React Native Testing Best Practices](https://reactnative.dev/docs/testing-overview)
- [Maestro Documentation](https://maestro.mobile.dev/) (Alternative tool)

