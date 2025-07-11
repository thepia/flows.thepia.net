# Admin Interface Implementation Plan

## Overview

The Admin Interface is a client-only Svelte application that provides Thepia staff with tools to manage demo invitations and system operations for flows.thepia.net. It follows Thepia's client-first, serverless architecture and uses a secure JWT-based role system.

**🔗 Related Documentation:**
- **[flows-db Role Architecture](../../flows-db/docs/ROLE_ARCHITECTURE_DECISIONS.md)** - Complete architectural decisions and rationale
- **[flows-db User Role Management](../../flows-db/docs/USER_ROLE_MANAGEMENT.md)** - Technical implementation details

## Current Status

- ✅ **Admin interface implemented** at `/admin` route
- ✅ **Base Astro + Svelte project structure ready**
- ✅ **@thepia/branding integration available**  
- ✅ **JWT-based authentication working** (Supabase Magic Links with `thepia_staff` role)
- ✅ **Role-based access control implemented** via RLS policies
- 🔄 **Route protection strategy defined** (Bunny CDN Edge Scripting for production)

## Architecture

### **Technology Stack**
- **Frontend Framework**: Astro with Svelte components
- **Styling**: Tailwind CSS v4 with @thepia/branding tokens
- **Authentication**: Supabase Magic Links (Phase 1) → flows-auth WebAuthn (Phase 2)
- **Database**: Supabase with Row Level Security (RLS)
- **Route Protection**: Bunny CDN Edge Scripting middleware
- **Build Tool**: Astro with file-based routing

### **Route Structure**
```
/admin                    # Admin dashboard landing page
/admin/invitations       # Manage demo invitations
/admin/users             # User permissions management
/admin/clients           # Client configuration
/admin/analytics         # Usage analytics dashboard
```

## Implementation Phases

### **Phase 1: Basic Setup & Authentication**

#### **1.1 Create Admin Route Structure**
```
src/pages/admin/
├── index.astro           # Admin dashboard
├── invitations.astro     # Invitation management
├── users.astro          # User management
└── clients.astro        # Client management
```

#### **1.2 Supabase Integration**
- Install Supabase client libraries
- Configure environment variables
- Set up magic link authentication
- Create admin-specific RLS policies

#### **1.3 Basic Admin Components**
```
src/components/admin/
├── AdminLayout.svelte    # Admin-specific layout
├── AdminNav.svelte      # Navigation component
├── AdminDashboard.svelte # Main dashboard
├── InvitationManager.svelte
├── UserManager.svelte
└── ClientManager.svelte
```

### **Phase 2: Core Admin Features**

#### **2.1 Demo Invitation Management**
- **Create invitations**: Generate demo access codes
- **Track invitation status**: Sent, opened, used, expired
- **Invitation analytics**: Usage patterns and conversion rates
- **Bulk operations**: Send multiple invitations, export data

#### **2.2 User Permission Management**
- **User directory**: View all authenticated users
- **Permission assignment**: Grant/revoke admin access
- **Role management**: Define custom permission levels
- **Activity logging**: Track admin actions and user activity

#### **2.3 Client Configuration**
- **Client registry**: Manage demo client instances
- **Feature toggles**: Enable/disable features per client
- **Usage monitoring**: Track resource usage and limits
- **Configuration templates**: Preset configurations for different demo types

### **Phase 3: Advanced Features**

#### **3.1 Analytics Dashboard**
- **Usage metrics**: Active users, session duration, feature usage
- **Invitation funnel**: Conversion rates and bottlenecks
- **System health**: API response times, error rates
- **Export capabilities**: CSV/JSON data export for analysis

#### **3.2 WebAuthn Migration**
- **flows-auth integration**: Replace magic links with WebAuthn
- **JWT exchange setup**: Custom Supabase JWT generation
- **Passkey management**: Register/manage admin passkeys
- **Fallback authentication**: Magic links as backup option

### **Phase 4: Production Deployment**

#### **4.1 Route Protection**
- **Bunny CDN Edge Scripting**: Middleware for /admin route protection
- **Authentication verification**: Server-side auth token validation
- **Access control**: Role-based route access
- **Security headers**: CSRF protection, content security policy

