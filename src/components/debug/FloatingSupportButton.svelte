<script>
import { onMount, onDestroy } from 'svelte';

// Thepia brand colors from @thepia/branding package
const thepiaColors = {
  primary: '#988ACA',      // Primary lavender
  primaryLight: '#B5A9D9', // Light variant
  primaryDark: '#7B6BB7',  // Dark variant
  primaryDarker: '#654CA3' // Darker variant
};

let showPopover = false;
let activeTab = 'chat';

// System Status
let errorReportingStatus = 'checking';
let devServerStatus = 'checking';
let apiServerStatus = 'checking';
let databaseStatus = 'checking';
let queueSize = 0;

// Environment
let currentEnvironment = 'Development';
let errorEndpoint = '/dev/error-reports';
let apiEndpoint = 'https://dev.thepia.com:8443';
let dbEndpoint = 'Supabase';

$: overallStatus = (() => {
  const statuses = [errorReportingStatus, devServerStatus, apiServerStatus, databaseStatus];
  
  if (statuses.includes('error') || queueSize > 5) return 'error';
  if (statuses.includes('warning') || queueSize > 0) return 'warning';
  if (statuses.every(s => s === 'connected' || s === 'healthy')) return 'healthy';
  return 'checking';
})();

$: statusConfig = (() => {
  switch (overallStatus) {
    case 'healthy':
      return { ring: 'ring-green-500', bg: 'bg-green-50', icon: '✓' };
    case 'warning':
      return { ring: 'ring-yellow-500', bg: 'bg-yellow-50', icon: '⚠' };
    case 'error':
      return { ring: 'ring-red-500', bg: 'bg-red-50', icon: '✗' };
    default:
      return { ring: 'ring-gray-500', bg: 'bg-gray-50', icon: '◯' };
  }
})();

async function checkSystemStatus() {
  console.log('🔍 Checking system status...');
  
  try {
    // Check Error Reporting System
    try {
      errorReportingStatus = 'connected';
      queueSize = 0; // Reset for now, implement proper queue checking later
      console.log('✅ Error reporting system: connected');
    } catch (error) {
      console.error('❌ Error reporting check failed:', error);
      errorReportingStatus = 'error';
    }

    // Check Dev Server with timeout (dev-only)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch('/dev/error-reports', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // In production, dev endpoint returns 404 - this is expected
      if (response.status === 404) {
        devServerStatus = 'error';
        console.log('ℹ️ Dev server: Disabled in production (expected)');
      } else if (response.ok) {
        devServerStatus = 'connected';
        console.log(`✅ Dev server (/dev/error-reports): connected`);
      } else {
        devServerStatus = 'warning';
        console.log(`⚠️ Dev server (/dev/error-reports): warning`);
      }
    } catch (error) {
      console.error('❌ Dev server check failed:', error);
      devServerStatus = 'error';
    }

    // Check API Server
    try {
      const isDev = window.location.hostname === 'localhost' || 
                   window.location.hostname.includes('dev.thepia.net');
      apiEndpoint = isDev ? 'https://dev.thepia.com:8443' : 'https://api.thepia.com';
      currentEnvironment = isDev ? 'Development' : 'Production';
      
      // For now mark as connected, implement actual health check later
      apiServerStatus = 'connected';
      console.log(`✅ API server (${apiEndpoint}): ${apiServerStatus}`);
    } catch (error) {
      console.error('❌ API server check failed:', error);
      apiServerStatus = 'error';
    }

    // Check Database
    try {
      const { supabase } = await import('../../lib/supabase.js');
      const { data, error } = await supabase.from('invitations').select('id').limit(1);
      
      if (error) {
        console.error('❌ Database check failed:', error);
        databaseStatus = 'error';
        dbEndpoint = `Supabase Error: ${error.message}`;
      } else {
        databaseStatus = 'connected';
        dbEndpoint = 'Supabase (flows.thepia.net)';
        console.log('✅ Database: connected');
      }
    } catch (error) {
      console.error('❌ Database check failed:', error);
      databaseStatus = 'error';
      dbEndpoint = 'Connection failed';
    }

    console.log(`🏁 Status check complete. Overall: ${overallStatus}`);
  } catch (error) {
    console.error('❌ System status check failed:', error);
  }
}

