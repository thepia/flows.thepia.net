<script lang="ts">
import { onMount } from 'svelte';
import { reportSupabaseError } from '../../lib/config/errorReporting.js';
import { supabase } from '../../lib/supabase.js';
import { user } from '../../stores/auth.ts';
import TabFilter from './TabFilter.svelte';
import InvitationCard from './InvitationCard.svelte';

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
  { id: 'pending', name: 'Pending', badge: true },
  { id: 'approved', name: 'Approved' },
  { id: 'rejected', name: 'Rejected' },
  { id: 'sent', name: 'Sent' },
  { id: 'expired', name: 'Expired' },
  { id: 'used', name: 'Used' },
];

// Simple filtering logic
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

onMount(() => {
  loadInvitations();
});

function getFilterCount(filterId: string) {
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
    company: decodedData.company || invitation.company || decodedData.companyName || 'Not available',
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

function handleApprove(event: CustomEvent<{ invitation: any }>) {
  console.log('Approve invitation:', event.detail.invitation);
  // TODO: Implement approval logic
}

function handleReject(event: CustomEvent<{ invitation: any }>) {
  console.log('Reject invitation:', event.detail.invitation);
  // TODO: Implement rejection logic
}

function handleUpdateStatus(event: CustomEvent<{ id: string, status: string }>) {
  console.log('Update status:', event.detail);
  // TODO: Implement status update logic
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
            on:approve={handleApprove}
            on:reject={handleReject}
            on:updateStatus={handleUpdateStatus}
          />
        {/each}
      </div>
    {/if}
  </div>
</div>