<script lang="ts">
import { onMount } from 'svelte';
import { reportSupabaseError } from '../../lib/config/errorReporting.js';
import { supabase } from '../../lib/supabase.js';
import { user } from '../../stores/auth.ts';
import InvitationCard from './InvitationCard.svelte';
import TabFilter from './TabFilter.svelte';

let invitations: any[] = [];
let loading = true;
let error: string | null = null;
let newInvitationEmail = '';
let creating = false;
let activeFilter = 'unresolved';

// Filter tabs configuration
const filterTabs = [
  { id: 'unresolved', name: 'Unresolved', badge: true },
  { id: 'all', name: 'All' },
  { id: 'requested', name: 'Requested', badge: true },
  { id: 'approved', name: 'Approved', badge: true },
  { id: 'rejected', name: 'Rejected' },
  { id: 'sent', name: 'Sent', badge: true },
  { id: 'expired', name: 'Expired' },
  { id: 'used', name: 'Used' },
];

// Simple filtering logic
$: filteredInvitations =
  Array.isArray(invitations) && activeFilter
    ? invitations.filter((invitation) => {
        if (!invitation || !invitation.status) return false;

        switch (activeFilter) {
          case 'unresolved':
            return invitation.status === 'requested';
          case 'all':
            return true;
          case 'requested':
            return invitation.status === 'requested';
          case 'approved':
            return invitation.status === 'approved';
          case 'rejected':
            return invitation.status === 'rejected';
          case 'sent':
            return invitation.status === 'sent';
          case 'expired':
            return invitation.status === 'expired';
          case 'used':
            return invitation.status === 'used';
          default:
            return true;
        }
      })
    : [];

onMount(() => {
  loadInvitations();
});

function getFilterCount(filterId: string) {
  if (!Array.isArray(invitations)) return 0;
  return invitations.filter((invitation) => {
    switch (filterId) {
      case 'unresolved':
        return invitation.status === 'requested';
      case 'all':
        return true;
      case 'requested':
        return invitation.status === 'requested';
      case 'approved':
        return invitation.status === 'approved';
      case 'rejected':
        return invitation.status === 'rejected';
      case 'sent':
        return invitation.status === 'sent';
      case 'expired':
        return invitation.status === 'expired';
      case 'used':
        return invitation.status === 'used';
      default:
        return false;
    }
  }).length;
}

async function loadInvitations() {
  try {
    loading = true;
    error = null;

    const { data, error: fetchError } = await supabase
      .from('invitations')
      .select(`
          *,
          jwt_token
        `)
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw new Error(fetchError.message || 'Failed to load invitations');
    }

    invitations = data || [];
    console.log('Loaded invitations:', invitations);
  } catch (err: any) {
    error = 'Failed to load invitations. Please refresh the page.';
    console.error('Error loading invitations:', err);

    await reportSupabaseError('invitations', 'select', err, {
      operation: 'loadInvitations',
      component: 'InvitationsView',
    });
  } finally {
    loading = false;
  }
}

