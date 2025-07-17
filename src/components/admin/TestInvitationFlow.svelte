<script lang="ts">
import { onMount } from 'svelte';
import { reportSupabaseError } from '../../lib/config/errorReporting.js';
import { supabase } from '../../lib/supabase.js';
import { user } from '../../stores/auth.ts';

let testEmail = '';
let testName = 'Test User';
let testCompany = 'Test Company';
let testWorkflowType = 'Employee Onboarding';
let testComment = 'Test request for flows demo access';
let testDemoDuration = '14_days';
let testTeamSize = '2-5';
let testTimeline = 'this_week';
let testRole = 'HR Manager';
let creating = false;
let error: string | null = null;
let success: string | null = null;
let lastCreatedRequest: any = null;

// Demo request test data templates matching FlowsDemoAccessForm
const testTemplates = [
  {
    name: 'Basic Demo Request',
    data: {
      name: 'Demo Test User',
      company: 'Test Company',
      workflowType: 'Employee Onboarding',
      comment: 'Request for flows demo access to evaluate employee onboarding workflows',
      demoDuration: '14_days',
      teamSize: '2-5',
      timeline: 'this_week',
      role: 'HR Manager',
    },
  },
  {
    name: 'Document Collection',
    data: {
      name: 'Document Test User',
      company: 'Documents Corp',
      workflowType: 'Document Collection',
      comment: 'Need to streamline document collection processes for new hires',
      demoDuration: '30_days',
      teamSize: '6-20',
      timeline: 'this_month',
      role: 'Operations Manager',
    },
  },
  {
    name: 'Custom Workflow',
    data: {
      name: 'Custom Test User',
      company: 'Custom Solutions Inc',
      workflowType: 'Custom Workflow',
      comment: 'Exploring custom workflow automation for our specific business needs',
      demoDuration: '30_days',
      teamSize: '21-50',
      timeline: 'exploring',
      role: 'IT Director',
    },
  },
];

/**
 * Generate unique test email to avoid conflicts
 */
function createTestEmail(prefix = 'test-invitation'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `hello+${prefix}-${timestamp}-${random}@thepia.net`;
}

/**
 * Apply a test template
 */
function applyTemplate(template: any) {
  testName = template.data.name;
  testCompany = template.data.company;
  testWorkflowType = template.data.workflowType;
  testComment = template.data.comment;
  testDemoDuration = template.data.demoDuration;
  testTeamSize = template.data.teamSize;
  testTimeline = template.data.timeline;
  testRole = template.data.role;
  testEmail = createTestEmail();

  success = `Applied template: ${template.name}`;
  setTimeout(() => (success = null), 3000);
}

/**
 * Detect available API server (local first, then production)
 */
async function detectApiServer(): Promise<string> {
  // Check for environment variable first
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'https://dev.thepia.com:8443';
  }

  // Try local development server first
  try {
    const localResponse = await fetch('https://dev.thepia.com:8443/health', {
      signal: AbortSignal.timeout(3000),
    });
    if (localResponse.ok) {
      console.log('🔧 Using local API server: https://dev.thepia.com:8443');
      return 'https://dev.thepia.com:8443';
    }
  } catch (error) {
    console.log('ℹ️ Local API server not available, using production');
  }

  // Fallback to production
  console.log('🌐 Using production API server: https://api.thepia.com');
  return 'https://api.thepia.com';
}

/**
 * Simulate demo request form submission
 * This creates a request that looks like it came from the thepia.com demo form
 */
