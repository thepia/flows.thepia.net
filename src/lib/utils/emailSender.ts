/**
 * Email Sending Utilities for Thepia Flows
 *
 * This module handles direct email sending from the browser using AWS SES
 * via a server endpoint.
 */

import { reportSupabaseError } from '../config/errorReporting';
import { prepareEmailData } from './emailTemplates';

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: any;
}

/**
 * Send an email for an invitation using AWS SES
 */
export async function sendInvitationEmail(
  invitation: any,
  templateName = 'invitation_approved'
): Promise<EmailSendResult> {
  try {
    // Prepare email data using templates
    const emailData = prepareEmailData(invitation, templateName);

    console.log('Sending email:', {
      to: emailData.to,
      subject: emailData.subject,
      invitation_id: emailData.invitation_id,
    });

    // Send via our email endpoint
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        metadata: {
          invitation_id: emailData.invitation_id,
          template: templateName,
          sent_from: 'admin_interface',
          is_resend: invitation.status === 'sent',
          previous_email_sent_at: invitation.email_sent_at || null,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    console.log('Email sent successfully:', result);

    return {
      success: true,
      messageId: result.messageId,
      details: result,
    };
  } catch (error: any) {
    console.error('Failed to send email:', error);

    // Report the error
    await reportSupabaseError('invitations', 'email_send', error, {
      operation: 'sendInvitationEmail',
      component: 'emailSender',
      invitationId: invitation.id,
      templateName,
    });

    return {
      success: false,
      error: error.message || 'Failed to send email',
      details: error,
    };
  }
}

/**
 * Test email sending functionality
 */
export async function sendTestEmail(toEmail: string): Promise<EmailSendResult> {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: toEmail,
        subject: 'Test Email from Thepia Flows Admin',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Test Email</h2>
            <p>This is a test email from the Thepia Flows admin interface.</p>
            <p>If you received this, email sending is working correctly!</p>
            <p>Time: ${new Date().toISOString()}</p>
          </div>
        `,
        text: `Test Email - This is a test email from the Thepia Flows admin interface. Time: ${new Date().toISOString()}`,
        metadata: {
          test: true,
          sent_from: 'admin_interface',
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();

    return {
      success: true,
      messageId: result.messageId,
      details: result,
    };
  } catch (error: any) {
    console.error('Test email failed:', error);

    return {
      success: false,
      error: error.message || 'Failed to send test email',
      details: error,
    };
  }
}

/**
 * Check if email service is available
 */
export async function checkEmailService(): Promise<{ available: boolean; error?: string }> {
  try {
    const response = await fetch('/api/send-email', {
      method: 'GET',
    });

    if (response.ok) {
      return { available: true };
    }
    return {
      available: false,
      error: `Service responded with ${response.status}`,
    };
  } catch (error: any) {
    return {
      available: false,
      error: error.message || 'Service unavailable',
    };
  }
}
