<script lang="ts">
import { onMount } from 'svelte';
import { reportComponentError, reportSupabaseError } from '../../lib/config/errorReporting.js';
import { supabase } from '../../lib/supabase.js';
import { user } from '../../stores/auth.ts';

let invitations: any[] = [];
let _loading = true;
let _error: string | null = null;
let newInvitationEmail = '';
let creating = false;

// Filtering and approval state
let activeFilter = 'unresolved';
let _showApprovalModal = false;
let _showRejectionModal = false;
let selectedInvitation = null;
let approvalData = {
  demo_client: 'default',
  apps: ['flows-main'],
  demo_duration: '14_days',
  notes: '',
};
let rejectionReason = '';

// Demo configuration (would eventually come from API)
const _availableClients = [
  { id: 'default', name: 'Default Demo Client', description: 'Standard demo environment' },
  { id: 'enterprise', name: 'Enterprise Demo', description: 'Full feature enterprise demo' },
];

const _availableApps = [
  { id: 'flows-main', name: 'Thepia Flows', description: 'Main workflow application' },
  { id: 'flows-admin', name: 'Admin Portal', description: 'Administrative interface' },
  {
    id: 'flows-analytics',
    name: 'Analytics Dashboard',
    description: 'Usage analytics and reporting',
  },
];

// Load invitations on mount
onMount(() => {
  loadInvitations();
});

// User-friendly error message transformation
function getUserFriendlyErrorMessage(err: any, operation: string): string {
  const message = err.message || '';

  // Handle specific database/API errors
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

  // Generic fallback based on operation
  const operationMessages = {
    'loading invitations': 'Failed to load invitations. Please refresh the page.',
    'creating invitation': 'Failed to create invitation. Please try again.',
    'updating invitation': 'Failed to update invitation. Please try again.',
    'approving invitation': 'Failed to approve invitation. Please try again.',
    'rejecting invitation': 'Failed to reject invitation. Please try again.',
  };

  return operationMessages[operation] || 'An error occurred. Please try again.';
}

async function loadInvitations() {
  try {
    _loading = true;
    _error = null;

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
    console.log('Loaded invitations with JWT tokens:', invitations);
  } catch (err: any) {
    _error = getUserFriendlyErrorMessage(err, 'loading invitations');
    console.error('Error loading invitations:', err);

    // Report error to dev server
    await reportSupabaseError('invitations', 'select', err, {
      operation: 'loadInvitations',
      component: 'InvitationsView',
    });
  } finally {
    _loading = false;
  }
}