async function simulateDemoRequest() {
  if (!testEmail || creating) return;

  try {
    creating = true;
    error = null;
    success = null;

    // Validate test email pattern
    const emailLower = testEmail.toLowerCase();
    const hasValidDomain = emailLower.endsWith('@thepia.net');

    if (!hasValidDomain) {
      throw new Error(
        'Please use test email patterns (test-*@thepia.net or hello+*@thepia.net) to avoid affecting production data'
      );
    }

    // Check for valid prefixes more precisely
    const localPart = emailLower.split('@')[0];
    const hasValidPrefix = localPart.includes('test-') || localPart.includes('hello+');

    // Additional validation: ensure the prefix is not just at the end
    const hasProperTestPrefix =
      localPart.includes('test-') && localPart.indexOf('test-') < localPart.length - 5;
    const hasProperHelloPrefix =
      localPart.includes('hello+') && localPart.indexOf('hello+') < localPart.length - 6;

    if (!hasValidPrefix || (!hasProperTestPrefix && !hasProperHelloPrefix)) {
      throw new Error(
        'Please use test email patterns (test-*@thepia.net or hello+*@thepia.net) to avoid affecting production data'
      );
    }

    console.log('🧪 Simulating demo request submission...', {
      name: testName,
      email: testEmail,
      company: testCompany,
      workflowType: testWorkflowType,
      comment: testComment,
    });

    // Detect and use appropriate API server
    const apiBaseUrl = await detectApiServer();

    const requestPayload = {
      name: testName,
      email: testEmail,
      company: testCompany,
      workflowType: testWorkflowType,
      comment: testComment,
      demoDuration: testDemoDuration,
      teamSize: testTeamSize,
      timeline: testTimeline,
      role: testRole,
      // Additional fields to match FlowsDemoAccessForm
      clientId: '453a82ec-c5b7-48c9-8244-4c978b9c7e11', // Hygge & Hvidløg client UUID
      appId: '83ba72e5-5ede-4917-bbfd-3aeb53e13096', // Employee onboarding app UUID
      source: 'admin_test_simulation',
    };

    console.log('📤 Sending demo request to:', `${apiBaseUrl}/api/inquiries`);
    console.log('📋 Request payload:', requestPayload);

    const response = await fetch(`${apiBaseUrl}/api/inquiries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(requestPayload),
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    console.log('📥 Response status:', response.status, response.statusText);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (jsonError) {
        // If response isn't JSON, get text
        try {
          const errorText = await response.text();
          throw new Error(
            `Demo request failed: ${response.status} - ${errorText || response.statusText}`
          );
        } catch (textError) {
          throw new Error(
            `Demo request failed: ${response.status} - ${response.statusText} (no response body)`
          );
        }
      }

      console.error('❌ Demo request error:', errorData);
      throw new Error(
        `Demo request failed: ${response.status} - ${errorData.message || errorData.error || response.statusText}`
      );
    }

    const result = await response.json();
    console.log('✅ Demo request result:', result);

    console.log('✅ Demo request submitted successfully:', result);

    lastCreatedRequest = {
      requestId: result.requestId,
      email: testEmail,
      name: testName,
      company: testCompany,
      type: result.type,
      submittedAt: new Date().toISOString(),
    };

    success = `Demo request created successfully! Request ID: ${result.requestId}`;

    // Check if this created an invitation in our database
    setTimeout(async () => {
      await checkForCreatedInvitation(testEmail);
    }, 2000);
  } catch (err: any) {
    error = err.message || 'Failed to simulate demo request';
    console.error('Error simulating demo request:', err);

    await reportSupabaseError('test_demo_requests', 'simulate', err, {
      operation: 'simulateDemoRequest',
      component: 'TestInvitationFlow',
      email: testEmail,
    });
  } finally {
    creating = false;
  }
}

/**
 * Check if the demo request created an invitation in our database
 */
async function checkForCreatedInvitation(email: string) {
  try {
    // First, let's check what columns are available by getting recent invitations
    const { data: recentInvitations, error: schemaError } = await supabase
      .from('invitations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (schemaError) {
      console.warn('Failed to check invitation schema:', schemaError);
      return;
    }

    if (recentInvitations && recentInvitations.length > 0) {
      console.log('📋 Available invitation columns:', Object.keys(recentInvitations[0]));
    }

    // Try to find invitation by checking if email is stored in jwt_token or other fields
    const { data: allInvitations, error: fetchError } = await supabase
      .from('invitations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10); // Get recent invitations to search through

    if (fetchError) {
      console.warn('Failed to check for created invitation:', fetchError);
      return;
    }

    if (allInvitations && allInvitations.length > 0) {
      // Look for invitation that matches our email in various possible fields
      const matchingInvitation = allInvitations.find((inv) => {
        // Check direct email field (if it exists)
        if (inv.email && inv.email === email) return true;

        // Check if email is in JWT token
        if (inv.jwt_token) {
          try {
            const parts = inv.jwt_token.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1]));
              if (payload.email === email) return true;
            }
          } catch (e) {
            // JWT decode failed, continue
          }
        }

        // Check if created recently (last 30 seconds) as a fallback
        const invitationTime = new Date(inv.created_at).getTime();
        const now = Date.now();
        if (now - invitationTime < 30000) {
          console.log('📋 Found recent invitation (potential match):', inv);
          return true;
        }

        return false;
      });

      if (matchingInvitation) {
        success = `Demo request created invitation! Status: ${matchingInvitation.status}, ID: ${matchingInvitation.id}`;
        lastCreatedRequest = {
          ...lastCreatedRequest,
          invitationId: matchingInvitation.id,
          invitationStatus: matchingInvitation.status,
        };
        console.log('✅ Found matching invitation:', matchingInvitation);
      } else {
        console.log('ℹ️ No matching invitation found for email:', email);
        console.log('📋 Recent invitations checked:', allInvitations.length);
      }
    }
  } catch (err) {
    console.warn('Error checking for invitation:', err);
  }
}

/**
 * Generate a fresh test email
 */
function generateTestEmail() {
  testEmail = createTestEmail();
}

onMount(() => {
  // Initialize with a test email
  generateTestEmail();
});
</script>

<div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
  <div class="flex items-center gap-3 mb-6">
    <div class="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
      <svg class="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
      </svg>
    </div>
    <div>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Test Invitation Flow</h3>
      <p class="text-sm text-gray-600 dark:text-gray-400">Simulate complete demo request → approval → invitation flow</p>
    </div>
  </div>

  <!-- Success Message -->
  {#if success}
    <div class="mb-6 flex items-start gap-2 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
      <svg class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
      </svg>
      <div class="text-sm text-green-700 dark:text-green-300">
        {success}
      </div>
    </div>
  {/if}

  <!-- Error Message -->
  {#if error}
    <div class="mb-6 flex items-start gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
      <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
      </svg>
      <div class="text-sm text-red-700 dark:text-red-300">
        {error}
      </div>
    </div>
  {/if}

  <!-- Test Templates -->
  <div class="mb-6">
    <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">Quick Templates</h4>
    <div class="flex flex-wrap gap-2">
      {#each testTemplates as template}
        <button
          type="button"
          on:click={() => applyTemplate(template)}
          disabled={creating}
          class="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 
                 dark:text-purple-300 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 
                 rounded-md transition-colors disabled:opacity-50"
        >
          {template.name}
        </button>
      {/each}
    </div>
  </div>

  <!-- Demo Request Form -->
  <form on:submit|preventDefault={simulateDemoRequest} class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label for="testEmail" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Test Email
        </label>
        <div class="flex gap-2">
          <input
            id="testEmail"
            type="email"
            bind:value={testEmail}
            placeholder="hello+test-invitation-xxx@thepia.net"
            required
            disabled={creating}
            class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                   focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                   dark:bg-gray-700 dark:text-white disabled:opacity-50 text-sm"
          />
          <button
            type="button"
            on:click={generateTestEmail}
            disabled={creating}
            class="px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 
                   dark:text-gray-400 dark:hover:text-gray-200 border border-gray-300 
                   dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 
                   transition-colors disabled:opacity-50"
            title="Generate new test email"
          >
            🔄
          </button>
        </div>
      </div>

      <div>
        <label for="testName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Name
        </label>
        <input
          id="testName"
          type="text"
          bind:value={testName}
          placeholder="Test User"
          required
          disabled={creating}
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                 dark:bg-gray-700 dark:text-white disabled:opacity-50 text-sm"
        />
      </div>

      <div>
        <label for="testCompany" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Company
        </label>
        <input
          id="testCompany"
          type="text"
          bind:value={testCompany}
          placeholder="Test Company"
          required
          disabled={creating}
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                 dark:bg-gray-700 dark:text-white disabled:opacity-50 text-sm"
        />
      </div>

      <div>
        <label for="testWorkflowType" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Primary Workflow Interest
        </label>
        <input
          id="testWorkflowType"
          type="text"
          bind:value={testWorkflowType}
          placeholder="e.g., Employee Onboarding, Document Collection, Custom Workflow..."
          required
          disabled={creating}
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                 dark:bg-gray-700 dark:text-white disabled:opacity-50 text-sm"
        />
      </div>

      <div>
        <label for="testDemoDuration" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Demo Duration
        </label>
        <select
          id="testDemoDuration"
          bind:value={testDemoDuration}
          disabled={creating}
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                 dark:bg-gray-700 dark:text-white disabled:opacity-50 text-sm"
        >
          <option value="7_days">1 week (quick evaluation)</option>
          <option value="14_days">2 weeks (standard demo)</option>
          <option value="30_days">30 days (thorough evaluation)</option>
          <option value="ongoing">Ongoing (internal/partner)</option>
        </select>
      </div>

      <div>
        <label for="testTeamSize" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Expected Team Size
        </label>
        <select
          id="testTeamSize"
          bind:value={testTeamSize}
          disabled={creating}
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                 dark:bg-gray-700 dark:text-white disabled:opacity-50 text-sm"
        >
          <option value="">Select team size (optional)</option>
          <option value="1">Just me</option>
          <option value="2-5">2-5 people</option>
          <option value="6-20">6-20 people</option>
          <option value="21-50">21-50 people</option>
          <option value="50+">50+ people</option>
        </select>
      </div>

      <div>
        <label for="testTimeline" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Timeline
        </label>
        <select
          id="testTimeline"
          bind:value={testTimeline}
          disabled={creating}
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                 dark:bg-gray-700 dark:text-white disabled:opacity-50 text-sm"
        >
          <option value="asap">ASAP (next few days)</option>
          <option value="this_week">This week</option>
          <option value="this_month">This month</option>
          <option value="exploring">Just exploring</option>
        </select>
      </div>

      <div>
        <label for="testRole" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Your Role
        </label>
        <input
          id="testRole"
          type="text"
          bind:value={testRole}
          placeholder="e.g., HR Manager, IT Director, Operations Lead"
          disabled={creating}
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                 dark:bg-gray-700 dark:text-white disabled:opacity-50 text-sm"
        />
      </div>
    </div>

    <div>
      <label for="testComment" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Additional Comments
      </label>
      <textarea
        id="testComment"
        bind:value={testComment}
        placeholder="Tell us more about your specific needs or use case (optional)"
        rows="3"
        disabled={creating}
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
               focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
               dark:bg-gray-700 dark:text-white disabled:opacity-50 text-sm resize-none"
      ></textarea>
    </div>

    <div class="flex justify-between items-center pt-4">
      <div class="text-xs text-gray-500 dark:text-gray-400">
        ⚠️ Only affects test-pattern emails (test-*@thepia.net or hello+*@thepia.net) to avoid production impact
      </div>
      <button
        type="submit"
        disabled={creating || !testEmail}
        class="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium 
               rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed
               focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2"
      >
        {creating ? 'Simulating...' : 'Simulate Demo Request'}
      </button>
    </div>
  </form>

  <!-- Last Created Request Info -->
  {#if lastCreatedRequest}
    <div class="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-md">
      <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-2">Last Created Request</h4>
      <div class="text-xs text-gray-600 dark:text-gray-400 space-y-1">
        <div><strong>Request ID:</strong> {lastCreatedRequest.requestId}</div>
        <div><strong>Email:</strong> {lastCreatedRequest.email}</div>
        <div><strong>Type:</strong> {lastCreatedRequest.type}</div>
        {#if lastCreatedRequest.invitationId}
          <div><strong>Invitation ID:</strong> {lastCreatedRequest.invitationId}</div>
          <div><strong>Status:</strong> {lastCreatedRequest.invitationStatus}</div>
        {/if}
        <div><strong>Created:</strong> {new Date(lastCreatedRequest.submittedAt).toLocaleString()}</div>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Custom styles for better visual hierarchy */
  .text-primary {
    color: rgb(147, 51, 234); /* purple-600 */
  }
  
  .border-primary {
    border-color: rgb(147, 51, 234);
  }
  
  .ring-primary {
    --tw-ring-color: rgb(147, 51, 234);
  }
  
  .bg-primary {
    background-color: rgb(147, 51, 234);
  }
  
  .bg-primary-600 {
    background-color: rgb(126, 34, 206); /* purple-700 */
  }
</style>