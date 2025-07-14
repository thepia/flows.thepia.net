# N8N Setup Guide for Thepia Flows Notifications

## N8N Cloud v1.1 Setup Instructions

### Prerequisites
- N8N Cloud account
- Supabase project with notification queue schema deployed
- Email service (SendGrid, SMTP, etc.)

## Step 1: Create New Workflow

1. **Login to N8N Cloud**
2. **Create New Workflow**
3. **Name**: "Thepia Flows - Unified Notification Processor"

## Step 2: Add Nodes

### Node 1: Schedule Trigger
1. **Add Node** → **Schedule Trigger**
2. **Interval**: Every 5 minutes
3. **Settings**: 
   - Unit: `minutes`
   - Value: `5`

### Node 2: Get Pending Notifications
1. **Add Node** → **Supabase**
2. **Select**: "custom Supabase API call"
3. **Configuration**:
   - **URL**: `/rest/v1/rpc/get_pending_notifications`
   - **Method**: `POST`
   - **Headers**: 
     ```json
     {
       "Content-Type": "application/json",
       "Prefer": "return=representation"
     }
     ```
   - **Body**: `{}`

### Node 3: Split in Batches
1. **Add Node** → **Split in Batches**
2. **Batch Size**: `10`

### Node 4: Process Notification
1. **Add Node** → **Code**
2. **Language**: JavaScript
3. **Code**: Copy entire content from `/scripts/n8n-notification-processor.js`

### Node 5: Check for Errors
1. **Add Node** → **IF**
2. **Condition**: `{{ $json.error }}` equals `true`

### Node 6: Mark as Processing (Success Path)
1. **Add Node** → **Supabase** 
2. **Select**: "custom Supabase API call"
3. **Configuration**:
   - **URL**: `/rest/v1/rpc/mark_notification_processing`
   - **Method**: `POST`
   - **Body**: 
     ```json
     {
       "invitation_id": "{{ $json.notification_id }}"
     }
     ```

### Node 7: Send Email
1. **Add Node** → **HTTP Request** (for SendGrid)
2. **Configuration**:
   - **URL**: `https://api.sendgrid.com/v3/mail/send`
   - **Method**: `POST`
   - **Authentication**: Header Auth
     - **Name**: `Authorization`
     - **Value**: `Bearer YOUR_SENDGRID_API_KEY`
   - **Headers**:
     ```json
     {
       "Content-Type": "application/json"
     }
     ```
   - **Body**:
     ```json
     {
       "personalizations": [{
         "to": [{"email": "{{ $json.email }}"}]
       }],
       "from": {
         "email": "noreply@thepia.com",
         "name": "Thepia Flows"
       },
       "subject": "{{ $json.subject }}",
       "content": [{
         "type": "text/html",
         "value": "{{ $json.html_body }}"
       }],
       "custom_args": {
         "notification_id": "{{ $json.notification_id }}"
       }
     }
     ```

### Node 8: Mark as Sent (Success)
1. **Add Node** → **Supabase**
2. **Select**: "custom Supabase API call"
3. **Configuration**:
   - **URL**: `/rest/v1/rpc/mark_notification_sent`
   - **Method**: `POST`
   - **Body**:
     ```json
     {
       "invitation_id": "{{ $json.notification_id }}",
       "delivery_method": "email",
       "service_message_id": "{{ $response.headers['x-message-id'] || 'n8n-' + Date.now() }}"
     }
     ```

### Node 9: Mark as Failed (Error Path)
1. **Add Node** → **Supabase**
2. **Select**: "custom Supabase API call"
3. **Configuration**:
   - **URL**: `/rest/v1/rpc/mark_notification_failed`
   - **Method**: `POST`
   - **Body**:
     ```json
     {
       "invitation_id": "{{ $json.notification_id }}",
       "delivery_method": "email", 
       "error_message": "{{ $json.error_message || 'Processing error' }}"
     }
     ```

## Step 3: Connect Nodes

1. **Schedule Trigger** → **Get Pending Notifications**
2. **Get Pending Notifications** → **Split in Batches**
3. **Split in Batches** → **Process Notification**
4. **Process Notification** → **Check for Errors**
5. **Check for Errors** (true) → **Mark as Failed**
6. **Check for Errors** (false) → **Mark as Processing**
7. **Mark as Processing** → **Send Email**
8. **Send Email** → **Mark as Sent**

## Step 4: Configure Credentials

### Supabase Credential
1. **Go to Credentials**
2. **Add New** → **Supabase**
3. **Configuration**:
   - **Host**: `your-project.supabase.co`
   - **Service Role Secret**: Your Supabase service role key

### SendGrid Credential (if using)
1. **Go to Credentials**
2. **Add New** → **Header Auth**
3. **Configuration**:
   - **Name**: `Authorization`
   - **Value**: `Bearer YOUR_SENDGRID_API_KEY`

## Step 5: Testing

### Manual Test
1. **Disable Schedule Trigger** temporarily
2. **Add Manual Trigger** node for testing
3. **Execute workflow** manually
4. **Check database** for status updates
5. **Verify email delivery**

### Monitoring Queries
```sql
-- Check notification queue status
SELECT 
  notification_status,
  COUNT(*) as count
FROM api.invitations
WHERE notification_status IS NOT NULL
GROUP BY notification_status;

-- Check recent activity
SELECT 
  id,
  status,
  notification_status,
  notification_attempts,
  last_notification_error,
  notification_triggered_at
FROM api.invitations
WHERE notification_triggered_at > NOW() - INTERVAL '1 hour'
ORDER BY notification_triggered_at DESC;
```

## Step 6: Enable Production

1. **Remove Manual Trigger**
2. **Enable Schedule Trigger**
3. **Activate Workflow**
4. **Monitor execution logs**

## Troubleshooting

### Common Issues

1. **RPC Function Not Found**
   - Verify schema 25 and 26 are deployed
   - Check function permissions

2. **JWT Decode Errors**
   - Verify JWT tokens exist in database
   - Check token format

3. **Email Sending Failures**
   - Verify SendGrid API key
   - Check email template formatting
   - Review rate limits

4. **Database Connection Issues**
   - Verify Supabase credentials
   - Check service role permissions
   - Confirm URL format

### Debug Steps
1. **Check N8N execution logs**
2. **Review database notification_status**
3. **Verify email service logs**
4. **Test individual nodes**

## Performance Considerations

- **Batch Size**: Start with 10, adjust based on performance
- **Schedule Frequency**: 5 minutes balances responsiveness vs. resource usage
- **Error Handling**: Failed notifications automatically retry with exponential backoff
- **Monitoring**: Set up alerts for repeated failures

## Security Notes

- **Service Role Key**: Store securely in N8N credentials
- **JWT Tokens**: Contain PII but are encrypted by Supabase
- **Email Content**: Validate all user inputs
- **API Keys**: Rotate regularly and store securely