<script lang="ts">
import { createEventDispatcher, onMount } from 'svelte';
import { reportSupabaseError } from '../lib/config/errorReporting.js';
import { supabase } from '../lib/supabase.js';

export let currentUser: any;
export const invitationToken = null;

const dispatch = createEventDispatcher();

let invitationData = null;
let userTasks = [];
let newTask = {
  title: '',
  description: '',
  assignee_email: '',
  priority: 'medium',
  due_date: '',
  category: 'interview',
};
const availableUsers = [
  { email: 'candidate1@example.com', name: 'Sarah Johnson', role: 'Frontend Developer' },
  { email: 'candidate2@example.com', name: 'Mike Chen', role: 'Backend Developer' },
  { email: 'interviewer1@company.com', name: 'Alex Smith', role: 'Engineering Manager' },
  { email: 'interviewer2@company.com', name: 'Lisa Rodriguez', role: 'Senior Developer' },
];
const taskCategories = [
  { id: 'interview', name: 'Interview Scheduling', icon: '📅' },
  { id: 'review', name: 'Application Review', icon: '📋' },
  { id: 'technical', name: 'Technical Assessment', icon: '💻' },
  { id: 'reference', name: 'Reference Check', icon: '📞' },
  { id: 'offer', name: 'Offer Management', icon: '📜' },
  { id: 'onboarding', name: 'Onboarding Prep', icon: '🎯' },
];
let loading = false;
let error = null;
let showCreateTask = false;
let creating = false;

let isNewUser = false;
let accountCreated = false;

onMount(async () => {
  // Decode invitation data if available
  if (invitationToken) {
    try {
      invitationData = decodeInvitationToken(invitationToken);
      console.log('Invitation data loaded:', invitationData);

      // Check if this is a new user registration
      const existingTasks = localStorage.getItem(`demo_tasks_${currentUser.email}`);
      isNewUser = !existingTasks;
      accountCreated = isNewUser; // Show success message for new accounts
    } catch (err) {
      console.warn('Failed to decode invitation token:', err);
    }
  }

  // Load user's tasks
  await loadUserTasks();

  // Initialize sample tasks for demo if new user
  if (isNewUser) {
    await initializeSampleTasks();
  }
});

// Decode JWT invitation token
function decodeInvitationToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const payload = JSON.parse(atob(parts[1]));
    return {
      email: payload.email,
      name: payload.name || payload.firstName,
      company: payload.company || payload.companyName,
      workflow_type: payload.workflow_type,
      demo_duration: payload.demo_duration,
      expires: payload.exp ? new Date(payload.exp * 1000) : null,
      ...payload,
    };
  } catch (error) {
    throw new Error('Failed to decode invitation token');
  }
}

// Load user's tasks
async function loadUserTasks() {
  if (!currentUser?.email) return;

  try {
    loading = true;
    error = null;

    // For demo purposes, use localStorage to simulate task storage
    const storedTasks = localStorage.getItem(`demo_tasks_${currentUser.email}`);
    if (storedTasks) {
      userTasks = JSON.parse(storedTasks);
    } else {
      userTasks = [];
    }

    console.log('User tasks loaded:', userTasks);
  } catch (err) {
    console.error('Error loading user tasks:', err);
    userTasks = [];

    await reportSupabaseError('demo', 'load_tasks', err, {
      operation: 'loadUserTasks',
      component: 'DemoContent',
      userEmail: currentUser?.email,
    });
  } finally {
    loading = false;
  }
}

