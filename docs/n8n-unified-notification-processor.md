# N8N Unified Notification Processor Workflow

## Overview

This N8N workflow processes the unified notification queue, handling all email notifications for the Thepia Flows platform.

**N8N Version**: Cloud v1.1  
**Architecture**: Uses custom Supabase API calls for RPC functions  
**Scheduling**: Schedule Trigger (every 5 minutes)

## Workflow Components

### 1. Main Notification Processor (N8N Cloud v1.1)

```json
{
  "name": "Unified Notification Processor",
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.cron",
      "typeVersion": 1,
      "position": [250, 300],
      "parameters": {
        "rule": "*/5 * * * *"  // Run every 5 minutes
      }
    },
    {
      "name": "Get Pending Notifications",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [450, 300],
      "parameters": {
        "operation": "rpc",
        "function": "get_pending_notifications",
        "parameters": "{}"
      }
    },
    {
      "name": "Process Each Notification",
      "type": "n8n-nodes-base.splitInBatches",
      "typeVersion": 1,
      "position": [650, 300],
      "parameters": {
        "batchSize": 10,
        "options": {}
      }
    },
    {
      "name": "Mark Processing",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [850, 300],
      "parameters": {
        "operation": "rpc",
        "function": "mark_notification_processing",
        "parameters": {
          "invitation_id": "={{$json.id}}"
        }
      }
    },
    {
      "name": "Decode JWT Token",
      "type": "n8n-nodes-base.function",
      "typeVersion": 1,
      "position": [1050, 300],
      "parameters": {
        "functionCode": `
// Decode JWT token to get email and other PII
const item = $input.item.json;
const jwt = item.jwt_token;

if (!jwt) {
  throw new Error('No JWT token found');
}

// Split JWT parts
const parts = jwt.split('.');
if (parts.length !== 3) {
  throw new Error('Invalid JWT format');
}

// Decode payload (without verification - Supabase already verified)
const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