async function createInvitation() {
  if (!newInvitationEmail || creating) return;

  try {
    creating = true;
    error = null;

    const invitationCode = crypto.randomUUID();

    const { data, error: insertError } = await supabase
      .from('invitations')
      .insert({
        email: newInvitationEmail,
        invitation_code: invitationCode,
        status: 'requested',
        request_type: 'demo_request',
        created_by: $user?.id || null,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(insertError.message || 'Failed to create invitation');
    }

    invitations = [data, ...invitations];
    newInvitationEmail = '';
  } catch (err: any) {
    error = 'Failed to create invitation. Please try again.';
    console.error('Error creating invitation:', err);

    await reportSupabaseError('invitations', 'insert', err, {
      operation: 'createInvitation',
      component: 'InvitationsView',
      email: newInvitationEmail,
    });
  } finally {
    creating = false;
  }
}

function decodeInvitationData(invitation: any) {
  let decodedData = {};

  if (invitation.jwt_token) {
    try {
      const parts = invitation.jwt_token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        decodedData = payload;
      }
    } catch (error) {
      console.warn('Failed to decode JWT token:', error);
    }
  }

  return {
    id: invitation.id,
    invitation_code: invitation.invitation_code,
    status: invitation.status,
    created_at: invitation.created_at,
    expires_at: invitation.expires_at,
    first_used_at: invitation.first_used_at,
    last_used_at: invitation.last_used_at,
    email: decodedData.email || invitation.email || 'Not available',
    name: decodedData.name || invitation.name || decodedData.firstName || 'Not available',
    company:
      decodedData.company || invitation.company || decodedData.companyName || 'Not available',
    workflow_type: invitation.workflow_type || decodedData.workflow_type || 'Unknown',
    demo_duration: invitation.demo_duration || decodedData.demo_duration || 'Unknown',
    comment: invitation.comment || decodedData.comment || null,
    priority: invitation.priority || decodedData.priority || 'normal',
    request_id: invitation.request_id || decodedData.request_id || null,
    team_size: invitation.team_size || decodedData.team_size || null,
    timeline: invitation.timeline || decodedData.timeline || null,
    role: invitation.role || decodedData.role || null,
  };
}

function handleFilterChange(event: CustomEvent<{ filterId: string }>) {
  activeFilter = event.detail.filterId;
}

async function _handleApprove(event: CustomEvent<{ invitation: any }>) {
  const invitation = event.detail.invitation;
  console.log('Approve invitation:', invitation);

  try {
    // 1. Update invitation status to approved
    const { error: updateError } = await supabase
      .from('invitations')
      .update({
        status: 'approved',
        client_data: {
          approved_by: $user?.email,
          approved_at: new Date().toISOString(),
        },
      })
      .eq('id', invitation.id);

    if (updateError) throw updateError;

    console.log('Invitation approved successfully');

    // 2. Queue notification for email delivery
    const { data: notificationResult, error: notificationError } = await supabase.rpc(
      'queue_notification',
      {
        invitation_id: invitation.id,
        template_name: 'invitation_approved',
        delivery_methods_array: ['email'],
        template_variables: {
          demo_duration: '14 days', // Default duration
          access_url: generateInvitationAccessUrl(invitation),
          admin_notes: '',
        },
        triggered_by: 'admin_approval',
      }
    );

    if (notificationError) {
      console.warn('Failed to queue notification:', notificationError);
      await reportSupabaseError('invitations', 'rpc', notificationError, {
        operation: 'queueNotification',
        component: 'InvitationsViewSimple',
        invitationId: invitation.id,
      });
    } else {
      console.log('Notification queued successfully:', notificationResult);
    }

    // 3. Update local state
    invitations = invitations.map((inv) =>
      inv.id === invitation.id ? { ...inv, status: 'approved' } : inv
    );

    console.log('Approval process completed successfully');
  } catch (err: any) {
    console.error('Error approving invitation:', err);
    error = getUserFriendlyErrorMessage(err, 'approving invitation');

    await reportSupabaseError('invitations', 'update', err, {
      operation: 'handleApprove',
      component: 'InvitationsViewSimple',
      invitationId: invitation.id,
    });
  }
}

async function _handleReject(event: CustomEvent<{ invitation: any }>) {
  const invitation = event.detail.invitation;
  console.log('Reject invitation:', invitation);

  try {
    const { error: updateError } = await supabase
      .from('invitations')
      .update({
        status: 'rejected',
        client_data: {
          rejected_by: $user?.email,
          rejected_at: new Date().toISOString(),
          rejection_reason: 'Manual rejection by admin',
        },
      })
      .eq('id', invitation.id);

    if (updateError) throw updateError;

    // Update local state
    invitations = invitations.map((inv) =>
      inv.id === invitation.id ? { ...inv, status: 'rejected' } : inv
    );

    console.log('Invitation rejected successfully');
  } catch (err: any) {
    console.error('Error rejecting invitation:', err);
    error = getUserFriendlyErrorMessage(err, 'rejecting invitation');

    await reportSupabaseError('invitations', 'update', err, {
      operation: 'handleReject',
      component: 'InvitationsViewSimple',
      invitationId: invitation.id,
    });
  }
}

