<script lang="ts">
import { createEventDispatcher } from 'svelte';

export let tabs: Array<{id: string, name: string, badge?: boolean}> = [];
export let activeFilter: string = '';
export let getFilterCount: (filterId: string) => number;
export let invitations: any[] = []; // Add this to trigger reactivity

const dispatch = createEventDispatcher<{
  filterChange: { filterId: string }
}>();

// Create reactive counts based on invitations array
$: counts = invitations.length >= 0 ? tabs.reduce((acc, tab) => {
  const count = getFilterCount(tab.id);
  console.log(`Tab ${tab.id} has ${count} items`);
  acc[tab.id] = count;
  return acc;
}, {} as Record<string, number>) : {};

$: console.log('TabFilter counts:', counts, 'invitations length:', invitations.length);

function handleTabClick(tabId: string) {
  dispatch('filterChange', { filterId: tabId });
}
</script>

<div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
  <div class="border-b border-gray-200 dark:border-gray-700">
    <nav class="flex space-x-8 px-6" aria-label="Tabs">
      {#each tabs as tab}
        <button
          type="button"
          on:click={() => handleTabClick(tab.id)}
          class="py-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
            {activeFilter === tab.id 
              ? 'border-blue-500 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }"
        >
          {tab.name}
          {#if tab.badge}
            {#if counts[tab.id] !== undefined}
              <span class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                {activeFilter === tab.id
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-300'
                }">
                {counts[tab.id] || 0}
              </span>
            {:else}
              <span class="ml-2 text-xs text-red-500">?</span>
            {/if}
          {/if}
        </button>
      {/each}
    </nav>
  </div>
</div>