// Initialize sample tasks for demo using personal data
async function initializeSampleTasks() {
  if (!currentUser?.email || userTasks.length > 0) return;

  const managerName = invitationData?.name || invitationData?.firstName || 'Hiring Manager';
  const companyName = invitationData?.company || invitationData?.companyName || 'Your Company';
  const workflowFocus = invitationData?.workflow_type || 'general hiring';

  // Customize tasks based on workflow type
  const getTasksForWorkflow = () => {
    if (
      workflowFocus.toLowerCase().includes('technical') ||
      workflowFocus.toLowerCase().includes('engineering')
    ) {
      return [
        {
          title: 'Schedule Technical Assessment',
          description: `Coordinate technical coding assessment for senior software engineer position at ${companyName}.`,
          category: 'technical',
          priority: 'high',
        },
        {
          title: 'Review GitHub Portfolio',
          description: "Evaluate candidate's open source contributions and code quality.",
          category: 'review',
          priority: 'medium',
        },
      ];
    }
    if (workflowFocus.toLowerCase().includes('interview')) {
      return [
        {
          title: 'Schedule Panel Interview',
          description: `Set up panel interview with ${companyName} leadership team for management position.`,
          category: 'interview',
          priority: 'high',
        },
        {
          title: 'Prepare Interview Questions',
          description: 'Create behavioral and situational questions for the upcoming interview.',
          category: 'interview',
          priority: 'medium',
        },
      ];
    }
    return [
      {
        title: 'Schedule Technical Interview',
        description: `Coordinate with candidate for the ${workflowFocus} role at ${companyName}.`,
        category: 'interview',
        priority: 'high',
      },
      {
        title: 'Review Application Portfolio',
        description: "Evaluate candidate's work samples and previous experience.",
        category: 'review',
        priority: 'medium',
      },
    ];
  };

  const taskTemplates = getTasksForWorkflow();
  const sampleTasks = taskTemplates.map((template, index) => ({
    id: `task_${Date.now()}_${index + 1}`,
    title: template.title,
    description: template.description,
    assignee_email: index === 0 ? 'interviewer1@company.com' : 'interviewer2@company.com',
    assignee_name: index === 0 ? 'Alex Smith' : 'Lisa Rodriguez',
    created_by: currentUser.email,
    created_by_name: managerName,
    priority: template.priority,
    status: index === 0 ? 'assigned' : 'in_progress',
    category: template.category,
    due_date: new Date(Date.now() + (index + 2) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    created_at: new Date(Date.now() - index * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    metadata: {
      company: companyName,
      workflow_type: workflowFocus,
      created_from_invitation: true,
    },
  }));

  userTasks = sampleTasks;
  saveTasks();

  console.log(
    `Initialized ${sampleTasks.length} personalized tasks for ${managerName} at ${companyName} (${workflowFocus})`
  );
}

// Save tasks to localStorage
function saveTasks() {
  if (currentUser?.email) {
    localStorage.setItem(`demo_tasks_${currentUser.email}`, JSON.stringify(userTasks));
  }
}

// Create a new task
async function createTask() {
  if (!newTask.title || !newTask.assignee_email || creating) return;

  try {
    creating = true;
    error = null;

    const assignee = availableUsers.find((user) => user.email === newTask.assignee_email);
    const task = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: newTask.title,
      description: newTask.description,
      assignee_email: newTask.assignee_email,
      assignee_name: assignee?.name || newTask.assignee_email,
      created_by: currentUser.email,
      created_by_name: invitationData?.name || invitationData?.firstName || currentUser.email,
      priority: newTask.priority,
      status: 'assigned',
      category: newTask.category,
      due_date: newTask.due_date,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        company: invitationData?.company || invitationData?.companyName,
        workflow_type: invitationData?.workflow_type,
        created_from_demo: true,
      },
    };

    userTasks = [task, ...userTasks];
    saveTasks();

    // Reset form
    newTask = {
      title: '',
      description: '',
      assignee_email: '',
      priority: 'medium',
      due_date: '',
      category: 'interview',
    };
    showCreateTask = false;

    console.log('Task created:', task);
  } catch (err) {
    console.error('Error creating task:', err);
    error = 'Failed to create task';

    await reportSupabaseError('demo', 'create_task', err, {
      operation: 'createTask',
      component: 'DemoContent',
      userEmail: currentUser?.email,
    });
  } finally {
    creating = false;
  }
}

// Update task status
async function updateTaskStatus(taskId, newStatus) {
  try {
    userTasks = userTasks.map((task) =>
      task.id === taskId
        ? { ...task, status: newStatus, updated_at: new Date().toISOString() }
        : task
    );
    saveTasks();
    console.log('Task status updated:', taskId, newStatus);
  } catch (err) {
    console.error('Error updating task status:', err);
    error = 'Failed to update task status';
  }
}

