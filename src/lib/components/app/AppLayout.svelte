<script lang="ts">
import { onMount } from 'svelte';
import { writable } from 'svelte/store';

// Browser detection for Astro
const browser = typeof window !== 'undefined';
import { thepiaColors } from '@thepia/branding';
import { List, X, Gear, SignOut, User, Buildings, CaretLeft, CaretRight } from 'phosphor-svelte';
import { cn } from '../../utils';
import Button from '../ui/button/button.svelte';
import Card from '../ui/card/card.svelte';
import CardContent from '../ui/card/card-content.svelte';
import CardDescription from '../ui/card/card-description.svelte';
import CardHeader from '../ui/card/card-header.svelte';
import CardTitle from '../ui/card/card-title.svelte';
import Badge from '../ui/badge/badge.svelte';
import Separator from '../ui/separator/separator.svelte';
import { reportSupabaseError } from '../../config/errorReporting.js';

export let currentUser: any;
export let clientId: string = '';
export let userRole: 'admin' | 'manager' | 'employee' = 'employee';

// Sidebar state
let sidebarOpen = writable(userRole === 'admin' || userRole === 'manager');
let sidebarCollapsed = writable(userRole === 'employee');
let mobileMenuOpen = writable(false);

// Current client information
let currentClient: any = null;
let loading = false;
let error: string | null = null;

// Navigation items based on user role
$: navigationItems = getNavigationItems(userRole);

function getNavigationItems(role: string) {
  const baseItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/dashboard' },
    { id: 'tasks', label: 'Tasks', icon: '📋', path: '/tasks' },
    { id: 'people', label: 'People', icon: '👥', path: '/people' },
  ];

  if (role === 'admin' || role === 'manager') {
    return [
      ...baseItems,
      { id: 'reports', label: 'Reports', icon: '📈', path: '/reports' },
      { id: 'settings', label: 'Settings', icon: '⚙️', path: '/settings' },
    ];
  }

  return baseItems;
}

// Load client information
onMount(async () => {
  if (!browser || !clientId) return;

  try {
    loading = true;
    error = null;

    // Import supabase client
    const { supabase } = await import('../../supabase.js');

    // Get client information
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError) throw clientError;
    currentClient = client;

    console.log('Client loaded:', currentClient);
  } catch (err) {
    console.error('Error loading client:', err);
    error = err.message || 'Failed to load client information';
    
    await reportSupabaseError('app', 'load_client', err, {
      operation: 'loadClient',
      component: 'AppLayout',
      clientId,
      userEmail: currentUser?.email,
    });
  } finally {
    loading = false;
  }
});

// Toggle sidebar
function toggleSidebar() {
  sidebarOpen.update(open => !open);
}

// Toggle sidebar collapsed state
function toggleSidebarCollapsed() {
  sidebarCollapsed.update(collapsed => !collapsed);
}

// Toggle mobile menu
function toggleMobileMenu() {
  mobileMenuOpen.update(open => !open);
}

// Handle navigation
function handleNavigation(item: any) {
  console.log('Navigate to:', item.path);
  // Close mobile menu on navigation
  mobileMenuOpen.set(false);
  // TODO: Implement navigation logic
}

// Sign out
function handleSignOut() {
  // Dispatch sign out event to parent
  const event = new CustomEvent('signOut');
  window.dispatchEvent(event);
}

// Get client tier badge variant
function getClientTierBadge(tier: string) {
  switch (tier) {
    case 'enterprise':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
    case 'pro':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
    case 'basic':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
  }
}