// Merge decoded data with template variables
return {
  ...item,
  email: payload.email,
  name: payload.name || payload.firstName || 'Guest',
  company: payload.company || payload.companyName || '',
  decodedData: payload,
  templateVars: {
    ...item.template_data,
    email: payload.email,
    name: payload.name || payload.firstName || 'Guest',
    company: payload.company || payload.companyName || '',
    demo_duration: item.template_data?.demo_duration || '14 days',
    access_url: item.template_data?.access_url || 'https://flows.thepia.net/demo',
    expires_at: new Date(item.expires_at).toLocaleDateString()
  }
};
        `
      }
    },
    {
      "name": "Select Email Template",
      "type": "n8n-nodes-base.switch",
      "typeVersion": 1,
      "position": [1250, 300],
      "parameters": {
        "dataType": "string",
        "value1": "={{$json.message_template}}",
        "rules": {
          "rules": [
            {
              "value2": "invitation_approved",
              "output": 0
            },
            {
              "value2": "invitation_reminder",
              "output": 1
            },
            {
              "value2": "demo_expiring",
              "output": 2
            }
          ]
        },
        "fallbackOutput": 3
      }
    },
    {
      "name": "Send Approved Email",
      "type": "n8n-nodes-base.emailSend",
      "typeVersion": 2,
      "position": [1450, 200],
      "parameters": {
        "fromEmail": "noreply@thepia.com",
        "toEmail": "={{$json.email}}",
        "subject": "Your Thepia Flows Demo Access is Ready!",
        "emailType": "html",
        "htmlBody": `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f8f9fa; padding: 20px; text-align: center; }
    .button { 
      display: inline-block; 
      background: #007bff; 
      color: white; 
      padding: 12px 24px; 
      text-decoration: none; 
      border-radius: 4px;
      margin: 20px 0;
    }
    .details { background: #f8f9fa; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Thepia Flows!</h1>
    </div>
    
    <p>Hi {{templateVars.name}},</p>
    
    <p>Great news! Your demo request has been approved and your access is ready.</p>
    
    <div class="details">
      <h3>Your Demo Details:</h3>
      <ul>
        <li><strong>Duration:</strong> {{templateVars.demo_duration}}</li>
        <li><strong>Expires:</strong> {{templateVars.expires_at}}</li>
        <li><strong>Company:</strong> {{templateVars.company}}</li>
      </ul>
    </div>
    
    <p style="text-align: center;">
      <a href="{{templateVars.access_url}}" class="button">Access Your Demo</a>
    </p>
    
    <p><strong>What's Next?</strong></p>
    <ul>
      <li>Click the button above to access your demo</li>
      <li>Use your email address to sign in with a passkey</li>
      <li>Explore the workflow automation features</li>
      <li>Contact us if you have any questions</li>
    </ul>
    
    <p>Questions? Reply to this email and we'll be happy to help.</p>
    
    <p>Best regards,<br>The Thepia Team</p>
  </div>
</body>
</html>
        `,
        "options": {}
      }
    },
    {
      "name": "Mark Email Sent",
      "type": "n8n-nodes-base.supabase", 
      "typeVersion": 1,
      "position": [1650, 300],
      "parameters": {
        "operation": "rpc",
        "function": "mark_notification_sent",
        "parameters": {
          "invitation_id": "={{$json.id}}",
          "delivery_method": "email",
          "service_message_id": "={{$json.messageId || 'n8n-' + Date.now()}}"
        }
      }
    },
    {
      "name": "Mark Email Failed",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [1650, 400],
      "parameters": {
        "operation": "rpc", 
        "function": "mark_notification_failed",
        "parameters": {
          "invitation_id": "={{$json.id}}",
          "delivery_method": "email",
          "error_message": "={{$json.error.message || 'Unknown error'}}"
        }
      }
    }
  ],
  "connections": {
    "Schedule Trigger": {
      "main": [[{"node": "Get Pending Notifications", "type": "main", "index": 0}]]
    },
    "Get Pending Notifications": {
      "main": [[{"node": "Process Each Notification", "type": "main", "index": 0}]]
    },
    "Process Each Notification": {
      "main": [[{"node": "Mark Processing", "type": "main", "index": 0}]]
    },
    "Mark Processing": {
      "main": [[{"node": "Decode JWT Token", "type": "main", "index": 0}]]
    },
    "Decode JWT Token": {
      "main": [[{"node": "Select Email Template", "type": "main", "index": 0}]]
    },
    "Select Email Template": {
      "main": [
        [{"node": "Send Approved Email", "type": "main", "index": 0}],
        [{"node": "Send Reminder Email", "type": "main", "index": 0}],
        [{"node": "Send Expiring Email", "type": "main", "index": 0}],
        [{"node": "Send Generic Email", "type": "main", "index": 0}]
      ]
    },
    "Send Approved Email": {
      "main": [[{"node": "Mark Email Sent", "type": "main", "index": 0}]]
    }
  }
}
```

## Implementation Steps

1. **Create the workflow in N8N**
   - Import the JSON structure above
   - Configure SMTP/SendGrid credentials
   - Test with a single notification first

2. **Configure Email Service**
   - Set up SMTP server or SendGrid API
   - Configure from address and reply-to
   - Set up email tracking (optional)

3. **Error Handling**
   - Connect error outputs to "Mark Email Failed" node
   - Set up alerting for repeated failures
   - Monitor retry attempts

4. **Testing Process**
   1. Create a test invitation request
   2. Approve it in the admin UI
   3. Manually trigger the workflow
   4. Verify email delivery
   5. Check status updates in database

## Monitoring

Query to check notification queue status:
```sql
SELECT 
  notification_status,
  COUNT(*) as count,
  MAX(notification_attempts) as max_attempts
FROM api.invitations
WHERE notification_status IS NOT NULL
GROUP BY notification_status;
```

## Security Considerations

1. **JWT Handling**: The JWT tokens contain PII but are already encrypted by Supabase
2. **Email Validation**: Always validate email addresses before sending
3. **Rate Limiting**: Process in batches to avoid overwhelming email service
4. **Audit Trail**: All actions are logged in the database

## Future Enhancements

1. **Multi-channel Support**: Add SMS, push notifications, Discord
2. **Template Management**: Store templates in database
3. **A/B Testing**: Support multiple template versions
4. **Analytics**: Track open rates, click rates
5. **Unsubscribe**: Honor unsubscribe preferences