// Delete task
async function deleteTask(taskId) {
  try {
    userTasks = userTasks.filter((task) => task.id !== taskId);
    saveTasks();
    console.log('Task deleted:', taskId);
  } catch (err) {
    console.error('Error deleting task:', err);
    error = 'Failed to delete task';
  }
}

// Format date for display
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Get status badge class for tasks
function getStatusBadgeClass(status) {
  const baseClass = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
  switch (status) {
    case 'assigned':
      return `${baseClass} bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300`;
    case 'in_progress':
      return `${baseClass} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300`;
    case 'completed':
      return `${baseClass} bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300`;
    case 'on_hold':
      return `${baseClass} bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300`;
    case 'cancelled':
      return `${baseClass} bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300`;
    default:
      return `${baseClass} bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300`;
  }
}

// Get priority badge class
function getPriorityBadgeClass(priority) {
  const baseClass = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium';
  switch (priority) {
    case 'high':
      return `${baseClass} bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300`;
    case 'medium':
      return `${baseClass} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300`;
    case 'low':
      return `${baseClass} bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300`;
    default:
      return `${baseClass} bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300`;
  }
}

// Get category info
function getCategoryInfo(categoryId) {
  return (
    taskCategories.find((cat) => cat.id === categoryId) || {
      id: categoryId,
      name: categoryId,
      icon: '📋',
    }
  );
}