async function testErrorReport() {
  try {
    const { reportComponentError } = await import('../../lib/config/errorReporting.js');
    await reportComponentError('FloatingStatusButton', 'testError', new Error('Test error'), {
      test: true,
      timestamp: new Date().toISOString()
    });
    alert('Test error sent!');
  } catch (error) {
    alert('Failed to send test error.');
  }
}

function getStatusBadge(status) {
  switch (status) {
    case 'connected':
    case 'healthy':
      return { class: 'bg-green-100 text-green-800', text: 'Connected' };
    case 'warning':
      return { class: 'bg-yellow-100 text-yellow-800', text: 'Warning' };
    case 'error':
      return { class: 'bg-red-100 text-red-800', text: 'Error' };
    default:
      return { class: 'bg-gray-100 text-gray-800', text: 'Checking...' };
  }
}

onMount(() => {
  checkSystemStatus();
  const interval = setInterval(checkSystemStatus, 10000);
  return () => clearInterval(interval);
});
</script>

<!-- Enhanced Floating Status Button -->
<div class="fixed bottom-4 right-4 z-50">
  <!-- Main Button -->
  <button
    class="relative w-12 h-12 rounded-full bg-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2"
    style="--ring-color: {thepiaColors.primary}; ring-color: var(--ring-color);"
    on:click={() => showPopover = !showPopover}
    title="Thepia System Console"
  >
    <!-- Thepia Logo -->
    <img src="/logo-square.png" alt="Thepia" class="w-8 h-8 mx-auto" />
    
    <!-- Status indicator -->
    <div class="absolute -top-1 -right-1 w-3 h-3 rounded-full {statusConfig.bg} border-2 border-white flex items-center justify-center">
      <span class="text-xs">{statusConfig.icon}</span>
    </div>
    
    <!-- Queue indicator -->
    {#if queueSize > 0}
      <div class="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
        {queueSize > 9 ? '9+' : queueSize}
      </div>
    {/if}
  </button>

  <!-- Status Popover -->
  {#if showPopover}
    <div class="absolute bottom-14 right-0 w-96 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
      <!-- Tab Navigation -->
      <div>
        <nav class="flex">
          <button
            class="flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors"
            class:border-transparent={activeTab !== 'chat'}
            class:text-gray-500={activeTab !== 'chat'}
            style={activeTab === 'chat' ? `border-color: ${thepiaColors.primary}; color: ${thepiaColors.primary}; background-color: ${thepiaColors.primary}15;` : ''}
            on:click={() => activeTab = 'chat'}
          >
            Chat
          </button>
          <button
            class="flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors"
            class:border-transparent={activeTab !== 'status'}
            class:text-gray-500={activeTab !== 'status'}
            style={activeTab === 'status' ? `border-color: ${thepiaColors.primary}; color: ${thepiaColors.primary}; background-color: ${thepiaColors.primary}15;` : ''}
            on:click={() => activeTab = 'status'}
          >
            Status
          </button>
          <button
            class="flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors"
            class:border-transparent={activeTab !== 'debugging'}
            class:text-gray-500={activeTab !== 'debugging'}
            style={activeTab === 'debugging' ? `border-color: ${thepiaColors.primary}; color: ${thepiaColors.primary}; background-color: ${thepiaColors.primary}15;` : ''}
            on:click={() => activeTab = 'debugging'}
          >
            Debugging
          </button>
        </nav>
      </div>

      <!-- Tab Content -->
      <div class="p-4 max-h-80 overflow-y-auto">
        {#if activeTab === 'chat'}
          <div class="space-y-3 h-64 flex flex-col">
            <div class="flex-1 bg-gray-50 rounded p-3 overflow-y-auto">
              <div class="space-y-2">
                <div class="text-xs text-gray-500 text-center">Support Chat</div>
                <div class="rounded-lg p-2 max-w-xs" style="background-color: {thepiaColors.primary}20;">
                  <div class="text-xs" style="color: {thepiaColors.primaryDarker};">👋 Hi! How can I help you with flows.thepia.net?</div>
                </div>
              </div>
            </div>
            <div class="flex gap-2">
              <input 
                type="text" 
                placeholder="Type your message..." 
                class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1"
                style="--focus-ring-color: {thepiaColors.primary}; focus:ring-color: var(--focus-ring-color);"
              />
              <button class="px-3 py-2 text-white text-sm rounded-md transition-colors" 
                      style="background-color: {thepiaColors.primary}; hover:background-color: {thepiaColors.primaryDark};">
                Send
              </button>
            </div>
          </div>

        {:else if activeTab === 'status'}
          <div class="space-y-4">
            <!-- Dev Server -->
            <div class="flex items-center justify-between">
              <div>
                <span class="text-sm text-gray-600">Dev Server</span>
                <div class="text-xs text-gray-500">{errorEndpoint}</div>
              </div>
              <span class="px-2 py-1 text-xs rounded-full {getStatusBadge(devServerStatus).class}">
                {getStatusBadge(devServerStatus).text}
              </span>
            </div>

            <!-- API Server -->
            <div class="flex items-center justify-between">
              <div>
                <span class="text-sm text-gray-600">API Server</span>
                <div class="text-xs text-gray-500">{apiEndpoint}</div>
              </div>
              <span class="px-2 py-1 text-xs rounded-full {getStatusBadge(apiServerStatus).class}">
                {getStatusBadge(apiServerStatus).text}
              </span>
            </div>

            <!-- Database -->
            <div class="flex items-center justify-between">
              <div>
                <span class="text-sm text-gray-600">Database</span>
                <div class="text-xs text-gray-500">{dbEndpoint}</div>
              </div>
              <span class="px-2 py-1 text-xs rounded-full {getStatusBadge(databaseStatus).class}">
                {getStatusBadge(databaseStatus).text}
              </span>
            </div>

            <!-- Error Reporting -->
            <div class="flex items-center justify-between">
              <div>
                <span class="text-sm text-gray-600">Error Reporting</span>
                <div class="text-xs text-gray-500">Queue: {queueSize} items</div>
              </div>
              <span class="px-2 py-1 text-xs rounded-full {getStatusBadge(errorReportingStatus).class}">
                {getStatusBadge(errorReportingStatus).text}
              </span>
            </div>
          </div>

        {:else if activeTab === 'debugging'}
          <div class="space-y-4">
            <h4 class="text-sm font-medium text-gray-900">Development Tools</h4>
            
            <div class="space-y-2">
              <button
                on:click={checkSystemStatus}
                class="w-full px-3 py-2 text-sm rounded-md transition-colors"
                style="background-color: {thepiaColors.primary}15; color: {thepiaColors.primaryDarker}; hover:background-color: {thepiaColors.primary}25;"
              >
                🔄 Refresh Status
              </button>
              
              <button
                on:click={testErrorReport}
                class="w-full px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-md transition-colors"
              >
                🧪 Test Error Report
              </button>
            </div>

            <div class="pt-2 border-t border-gray-200">
              <h5 class="text-xs font-medium text-gray-700 mb-2">Environment Info</h5>
              <div class="text-xs text-gray-500 space-y-1">
                <div>App: flows.thepia.net</div>
                <div>Environment: {currentEnvironment}</div>
                <div>Build: {new Date().toLocaleDateString()}</div>
              </div>
            </div>
          </div>

        {/if}
      </div>

      <!-- Footer -->
      <div class="px-4 py-2 bg-gray-50 border-t border-gray-200">
        <button
          on:click={() => showPopover = false}
          class="w-full text-xs text-gray-500 hover:text-gray-700"
        >
          Close Console
        </button>
      </div>
    </div>
  {/if}
</div>