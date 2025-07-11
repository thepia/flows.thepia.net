import type { Session, User } from '@supabase/supabase-js';
import { type Writable, writable } from 'svelte/store';
import { supabase } from '../lib/supabase.js';

// Auth store with proper types
export const user: Writable<User | null> = writable(null);
export const loading: Writable<boolean> = writable(true);
export const isAdmin: Writable<boolean> = writable(false);

// Initialize auth state
supabase.auth.getSession().then(({ data: { session } }) => {
  user.set(session?.user ?? null);
  loading.set(false);

  if (session?.user) {
    checkAdminAccess(session.user.id);
  }
});

// Listen for auth changes
supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
  user.set(session?.user ?? null);
  loading.set(false);

  if (session?.user) {
    checkAdminAccess(session.user.id);
  } else {
    isAdmin.set(false);
  }
});

// Check if user has admin access via JWT role
async function checkAdminAccess(_userId: string): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      // Check user metadata from session
      const userRole = session.user?.user_metadata?.role as string | undefined;

      // Check for thepia_staff role (following flows-db pattern)
      isAdmin.set(userRole === 'thepia_staff' || userRole === 'service_role');
    } else {
      isAdmin.set(false);
    }
  } catch (error) {
    console.error('Error checking admin access:', error);
    isAdmin.set(false);
  }
}

// Sign in with magic link
export async function signInWithMagicLink(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email: email,
    options: {
      emailRedirectTo: `${window.location.origin}/admin`,
    },
  });

  if (error) throw error;
  return data;
}

// Sign out
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