async function _handleUpdateStatus(event: CustomEvent<{ id: string; status: string }>) {
  const { id, status } = event.detail;
  console.log('Update status:', { id, status });

  try {
    const { error } = await supabase.from('invitations').update({ status }).eq('id', id);

    if (error) throw error;

    // Update local state
    invitations = invitations.map((inv) => (inv.id === id ? { ...inv, status } : inv));

    console.log('Status updated successfully');
  } catch (err: any) {
    console.error('Error updating status:', err);
    error = `Failed to update status: ${err.message}`;
  }
}

// Generate invitation access URL from JWT token
function generateInvitationAccessUrl(invitation) {
  const baseUrl = window.location.origin;
  const accessToken = invitation.jwt_token || invitation.invitation_code;
  return `${baseUrl}/demo?token=${encodeURIComponent(accessToken)}`;
}

// User-friendly error message transformation
function getUserFriendlyErrorMessage(err: any, operation: string): string {
  const message = err.message || '';

  if (message.includes('permission denied') || message.includes('RLS')) {
    return 'Access denied. Please check your permissions or contact support.';
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'Network error. Please check your connection and try again.';
  }
  if (message.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }
  if (message.includes('duplicate') || message.includes('unique constraint')) {
    return 'This record already exists.';
  }

  const operationMessages = {
    'loading invitations': 'Failed to load invitations. Please refresh the page.',
    'creating invitation': 'Failed to create invitation. Please try again.',
    'approving invitation': 'Failed to approve invitation. Please try again.',
    'rejecting invitation': 'Failed to reject invitation. Please try again.',
  };

  return operationMessages[operation] || 'An error occurred. Please try again.';
}