// Check if task is overdue
function isOverdue(dueDate) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
    <div class="flex items-start justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          🎯 Hiring Task Manager
        </h2>
        <p class="text-gray-600 dark:text-gray-400 mb-4">
          Create and assign hiring tasks to team members and candidates.
        </p>
        
        {#if accountCreated}
          <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
            <div class="flex items-center gap-2 mb-2">
              <svg class="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="font-medium text-green-900 dark:text-green-100">Account Created Successfully!</span>
            </div>
            <p class="text-sm text-green-800 dark:text-green-200">
              Your passkey account has been created. You can now return to this app anytime using your secure passkey authentication.
            </p>
          </div>
        {/if}
        
        {#if invitationData}
          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 class="font-medium text-blue-900 dark:text-blue-100 mb-2">
              {isNewUser ? 'Welcome to Your Demo Account' : 'Welcome Back'}
            </h3>
            <div class="text-sm text-blue-800 dark:text-blue-200">
              <div class="grid grid-cols-2 gap-x-4 gap-y-1 mb-3">
                <p><span class="font-medium">Manager:</span> {invitationData.name || invitationData.firstName || currentUser.email}</p>
                <p><span class="font-medium">Company:</span> {invitationData.company || invitationData.companyName || 'Demo Corp'}</p>
                <p><span class="font-medium">Email:</span> {currentUser.email}</p>
                <p><span class="font-medium">Role:</span> Hiring Manager</p>
                {#if invitationData.team_size}
                  <p><span class="font-medium">Team Size:</span> {invitationData.team_size}</p>
                {/if}
                {#if invitationData.workflow_type}
                  <p><span class="font-medium">Focus:</span> {invitationData.workflow_type}</p>
                {/if}
              </div>
              
              {#if isNewUser}
                <div class="text-xs pt-2 border-t border-blue-200 dark:border-blue-700 bg-blue-100/50 dark:bg-blue-900/30 rounded p-2">
                  <p class="font-medium mb-1">🎯 Personalized Demo Setup</p>
                  <p>Sample hiring tasks have been created based on your profile and workflow focus.</p>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
      
      <div class="flex items-center gap-3">
        <button
          on:click={() => showCreateTask = true}
          class="px-4 py-2 bg-primary hover:bg-primary-600 text-white text-sm font-medium 
                 rounded-md transition-colors flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          New Task
        </button>
        
        <button
          on:click={() => dispatch('signOut')}
          class="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 
                 text-gray-700 dark:text-gray-300 rounded-md transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  </div>

  <!-- Create Task Modal -->
  {#if showCreateTask}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" on:click={() => showCreateTask = false} on:keydown={(e) => e.key === 'Escape' && (showCreateTask = false)} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md m-4" on:click|stopPropagation role="document">
        <div class="flex items-center justify-between mb-4">
          <h3 id="modal-title" class="text-lg font-semibold text-gray-900 dark:text-white">Create New Task</h3>
          <button on:click={() => showCreateTask = false} class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <form on:submit|preventDefault={createTask} class="space-y-4">
          <!-- Task Title -->
          <div>
            <label for="task-title" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task Title</label>
            <input
              id="task-title"
              type="text"
              bind:value={newTask.title}
              placeholder="Enter task title"
              required
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                     focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                     dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          <!-- Description -->
          <div>
            <label for="task-description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              id="task-description"
              bind:value={newTask.description}
              placeholder="Describe the task..."
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                     focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                     dark:bg-gray-700 dark:text-white"
            ></textarea>
          </div>
          
          <!-- Category and Priority -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="task-category" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select id="task-category" bind:value={newTask.category} class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                                                            focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                                                            dark:bg-gray-700 dark:text-white">
                {#each taskCategories as category}
                  <option value={category.id}>{category.icon} {category.name}</option>
                {/each}
              </select>
            </div>
            
            <div>
              <label for="task-priority" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
              <select id="task-priority" bind:value={newTask.priority} class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                                                             focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                                                             dark:bg-gray-700 dark:text-white">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          
          <!-- Assignee and Due Date -->
          <div class="grid grid-cols-1 gap-4">
            <div>
              <label for="task-assignee" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign To</label>
              <select id="task-assignee" bind:value={newTask.assignee_email} required class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                                                                           focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                                                                           dark:bg-gray-700 dark:text-white">
                <option value="">Select assignee...</option>
                {#each availableUsers as user}
                  <option value={user.email}>{user.name} ({user.role})</option>
                {/each}
              </select>
            </div>
            
            <div>
              <label for="task-due-date" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
              <input
                id="task-due-date"
                type="date"
                bind:value={newTask.due_date}
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                       focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                       dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          
          <!-- Buttons -->
          <div class="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={creating || !newTask.title || !newTask.assignee_email}
              class="flex-1 px-4 py-2 bg-primary hover:bg-primary-600 text-white font-medium 
                     rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create Task'}
            </button>
            <button
              type="button"
              on:click={() => showCreateTask = false}
              class="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 
                     text-gray-700 dark:text-gray-300 rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  <!-- Error Message -->
  {#if error}
    <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
        </svg>
        <p class="text-red-800 dark:text-red-200 text-sm">{error}</p>
      </div>
    </div>
  {/if}

  <!-- Task Statistics -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400">Total Tasks</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">{userTasks.length}</p>
        </div>
        <div class="text-2xl">📋</div>
      </div>
    </div>
    
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
          <p class="text-2xl font-bold text-yellow-600">{userTasks.filter(t => t.status === 'in_progress').length}</p>
        </div>
        <div class="text-2xl">⏳</div>
      </div>
    </div>
    
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400">Completed</p>
          <p class="text-2xl font-bold text-green-600">{userTasks.filter(t => t.status === 'completed').length}</p>
        </div>
        <div class="text-2xl">✅</div>
      </div>
    </div>
    
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400">Overdue</p>
          <p class="text-2xl font-bold text-red-600">{userTasks.filter(t => isOverdue(t.due_date) && t.status !== 'completed').length}</p>
        </div>
        <div class="text-2xl">⚠️</div>
      </div>
    </div>
  </div>

  <!-- Task List -->
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
    <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
        Hiring Tasks ({userTasks.length})
      </h3>
    </div>
    
    {#if loading}
      <div class="p-8 text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p class="text-gray-600 dark:text-gray-400">Loading tasks...</p>
      </div>
    {:else if userTasks.length === 0}
      <div class="p-8 text-center">
        <div class="text-4xl mb-4">📝</div>
        <h4 class="text-lg font-medium text-gray-900 dark:text-white mb-2">No tasks yet</h4>
        <p class="text-gray-600 dark:text-gray-400 mb-4">Create your first hiring task to get started.</p>
        <button
          on:click={() => showCreateTask = true}
          class="px-4 py-2 bg-primary hover:bg-primary-600 text-white text-sm font-medium rounded-md transition-colors"
        >
          Create Task
        </button>
      </div>
    {:else}
      <div class="divide-y divide-gray-200 dark:divide-gray-700">
        {#each userTasks as task (task.id)}
          <div class="p-6">
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <h4 class="font-medium text-gray-900 dark:text-white">{task.title}</h4>
                  <span class={getStatusBadgeClass(task.status)}>{task.status.replace('_', ' ')}</span>
                  <span class={getPriorityBadgeClass(task.priority)}>{task.priority}</span>
                  {#if isOverdue(task.due_date) && task.status !== 'completed'}
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                      Overdue
                    </span>
                  {/if}
                </div>
                
                {#if task.description}
                  <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">{task.description}</p>
                {/if}
                
                <div class="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span class="flex items-center gap-1">
                    {getCategoryInfo(task.category).icon}
                    {getCategoryInfo(task.category).name}
                  </span>
                  <span>Assigned to: {task.assignee_name}</span>
                  {#if task.due_date}
                    <span>Due: {formatDate(task.due_date)}</span>
                  {/if}
                  <span>Created: {formatDate(task.created_at)}</span>
                </div>
              </div>
              
              <div class="flex items-center gap-2 ml-4">
                <select
                  bind:value={task.status}
                  on:change={() => updateTaskStatus(task.id, task.status)}
                  class="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1
                         focus:outline-none focus:ring-1 focus:ring-primary dark:bg-gray-700 dark:text-white"
                >
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                
                <button
                  on:click={() => deleteTask(task.id)}
                  class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
                  title="Delete task"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Getting Started Guide -->
  <div class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
      {isNewUser ? '🎉 Getting Started with Your New Account' : '🚀 Quick Reference Guide'}
    </h3>
    
    {#if isNewUser && accountCreated}
      <div class="bg-white dark:bg-blue-900/10 rounded-lg p-4 mb-4">
        <h4 class="font-medium text-blue-900 dark:text-blue-100 mb-2">🔐 Your Secure Passkey Account</h4>
        <p class="text-sm text-blue-800 dark:text-blue-200 mb-3">
          Congratulations! You've successfully created a passkey account. Here's what this means:
        </p>
        <ul class="text-xs text-blue-700 dark:text-blue-300 space-y-1 ml-4">
          <li>• <strong>No passwords needed</strong> - Sign in with your fingerprint, face ID, or device PIN</li>
          <li>• <strong>Secure by default</strong> - Passkeys are phishing-resistant and unbreachable</li>
          <li>• <strong>Easy access</strong> - Return to this app anytime from any device</li>
          <li>• <strong>Your data persists</strong> - Tasks and progress are saved to your account</li>
        </ul>
      </div>
    {/if}
    
    <div class="grid md:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
      <div class="space-y-3">
        <div class="flex items-start gap-3">
          <span class="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-medium">1</span>
          <div>
            <p class="font-medium">{isNewUser ? 'Explore Sample Tasks' : 'Create Tasks'}</p>
            <p class="text-xs text-gray-600 dark:text-gray-400">
              {isNewUser ? 'Review the sample hiring tasks we created for you.' : 'Click "New Task" to create hiring tasks for your team.'}
            </p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <span class="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-medium">2</span>
          <div>
            <p class="font-medium">Assign to Team</p>
            <p class="text-xs text-gray-600 dark:text-gray-400">Assign tasks to interviewers, candidates, or other team members.</p>
          </div>
        </div>
      </div>
      <div class="space-y-3">
        <div class="flex items-start gap-3">
          <span class="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-medium">3</span>
          <div>
            <p class="font-medium">Track Progress</p>
            <p class="text-xs text-gray-600 dark:text-gray-400">Monitor task status and completion in real-time.</p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <span class="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-medium">4</span>
          <div>
            <p class="font-medium">{isNewUser ? 'Return Anytime' : 'Stay Organized'}</p>
            <p class="text-xs text-gray-600 dark:text-gray-400">
              {isNewUser ? 'Bookmark this page and sign in with your passkey to continue.' : 'Use categories, priorities, and due dates to manage your hiring process.'}
            </p>
          </div>
        </div>
      </div>
    </div>
    
    {#if isNewUser}
      <div class="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
        <p class="text-xs text-gray-600 dark:text-gray-400 text-center">
          💡 <strong>Tip:</strong> Try signing out and back in to experience the seamless passkey authentication!
        </p>
      </div>
    {/if}
  </div>
</div>