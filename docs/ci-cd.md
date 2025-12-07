# CI/CD Documentation

This document outlines the Continuous Integration and Continuous Deployment (CI/CD) strategy for Moment Roulette using Expo Application Services (EAS).

## Overview

We use [EAS Build](https://docs.expo.dev/build/introduction/) to build native iOS and Android apps in the cloud. EAS handles:
- Native code compilation
- Certificate and provisioning profile management
- Build artifact distribution
- App Store and Play Store submission

## Prerequisites

1. **Expo Account**: Sign up at [expo.dev](https://expo.dev)
2. **EAS CLI**: Install globally
   ```bash
   npm install -g eas-cli
   ```
3. **Login**: Authenticate with your Expo account
   ```bash
   eas login
   ```
4. **Project Setup**: Link your project to EAS
   ```bash
   eas build:configure
   ```

## Build Profiles

Our `eas.json` defines three build profiles:

### 1. Development Builds

**Purpose**: For local development and testing with custom native modules.

**Characteristics**:
- Includes development client (Expo Go-like experience)
- Can install updates via OTA (Over-The-Air updates)
- iOS builds run on simulator
- Android builds are APKs for easy installation

**Usage**:
```bash
# Build for iOS simulator
eas build --profile development --platform ios

# Build for Android device
eas build --profile development --platform android

# Build for both platforms
eas build --profile development --platform all
```

**When to use**:
- Testing new native modules or custom native code
- Development workflow with hot reloading
- Internal team testing

---

### 2. Preview Builds

**Purpose**: Internal testing builds for stakeholders, QA, and beta testers.

**Characteristics**:
- Production-like builds without App Store distribution
- iOS: `.ipa` files for TestFlight or ad-hoc distribution
- Android: APK files for direct installation
- Can be distributed via EAS Update for OTA updates

**Usage**:
```bash
# Build for iOS
eas build --profile preview --platform ios

# Build for Android
eas build --profile preview --platform android

# Build for both
eas build --profile preview --platform all
```

**When to use**:
- Pre-release testing
- Stakeholder demos
- QA testing cycles
- Beta testing programs

---

### 3. Production Builds

**Purpose**: Final builds for App Store and Play Store submission.

**Characteristics**:
- Auto-increments build numbers
- iOS: `.ipa` for App Store Connect
- Android: App Bundle (`.aab`) for Play Store
- Optimized for release

**Usage**:
```bash
# Build for iOS App Store
eas build --profile production --platform ios

# Build for Android Play Store
eas build --profile production --platform android

# Build for both stores
eas build --profile production --platform all
```

**When to use**:
- App Store submission
- Play Store submission
- Public release

---

## Building Locally

### Prerequisites for Local Builds

**iOS**:
- macOS with Xcode installed
- Apple Developer account
- CocoaPods: `sudo gem install cocoapods`

**Android**:
- Android Studio installed
- Android SDK configured
- `ANDROID_HOME` environment variable set

### Local Build Commands

```bash
# iOS local build
eas build --profile development --platform ios --local

# Android local build
eas build --profile development --platform android --local
```

**Note**: Local builds require native development environments and are slower than cloud builds. Use cloud builds for most scenarios.

---

## Environment Variables

EAS Build supports environment variables via:
1. **`eas.json` env section** (for build-time variables)
2. **`.env` files** (loaded automatically)
3. **EAS Secrets** (for sensitive data)

### Setting EAS Secrets

```bash
# Set a secret (e.g., Supabase keys)
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-project.supabase.co"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-anon-key"

# List secrets
eas secret:list

# Delete a secret
eas secret:delete --name EXPO_PUBLIC_SUPABASE_URL
```

### Using Secrets in Builds

Secrets are automatically injected as environment variables during builds. Access them in your app via `process.env.EXPO_PUBLIC_*`.

**Important**: Only variables prefixed with `EXPO_PUBLIC_` are exposed to your app bundle.

---

## Build Workflow

### Typical Development Workflow

1. **Make code changes**
2. **Test locally**: `npm start` or `expo start`
3. **Build development version** (if native changes):
   ```bash
   eas build --profile development --platform ios
   ```
4. **Install and test** on device/simulator
5. **Iterate** until ready for preview

### Pre-Release Workflow

1. **Update version** in `app.config.js`:
   ```javascript
   version: '1.0.1', // Increment version
   ```
2. **Build preview**:
   ```bash
   eas build --profile preview --platform all
   ```
3. **Distribute** to testers via:
   - EAS Build download links
   - TestFlight (iOS)
   - Internal Play Store track (Android)
4. **Collect feedback** and fix issues
5. **Build production** when ready:
   ```bash
   eas build --profile production --platform all
   ```

### Release Workflow

1. **Build production**:
   ```bash
   eas build --profile production --platform all
   ```
2. **Submit to stores**:
   ```bash
   # iOS App Store
   eas submit --platform ios --latest

   # Android Play Store
   eas submit --platform android --latest
   ```
3. **Monitor** build status:
   ```bash
   eas build:list
   ```

---

## GitHub Actions Integration

### Setup

Create `.github/workflows/eas-build.yml`:

```yaml
name: EAS Build

on:
  push:
    branches:
      - main
      - develop
  pull_request:
    branches:
      - main
  workflow_dispatch:
    inputs:
      platform:
        description: 'Platform to build'
        required: true
        type: choice
        options:
          - ios
          - android
          - all
      profile:
        description: 'Build profile'
        required: true
        type: choice
        options:
          - development
          - preview
          - production

jobs:
  build:
    name: Build and Submit
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18.x
          cache: 'npm'

      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:ci

      - name: Build app
        run: |
          if [ "${{ github.event_name }}" == "workflow_dispatch" ]; then
            eas build --profile ${{ github.event.inputs.profile }} --platform ${{ github.event.inputs.platform }} --non-interactive
          elif [ "${{ github.ref }}" == "refs/heads/main" ]; then
            eas build --profile production --platform all --non-interactive
          else
            eas build --profile preview --platform all --non-interactive
          fi

      - name: Submit to stores (production only)
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        run: |
          eas submit --platform ios --latest --non-interactive
          eas submit --platform android --latest --non-interactive
```

### Required GitHub Secrets

Add these secrets in your GitHub repository settings:

1. **`EXPO_TOKEN`**: Your Expo access token
   - Generate at: https://expo.dev/accounts/[your-account]/settings/access-tokens
   - Or run: `eas whoami` and copy the token

2. **iOS Submission** (optional, if auto-submitting):
   - `APPLE_ID`: Your Apple ID email
   - `APPLE_APP_SPECIFIC_PASSWORD`: App-specific password
   - `APPLE_TEAM_ID`: Your Apple Team ID

3. **Android Submission** (optional, if auto-submitting):
   - Upload `google-service-account.json` as a secret
   - Or use `GOOGLE_SERVICE_ACCOUNT_KEY` secret

### Workflow Triggers

- **Push to `main`**: Builds production and submits to stores
- **Push to `develop`**: Builds preview builds
- **Pull Requests**: Builds preview builds for testing
- **Manual Dispatch**: Allows manual builds with profile/platform selection

---

## Build Status and Monitoring

### Check Build Status

```bash
# List recent builds
eas build:list

# View specific build details
eas build:view [BUILD_ID]

# Download build artifacts
eas build:download [BUILD_ID]
```

### Build Notifications

EAS sends email notifications when builds complete. You can also:
- Monitor builds in [expo.dev dashboard](https://expo.dev/accounts/[account]/projects/moment-roulette/builds)
- Set up webhook notifications (advanced)

---

## Troubleshooting

### Common Issues

1. **Build fails with "No credentials found"**
   - Run: `eas credentials` to configure certificates
   - Or use: `eas build --profile [profile] --platform [platform] --auto-submit`

2. **Environment variables not available**
   - Ensure variables are prefixed with `EXPO_PUBLIC_` for client-side access
   - Check `eas.json` env section matches your profile
   - Verify secrets are set: `eas secret:list`

3. **iOS build fails with provisioning profile errors**
   - Run: `eas credentials` to regenerate profiles
   - Ensure bundle identifier matches `app.config.js`

4. **Android build fails with signing errors**
   - Run: `eas credentials` to configure keystore
   - EAS can auto-generate keystores if not configured

### Getting Help

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Build Troubleshooting](https://docs.expo.dev/build/troubleshooting/)
- [Expo Discord](https://chat.expo.dev/)
- [Expo Forums](https://forums.expo.dev/)

---

## Best Practices

1. **Version Management**: Always increment version in `app.config.js` before production builds
2. **Secrets**: Never commit secrets to git. Use EAS Secrets for sensitive data
3. **Build Profiles**: Use appropriate profiles for each use case
4. **Testing**: Always test preview builds before production
5. **Monitoring**: Monitor build status and fix issues promptly
6. **Documentation**: Document any custom build steps or configurations

---

## Next Steps

1. **Set up EAS account**: `eas login`
2. **Configure credentials**: `eas credentials`
3. **Create first build**: `eas build --profile development --platform ios`
4. **Set up GitHub Actions**: Add `.github/workflows/eas-build.yml`
5. **Configure secrets**: Add required secrets to GitHub
6. **Test workflow**: Push to a branch and verify builds trigger

---

## Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [EAS Update Documentation](https://docs.expo.dev/eas-update/introduction/)
- [Expo GitHub Action](https://github.com/expo/expo-github-action)

