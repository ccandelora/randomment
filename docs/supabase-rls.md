# Supabase Row Level Security (RLS) Policies

This document describes the RLS policies for the `profiles` and `moments` tables in Supabase. These policies ensure that users can only access and modify data they're authorized to see.

## Table of Contents

- [Profiles Table](#profiles-table)
- [Moments Table](#moments-table)
- [Feed Moments View](#feed-moments-view)
- [Example Queries](#example-queries)
- [Testing RLS Policies](#testing-rls-policies)

---

## Profiles Table

### Schema

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS Policies

#### 1. **SELECT: Public Read Access**
```sql
CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles
FOR SELECT
USING (true);
```

**Purpose**: Allow all authenticated users to read any profile. This is needed for:
- Displaying usernames in the feed
- Looking up profiles by username
- Showing profile information in moment cards

**RLS Behavior**: 
- ✅ Any authenticated user can read any profile
- ❌ Unauthenticated users cannot read profiles

#### 2. **INSERT: Users can create their own profile**
```sql
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);
```

**Purpose**: Users can only create a profile with their own user ID.

**RLS Behavior**:
- ✅ User can insert profile where `id = auth.uid()`
- ❌ User cannot insert profile with a different `id`
- ❌ Unauthenticated users cannot insert profiles

#### 3. **UPDATE: Users can update their own profile**
```sql
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

**Purpose**: Users can only update their own profile fields (display_name, bio, etc.). Username should remain immutable or require special handling.

**RLS Behavior**:
- ✅ User can update profile where `id = auth.uid()`
- ❌ User cannot update another user's profile
- ❌ Unauthenticated users cannot update profiles

#### 4. **DELETE: Users can delete their own profile**
```sql
CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE
USING (auth.uid() = id);
```

**Purpose**: Users can delete their own profile (cascade deletes will handle related data).

**RLS Behavior**:
- ✅ User can delete profile where `id = auth.uid()`
- ❌ User cannot delete another user's profile
- ❌ Unauthenticated users cannot delete profiles

---

## Moments Table

### Schema

```sql
CREATE TABLE public.moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  description TEXT,
  duration_seconds NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'published')),
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS Policies

#### 1. **SELECT: Users can read public moments and their own moments**
```sql
CREATE POLICY "Users can view public moments and their own moments"
ON public.moments
FOR SELECT
USING (
  visibility = 'public' 
  OR user_id = auth.uid()
);
```

**Purpose**: 
- All authenticated users can see public moments (for the feed)
- Users can see their own moments regardless of visibility (for profile/management)

**RLS Behavior**:
- ✅ User can read moments where `visibility = 'public'` (any user's public moments)
- ✅ User can read moments where `user_id = auth.uid()` (their own moments, including private)
- ❌ User cannot read another user's private moments
- ❌ Unauthenticated users cannot read moments

#### 2. **INSERT: Users can create their own moments**
```sql
CREATE POLICY "Users can insert their own moments"
ON public.moments
FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

**Purpose**: Users can only create moments with their own `user_id`.

**RLS Behavior**:
- ✅ User can insert moment where `user_id = auth.uid()`
- ❌ User cannot insert moment with a different `user_id`
- ❌ Unauthenticated users cannot insert moments

#### 3. **UPDATE: Users can update their own moments**
```sql
CREATE POLICY "Users can update their own moments"
ON public.moments
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

**Purpose**: Users can only update their own moments (e.g., change description, visibility, status).

**RLS Behavior**:
- ✅ User can update moment where `user_id = auth.uid()`
- ❌ User cannot update another user's moment
- ❌ Unauthenticated users cannot update moments

#### 4. **DELETE: Users can delete their own moments**
```sql
CREATE POLICY "Users can delete their own moments"
ON public.moments
FOR DELETE
USING (user_id = auth.uid());
```

**Purpose**: Users can delete their own moments.

**RLS Behavior**:
- ✅ User can delete moment where `user_id = auth.uid()`
- ❌ User cannot delete another user's moment
- ❌ Unauthenticated users cannot delete moments

---

## Feed Moments View

### Purpose

The `feed_moments` view is a database view that combines data from multiple tables to provide a ready-to-use feed of moments with all necessary information. This view is the **primary data source** for the feed screen.

### Schema

The view combines:
- `moments` table (id, storage_path, description, created_at, user_id, visibility, status)
- `profiles` table (username, display_name)
- `moment_reactions` table (like_count, has_liked for current user)

### View Definition (Example)

```sql
CREATE OR REPLACE VIEW feed_moments AS
SELECT 
  m.id,
  m.storage_path,
  m.description,
  m.created_at,
  m.user_id,
  p.username,
  p.display_name,
  COALESCE(COUNT(DISTINCT mr.id) FILTER (WHERE mr.reaction = 'like'), 0) AS like_count,
  EXISTS(
    SELECT 1 FROM moment_reactions mr2 
    WHERE mr2.moment_id = m.id 
    AND mr2.user_id = auth.uid() 
    AND mr2.reaction = 'like'
  ) AS has_liked
FROM moments m
JOIN profiles p ON m.user_id = p.id
LEFT JOIN moment_reactions mr ON m.id = mr.moment_id AND mr.reaction = 'like'
WHERE m.visibility = 'public'
  AND m.status IN ('published', 'approved', 'pending_review')
GROUP BY m.id, m.storage_path, m.description, m.created_at, m.user_id, p.username, p.display_name
ORDER BY m.created_at DESC;
```

### RLS Policy

The view inherits RLS policies from underlying tables:
- **moments**: Only public moments are included (visibility='public')
- **profiles**: Public read access (all authenticated users can read)
- **moment_reactions**: Respects RLS on reactions table

### Usage

The view is queried directly from the TypeScript client:

```typescript
const { data } = await supabase
  .from('feed_moments')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(50);
```

**Benefits**:
- Single query instead of multiple joins
- Pre-computed like counts
- Includes user like status
- Automatically filters to public, published moments
- Respects RLS policies on all underlying tables

---

## Example Queries

### Profiles Table

#### ✅ **Should Work: Read own profile**
```typescript
// RLS: SELECT policy allows reading any profile
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', auth.uid())
  .single();
```
**Expected**: Returns user's own profile if authenticated.

#### ✅ **Should Work: Read profile by username**
```typescript
// RLS: SELECT policy allows reading any profile
const { data } = await supabase
  .from('profiles')
  .select('id, username, display_name')
  .eq('username', 'some_username')
  .single();
```
**Expected**: Returns profile if authenticated, null if not found.

#### ✅ **Should Work: Insert own profile**
```typescript
// RLS: INSERT policy checks auth.uid() = id
const { data } = await supabase
  .from('profiles')
  .insert({
    id: auth.uid(), // Must match authenticated user
    username: 'my_username',
    display_name: 'My Name'
  });
```
**Expected**: Creates profile successfully.

#### ❌ **Should Fail: Insert profile with wrong ID**
```typescript
// RLS: INSERT policy rejects if id != auth.uid()
const { data } = await supabase
  .from('profiles')
  .insert({
    id: 'different-user-id', // Different from auth.uid()
    username: 'hacker'
  });
```
**Expected**: RLS policy violation error.

#### ✅ **Should Work: Update own profile**
```typescript
// RLS: UPDATE policy checks auth.uid() = id
const { data } = await supabase
  .from('profiles')
  .update({ bio: 'New bio' })
  .eq('id', auth.uid());
```
**Expected**: Updates user's own profile.

#### ❌ **Should Fail: Update another user's profile**
```typescript
// RLS: UPDATE policy rejects if id != auth.uid()
const { data } = await supabase
  .from('profiles')
  .update({ bio: 'Hacked bio' })
  .eq('id', 'other-user-id');
```
**Expected**: Returns empty result (no rows updated) or RLS error.

---

### Moments Table

#### ✅ **Should Work: Read public moments (feed)**
```typescript
// RLS: SELECT policy allows reading public moments
const { data } = await supabase
  .from('moments')
  .select('*')
  .eq('visibility', 'public')
  .in('status', ['published', 'approved'])
  .order('created_at', { ascending: false });
```
**Expected**: Returns all public moments visible to authenticated users.

#### ✅ **Should Work: Read own moments (including private)**
```typescript
// RLS: SELECT policy allows reading own moments regardless of visibility
const { data } = await supabase
  .from('moments')
  .select('*')
  .eq('user_id', auth.uid())
  .order('created_at', { ascending: false });
```
**Expected**: Returns all of user's own moments (public and private).

#### ❌ **Should Fail: Read another user's private moment**
```typescript
// RLS: SELECT policy rejects private moments from other users
const { data } = await supabase
  .from('moments')
  .select('*')
  .eq('id', 'other-user-private-moment-id')
  .eq('visibility', 'private')
  .eq('user_id', 'other-user-id');
```
**Expected**: Returns empty result (no rows) or RLS error.

#### ✅ **Should Work: Insert own moment**
```typescript
// RLS: INSERT policy checks auth.uid() = user_id
const { data } = await supabase
  .from('moments')
  .insert({
    user_id: auth.uid(), // Must match authenticated user
    storage_path: 'moments/user-id/video.mp4',
    description: 'My moment',
    visibility: 'public',
    status: 'pending_review'
  });
```
**Expected**: Creates moment successfully.

#### ❌ **Should Fail: Insert moment with wrong user_id**
```typescript
// RLS: INSERT policy rejects if user_id != auth.uid()
const { data } = await supabase
  .from('moments')
  .insert({
    user_id: 'different-user-id', // Different from auth.uid()
    storage_path: 'moments/hacker/video.mp4'
  });
```
**Expected**: RLS policy violation error.

#### ✅ **Should Work: Update own moment**
```typescript
// RLS: UPDATE policy checks user_id = auth.uid()
const { data } = await supabase
  .from('moments')
  .update({ description: 'Updated description' })
  .eq('id', 'moment-id')
  .eq('user_id', auth.uid());
```
**Expected**: Updates moment if user owns it.

#### ❌ **Should Fail: Update another user's moment**
```typescript
// RLS: UPDATE policy rejects if user_id != auth.uid()
const { data } = await supabase
  .from('moments')
  .update({ description: 'Hacked description' })
  .eq('id', 'other-user-moment-id');
```
**Expected**: Returns empty result (no rows updated).

---

## Testing RLS Policies

### Manual Testing

1. **Test as authenticated user**:
   - Sign in to the app
   - Verify you can read your own profile
   - Verify you can read other users' profiles
   - Verify you can read public moments
   - Verify you can read your own private moments
   - Verify you cannot read other users' private moments

2. **Test as unauthenticated user** (using Supabase client without auth):
   ```typescript
   // This should fail
   const { data } = await supabase
     .from('profiles')
     .select('*');
   ```

3. **Test unauthorized operations**:
   - Try to insert a moment with `user_id` different from `auth.uid()`
   - Try to update another user's profile
   - Try to delete another user's moment

### SQL Testing in Supabase Dashboard

```sql
-- Test as user A
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-a-id';

-- Should work: Read own profile
SELECT * FROM profiles WHERE id = 'user-a-id';

-- Should work: Read public moments
SELECT * FROM moments WHERE visibility = 'public';

-- Should fail: Read user B's private moment
SELECT * FROM moments WHERE user_id = 'user-b-id' AND visibility = 'private';

-- Should fail: Insert moment with wrong user_id
INSERT INTO moments (user_id, storage_path) 
VALUES ('user-b-id', 'hack.mp4');
```

---

## Implementation Notes

### TypeScript Client Assumptions

All queries in the TypeScript codebase assume RLS is enabled and enforced. The Supabase client automatically:
- Includes the JWT token in requests (from `auth.storage`)
- Applies RLS policies server-side
- Returns empty results or errors for unauthorized operations

### Common Patterns

1. **Reading own data**: Always filter by `auth.uid()` or `user_id = auth.uid()`
2. **Reading public data**: Filter by `visibility = 'public'` for moments
3. **Inserting data**: Always set `user_id` or `id` to `auth.uid()`
4. **Updating data**: Always include `.eq('user_id', auth.uid())` or `.eq('id', auth.uid())`

### Security Considerations

- **RLS is the primary security layer**: Never rely solely on client-side filtering
- **Always use authenticated client**: Unauthenticated requests will be rejected
- **Validate user_id on insert**: RLS will reject, but client should also validate
- **Test policies regularly**: RLS policies should be tested as part of the deployment process

---

## Related Tables

### `moment_reactions` Table

RLS policies should ensure:
- Users can read reactions on moments they can see
- Users can insert/delete their own reactions
- Users cannot modify other users' reactions

### `moment_reports` Table

RLS policies should ensure:
- Users can insert reports (but not read them - admin only)
- Users cannot modify or delete reports

### `blocks` Table

RLS policies should ensure:
- Users can read their own blocks
- Users can insert/delete their own blocks
- Users cannot see who blocked them

---

## Migration Checklist

When setting up RLS policies:

- [ ] Enable RLS on `profiles` table: `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;`
- [ ] Enable RLS on `moments` table: `ALTER TABLE moments ENABLE ROW LEVEL SECURITY;`
- [ ] Create SELECT policies for public read access
- [ ] Create INSERT policies for own data creation
- [ ] Create UPDATE policies for own data modification
- [ ] Create DELETE policies for own data deletion
- [ ] Test all policies with authenticated and unauthenticated users
- [ ] Verify client queries work as expected
- [ ] Document any edge cases or special handling

---

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

