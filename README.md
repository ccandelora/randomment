# Moment Roulette

A social app built with Expo (React Native + TypeScript) where users capture ~10s videos ("Moment Windows") with explicit recording and approval steps to ensure privacy and trust.

## Features

- 📹 **Video Capture**: Record 10-second moments with camera permissions
- 🔒 **Privacy-First**: Explicit recording and approval steps - nothing is shared without your approval
- 👤 **User Profiles**: Username, display name, and bio
- 📱 **Feed**: View moments from all users with like/reaction support
- 🚫 **Content Moderation**: Report and block functionality
- 🔔 **Push Notifications**: Moment Window alerts (future: server-side scheduling)
- 💾 **Offline Support**: Local storage with Supabase sync

## Tech Stack

- **Framework**: Expo (React Native)
- **Language**: TypeScript
- **Backend**: Supabase (Auth, Database, Storage)
- **Navigation**: React Navigation (Bottom Tabs + Stack)
- **State Management**: React Context + Hooks
- **Testing**: Jest + React Native Testing Library
- **E2E Testing**: Detox (configured, see `tests/e2e/`)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- Supabase account and project
- iOS Simulator or Android Emulator (or Expo Go app)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ccandelora/randomment.git
cd randomment
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env  # If you have an example file
# Or create .env with:
# EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
# EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up Supabase:
   - Create a Supabase project
   - Run migrations from `migrations/COMPLETE-FIX.sql` in Supabase SQL Editor
   - Set up Storage bucket "moments" (see `docs/supabase-storage-setup.md`)
   - Configure RLS policies (see `docs/supabase-rls.md`)

5. Start the development server:
```bash
npm start
```

## Project Structure

```
randommoment/
├── src/
│   ├── components/      # Reusable UI components
│   ├── context/        # React Context providers
│   ├── hooks/          # Custom React hooks
│   ├── navigation/     # Navigation configuration
│   ├── screens/        # Screen components
│   ├── services/       # API and service layer
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Utility functions
├── migrations/          # Database migration scripts
├── docs/               # Documentation
├── tests/              # Test files
└── scripts/             # Utility scripts
```

## Key Features Implementation

### Capture Flow
- `CaptureScreen`: Camera preview with privacy messaging
- `ReviewScreen`: Video review before approval
- `useCamera`: Custom hook for camera operations

### Feed
- `FeedScreen`: Displays moments from `feed_moments` view
- Like/reaction support
- Report and block functionality

### Authentication
- `AuthScreen`: Email/password sign-up and sign-in
- `ProfileOnboardingScreen`: Username creation
- `ProfileScreen`: Profile management

### Storage
- Video uploads to Supabase Storage
- RLS policies ensure users can only upload to their own folders
- Public read access for feed videos

## Database Schema

See `docs/supabase-rls.md` for detailed schema and RLS policies.

Key tables:
- `moments`: Video moments with metadata
- `profiles`: User profiles
- `moment_reactions`: Like/reaction data
- `moment_reports`: Content moderation reports
- `blocks`: User blocking relationships
- `device_tokens`: Push notification tokens

## Testing

### Unit Tests
```bash
npm test
```

### E2E Tests (Detox)
See `tests/e2e/README.md` for setup instructions.

## Building

### Development Build
```bash
eas build --profile development --platform ios
```

### Production Build
```bash
eas build --profile production --platform ios
```

See `docs/ci-cd.md` for CI/CD setup with GitHub Actions.

## Documentation

- `docs/supabase-rls.md`: Database schema and RLS policies
- `docs/supabase-storage-setup.md`: Storage bucket setup
- `docs/email-verification.md`: Email verification setup
- `docs/ci-cd.md`: CI/CD with EAS Build
- `migrations/README.md`: Database migration guide

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[Add your license here]

## Acknowledgments

- Built with [Expo](https://expo.dev/)
- Backend powered by [Supabase](https://supabase.com/)
- UI components from React Native

