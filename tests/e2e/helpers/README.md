# E2E Test Helpers

This directory contains reusable helper functions for E2E tests.

## Planned Helpers

- `permissions.ts` - Camera permission management
- `navigation.ts` - Navigation helpers
- `moments.ts` - Moment creation/management
- `storage.ts` - AsyncStorage clearing/management
- `selectors.ts` - Common testID selectors

## Usage

```typescript
import { navigateToCapture, createTestMoment } from './helpers';

describe('My Test', () => {
  it('should do something', async () => {
    await navigateToCapture();
    await createTestMoment('Test description');
    // ... rest of test
  });
});
```

