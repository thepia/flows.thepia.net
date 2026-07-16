<script lang="ts">
import { thepiaColors } from '@thepia/branding';
import { onMount } from 'svelte';
import { writable } from 'svelte/store';
import { reportSupabaseError } from '../../config/errorReporting.js';
import Badge from '../ui/badge/badge.svelte';
import Button from '../ui/button/button.svelte';
import CardContent from '../ui/card/card-content.svelte';
import CardDescription from '../ui/card/card-description.svelte';
import CardHeader from '../ui/card/card-header.svelte';
import CardTitle from '../ui/card/card-title.svelte';
import Card from '../ui/card/card.svelte';
import AppLayout from './AppLayout.svelte';

interface Props {
  currentUser: any;
  invitationToken?: string | null;
}

let { currentUser, invitationToken = null }: Props = $props();

// App state
let loading = $state(false);
let error: string | null = $state(null);
let clientId: string = $state('');
let userRole: 'admin' | 'manager' | 'employee' = $state('employee');

// Demo data
let dashboardStats = $state({
  totalTasks: 0,
  activeTasks: 0,
  completedTasks: 0,
  totalPeople: 0,
});

let recentTasks = $state([]);
let recentActivity = [];

// Determine user role and client ID
onMount(async () => {
  if (!currentUser) return;

  try {
    loading = true;
    error = null;

    // For demo purposes, we'll use a fixed client ID
    // In production, this would come from user permissions/organization
    clientId = 'demo-client-001';

    // Determine user role based on email domain or other criteria
    // This is a simplified demo implementation
    if (currentUser.email.includes('admin')) {
      userRole = 'admin';
    } else if (currentUser.email.includes('manager')) {
      userRole = 'manager';
    } else {
      userRole = 'employee';
    }

    console.log('User role determined:', userRole, 'for client:', clientId);

    // Load dashboard data
    await loadDashboardData();
  } catch (err) {
    console.error('Error initializing app:', err);
    error = err.message || 'Failed to initialize application';

    await reportSupabaseError('app', 'init_app', err, {
      operation: 'initializeApp',
      component: 'MainApp',
      userEmail: currentUser?.email,
    });
  } finally {
    loading = false;
  }
});

// Load dashboard data
async function loadDashboardData() {
  try {
    // Import supabase client
    const { supabase } = await import('../../supabase.js');

    // Get tasks count for this client
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('id, status, title, created_at, assignee_email')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(10);

    let tasks: typeof tasksData;
    if (tasksError) {
      console.warn('Tasks query failed:', tasksError);
      // Use demo data if database query fails
      tasks = getDemoTasks();
    } else {
      tasks = tasksData;
    }

    // Calculate stats
    dashboardStats = {
      totalTasks: tasks?.length || 0,
      activeTasks:
        tasks?.filter((t) => t.status === 'in_progress' || t.status === 'assigned').length || 0,
      completedTasks: tasks?.filter((t) => t.status === 'completed').length || 0,
      totalPeople: 12, // Demo value
    };

    recentTasks = tasks?.slice(0, 5) || [];

    // Create recent activity from tasks
    recentActivity = recentTasks.map((task) => ({
      id: task.id,
      type: 'task',
      title: task.title,
      timestamp: task.created_at,
      user: task.assignee_email || 'System',
    }));

    console.log('Dashboard data loaded:', { dashboardStats, recentTasks });
  } catch (err) {
    console.error('Error loading dashboard data:', err);
    // Use demo data on error
    dashboardStats = { totalTasks: 8, activeTasks: 3, completedTasks: 5, totalPeople: 12 };
    recentTasks = getDemoTasks();
  }
}

// Get demo tasks data
function getDemoTasks() {
  return [
    {
      id: '1',
      title: 'Schedule Technical Interview',
      status: 'in_progress',
      created_at: new Date().toISOString(),
      assignee_email: 'interviewer@company.com',
    },
    {
      id: '2',
      title: 'Review Application Portfolio',
      status: 'completed',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      assignee_email: 'manager@company.com',
    },
    {
      id: '3',
      title: 'Prepare Interview Questions',
      status: 'assigned',
      created_at: new Date(Date.now() - 7200000).toISOString(),
      assignee_email: 'hr@company.com',
    },
    {
      id: '4',
      title: 'Reference Check',
      status: 'in_progress',
      created_at: new Date(Date.now() - 10800000).toISOString(),
      assignee_email: 'recruiter@company.com',
    },
    {
      id: '5',
      title: 'Onboarding Preparation',
      status: 'assigned',
      created_at: new Date(Date.now() - 14400000).toISOString(),
      assignee_email: 'hr@company.com',
    },
  ];
}

