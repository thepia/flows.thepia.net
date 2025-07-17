<script lang="ts">
import { createEventDispatcher } from 'svelte';
import { checkEmailService, sendInvitationEmail } from '../../lib/utils/emailSender';

export let invitation: any;
export let inviteData: any;

// Detect environment and build appropriate URL
const isDev = import.meta.env.DEV;
const baseUrl = isDev ? 'https://dev.thepia.net:5176' : 'https://flows.thepia.net';
const demoPath = '/app';

const dispatch = createEventDispatcher<{
  approve: { invitation: any };
  reject: { invitation: any };
  updateStatus: { id: string; status: string };
  emailSent: { invitation: any; result: any };
}>();

let sendingEmail = false;
let emailError: string | null = null;
let emailSuccess: string | null = null;

function getStatusBadgeClass(status: string) {
  const baseClass = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
  switch (status) {
    case 'requested':
      return `${baseClass} bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300`;
    case 'pending':
      return `${baseClass} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300`;
    case 'approved':
      return `${baseClass} bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300`;
    case 'rejected':
      return `${baseClass} bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300`;
    case 'sent':
      return `${baseClass} bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300`;
    case 'opened':
      return `${baseClass} bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300`;
    case 'used':
      return `${baseClass} bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300`;
    case 'expired':
      return `${baseClass} bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300`;
    default:
      return `${baseClass} bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300`;
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function handleSendEmail() {
  if (sendingEmail) return;

  // Clear previous messages
  emailError = null;
  emailSuccess = null;
  sendingEmail = true;

  try {
    const isResend = invitation.status === 'sent';
    console.log(`${isResend ? 'Resending' : 'Sending'} email for invitation:`, invitation.id);

    const result = await sendInvitationEmail(invitation, 'invitation_approved');

    if (result.success) {
      emailSuccess = `Email ${isResend ? 'resent' : 'sent'} successfully! Message ID: ${result.messageId}`;
      console.log(`Email ${isResend ? 'resent' : 'sent'} successfully:`, result);

      // Notify parent component
      dispatch('emailSent', { invitation, result, isResend });

      // Clear success message after 5 seconds
      setTimeout(() => {
        emailSuccess = null;
      }, 5000);
    } else {
      emailError = result.error || 'Failed to send email';
      console.error('Email sending failed:', result);
    }
  } catch (error: any) {
    emailError = error.message || 'Failed to send email';
    console.error('Email sending error:', error);
  } finally {
    sendingEmail = false;
  }
}

function getNotificationStatusBadgeClass(notificationStatus: string) {
  const baseClass = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium';
  switch (notificationStatus) {
    case 'pending':
      return `${baseClass} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300`;
    case 'processing':
      return `${baseClass} bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300`;
    case 'sent':
      return `${baseClass} bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300`;
    case 'failed':
      return `${baseClass} bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300`;
    case 'retry_scheduled':
      return `${baseClass} bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300`;
    case 'reminder_due':
      return `${baseClass} bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300`;
    case 'cancelled':
      return `${baseClass} bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300`;
    default:
      return `${baseClass} bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300`;
  }
}
</script>

<div class="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
  <div class="flex items-center justify-between">
    <div class="flex-1">
      <div class="flex items-center gap-3 mb-2">
        <h3 class="text-sm font-medium text-gray-900 dark:text-white">
          {inviteData.name} ({inviteData.email})
        </h3>
        <span class={getStatusBadgeClass(inviteData.status)}>
          {inviteData.status}
        </span>
        {#if invitation.notification_status}
          <span class={getNotificationStatusBadgeClass(invitation.notification_status)}>
            📧 {invitation.notification_status}
          </span>
        {/if}
        {#if inviteData.priority === 'high'}
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300">
            high priority
          </span>
        {/if}
      </div>
      
      <div class="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        {#if inviteData.company && inviteData.company !== 'Not stored in database'}
          <div>Company: {inviteData.company}</div>
        {/if}
        {#if inviteData.workflow_type}
          <div>Workflow: {inviteData.workflow_type}</div>
        {/if}
        {#if inviteData.demo_duration}
          <div>Duration: {inviteData.demo_duration}</div>
        {/if}
        {#if inviteData.team_size}
          <div>Team Size: {inviteData.team_size}</div>
        {/if}
        {#if inviteData.timeline}
          <div>Timeline: {inviteData.timeline}</div>
        {/if}
        {#if inviteData.role}
          <div>Role: {inviteData.role}</div>
        {/if}
        <div>Code: <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">{inviteData.invitation_code}</code></div>
        {#if invitation.jwt_token}
          <div class="flex items-center gap-2">
            <span>Link:</span>
            <a 
              href="{baseUrl}{demoPath}?token={invitation.jwt_token}" 
              target="_blank"
              class="text-blue-600 dark:text-blue-400 hover:underline text-xs font-mono break-all"
              title="Click to open invitation link"
            >
              {baseUrl}{demoPath}?token={invitation.jwt_token}
            </a>
            <button
              on:click={() => navigator.clipboard.writeText(`${baseUrl}${demoPath}?token=${invitation.jwt_token}`)}
              class="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title="Copy link to clipboard"
            >
              📋
            </button>
          </div>
        {/if}
        {#if inviteData.request_id}
          <div>Request ID: <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">{inviteData.request_id}</code></div>
        {/if}
        <div>Created: {formatDate(inviteData.created_at)}</div>
        {#if inviteData.first_used_at}
          <div>First Used: {formatDate(inviteData.first_used_at)}</div>
        {/if}
        {#if inviteData.expires_at}
          <div>Expires: {formatDate(inviteData.expires_at)}</div>
        {/if}
        {#if inviteData.last_used_at}
          <div>Last Used: {formatDate(inviteData.last_used_at)}</div>
        {/if}
        
        <!-- Notification Queue Details -->
        {#if invitation.notification_status || invitation.delivery_methods}
          <div class="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
            <div class="font-medium text-blue-900 dark:text-blue-200 mb-1">Notification Queue</div>
            {#if invitation.delivery_methods}
              <div>Methods: {Array.isArray(invitation.delivery_methods) ? invitation.delivery_methods.join(', ') : 'none'}</div>
            {/if}
            {#if invitation.notification_attempts > 0}
              <div>Attempts: {invitation.notification_attempts}/{invitation.max_notification_attempts || 3}</div>
            {/if}
            {#if invitation.last_notification_error}
              <div class="text-red-600 dark:text-red-400">Error: {invitation.last_notification_error}</div>
            {/if}
            {#if invitation.next_notification_attempt}
              <div>Next retry: {formatDate(invitation.next_notification_attempt)}</div>
            {/if}
            {#if invitation.message_template}
              <div>Template: {invitation.message_template}</div>
            {/if}
          </div>
        {/if}
        
        <!-- Email Status Messages -->
        {#if emailSuccess}
          <div class="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
            <div class="text-green-800 dark:text-green-200 text-sm">✅ {emailSuccess}</div>
          </div>
        {/if}
        
        {#if emailError}
          <div class="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
            <div class="text-red-800 dark:text-red-200 text-sm">❌ {emailError}</div>
          </div>
        {/if}
        
        {#if inviteData.comment}
          <div class="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">
            "{inviteData.comment}"
          </div>
        {/if}
        
        <!-- JWT debug info -->
        {#if invitation.jwt_token}
          <div class="mt-2 text-xs text-blue-600 dark:text-blue-400">
            🔑 JWT token available - decoding...
          </div>
        {:else}
          <div class="mt-2 text-xs text-amber-600 dark:text-amber-400">
            ⚠️ No JWT token found for this invitation
          </div>
        {/if}
      </div>
    </div>
    
    <div class="flex gap-2 ml-4">
      <!-- Approval/Rejection Actions for requested/pending invitations -->
      {#if ['requested', 'pending'].includes(invitation.status)}
        <button
          on:click={() => dispatch('approve', { invitation })}
          class="px-3 py-1 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/40 rounded-md transition-colors"
        >
          Approve
        </button>
        <button
          on:click={() => dispatch('reject', { invitation })}
          class="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/40 rounded-md transition-colors"
        >
          Reject
        </button>
      {/if}
      
      <!-- Email Actions for approved invitations -->
      {#if invitation.status === 'approved' && invitation.jwt_token}
        <button
          on:click={handleSendEmail}
          disabled={sendingEmail}
          class="px-3 py-1 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sendingEmail ? 'Sending...' : '📧 Send Email'}
        </button>
      {/if}
      
      <!-- Resend Email for sent invitations -->
      {#if invitation.status === 'sent' && invitation.jwt_token}
        <button
          on:click={handleSendEmail}
          disabled={sendingEmail}
          class="px-3 py-1 text-sm font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:hover:bg-purple-900/40 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sendingEmail ? 'Sending...' : '🔄 Resend Email'}
        </button>
      {/if}
      
      <!-- Legacy status change actions -->
      {#if invitation.status === 'pending'}
        <button
          on:click={() => dispatch('updateStatus', { id: invitation.id, status: 'sent' })}
          class="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Mark Sent
        </button>
      {/if}
      
      {#if invitation.status !== 'expired' && invitation.status !== 'used'}
        <button
          on:click={() => dispatch('updateStatus', { id: invitation.id, status: 'expired' })}
          class="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
        >
          Expire
        </button>
      {/if}
    </div>
  </div>
</div>