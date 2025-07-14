/**
 * N8N Notification Processor Handler
 * 
 * This script is designed to be used in N8N Cloud v1.1 Code node
 * It processes notifications from the unified queue system
 * 
 * Usage: Copy this entire script into an N8N Code node (JavaScript)
 * Input: Results from Supabase custom API call to get_pending_notifications
 * Output: Processed notification data ready for email sending
 * 
 * N8N Setup: See /docs/n8n-setup-guide.md for complete workflow setup
 * Architecture: Uses custom Supabase API calls for RPC functions
 */

// Main processing function for N8N
const processNotification = (notification) => {
  try {
    // Extract core notification data
    const {
      id,
      jwt_token,
      delivery_methods,
      message_template,
      template_data,
      custom_message,
      created_at,
      expires_at
    } = notification;

    // Validate required fields
    if (!jwt_token) {
      throw new Error('No JWT token found for notification');
    }

    if (!delivery_methods || !Array.isArray(delivery_methods)) {
      throw new Error('Invalid or missing delivery methods');
    }

    // Decode JWT token to extract PII
    const decodedData = decodeJWT(jwt_token);
    
    // Merge template data with decoded JWT data
    const mergedTemplateData = {
      ...template_data,
      ...decodedData,
      // Ensure critical fields are available
      email: decodedData.email || template_data.email,
      name: decodedData.name || decodedData.firstName || template_data.name || 'Guest',
      company: decodedData.company || decodedData.companyName || template_data.company || '',
      // Add computed fields
      expires_at_formatted: formatDate(expires_at),
      created_at_formatted: formatDate(created_at),
      demo_duration: template_data?.demo_duration || '14 days',
      access_url: template_data?.access_url || generateAccessUrl(jwt_token)
    };

    // Select appropriate email template
    const emailContent = selectEmailTemplate(message_template, mergedTemplateData, custom_message);

    // Prepare output for email sending node
    return {
      notification_id: id,
      email: mergedTemplateData.email,
      subject: emailContent.subject,
      html_body: emailContent.html,
      text_body: emailContent.text,
      template_used: message_template,
      delivery_method: 'email', // Currently only supporting email
      metadata: {
        notification_id: id,
        template: message_template,
        attempt: notification.notification_attempts + 1,
        max_attempts: notification.max_notification_attempts || 3
      }
    };
  } catch (error) {
    // Return error object that can be handled by N8N
    return {
      error: true,
      notification_id: notification.id,
      error_message: error.message,
      error_type: 'processing_error',
      original_data: notification
    };
  }
};

// JWT Decoder (without verification - Supabase already verified)
const decodeJWT = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    
    // Decode payload
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    return {
      email: payload.email,
      name: payload.name || payload.firstName,
      firstName: payload.firstName,
      lastName: payload.lastName,
      company: payload.company || payload.companyName,
      companyName: payload.companyName,
      workflow_type: payload.workflow_type,
      demo_duration: payload.demo_duration,
      team_size: payload.team_size,
      timeline: payload.timeline,
      role: payload.role,
      comment: payload.comment,
      priority: payload.priority,
      request_id: payload.request_id,
      // Include all other fields
      ...payload
    };
  } catch (error) {
    throw new Error(`JWT decode failed: ${error.message}`);
  }
};

