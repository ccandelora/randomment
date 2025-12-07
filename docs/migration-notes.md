# Migration Notes

## UUID Column Migration

When adding UUID columns to existing tables with data, the migration script uses `uuid_generate_v4()` as a temporary default. However, **foreign key columns** (like `user_id`, `moment_id`) need to reference actual records, not random UUIDs.

### If Your Tables Have Existing Data

After running `migrations/fix-schema.sql`, you may need to update UUID values:

#### Example: Update `moments.user_id` to reference actual users

```sql
-- First, check what data exists
SELECT id, user_id FROM moments LIMIT 10;

-- If moments have a different user identifier column, update user_id:
-- UPDATE moments SET user_id = (SELECT id FROM auth.users WHERE email = moments.old_user_email);

-- Or if you need to create profiles first:
-- INSERT INTO profiles (id, username) 
-- SELECT id, 'user_' || SUBSTRING(id::text, 1, 8) 
-- FROM auth.users 
-- WHERE id NOT IN (SELECT id FROM profiles);
```

#### Example: Update `moment_reactions.moment_id` and `user_id`

```sql
-- Update moment_id to reference actual moments
-- UPDATE moment_reactions SET moment_id = (SELECT id FROM moments WHERE ...);

-- Update user_id to reference actual users
-- UPDATE moment_reactions SET user_id = (SELECT id FROM auth.users WHERE ...);
```

### Safe Migration Strategy

1. **Backup your database** before running migrations
2. **Run migrations** in Supabase Dashboard → SQL Editor
3. **Check for NULL or invalid UUIDs**:
   ```sql
   SELECT COUNT(*) FROM moments WHERE user_id IS NULL;
   ```
4. **Update foreign key values** to match actual relationships
5. **Verify data integrity**:
   ```sql
   -- Check for orphaned records
   SELECT m.* FROM moments m 
   LEFT JOIN auth.users u ON m.user_id = u.id 
   WHERE u.id IS NULL;
   ```

### If Tables Are Empty

If your tables are empty (no existing data), the migration script is safe to run as-is. The UUID defaults will only apply to new rows inserted after the migration.

### Common Issues

**Issue**: Foreign key constraint violations after migration
- **Solution**: Update UUID values to reference actual records before adding foreign key constraints

**Issue**: NULL values in NOT NULL columns
- **Solution**: The migration adds columns with defaults, then sets NOT NULL. If defaults don't apply correctly, update NULL values manually

**Issue**: Duplicate UUIDs in primary key columns
- **Solution**: Ensure primary key columns use `uuid_generate_v4()` or have unique constraints

## Next Steps

1. Review `migrations/fix-schema.sql`
2. Check if your tables have existing data
3. Run the migration
4. Update foreign key values if needed
5. Verify data integrity
6. Test your application