// Get client status badge variant
function getClientStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
    case 'trial':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
    case 'suspended':
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
  }
}
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
  <!-- Mobile menu overlay -->
  {#if $mobileMenuOpen}
    <div 
      class="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
      on:click={toggleMobileMenu}
      on:keydown={(e) => e.key === 'Escape' && toggleMobileMenu()}
      role="button"
      tabindex="0"
    ></div>
  {/if}

  <!-- Sidebar -->
  <div class={cn(
    "fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out",
    $sidebarCollapsed ? "w-16" : "w-64",
    $mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
  )}>
    <!-- Sidebar Header -->
    <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
      {#if !$sidebarCollapsed}
        <div class="flex items-center gap-3">
          <img src="/favicon.svg" alt="Thepia" class="w-8 h-8" />
          <h1 class="text-lg font-semibold text-gray-900 dark:text-white">
            Thepia Flows
          </h1>
        </div>
      {:else}
        <img src="/favicon.svg" alt="Thepia" class="w-8 h-8 mx-auto" />
      {/if}
      
      <!-- Desktop collapse toggle -->
      <div class="hidden lg:block">
        <Button
          variant="ghost"
          size="sm"
          on:click={toggleSidebarCollapsed}
          class="p-2"
        >
          {#if $sidebarCollapsed}
            <CaretRight class="w-4 h-4" />
          {:else}
            <CaretLeft class="w-4 h-4" />
          {/if}
        </Button>
      </div>
      
      <!-- Mobile close button -->
      <div class="lg:hidden">
        <Button
          variant="ghost"
          size="sm"
          on:click={toggleMobileMenu}
          class="p-2"
        >
          <X class="w-4 h-4" />
        </Button>
      </div>
    </div>

    <!-- Client Information -->
    {#if currentClient && !$sidebarCollapsed}
      <div class="p-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-semibold">
            {currentClient.name.charAt(0)}
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-medium text-gray-900 dark:text-white truncate">
              {currentClient.name}
            </h3>
            <div class="flex items-center gap-2 mt-1">
              <Badge class={getClientTierBadge(currentClient.tier)}>
                {currentClient.tier}
              </Badge>
              <Badge class={getClientStatusBadge(currentClient.status)}>
                {currentClient.status}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    {:else if currentClient && $sidebarCollapsed}
      <div class="p-2 border-b border-gray-200 dark:border-gray-700">
        <div class="w-12 h-12 bg-primary rounded-lg flex items-center justify-center text-white font-semibold mx-auto">
          {currentClient.name.charAt(0)}
        </div>
      </div>
    {/if}

    <!-- Navigation -->
    <nav class="flex-1 p-4 space-y-2">
      {#each navigationItems as item}
        <button
          on:click={() => handleNavigation(item)}
          class={cn(
            "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
            "hover:bg-gray-100 dark:hover:bg-gray-700",
            "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          )}
        >
          <span class="text-lg">{item.icon}</span>
          {#if !$sidebarCollapsed}
            <span>{item.label}</span>
          {/if}
        </button>
      {/each}
    </nav>

    <!-- User Profile -->
    <div class="p-4 border-t border-gray-200 dark:border-gray-700">
      {#if !$sidebarCollapsed}
        <div class="flex items-center gap-3 mb-3">
          <div class="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
            <User class="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
              {currentUser?.name || currentUser?.email}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {userRole}
            </p>
          </div>
        </div>
        
        <div class="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            on:click={handleSignOut}
            class="flex-1 justify-start gap-2"
          >
            <SignOut class="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      {:else}
        <div class="flex flex-col items-center gap-2">
          <div class="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
            <User class="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            on:click={handleSignOut}
            class="p-2"
          >
            <SignOut class="w-4 h-4" />
          </Button>
        </div>
      {/if}
    </div>
  </div>

  <!-- Main Content Area -->
  <div class={cn(
    "flex-1 transition-all duration-300 ease-in-out",
    $sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
  )}>
    <!-- Top Bar -->
    <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div class="flex items-center justify-between">
        <!-- Mobile menu button -->
        <div class="lg:hidden">
          <Button
            variant="ghost"
            size="sm"
            on:click={toggleMobileMenu}
            class="p-2"
          >
            <List class="w-4 h-4" />
          </Button>
        </div>

        <!-- Page Title -->
        <div class="flex items-center gap-3">
          <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
            Dashboard
          </h1>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-3">
          {#if currentClient}
            <div class="hidden sm:flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Buildings class="w-4 h-4" />
              <span>{currentClient.name}</span>
            </div>
          {/if}
          
          <Button variant="ghost" size="sm" class="p-2">
            <Gear class="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="p-6">
      {#if loading}
        <div class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      {:else if error}
        <Card class="max-w-md mx-auto">
          <CardHeader>
            <CardTitle class="text-red-600">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button on:click={() => window.location.reload()} variant="outline" class="w-full">
              Retry
            </Button>
          </CardContent>
        </Card>
      {:else}
        <!-- Content slot -->
        <slot />
      {/if}
    </main>
  </div>
</div>