#### **4.2 Monitoring & Security**
- **Audit logging**: All admin actions logged
- **Rate limiting**: Prevent abuse of admin endpoints
- **Session management**: Secure session handling
- **Backup procedures**: Data backup and recovery plans

## Database Schema

### **Admin-Specific Tables**
```sql
-- Admin users table
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  email TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Invitations table
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  invitation_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'opened', 'used', 'expired')),
  created_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  used_at TIMESTAMP WITH TIME ZONE
);

-- Admin activity log
CREATE TABLE admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES admin_users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Row Level Security Policies**
```sql
-- Only authenticated admin users can access admin tables
CREATE POLICY "Admin users can manage invitations" ON invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Audit log is read-only for admins
CREATE POLICY "Admins can view activity log" ON admin_activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  );
```

## Component Architecture

### **AdminLayout.svelte**
```svelte
<script>
  import AdminNav from './AdminNav.svelte';
  import { authStore } from '../stores/auth.js';
  
  export let title = 'Admin Dashboard';
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
  <AdminNav />
  
  <main class="container mx-auto px-4 py-8">
    <header class="mb-8">
      <h1 class="text-3xl font-serif text-gray-900 dark:text-white">
        {title}
      </h1>
    </header>
    
    <slot />
  </main>
</div>
```

### **InvitationManager.svelte**
```svelte
<script>
  import { onMount } from 'svelte';
  import { supabase } from '../lib/supabase.js';
  
  let invitations = [];
  let newInvitationEmail = '';
  
  async function createInvitation() {
    // Create new demo invitation
  }
  
  async function loadInvitations() {
    // Load existing invitations
  }
  
  onMount(loadInvitations);
</script>

<div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
  <h2 class="text-xl font-semibold mb-4">Demo Invitations</h2>
  
  <!-- Invitation creation form -->
  <form on:submit|preventDefault={createInvitation} class="mb-6">
    <div class="flex gap-4">
      <input
        type="email"
        bind:value={newInvitationEmail}
        placeholder="Enter email address"
        class="flex-1 px-3 py-2 border border-gray-300 rounded-md"
        required
      />
      <button
        type="submit"
        class="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary-hover"
      >
        Send Invitation
      </button>
    </div>
  </form>
  
  <!-- Invitations list -->
  <div class="space-y-3">
    {#each invitations as invitation}
      <div class="flex items-center justify-between p-3 border border-gray-200 rounded-md">
        <div>
          <div class="font-medium">{invitation.email}</div>
          <div class="text-sm text-gray-500">
            Status: {invitation.status} • Created: {new Date(invitation.created_at).toLocaleDateString()}
          </div>
        </div>
        <div class="flex gap-2">
          <button class="text-blue-600 hover:text-blue-800">Resend</button>
          <button class="text-red-600 hover:text-red-800">Revoke</button>
        </div>
      </div>
    {/each}
  </div>
</div>
```

## Authentication Flow

### **Phase 1: Supabase Magic Links**
```javascript
// Sign in with magic link
async function signInWithMagicLink(email) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email: email,
    options: {
      emailRedirectTo: 'https://flows.thepia.net/admin'
    }
  });
  
  if (error) throw error;
  return data;
}

