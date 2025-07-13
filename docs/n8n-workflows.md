# n8n Workflow Documentation

## Contact Form Handler Workflow

This workflow processes incoming contact form submissions and routes them to appropriate handlers based on the request type.

### Workflow Diagram

```text
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Webhook   │────▶│     Code     │────▶│     Switch      │
│             │     │              │     │   (Rules Mode)  │
│  POST Entry │     │  Processing  │     │                 │
└─────────────┘     └──────────────┘     └─────────┬───────┘
                                                   │
        ┌──────────────┬─────────────┬─────────────┼─────────────┬─────────────┐
        │              │             │             │             │             │
        ▼              ▼             ▼             ▼             ▼             ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Demo Request│ │ Quarantine  │ │   Reject    │ │ General Bus │ │ Support Req │ │Partnership  │
│             │ │             │ │             │ │             │ │             │ │ Inquiry     │
└─────┬───────┘ └─────┬───────┘ └─────┬───────┘ └─────┬───────┘ └─────┬───────┘ └─────┬───────┘
      │               │               │               │               │               │
      ▼               ▼               ▼               ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│HTTP Request │ │HTTP Request │ │HTTP Request │ │HTTP Request │ │HTTP Request │ │HTTP Request │
│             │ │             │ │             │ │             │ │             │ │             │
│Discord Demo │ │Discord Quar │ │Discord Rejct│ │Discord Gen  │ │Discord Supp │ │Discord Part │
│Channel      │ │Channel      │ │Channel      │ │Channel      │ │Channel      │ │Channel      │
└─────┬───────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
      │
      ▼
┌─────────────┐
│HTTP Request │
│             │
│Create Invit │
│Request (DB) │
└─────────────┘

Flow Summary:
• Demo request    ──▶ Discord Demo Channel    ──▶ Create Invitation Record (Supabase)
• Quarantine      ──▶ Discord Quarantine Channel
• Reject          ──▶ Discord Reject Channel
• General Business──▶ Discord General Channel
• Support Request ──▶ Discord Support Channel  
• Partnership     ──▶ Discord Partnership Channel
```

### Workflow Components

#### 1. Webhook (Entry Point)

- **Type**: Webhook Trigger
- **Method**: POST
- **Purpose**: Receives contact form submissions from the website

#### 2. Code (Processing)

- **Type**: Code Node
- **Purpose**: Processes and validates incoming form data
- **Function**: Categorizes requests and prepares data for routing

#### 3. Switch (Router)

- **Type**: Switch Node
- **Mode**: Rules
- **Purpose**: Routes requests based on type/category
- **Routes**:
  - **Demo request**: New demo access requests
  - **Quarantine**: Filtered/spam requests
  - **Reject**: Requests to be rejected
  - **General business**: General inquiries
  - **Support request**: Technical support
  - **Partnership inquiry**: Business partnerships

#### 4. HTTP Request Nodes

##### Discord Notifications

- **Purpose**: Sends notifications to appropriate Discord channels
- **Endpoint**: Discord API webhooks
- **Triggers**: All request types get routed to their respective Discord channels

##### Create Invitation Request

- **Purpose**: Creates invitation records for demo requests only
- **Node Type**: Supabase "Create a row" node
- **Target**: `api.invitations` table in Supabase
- **Flow**: Only triggered after Discord notification for demo requests
- **Data Processing**: 
  - **Code node** processes input array and creates JWT with PII
  - **JWT token** contains encrypted personal data (name, email, company, message)
  - **Database record** stores JWT hash and non-PII metadata only
  - **GDPR compliance** through encrypted PII storage and retention policies

### Integration Points

#### Database Integration

The workflow integrates with the `api.invitations` table in Supabase:

- **Record Type**: `request_type: 'demo_request'` with `status: 'requested'`
- **PII Storage**: Personal data encrypted in JWT token, stored in `jwt_token` field
- **Database Fields**: Non-PII metadata stored directly (spam scores, domains, timestamps)
- **Security**: JWT token hashed with SHA-256 for secure lookups (`jwt_token_hash`)
- **GDPR**: Automatic deletion policies and retention purpose tracking

