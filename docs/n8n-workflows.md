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

### Monitoring

- Monitor webhook execution logs in n8n
- Track invitation creation in admin interface
- Monitor Discord notification delivery
- Review failed executions and error handling