// Date formatter
const formatDate = (dateString) => {
  if (!dateString) return 'Not specified';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Generate access URL
const generateAccessUrl = (jwt_token) => {
  // Use environment variable or default
  const baseUrl = $env.DEMO_BASE_URL || 'https://flows.thepia.net';
  return `${baseUrl}/demo?token=${encodeURIComponent(jwt_token)}`;
};

// Email template selector
const selectEmailTemplate = (templateName, data, customMessage) => {
  // If custom message provided, use it
  if (customMessage) {
    return {
      subject: 'Important Update from Thepia Flows',
      html: formatCustomMessage(customMessage, data),
      text: customMessage
    };
  }

  // Select template based on name
  switch (templateName) {
    case 'invitation_approved':
      return getApprovedEmailTemplate(data);
    
    case 'invitation_reminder':
      return getReminderEmailTemplate(data);
    
    case 'demo_expiring':
      return getExpiringEmailTemplate(data);
    
    case 'invitation_rejected':
      return getRejectedEmailTemplate(data);
    
    default:
      return getDefaultEmailTemplate(data);
  }
};

// Email Templates
const getApprovedEmailTemplate = (data) => {
  const subject = `Your Thepia Flows Demo Access is Ready!`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      margin: 0;
      padding: 0;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      padding: 20px; 
    }
    .header { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px 20px; 
      text-align: center; 
      border-radius: 8px 8px 0 0;
    }
    .content {
      background: white;
      padding: 30px;
      border: 1px solid #e1e1e1;
      border-top: none;
      border-radius: 0 0 8px 8px;
    }
    .button { 
      display: inline-block; 
      background: #667eea; 
      color: white; 
      padding: 14px 28px; 
      text-decoration: none; 
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      background: #5a67d8;
    }
    .details { 
      background: #f7fafc; 
      padding: 20px; 
      margin: 20px 0; 
      border-radius: 6px;
      border-left: 4px solid #667eea;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #718096;
      font-size: 14px;
    }
    h1 { margin: 0; }
    h3 { color: #2d3748; margin-top: 0; }
    ul { padding-left: 20px; }
    li { margin: 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Thepia Flows!</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Your demo access has been approved</p>
    </div>
    
    <div class="content">
      <p>Hi ${data.name},</p>
      
      <p>Great news! Your demo request has been approved and your personalized demo environment is ready.</p>
      
      <div class="details">
        <h3>📋 Demo Details</h3>
        <ul style="list-style: none; padding: 0;">
          <li>👤 <strong>Name:</strong> ${data.name}</li>
          <li>🏢 <strong>Company:</strong> ${data.company || 'Not specified'}</li>
          <li>⏱️ <strong>Duration:</strong> ${data.demo_duration}</li>
          <li>📅 <strong>Expires:</strong> ${data.expires_at_formatted}</li>
          ${data.workflow_type ? `<li>🔄 <strong>Workflow Type:</strong> ${data.workflow_type}</li>` : ''}
          ${data.team_size ? `<li>👥 <strong>Team Size:</strong> ${data.team_size}</li>` : ''}
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.access_url}" class="button">Access Your Demo →</a>
      </div>
      
      <h3>🚀 Getting Started</h3>
      <ol>
        <li><strong>Click the button above</strong> to access your demo environment</li>
        <li><strong>Sign in with your email</strong> using a secure passkey (no password needed!)</li>
        <li><strong>Explore the features</strong> we've prepared based on your requirements</li>
        <li><strong>Contact us anytime</strong> if you have questions or need assistance</li>
      </ol>
      
      ${data.admin_notes ? `
      <div class="details" style="border-left-color: #48bb78;">
        <h3>💬 Note from our team</h3>
        <p style="margin: 0;">${data.admin_notes}</p>
      </div>
      ` : ''}
      
      <p>We're excited to show you how Thepia Flows can transform your workflow automation. If you have any questions or need assistance, simply reply to this email.</p>
      
      <p>Best regards,<br>
      <strong>The Thepia Team</strong></p>
    </div>
    
    <div class="footer">
      <p>© 2024 Thepia. All rights reserved.<br>
      <a href="https://thepia.com" style="color: #667eea;">thepia.com</a></p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Hi ${data.name},

Great news! Your demo request has been approved and your personalized demo environment is ready.

Demo Details:
- Name: ${data.name}
- Company: ${data.company || 'Not specified'}
- Duration: ${data.demo_duration}
- Expires: ${data.expires_at_formatted}
${data.workflow_type ? `- Workflow Type: ${data.workflow_type}` : ''}
${data.team_size ? `- Team Size: ${data.team_size}` : ''}

Access your demo: ${data.access_url}

Getting Started:
1. Click the link above to access your demo environment
2. Sign in with your email using a secure passkey (no password needed!)
3. Explore the features we've prepared based on your requirements
4. Contact us anytime if you have questions or need assistance

${data.admin_notes ? `Note from our team: ${data.admin_notes}` : ''}

We're excited to show you how Thepia Flows can transform your workflow automation. If you have any questions or need assistance, simply reply to this email.

Best regards,
The Thepia Team

© 2024 Thepia. All rights reserved.
https://thepia.com
  `.trim();

  return { subject, html, text };
};

// Add other template functions
const getReminderEmailTemplate = (data) => {
  return {
    subject: `Reminder: Your Thepia Flows Demo is Waiting`,
    html: `<p>Reminder email for ${data.name}</p>`,
    text: `Reminder email for ${data.name}`
  };
};

const getExpiringEmailTemplate = (data) => {
  return {
    subject: `Your Thepia Flows Demo Expires Soon`,
    html: `<p>Expiring notice for ${data.name}</p>`,
    text: `Expiring notice for ${data.name}`
  };
};

const getRejectedEmailTemplate = (data) => {
  return {
    subject: `Update on Your Thepia Flows Demo Request`,
    html: `<p>Request update for ${data.name}</p>`,
    text: `Request update for ${data.name}`
  };
};

const getDefaultEmailTemplate = (data) => {
  return {
    subject: `Thepia Flows Notification`,
    html: `<p>Notification for ${data.name}</p>`,
    text: `Notification for ${data.name}`
  };
};

const formatCustomMessage = (message, data) => {
  // Simple template replacement
  let formatted = message;
  Object.keys(data).forEach(key => {
    formatted = formatted.replace(new RegExp(`{{${key}}}`, 'g'), data[key]);
  });
  return `<div style="font-family: Arial, sans-serif; padding: 20px;">${formatted}</div>`;
};

// N8N Function node entry point
// Process each item from the input
for (const item of $input.all()) {
  const notification = item.json;
  const processed = processNotification(notification);
  
  // Add to output
  $input.all().push({ json: processed });
}

// Return processed items
return $input.all().slice($input.all().length / 2);