// Check admin permissions
async function checkAdminAccess(userId) {
  const { data, error } = await supabase
    .from('admin_users')
    .select('role')
    .eq('user_id', userId)
    .single();
    
  return data?.role ? true : false;
}
```

### **Phase 2: flows-auth Integration**
```javascript
// Exchange flows-auth JWT for Supabase JWT
async function exchangeAuthToken(flowsAuthToken) {
  const response = await fetch('/api/auth/exchange', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${flowsAuthToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  const { supabaseToken } = await response.json();
  
  // Set Supabase session
  await supabase.auth.setSession({
    access_token: supabaseToken,
    refresh_token: null
  });
  
  return supabaseToken;
}
```

## Security Considerations

### **Access Control**
- **Multi-factor authentication**: Required for all admin access
- **Role-based permissions**: Granular access control by admin role
- **Session management**: Secure session handling with proper expiration
- **IP allowlisting**: Optional restriction to specific IP ranges

### **Data Protection**
- **Encryption at rest**: All sensitive data encrypted in database
- **Encryption in transit**: HTTPS-only communication
- **Audit logging**: All admin actions logged with timestamps
- **Data retention**: Automatic cleanup of old logs and expired invitations

### **HTTPS Certificate Setup**

**Option 1: Production Let's Encrypt (Recommended)**
- Requires DNS control for thepia.net domain
- Provides fully trusted certificates
- No browser warnings
- Works with Safari WebAuthn

**Option 2: Local mkcert Certificates**  
- Quick setup for development
- Locally trusted only
- Requires mkcert installation
- Browser will trust after mkcert CA installation

### **Route Protection**
```javascript
// Bunny CDN Edge Script for /admin protection
export async function onOriginRequest(request) {
  const url = new URL(request.url);
  
  // Check if accessing admin route
  if (url.pathname.startsWith('/admin')) {
    const authToken = request.headers.get('Authorization') || 
                     getCookie(request, 'supabase-auth-token');
    
    if (!authToken || !await verifyAdminToken(authToken)) {
      return new Response('Unauthorized', { 
        status: 401,
        headers: {
          'Location': '/auth?redirect=' + encodeURIComponent(url.pathname)
        }
      });
    }
  }
  
  return request;
}
```

## Development Workflow

### **Setup Instructions**
```bash
# Install dependencies
pnpm install

# Add Supabase environment variables
cp .env.example .env
# Edit .env with Supabase credentials

# Set up DNS and Let's Encrypt certificates
# 1. Add DNS A record: dev.thepia.net → 127.0.0.1
# 2. Generate Let's Encrypt certificates:
pnpm setup:letsencrypt
# 3. Follow DNS TXT record instructions for validation
# 4. Certificates will be saved to certs/ directory

# Alternative: Use mkcert for local development (faster setup)
pnpm setup:https

# Add to /etc/hosts file
sudo sh -c 'echo "127.0.0.1 dev.thepia.net" >> /etc/hosts'

# Update Supabase dashboard redirect URLs:
# - Site URL: https://dev.thepia.net:5176
# - Redirect URLs: https://dev.thepia.net:5176/admin

# Start development server with HTTPS
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

### **Testing Strategy**
- **Unit tests**: Component logic and utilities
- **Integration tests**: Database operations and API calls
- **E2E tests**: Complete admin workflows
- **Security tests**: Authentication and authorization flows

### **Deployment Process**
1. **Build production bundle**: `pnpm build`
2. **Run security scan**: Verify no secrets in bundle
3. **Deploy to staging**: Test in staging environment
4. **Configure Bunny CDN**: Set up route protection
5. **Deploy to production**: Push to Bunny CDN

## Success Criteria

### **Functional Requirements**
- ✅ Admin can authenticate using magic links
- ✅ Admin can create and manage demo invitations
- ✅ Admin can view and manage user permissions
- ✅ Admin can configure client settings
- ✅ All admin actions are logged and auditable

### **Non-Functional Requirements**
- ✅ Page load times under 2 seconds
- ✅ Mobile-responsive design
- ✅ Accessibility compliance (WCAG 2.1 AA)
- ✅ Security: No vulnerabilities in security scan
- ✅ Monitoring: Real-time error tracking and alerting

### **Security Requirements**
- ✅ Multi-factor authentication enforced
- ✅ All data access properly authorized via RLS
- ✅ Admin routes protected at CDN level
- ✅ Audit trail for all administrative actions
- ✅ Regular security reviews and updates

## Future Enhancements

### **Advanced Analytics**
- **Real-time dashboards**: Live metrics and alerts
- **Predictive analytics**: Usage forecasting and trends
- **Custom reports**: Configurable reporting system
- **Data visualization**: Charts and graphs for insights

### **Multi-tenant Support**
- **Organization management**: Support multiple organizations
- **Tenant isolation**: Strict data separation
- **Custom branding**: Per-tenant visual customization
- **Feature flags**: Organization-specific feature control

### **API Integration**
- **REST API**: Programmatic admin operations
- **Webhooks**: Event-driven integrations
- **Third-party connectors**: CRM and marketing tool integration
- **Automation**: Scheduled tasks and workflows

## Notes

- This implementation serves as the **foundation** for admin capabilities across Thepia
- The modular architecture allows **easy extension** with new admin features
- Security-first design ensures **safe operation** in production environments
- Integration patterns established here will **guide future** admin interface development