#### Admin Interface Integration

The created invitation records are visible in the admin interface at `/admin`, where administrators can:

- Review demo requests
- Approve or reject applications
- Track request status and progress

### Configuration Notes

- **Environment**: Production n8n instance
- **Webhook URL**: Configured in website contact forms
- **Discord Integration**: Requires webhook URLs for notifications
- **Database Access**: Uses Supabase service role for data operations

### n8n Node Configuration Details

#### Data Flow Architecture

**API Server Responsibilities:**
- ✅ **IMPLEMENTED**: Creates JWT token with encrypted PII before sending to n8n
- ✅ **IMPLEMENTED**: Generates SHA-256 hash of JWT for secure database lookups  
- ✅ **IMPLEMENTED**: Prepares all metadata fields for database storage
- ✅ **IMPLEMENTED**: Sends complete database record structure to n8n webhook

**n8n Workflow Responsibilities:**
- Receives prepared data from API server (including JWT token and hash)
- Routes to Discord notifications 
- Creates database record using "Create a row" node
- No JWT creation or PII processing in n8n (handled by API server)

#### Supabase "Create a row" Node

- **Resource**: Supabase
- **Table**: `invitations`
- **Schema**: `api`  
- **Input**: Maps directly from API server payload (array with single object)
- **Authentication**: Uses Supabase service role key from environment variables

**Data Provided by API Server:**
- ✅ `jwt_token` - Encrypted JWT containing PII (created by API server)
- ✅ `jwt_token_hash` - SHA-256 hash for lookups (created by API server)
- ✅ `request_type` - Set to 'demo_request'
- ✅ `status` - Set to 'requested'
- ✅ `invitation_code` - Generated unique code (DEMO-XXXXXX format)
- ✅ `email_hash` - SHA-256 of email for privacy-preserving lookups
- ✅ `email_domain` - Domain portion for spam analysis
- ✅ `spam_score`, `spam_status` - Spam detection results
- ✅ `workflow_type` - Type of demo request
- ✅ `retention_purpose` - GDPR compliance field
- ✅ `expires_at` - Token expiration date
- ✅ `client_code`, `app_code` - Demo client and app codes for UUID resolution
- ✅ `client_name`, `app_name` - Human-readable names for logging

**Intelligent Client/App Mapping:**
The API server intelligently maps workflow descriptions to appropriate demo clients:

- **Offboarding Keywords** → Hygge & Hvidløg A/S + Knowledge Transfer & Offboarding
  - Keywords: "offboard", "departure", "exit", "leaving", "termination", "knowledge transfer", "handover"
- **Rapid/Scale Keywords** → Meridian Brands International + Rapid Market Onboarding  
  - Keywords: "rapid", "fast", "quick", "bulk", "high volume", "scale", "automated"
- **Default** → Hygge & Hvidløg A/S + Employee Onboarding
  - All other workflow types default to standard onboarding

**n8n UUID Resolution Required:**
The API server provides `client_code` and `app_code`. The n8n workflow must resolve these to UUIDs:

```sql
SELECT id FROM api.clients WHERE client_code = 'hygge-hvidlog';
SELECT id FROM api.client_applications WHERE app_code = 'employee-onboarding' AND client_id = (client_uuid);
```

> **⚠️ ARCHITECTURE DECISION PENDING**: The current approach uses `app_code`/`client_code` with N8N doing UUID resolution. An alternative approach would be to have the API server resolve codes to UUIDs (`app_id`/`client_id`) and send UUIDs directly to N8N. The `app_code` approach may be more maintainable, but the current implementation is working well. This decision should be reviewed when refactoring the contact form handler. See discussion in flows.thepia.net issue tracking.

### Monitoring

- Monitor webhook execution logs in n8n
- Track invitation creation in admin interface
- Monitor Discord notification delivery
- Review failed executions and error handling

---

## 🚀 FUTURE ARCHITECTURE: UNIFIED NOTIFICATION QUEUE

