<script lang="ts">
import { createEventDispatcher } from 'svelte';

export let invitation: any;
export let inviteData: any;

const dispatch = createEventDispatcher<{
  approve: { invitation: any },
  reject: { invitation: any },
  updateStatus: { id: string, status: string }
}>();

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