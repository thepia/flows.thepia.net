# Troubleshooting Guide - flows.thepia.net

## Common Issues and Solutions

### Admin App: Missing Invitation Records

**Problem**: Admin app at `/admin` shows no invitations despite records existing in database.

**Root Cause**: RLS policies checking incorrect JWT claim path.

**Diagnosis**:
1. User has `thepia_staff` role in Supabase user metadata ✅
2. JWT contains `"user_metadata": {"role": "thepia_staff"}` ✅  
3. RLS policies check `auth.jwt()->>'role'` (returns `"authenticated"`) ❌
4. Should check `auth.jwt()->>'user_metadata'->>'role'` ✅

**Solution**:
```sql
-- Apply the RLS policy fix in flows-db
\i schemas/23_fix_jwt_role_paths.sql

-- Or manual fix for invitations table:
DROP POLICY IF EXISTS policy_invitations_staff_access ON api.invitations;
CREATE POLICY policy_invitations_staff_access ON api.invitations
  FOR ALL USING (
    auth.jwt()->>'user_metadata'->>'role' = 'thepia_staff'
    OR auth.jwt()->>'role' = 'service_role'
  );
```

**Verification**:
1. Refresh admin app at `https://dev.thepia.net:5176/admin`
2. Invitation records should now be visible
3. Create/edit functionality should work

### Admin Access: User Not Recognized as Admin

**Problem**: User can sign in but sees "Access Denied" in admin interface.

**Cause**: User lacks `thepia_staff` role assignment.

**Solution**:
```bash
# Using flows-db CLI tool
cd ../flows-db
pnpm admin:assign your-email@thepia.com "Admin access"

# Or manual Supabase Dashboard:
# 1. Go to Authentication > Users
# 2. Find your user, edit Raw User Meta Data
# 3. Add: {"role": "thepia_staff"}
```

### HTTPS Development Issues

**Problem**: WebAuthn features not working in development.

**Cause**: HTTPS required for WebAuthn APIs.

**Solution**:
```bash
# Ensure HTTPS development server
pnpm dev  # Should start on https://dev.thepia.net:5176

# Check /etc/hosts contains:
127.0.0.1 dev.thepia.net

# Verify SSL certificates in certs/ directory
```

### Database Connection Issues

**Problem**: Admin app shows connection errors.

**Diagnosis**:
```javascript
// Check environment variables in browser dev tools
console.log('Supabase URL:', import.meta.env.PUBLIC_SUPABASE_URL);
console.log('Has anon key:', !!import.meta.env.PUBLIC_SUPABASE_ANON_KEY);

// Check network tab for failed requests to Supabase
```

**Solution**:
1. Verify `.env` has correct `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`
2. Check Supabase project is active
3. Verify CORS settings allow dev.thepia.net domain

## Related Documentation

- **[flows-db Role Architecture](../../flows-db/docs/ROLE_ARCHITECTURE_DECISIONS.md)** - Complete role system documentation
- **[flows-db User Management](../../flows-db/docs/USER_ROLE_MANAGEMENT.md)** - CLI tools and role assignment
- **[Admin Interface Implementation](admin-interface.md)** - Architecture and implementation details

## Getting Help

For additional issues:
1. Check browser console for JavaScript errors
2. Check network tab for failed API requests  
3. Verify user role assignment via flows-db CLI tools
4. Review RLS policies in Supabase dashboard


## Amazon SES Configuration

- [Amazon SES Identities](https://eu-north-1.console.aws.amazon.com/ses/home?region=eu-north-1#/identities)
- [Console Home](https://eu-north-1.console.aws.amazon.com/console/home?nc2=h_si&region=eu-north-1&src=header-signin#)