> **Current State**: Contact Form Handler workflow is functional for production. **Recommended Evolution**: Consolidate all notification workflows into a single queue-based processor to optimize N8N Cloud workflow limits and costs.

### **Queue-Based Notification Strategy**

**Problem**: N8N Cloud pricing limits active workflows (5 for Starter €20/month, 15 for Pro €50/month). Multiple notification workflows (Contact Form Handler, Discord Approval Handler, Email Sender, etc.) quickly consume workflow quota.

**Solution**: Single "Notification Processor" workflow that handles all notification types through database-driven queue management.

### **Unified Workflow Architecture**

**Single N8N Workflow: "Notification Processor"**
```
Timer Trigger (5min) → Query Pending Notifications → Route by Type → Send → Update Status
Manual Trigger ─────┘                                    ↓
                                                    [Email|SMS|Push|Discord]
```

**Database-Driven Approach**:
- **Notification records** stored in `api.notifications` or extended `api.invitations` table
- **Status management** handled by database flags (`pending`, `processing`, `sent`, `failed`, `retry_scheduled`)
- **Retry logic** controlled by database fields (`attempt_count`, `next_attempt_at`, `max_attempts`)
- **Template system** with `message_template` and `template_data` fields

### **Integration with Existing Workflows**

**Contact Form Handler Evolution**:
1. **Current**: Webhook → Discord + Database record
2. **Future**: Webhook → Database record + Notification queue entry
3. **Benefit**: Email notifications handled by unified processor

**Discord Approval Handler Evolution**:
1. **Current**: Separate workflow for approval emails and Discord updates  
2. **Future**: Approval creates notification records, processor handles delivery
3. **Benefit**: Single workflow manages all approval-related notifications

**Admin Interface Integration**:
```typescript
// Simplified approval flow
async function approveInvitation() {
  // 1. Update invitation status
  await supabase.from('invitations').update({ status: 'approved' });
  
  // 2. Queue notification
  await supabase.from('notifications').insert({
    notification_type: 'invitation_email',
    reference_id: invitation.id,
    delivery_method: 'email',
    recipient_data: { email: invitation.email },
    message_template: 'invitation_approved'
  });
  
  // 3. Optional immediate trigger
  await triggerNotificationProcessor();
}
```

### **Workflow Consolidation Plan**

**Phase 1: Foundation** (High Priority)
- [ ] Extend `api.invitations` table with notification status fields
- [ ] Build N8N Notification Processor workflow with timer + manual triggers
- [ ] Test email delivery through queue system

**Phase 2: Integration** (Medium Priority)  
- [ ] Modify Contact Form Handler to use notification queue
- [ ] Update admin approval flow to create notification records
- [ ] Add manual notification trigger button in admin interface

**Phase 3: Expansion** (Low Priority)
- [ ] Add SMS delivery method (Twilio integration)
- [ ] Add push notifications (Firebase/OneSignal)
- [ ] Migrate to central `api.notifications` table
- [ ] Implement notification analytics and monitoring

### **N8N Workflow Count Optimization**

**Current Trajectory**: Multiple workflows consuming N8N limits
- Contact Form Handler (1)
- Discord Approval Handler (1) 
- Email Invitation Sender (1)
- Follow-up Cadence (1)
- Manual Resend Handler (1)
- **Total**: 5+ workflows (exceeds Starter plan)

**Optimized Architecture**: Single workflow handling all notifications
- Notification Processor (1)
- Backup/Manual Contact Form (1, optional)
- **Total**: 1-2 workflows (fits Starter plan comfortably)

### **Benefits Summary**

✅ **Cost Optimization**: Stay within N8N Starter plan (€20/month vs €50/month Pro)  
✅ **Unified Management**: Single workflow to monitor and debug  
✅ **Database-Driven**: Retry logic and status management in reliable SQL database  
✅ **Scalable**: Add notification types without new N8N workflows  
✅ **Admin Friendly**: Simple database operations for approval/notification triggering  
✅ **Reliable**: Queue-based approach handles failures and retries systematically

This evolution maintains all existing functionality while optimizing for N8N Cloud constraints and providing a robust foundation for future notification requirements.
