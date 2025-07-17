/**
 * Invitation URL Handler for flows.thepia.net
 * Handles invitation links and determines what to show based on user state
 */

export interface InvitationState {
  hasToken: boolean;
  email?: string;
  token?: string;
  isAuthenticated: boolean;
  shouldShowDemo: boolean;
  shouldShowSignIn: boolean;
  shouldCleanUrl: boolean;
}

/**
 * Check if user is authenticated (simple check for flows.thepia.net)
 * In flows.thepia.net, we'll rely on the auth store state
 */
function isUserAuthenticated(): boolean {
  // For flows.thepia.net, we'll check if there's a stored session
  // This is a simplified check - in practice, the auth store will handle this
  try {
    const stored = localStorage.getItem('thepia-auth-session');
    return stored !== null;
  } catch {
    return false;
  }
}

/**
 * Analyze the current URL and user state to determine what to show
 */
export function analyzeInvitationState(): InvitationState {
  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.search);

  const hasToken = params.has('token');
  const email = params.get('email') || undefined;
  const token = params.get('token') || undefined;
  const isAuthenticated = isUserAuthenticated();

  console.log('🔍 Analyzing invitation state:', {
    hasToken,
    email,
    isAuthenticated,
    url: window.location.href,
  });

  // If no token, this is not an invitation flow
  if (!hasToken) {
    return {
      hasToken: false,
      isAuthenticated,
      shouldShowDemo: false,
      shouldShowSignIn: !isAuthenticated,
      shouldCleanUrl: false,
    };
  }

  // If token exists and user is authenticated, show demo and clean URL
  if (hasToken && isAuthenticated) {
    return {
      hasToken: true,
      email,
      token,
      isAuthenticated: true,
      shouldShowDemo: true,
      shouldShowSignIn: false,
      shouldCleanUrl: true,
    };
  }

  // If token exists but user is not authenticated, show sign-in
  if (hasToken && !isAuthenticated) {
    return {
      hasToken: true,
      email,
      token,
      isAuthenticated: false,
      shouldShowDemo: false,
      shouldShowSignIn: true,
      shouldCleanUrl: false, // Keep token for registration process
    };
  }

  // Default fallback
  return {
    hasToken,
    email,
    token,
    isAuthenticated,
    shouldShowDemo: false,
    shouldShowSignIn: !isAuthenticated,
    shouldCleanUrl: false,
  };
}

/**
 * Clean up invitation parameters from URL
 */
export function cleanInvitationUrl(): void {
  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.search);

  // Remove invitation-related parameters
  params.delete('token');
  params.delete('email');
  params.delete('code');
  params.delete('state');
  params.delete('error');
  params.delete('error_description');

  // Update the URL without these parameters
  const newUrl = params.toString() ? `${url.pathname}?${params.toString()}` : url.pathname;

  // Use replaceState to update URL without triggering a page reload
  window.history.replaceState({}, '', newUrl);

  console.log('🧹 Invitation URL cleaned:', {
    oldUrl: window.location.href,
    newUrl: newUrl,
  });
}

/**
 * Handle invitation URL on page load
 * Returns the action that should be taken
 */
export function handleInvitationUrl(): {
  action: 'show-demo' | 'show-signin' | 'normal-flow';
  email?: string;
  token?: string;
} {
  const state = analyzeInvitationState();

  if (state.shouldCleanUrl) {
    cleanInvitationUrl();
  }

  if (state.shouldShowDemo) {
    // Dispatch event for demo mode
    window.dispatchEvent(
      new CustomEvent('invitationProcessed', {
        detail: {
          action: 'show-demo',
          email: state.email,
          token: state.token,
          timestamp: Date.now(),
        },
      })
    );

    return {
      action: 'show-demo',
      email: state.email,
      token: state.token,
    };
  }

  if (state.shouldShowSignIn) {
    // Dispatch event for sign-in mode
    window.dispatchEvent(
      new CustomEvent('invitationProcessed', {
        detail: {
          action: 'show-signin',
          email: state.email,
          token: state.token,
          timestamp: Date.now(),
        },
      })
    );

    return {
      action: 'show-signin',
      email: state.email,
      token: state.token,
    };
  }

  return {
    action: 'normal-flow',
  };
}
