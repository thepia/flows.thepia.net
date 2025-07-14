/**
 * AWS SES Email Sending Endpoint
 *
 * This endpoint handles email sending using AWS SES for the Thepia Flows admin interface.
 * It provides a secure server-side interface for sending emails without exposing AWS credentials to the browser.
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import type { APIRoute } from 'astro';

// Initialize AWS SES client
const sesClient = new SESClient({
  region: import.meta.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: import.meta.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: import.meta.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  text: string;
  metadata?: Record<string, any>;
}

export const POST: APIRoute = async ({ request }) => {
  // Only allow in development or with proper authentication
  if (import.meta.env.PROD && !isAuthorized(request)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Unauthorized access to email endpoint',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Check if request has body
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Content-Type must be application/json',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const text = await request.text();
    if (!text) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Request body is empty',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const emailData: EmailRequest = JSON.parse(text);

    // Validate required fields
    if (!emailData.to || !emailData.subject || (!emailData.html && !emailData.text)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required email fields (to, subject, html/text)',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate email address format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailData.to)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid email address format',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Prepare SES email command
    const fromEmail = import.meta.env.FROM_EMAIL || 'noreply@thepia.com';
    const fromName = import.meta.env.FROM_NAME || 'Thepia Flows';

    const emailCommand = new SendEmailCommand({
      Source: `${fromName} <${fromEmail}>`,
      Destination: {
        ToAddresses: [emailData.to],
      },
      Message: {
        Subject: {
          Data: emailData.subject,
          Charset: 'UTF-8',
        },
        Body: {
          ...(emailData.html && {
            Html: {
              Data: emailData.html,
              Charset: 'UTF-8',
            },
          }),
          ...(emailData.text && {
            Text: {
              Data: emailData.text,
              Charset: 'UTF-8',
            },
          }),
        },
      },
      // Add metadata as email headers
      ...(emailData.metadata && {
        Tags: Object.entries(emailData.metadata).map(([key, value]) => ({
          Name: key,
          Value: String(value),
        })),
      }),
    });

    // Send email via AWS SES
    const result = await sesClient.send(emailCommand);

    console.log(`Email sent successfully to ${emailData.to}:`, {
      messageId: result.MessageId,
      metadata: emailData.metadata,
    });

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.MessageId,
        to: emailData.to,
        subject: emailData.subject,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  } catch (error: any) {
    console.error('AWS SES email sending failed:', error);

    // Handle specific AWS SES errors
    let errorMessage = 'Failed to send email';
    let statusCode = 500;

    if (error.name === 'MessageRejected') {
      errorMessage = 'Email address rejected by AWS SES';
      statusCode = 400;
    } else if (error.name === 'MailFromDomainNotVerifiedException') {
      errorMessage = 'Sender domain not verified in AWS SES';
      statusCode = 500;
    } else if (error.name === 'ConfigurationSetDoesNotExistException') {
      errorMessage = 'AWS SES configuration error';
      statusCode = 500;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: import.meta.env.DEV ? error.stack : undefined,
      }),
      {
        status: statusCode,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  }
};

// GET endpoint for health check
export const GET: APIRoute = async () => {
  try {
    // Simple health check - verify AWS credentials are configured
    const requiredEnvVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
    const missingVars = requiredEnvVars.filter((varName) => !import.meta.env[varName]);

    if (missingVars.length > 0) {
      return new Response(
        JSON.stringify({
          status: 'configuration_error',
          error: `Missing environment variables: ${missingVars.join(', ')}`,
          service: 'aws-ses-email-sender',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        status: 'healthy',
        service: 'aws-ses-email-sender',
        timestamp: new Date().toISOString(),
        region: import.meta.env.AWS_REGION || 'us-east-1',
        fromEmail: import.meta.env.FROM_EMAIL || 'noreply@thepia.com',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        status: 'error',
        error: error.message,
        service: 'aws-ses-email-sender',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// OPTIONS endpoint for CORS preflight
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};

// Simple authorization check (in development, always allow; in production, check for admin session)
function isAuthorized(_request: Request): boolean {
  // In development, always allow
  if (import.meta.env.DEV) {
    return true;
  }

  // In production, you would check for proper authentication here
  // For now, allowing all requests - you should implement proper auth
  // Examples:
  // - Check for valid session cookie
  // - Verify JWT token
  // - Check API key

  return true; // TODO: Implement proper authorization
}