async function createInvitation() {
  if (!newInvitationEmail || creating) return;

  try {
    creating = true;
    _error = null;

    // Generate invitation code
    const invitationCode = crypto.randomUUID();

    const { data, error: insertError } = await supabase
      .from('invitations')
      .insert({
        email: newInvitationEmail,
        invitation_code: invitationCode,
        status: 'requested',
        request_type: 'demo_request',
        created_by: $user?.id,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(insertError.message || 'Failed to create invitation');
    }

    // Add to local state
    invitations = [data, ...invitations];
    newInvitationEmail = '';
  } catch (err: any) {
    _error = getUserFriendlyErrorMessage(err, 'creating invitation');
    console.error('Error creating invitation:', err);

    // Report error to dev server
    await reportSupabaseError('invitations', 'insert', err, {
      operation: 'createInvitation',
      component: 'InvitationsView',
      email: newInvitationEmail,
    });
  } finally {
    creating = false;
  }
}

async function updateInvitationStatus(id, newStatus) {
  try {
    const { error: updateError } = await supabase
      .from('invitations')
      .update({ status: newStatus })
      .eq('id', id);

    if (updateError) throw updateError;

    // Update local state
    invitations = invitations.map((inv) => (inv.id === id ? { ...inv, status: newStatus } : inv));
  } catch (err) {
    _error = err.message || 'Failed to update invitation';
  }
}

function getStatusBadgeClass(status) {
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

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Function to decode JWT token and extract invitation data
function decodeInvitationData(invitation) {
  let decodedData = {};

  // Try to decode the JWT token if it exists
  if (invitation.jwt_token) {
    try {
      // JWT tokens have 3 parts separated by dots: header.payload.signature
      const parts = invitation.jwt_token.split('.');
      if (parts.length === 3) {
        // Decode the payload (second part)
        const payload = JSON.parse(atob(parts[1]));
        decodedData = payload;
      }
    } catch (error) {
      console.warn('Failed to decode JWT token:', error);
    }
  }

  return {
    // Use database fields first, then JWT payload as fallback
    id: invitation.id,
    invitation_code: invitation.invitation_code,
    status: invitation.status,
    created_at: invitation.created_at,
    expires_at: invitation.expires_at,
    first_used_at: invitation.first_used_at,
    last_used_at: invitation.last_used_at,

    // Try to get from JWT payload or database fields
    email: decodedData.email || invitation.email || 'Not available',
    name: decodedData.name || invitation.name || decodedData.firstName || 'Not available',
    company:
      decodedData.company || invitation.company || decodedData.companyName || 'Not available',
    workflow_type:
      invitation.workflow_type ||
      decodedData.workflow_type ||
      getWorkflowFromCode(invitation.invitation_code),
    demo_duration:
      invitation.demo_duration ||
      decodedData.demo_duration ||
      getDurationFromCode(invitation.invitation_code),
    comment: invitation.comment || decodedData.comment || null,
    priority: invitation.priority || decodedData.priority || 'normal',
    request_id: invitation.request_id || decodedData.request_id || null,
    team_size: invitation.team_size || decodedData.team_size || null,
    timeline: invitation.timeline || decodedData.timeline || null,
    role: invitation.role || decodedData.role || null,
  };
}

// Extract workflow type from invitation code pattern
function getWorkflowFromCode(code) {
  if (code?.includes('OFFBOARDING')) return 'Offboarding';
  if (code?.includes('ONBOARDING')) return 'Onboarding';
  if (code?.includes('DEMO')) return 'Demo';
  return 'Unknown';
}

// Extract duration from invitation code or use default
function getDurationFromCode(code) {
  // This is a guess based on the pattern you showed
  if (code?.includes('OFFBOARDING')) return '14_days';
  if (code?.includes('DEMO')) return '7_days';
  return 'Unknown';
}

// Filtering logic
$: filteredInvitations = Array.isArray(invitations) && activeFilter
  ? invitations.filter((invitation) => {
      if (!invitation || !invitation.status) return false;

      switch (activeFilter) {
        case 'unresolved':
          return ['requested', 'pending'].includes(invitation.status);
        case 'all':
          return true;
        case 'pending':
          return invitation.status === 'pending';
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

// Filter tabs configuration
const _filterTabs = [
  { id: 'unresolved', name: 'Unresolved', badge: true },
  { id: 'all', name: 'All' },
  { id: 'requested', name: 'Requested', badge: true },
  { id: 'pending', name: 'Pending', badge: true },
  { id: 'approved', name: 'Approved' },
  { id: 'rejected', name: 'Rejected' },
  { id: 'sent', name: 'Sent' },
  { id: 'expired', name: 'Expired' },
  { id: 'used', name: 'Used' },
];

function getFilterCount(filterId) {
  if (!Array.isArray(invitations)) return 0;
  return invitations.filter((invitation) => {
    switch (filterId) {
      case 'unresolved':
        return ['requested', 'pending'].includes(invitation.status);
      case 'all':
        return true;
      case 'requested':
        return invitation.status === 'requested';
      case 'pending':
        return invitation.status === 'pending';
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

// Approval workflow functions
function openApprovalModal(invitation) {
  selectedInvitation = invitation;
  approvalData = {
    demo_client: 'default',
    apps: ['flows-main'],
    demo_duration: '14_days',
    notes: '',
  };
  _showApprovalModal = true;
}

function openRejectionModal(invitation) {
  selectedInvitation = invitation;
  rejectionReason = '';
  _showRejectionModal = true;
}

async function approveInvitation() {
  if (!selectedInvitation) return;

  try {
    const { error: updateError } = await supabase
      .from('invitations')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        demo_duration: approvalData.demo_duration,
        comment: approvalData.notes,
        // Store approval metadata
        client_data: {
          demo_client: approvalData.demo_client,
          approved_apps: approvalData.apps,
          approved_by: $user?.email,
          approved_at: new Date().toISOString(),
        },
      })
      .eq('id', selectedInvitation.id);

    if (updateError) throw updateError;

    // Update local state
    invitations = invitations.map((inv) =>
      inv.id === selectedInvitation.id
        ? { ...inv, status: 'approved', approved_at: new Date().toISOString() }
        : inv
    );

    closeApprovalModal();
  } catch (err: any) {
    _error = getUserFriendlyErrorMessage(err, 'approving invitation');
    console.error('Error approving invitation:', err);

    // Report error to dev server
    await reportSupabaseError('invitations', 'update', err, {
      operation: 'approveInvitation',
      component: 'InvitationsView',
      invitationId: selectedInvitation.id,
    });
  }
}

async function rejectInvitation() {
  if (!selectedInvitation) return;

  try {
    const { error: updateError } = await supabase
      .from('invitations')
      .update({
        status: 'rejected',
        comment: rejectionReason,
        client_data: {
          rejected_by: $user?.email,
          rejected_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        },
      })
      .eq('id', selectedInvitation.id);

    if (updateError) throw updateError;

    // Update local state
    invitations = invitations.map((inv) =>
      inv.id === selectedInvitation.id ? { ...inv, status: 'rejected' } : inv
    );

    closeRejectionModal();
  } catch (err: any) {
    _error = getUserFriendlyErrorMessage(err, 'rejecting invitation');
    console.error('Error rejecting invitation:', err);

    // Report error to dev server
    await reportSupabaseError('invitations', 'update', err, {
      operation: 'rejectInvitation',
      component: 'InvitationsView',
      invitationId: selectedInvitation.id,
    });
  }
}

function closeApprovalModal() {
  _showApprovalModal = false;
  selectedInvitation = null;
}

function closeRejectionModal() {
  _showRejectionModal = false;
  selectedInvitation = null;
  rejectionReason = '';
}

// Handle tab click with error reporting
async function handleTabClick(tabId: string) {
  try {
    console.log('Tab clicked:', tabId, 'Current filter:', activeFilter);
    activeFilter = tabId;
  } catch (err) {
    console.error('Error changing filter tab:', err);
    await reportComponentError('InvitationsView', 'changeFilterTab', err, {
      newFilter: tabId,
      currentFilter: activeFilter
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
  {#if _error}
    <div class="mb-6 flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
      <svg class="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
      </svg>
      <p class="text-sm text-red-800 dark:text-red-300">{_error}</p>
    </div>
  {/if}
  
  <!-- Filter Tabs -->
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
    <div class="border-b border-gray-200 dark:border-gray-700">
      <nav class="flex space-x-8 px-6" aria-label="Tabs">
        {#each _filterTabs as tab}
          <button
            type="button"
            on:click|preventDefault={() => handleTabClick(tab.id)}
            class="py-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
              {activeFilter === tab.id 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }"
          >
            {tab.name}
            {#if tab.badge}
              {#each [getFilterCount(tab.id)] as count}
                {#if count > 0}
                  <span class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    {activeFilter === tab.id
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-300'
                    }">
                    {count}
                  </span>
                {/if}
              {/each}
            {/if}
          </button>
        {/each}
      </nav>
    </div>
  </div>

  <!-- Invitations List -->
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
    <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
        {_filterTabs.find(tab => tab.id === activeFilter)?.name || 'All'} Invitations ({filteredInvitations.length})
      </h2>
    </div>
    
    {#if _loading}
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
        {#each filteredInvitations as invitation}
          {#each [decodeInvitationData(invitation)] as inviteData}
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
                    on:click={() => openApprovalModal(invitation)}
                    class="px-3 py-1 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/40 rounded-md transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    on:click={() => openRejectionModal(invitation)}
                    class="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/40 rounded-md transition-colors"
                  >
                    Reject
                  </button>
                {/if}
                
                <!-- Legacy status change actions -->
                {#if invitation.status === 'pending'}
                  <button
                    on:click={() => updateInvitationStatus(invitation.id, 'sent')}
                    class="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Mark Sent
                  </button>
                {/if}
                
                {#if invitation.status !== 'expired' && invitation.status !== 'used'}
                  <button
                    on:click={() => updateInvitationStatus(invitation.id, 'expired')}
                    class="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Expire
                  </button>
                {/if}
              </div>
            </div>
          </div>
          {/each}
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- Approval Modal -->
{#if _showApprovalModal && selectedInvitation}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
      <div class="p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Approve Demo Request
        </h3>
        
        <div class="space-y-4">
          <div>
            <label for="demo-client-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Demo Client
            </label>
            <select 
              id="demo-client-select"
              bind:value={approvalData.demo_client}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            >
              {#each _availableClients as client}
                <option value={client.id}>{client.name}</option>
              {/each}
            </select>
          </div>
          
          <fieldset>
            <legend class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Available Apps
            </legend>
            <div class="space-y-2">
              {#each _availableApps as app}
                <label class="flex items-center">
                  <input 
                    type="checkbox" 
                    bind:group={approvalData.apps} 
                    value={app.id}
                    class="mr-2"
                  />
                  <span class="text-sm text-gray-700 dark:text-gray-300">{app.name}</span>
                </label>
              {/each}
            </div>
          </fieldset>
          
          <div>
            <label for="demo-duration-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Demo Duration
            </label>
            <select 
              id="demo-duration-select"
              bind:value={approvalData.demo_duration}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            >
              <option value="7_days">7 days</option>
              <option value="14_days">14 days</option>
              <option value="30_days">30 days</option>
            </select>
          </div>
          
          <div>
            <label for="approval-notes" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea 
              id="approval-notes"
              bind:value={approvalData.notes}
              placeholder="Optional approval notes..."
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              rows="3"
            ></textarea>
          </div>
        </div>
        
        <div class="flex justify-end gap-3 mt-6">
          <button
            on:click={closeApprovalModal}
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            on:click={approveInvitation}
            class="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
          >
            Approve Demo
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Rejection Modal -->
{#if _showRejectionModal && selectedInvitation}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
      <div class="p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Reject Demo Request
        </h3>
        
        <div class="space-y-4">
          <div>
            <label for="rejection-reason" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rejection Reason
            </label>
            <textarea 
              id="rejection-reason"
              bind:value={rejectionReason}
              placeholder="Please provide a reason for rejection..."
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              rows="4"
              required
            ></textarea>
          </div>
        </div>
        
        <div class="flex justify-end gap-3 mt-6">
          <button
            on:click={closeRejectionModal}
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            on:click={rejectInvitation}
            disabled={!rejectionReason.trim()}
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
          >
            Reject Request
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}