// Handle sign out
function handleSignOut() {
  // Clear any local data
  localStorage.removeItem('demo_client_id');

  // Dispatch sign out event
  const event = new CustomEvent('signOut');
  window.dispatchEvent(event);
}

// Format date for display
function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Get task status badge class
function getTaskStatusBadge(status: string) {
  switch (status) {
    case 'assigned':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
    case 'in_progress':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
    case 'completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
  }
}
</script>

<AppLayout 
  {currentUser} 
  {clientId} 
  {userRole}
  on:signOut={handleSignOut}
>
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <span class="ml-2 text-gray-600 dark:text-gray-400">Loading dashboard...</span>
    </div>
  {:else if error}
    <Card class="max-w-md mx-auto">
      <CardHeader>
        <CardTitle class="text-red-600">Application Error</CardTitle>
        <CardDescription>{error}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button on:click={() => window.location.reload()} variant="outline" class="w-full">
          Retry
        </Button>
      </CardContent>
    </Card>
  {:else}
    <!-- Dashboard Content -->
    <div class="space-y-6">
      <!-- Welcome Section -->
      <div class="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome back, {currentUser.name || currentUser.email}!
        </h2>
        <p class="text-gray-600 dark:text-gray-400">
          Here's an overview of your current workflow activities.
        </p>
        <div class="mt-3 flex items-center gap-4">
          <Badge class="bg-primary/20 text-primary">
            {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
          </Badge>
          {#if invitationToken}
            <Badge variant="outline">
              Invitation Access
            </Badge>
          {/if}
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold text-gray-900 dark:text-white">
              {dashboardStats.totalTasks}
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Across all projects
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-sm font-medium text-gray-600 dark:text-gray-400">Active Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold text-yellow-600">
              {dashboardStats.activeTasks}
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              In progress or assigned
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold text-green-600">
              {dashboardStats.completedTasks}
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Tasks finished
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-sm font-medium text-gray-600 dark:text-gray-400">Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold text-blue-600">
              {dashboardStats.totalPeople}
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Active team members
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Recent Tasks -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Tasks</CardTitle>
            <CardDescription>Latest task activities</CardDescription>
          </CardHeader>
          <CardContent>
            {#if recentTasks.length > 0}
              <div class="space-y-3">
                {#each recentTasks as task}
                  <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div class="flex-1">
                      <h4 class="font-medium text-gray-900 dark:text-white text-sm">
                        {task.title}
                      </h4>
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(task.created_at)}
                      </p>
                    </div>
                    <Badge class={getTaskStatusBadge(task.status)}>
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </div>
                {/each}
              </div>
            {:else}
              <p class="text-gray-500 dark:text-gray-400 text-sm">
                No tasks found. Create your first task to get started.
              </p>
            {/if}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common workflow actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="space-y-3">
              <Button class="w-full justify-start" variant="outline">
                <span class="mr-2">📋</span>
                Create New Task
              </Button>
              <Button class="w-full justify-start" variant="outline">
                <span class="mr-2">👥</span>
                Invite Team Member
              </Button>
              <Button class="w-full justify-start" variant="outline">
                <span class="mr-2">📊</span>
                View Reports
              </Button>
              <Button class="w-full justify-start" variant="outline">
                <span class="mr-2">⚙️</span>
                Manage Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Getting Started Guide -->
      {#if userRole === 'employee'}
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Tips for using your workflow dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="grid md:grid-cols-2 gap-4 text-sm">
              <div class="space-y-2">
                <h4 class="font-medium text-gray-900 dark:text-white">Your Tasks</h4>
                <p class="text-gray-600 dark:text-gray-400">
                  View and manage tasks assigned to you in the Tasks section.
                </p>
              </div>
              <div class="space-y-2">
                <h4 class="font-medium text-gray-900 dark:text-white">Team Collaboration</h4>
                <p class="text-gray-600 dark:text-gray-400">
                  Collaborate with team members and track progress together.
                </p>
              </div>
              <div class="space-y-2">
                <h4 class="font-medium text-gray-900 dark:text-white">Mobile Access</h4>
                <p class="text-gray-600 dark:text-gray-400">
                  Access your dashboard from any device with responsive design.
                </p>
              </div>
              <div class="space-y-2">
                <h4 class="font-medium text-gray-900 dark:text-white">Secure Login</h4>
                <p class="text-gray-600 dark:text-gray-400">
                  Your account is protected with passkey authentication.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      {/if}
    </div>
  {/if}
</AppLayout>