// Status badge styling
function _getStatusBadgeClass(status: string) {
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

// Notification status badge styling
function _getNotificationStatusBadgeClass(notificationStatus: string) {
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

// Date formatting
function _formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Trigger immediate notification processing
async function triggerNotificationProcessor() {
  try {
    const { error } = await supabase.rpc('trigger_notification_processing');
    if (error) throw error;
  } catch (error) {
    console.warn('Failed to trigger notification processor:', error);
    throw error;
  }
}

// Manually trigger notification for specific invitation
async function _manuallyTriggerNotification(invitationId: string) {
  try {
    const { error } = await supabase.rpc('trigger_notification_processing', {
      invitation_id: invitationId,
      force_retry: true,
    });

    if (error) throw error;

    invitations = invitations.map((inv) =>
      inv.id === invitationId ? { ...inv, notification_status: 'pending' } : inv
    );

    await triggerNotificationProcessor();
    console.log('Manual notification trigger successful for invitation:', invitationId);
  } catch (err: any) {
    error = getUserFriendlyErrorMessage(err, 'triggering notification');
    console.error('Error manually triggering notification:', err);

    await reportSupabaseError('invitations', 'rpc', err, {
      operation: 'manuallyTriggerNotification',
      component: 'InvitationsViewSimple',
      invitationId: invitationId,
    });
  }
}

// Load notification queue statistics
async function _loadNotificationStats() {
  try {
    const { data, error } = await supabase.rpc('get_notification_stats');
    if (error) throw error;
    console.log('Notification statistics loaded:', data);
    return data;
  } catch (err: any) {
    console.error('Error loading notification stats:', err);
    await reportSupabaseError('invitations', 'rpc', err, {
      operation: 'loadNotificationStats',
      component: 'InvitationsViewSimple',
    });
  }
}

// Handle email sent from InvitationCard
async function handleEmailSent(
  event: CustomEvent<{ invitation: any; result: any; isResend?: boolean }>
) {
  const { invitation, result, isResend = false } = event.detail;
  console.log(`Email ${isResend ? 'resent' : 'sent'} for invitation:`, invitation.id, result);

  try {
    // Mark the notification as sent in the database
    if (result.success && result.messageId) {
      const { error: markSentError } = await supabase.rpc('mark_notification_sent', {
        invitation_id: invitation.id,
        delivery_method: 'email',
        service_message_id: result.messageId,
      });

      if (markSentError) {
        console.warn('Failed to mark notification as sent in database:', markSentError);
      } else {
        console.log('Notification marked as sent in database');

        // Update local state to reflect the email was sent
        invitations = invitations.map((inv) =>
          inv.id === invitation.id
            ? {
                ...inv,
                status: 'sent',
                notification_status: 'sent',
                notification_completed_at: new Date().toISOString(),
                email_sent: true,
                email_sent_at: new Date().toISOString(),
                email_id: result.messageId,
              }
            : inv
        );
      }
    }
  } catch (err: any) {
    console.error('Error updating notification status after email sent:', err);
    await reportSupabaseError('invitations', 'rpc', err, {
      operation: 'handleEmailSent',
      component: 'InvitationsViewSimple',
      invitationId: invitation.id,
    });
  }
}
</script>

<div class="max-w-6xl mx-auto p-6">
  <!-- Header -->
  <div class="mb-8">
    <h1 class="text-3xl font-serif text-gray-900 dark:text-white mb-2">
      Demo Invitations
    </h1>
    <p class="text-gray-600 dark:text-gray-400">
      Manage demo access invitations for Thepia Flows
    </p>
  </div>
  
  <!-- Create Invitation Form -->
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
    <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
      Create New Invitation
    </h2>
    
    <form on:submit|preventDefault={createInvitation} class="flex gap-4">
      <div class="flex-1">
        <input
          type="email"
          bind:value={newInvitationEmail}
          placeholder="Enter email address"
          required
          disabled={creating}
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                 dark:bg-gray-700 dark:text-white disabled:opacity-50"
        />
      </div>
      <button
        type="submit"
        disabled={creating || !newInvitationEmail}
        class="px-6 py-2 bg-primary hover:bg-primary-600 text-white font-medium 
               rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed
               focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        {creating ? 'Creating...' : 'Create Invitation'}
      </button>
    </form>
  </div>
  
  <!-- Error Message -->
  {#if error}
    <div class="mb-6 flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
      <svg class="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
      </svg>
      <p class="text-sm text-red-800 dark:text-red-300">{error}</p>
    </div>
  {/if}
  
  <!-- Filter Tabs -->
  <TabFilter
    tabs={filterTabs}
    {activeFilter}
    {getFilterCount}
    {invitations}
    on:filterChange={handleFilterChange}
  />

  <!-- Invitations List -->
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
    <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
        {filterTabs.find(tab => tab.id === activeFilter)?.name || 'All'} Invitations ({filteredInvitations.length})
      </h2>
    </div>
    
    {#if loading}
      <div class="p-8 text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p class="mt-2 text-gray-600 dark:text-gray-400">Loading invitations...</p>
      </div>
    {:else if invitations.length === 0}
      <div class="p-8 text-center">
        <p class="text-gray-600 dark:text-gray-400">No invitations created yet.</p>
      </div>
    {:else if filteredInvitations.length === 0}
      <div class="p-8 text-center">
        <p class="text-gray-600 dark:text-gray-400">No invitations match the current filter.</p>
      </div>
    {:else}
      <div class="divide-y divide-gray-200 dark:divide-gray-700">
        {#each filteredInvitations as invitation (invitation.id)}
          <InvitationCard
            {invitation}
            inviteData={decodeInvitationData(invitation)}
            on:approve={_handleApprove}
            on:reject={_handleReject}
            on:updateStatus={_handleUpdateStatus}
            on:emailSent={handleEmailSent}
          />
        {/each}
      </div>
    {/if}
  </div>
</div>