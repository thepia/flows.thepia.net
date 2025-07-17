/**
 * AppSignIn Authentication State Machine Logic Tests
 * 
 * Tests the authentication state machine logic that can be extracted and tested
 * independently of the Svelte component rendering.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock flows-auth functions
const mockIsAuthenticatedFromSession = vi.fn();
const mockGetCurrentUserFromSession = vi.fn();
const mockCreateAuthStore = vi.fn();
const mockSignInWithPasskey = vi.fn();
const mockCreateAccount = vi.fn();
const mockCheckUser = vi.fn();

// Authentication state machine logic extracted from component
interface AuthState {
  isAuthenticated: boolean;
  currentUser: any;
  authLoaded: boolean;
  authError: string | null;
  showRegistrationForm: boolean;
  invitationToken: string | null;
  tokenData: any;
  isSigningIn: boolean;
  isSubmitting: boolean;
}

class AuthStateMachine {
  private state: AuthState = {
    isAuthenticated: false,
    currentUser: null,
    authLoaded: false,
    authError: null,
    showRegistrationForm: false,
    invitationToken: null,
    tokenData: null,
    isSigningIn: false,
    isSubmitting: false
  };

  private isAuthenticatedFromSession: () => boolean;
  private getCurrentUserFromSession: () => any;

  constructor(sessionFunctions: { 
    isAuthenticatedFromSession: () => boolean;
    getCurrentUserFromSession: () => any;
  }) {
    this.isAuthenticatedFromSession = sessionFunctions.isAuthenticatedFromSession;
    this.getCurrentUserFromSession = sessionFunctions.getCurrentUserFromSession;
  }

  // Main state update function following the implementation guide
  updateAuthState(): void {
    try {
      this.state.isAuthenticated = this.isAuthenticatedFromSession();
      this.state.currentUser = this.getCurrentUserFromSession();
      
      console.log('🔍 Auth state updated:', {
        isAuthenticated: this.state.isAuthenticated,
        hasUser: !!this.state.currentUser,
        source: 'updateAuthState'
      });
      
    } catch (error) {
      console.error('Session check failed:', error);
      // Fallback to unauthenticated state
      this.state.isAuthenticated = false;
      this.state.currentUser = null;
    }
  }

  // Handle session update events
  handleSessionUpdate(eventDetail: any): void {
    this.updateAuthState();
  }

  // Handle auth store state changes
  handleAuthStoreChange(authStoreState: any): void {
    this.updateAuthState();
    
    // Handle auth store errors
    if (authStoreState.state === 'error') {
      this.state.authError = authStoreState.error;
    }
  }

  // Check current authentication state
  getCurrentState(): 'checking' | 'authenticated' | 'unauthenticated' | 'registration' {
    if (!this.state.authLoaded) {
      return 'checking';
    }
    
    if (this.state.isAuthenticated && this.state.currentUser) {
      return 'authenticated';
    }
    
    if (this.state.showRegistrationForm) {
      return 'registration';
    }
    
    return 'unauthenticated';
  }

  // Initialize authentication system
  async initialize(): Promise<void> {
    // Mock the initialization logic
    this.state.authLoaded = true;
    this.updateAuthState();
  }

  // Decode invitation token
  decodeInvitationToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      const payload = JSON.parse(atob(parts[1]));
      return {
        email: payload.email,
        firstName: payload.firstName || payload.name?.split(' ')[0],
        lastName: payload.lastName || payload.name?.split(' ').slice(1).join(' '),
        name: payload.name,
        company: payload.company || payload.companyName,
        phone: payload.phone,
        jobTitle: payload.jobTitle,
        expires: payload.exp ? new Date(payload.exp * 1000) : null,
        issuedAt: payload.iat ? new Date(payload.iat * 1000) : null,
        ...payload,
      };
    } catch (error) {
      throw new Error('Failed to decode invitation token');
    }
  }

  // Validate invitation token
  validateInvitationToken(token: string, tokenData: any): boolean {
    if (!token || !tokenData) {
      return false;
    }

    try {
      // Check if token is expired
      if (tokenData.expires && tokenData.expires < new Date()) {
        return false;
      }

      // Check if token was issued in the future
      if (tokenData.issuedAt && tokenData.issuedAt > new Date(Date.now() + 5 * 60 * 1000)) {
        return false;
      }

      // Basic JWT structure validation
      const parts = token.split('.');
      if (parts.length !== 3) {
        return false;
      }

      // Validate required fields
      if (!tokenData.email) {
        return false;
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(tokenData.email)) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  // Get current state for testing
  getState(): AuthState {
    return { ...this.state };
  }

  // Set state for testing
  setState(updates: Partial<AuthState>): void {
    this.state = { ...this.state, ...updates };
  }
}

describe('AppSignIn Authentication State Machine Logic', () => {
  let authStateMachine: AuthStateMachine;
  let mockUser: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User'
    };
    
    authStateMachine = new AuthStateMachine({
      isAuthenticatedFromSession: mockIsAuthenticatedFromSession,
      getCurrentUserFromSession: mockGetCurrentUserFromSession
    });
  });

  describe('State Machine States', () => {
    it('should start in checking state', () => {
      expect(authStateMachine.getCurrentState()).toBe('checking');
    });

    it('should transition to authenticated state when user is logged in', async () => {
      mockIsAuthenticatedFromSession.mockReturnValue(true);
      mockGetCurrentUserFromSession.mockReturnValue(mockUser);
      
      await authStateMachine.initialize();
      
      expect(authStateMachine.getCurrentState()).toBe('authenticated');
    });

    it('should transition to unauthenticated state when user is not logged in', async () => {
      mockIsAuthenticatedFromSession.mockReturnValue(false);
      mockGetCurrentUserFromSession.mockReturnValue(null);
      
      await authStateMachine.initialize();
      
      expect(authStateMachine.getCurrentState()).toBe('unauthenticated');
    });

    it('should transition to registration state when registration form is shown', async () => {
      mockIsAuthenticatedFromSession.mockReturnValue(false);
      mockGetCurrentUserFromSession.mockReturnValue(null);
      
      await authStateMachine.initialize();
      authStateMachine.setState({ showRegistrationForm: true });
      
      expect(authStateMachine.getCurrentState()).toBe('registration');
    });
  });

  describe('State Updates', () => {
    it('should update authentication state correctly', () => {
      mockIsAuthenticatedFromSession.mockReturnValue(true);
      mockGetCurrentUserFromSession.mockReturnValue(mockUser);
      
      authStateMachine.updateAuthState();
      
      const state = authStateMachine.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.currentUser).toBe(mockUser);
    });

    it('should handle session function errors gracefully', () => {
      mockIsAuthenticatedFromSession.mockImplementation(() => {
        throw new Error('Session check failed');
      });
      
      authStateMachine.updateAuthState();
      
      const state = authStateMachine.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.currentUser).toBe(null);
    });

    it('should handle session update events', () => {
      mockIsAuthenticatedFromSession.mockReturnValue(true);
      mockGetCurrentUserFromSession.mockReturnValue(mockUser);
      
      authStateMachine.handleSessionUpdate({ user: mockUser });
      
      const state = authStateMachine.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.currentUser).toBe(mockUser);
    });

    it('should handle auth store state changes', () => {
      mockIsAuthenticatedFromSession.mockReturnValue(true);
      mockGetCurrentUserFromSession.mockReturnValue(mockUser);
      
      authStateMachine.handleAuthStoreChange({ state: 'authenticated', user: mockUser });
      
      const state = authStateMachine.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.currentUser).toBe(mockUser);
    });

    it('should handle auth store errors', () => {
      const errorMessage = 'Authentication failed';
      
      authStateMachine.handleAuthStoreChange({ state: 'error', error: errorMessage });
      
      const state = authStateMachine.getState();
      expect(state.authError).toBe(errorMessage);
    });
  });

  describe('Invitation Token Handling', () => {
    const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJmaXJzdE5hbWUiOiJUZXN0IiwibGFzdE5hbWUiOiJVc2VyIiwiY29tcGFueSI6IlRlc3QgQ29tcGFueSIsImV4cCI6OTk5OTk5OTk5OSwiaWF0IjoxNjAwMDAwMDAwfQ.mock-signature';
    
    beforeEach(() => {
      // Mock atob for JWT decoding
      global.atob = vi.fn().mockReturnValue(JSON.stringify({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        company: 'Test Company',
        exp: 9999999999,
        iat: 1600000000
      }));
    });

    it('should decode invitation token correctly', () => {
      const tokenData = authStateMachine.decodeInvitationToken(validToken);
      
      expect(tokenData.email).toBe('test@example.com');
      expect(tokenData.firstName).toBe('Test');
      expect(tokenData.lastName).toBe('User');
      expect(tokenData.company).toBe('Test Company');
    });

    it('should validate valid invitation tokens', () => {
      const tokenData = authStateMachine.decodeInvitationToken(validToken);
      const isValid = authStateMachine.validateInvitationToken(validToken, tokenData);
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid invitation tokens', () => {
      const invalidToken = 'invalid-token';
      
      expect(() => {
        authStateMachine.decodeInvitationToken(invalidToken);
      }).toThrow('Failed to decode invitation token');
    });

    it('should reject expired invitation tokens', () => {
      global.atob = vi.fn().mockReturnValue(JSON.stringify({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        exp: 1000000000, // Expired timestamp
        iat: 1600000000
      }));
      
      const tokenData = authStateMachine.decodeInvitationToken(validToken);
      const isValid = authStateMachine.validateInvitationToken(validToken, tokenData);
      
      expect(isValid).toBe(false);
    });

    it('should reject tokens without required email field', () => {
      global.atob = vi.fn().mockReturnValue(JSON.stringify({
        firstName: 'Test',
        lastName: 'User',
        exp: 9999999999,
        iat: 1600000000
      }));
      
      const tokenData = authStateMachine.decodeInvitationToken(validToken);
      const isValid = authStateMachine.validateInvitationToken(validToken, tokenData);
      
      expect(isValid).toBe(false);
    });

    it('should reject tokens with invalid email format', () => {
      global.atob = vi.fn().mockReturnValue(JSON.stringify({
        email: 'invalid-email',
        firstName: 'Test',
        lastName: 'User',
        exp: 9999999999,
        iat: 1600000000
      }));
      
      const tokenData = authStateMachine.decodeInvitationToken(validToken);
      const isValid = authStateMachine.validateInvitationToken(validToken, tokenData);
      
      expect(isValid).toBe(false);
    });

    it('should reject tokens with malformed JWT structure', () => {
      const malformedToken = 'not.a.valid.jwt';
      
      const tokenData = authStateMachine.decodeInvitationToken(validToken);
      const isValid = authStateMachine.validateInvitationToken(malformedToken, tokenData);
      
      expect(isValid).toBe(false);
    });
  });

  describe('State Machine Integrity', () => {
    it('should maintain single source of truth for authentication state', () => {
      mockIsAuthenticatedFromSession.mockReturnValue(true);
      mockGetCurrentUserFromSession.mockReturnValue(mockUser);
      
      authStateMachine.updateAuthState();
      
      // Verify session functions are called
      expect(mockIsAuthenticatedFromSession).toHaveBeenCalled();
      expect(mockGetCurrentUserFromSession).toHaveBeenCalled();
    });

    it('should handle state transitions correctly', async () => {
      // Start in checking state
      expect(authStateMachine.getCurrentState()).toBe('checking');
      
      // Initialize with unauthenticated user
      mockIsAuthenticatedFromSession.mockReturnValue(false);
      mockGetCurrentUserFromSession.mockReturnValue(null);
      
      await authStateMachine.initialize();
      expect(authStateMachine.getCurrentState()).toBe('unauthenticated');
      
      // Simulate authentication
      mockIsAuthenticatedFromSession.mockReturnValue(true);
      mockGetCurrentUserFromSession.mockReturnValue(mockUser);
      
      authStateMachine.updateAuthState();
      expect(authStateMachine.getCurrentState()).toBe('authenticated');
    });

    it('should handle error states properly', () => {
      const errorMessage = 'Authentication failed';
      
      authStateMachine.handleAuthStoreChange({ state: 'error', error: errorMessage });
      
      const state = authStateMachine.getState();
      expect(state.authError).toBe(errorMessage);
    });

    it('should ensure state consistency across updates', () => {
      // Initial state
      mockIsAuthenticatedFromSession.mockReturnValue(false);
      mockGetCurrentUserFromSession.mockReturnValue(null);
      
      authStateMachine.updateAuthState();
      
      let state = authStateMachine.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.currentUser).toBe(null);
      
      // Update to authenticated
      mockIsAuthenticatedFromSession.mockReturnValue(true);
      mockGetCurrentUserFromSession.mockReturnValue(mockUser);
      
      authStateMachine.updateAuthState();
      
      state = authStateMachine.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.currentUser).toBe(mockUser);
    });
  });

  describe('Registration and Sign-in Flow Logic', () => {
    it('should handle registration state correctly', () => {
      authStateMachine.setState({ 
        showRegistrationForm: true,
        isAuthenticated: false,
        currentUser: null,
        authLoaded: true 
      });
      
      expect(authStateMachine.getCurrentState()).toBe('registration');
    });

    it('should handle sign-in state correctly', () => {
      authStateMachine.setState({ 
        showRegistrationForm: false,
        isAuthenticated: false,
        currentUser: null,
        authLoaded: true 
      });
      
      expect(authStateMachine.getCurrentState()).toBe('unauthenticated');
    });

    it('should handle authenticated state correctly', () => {
      authStateMachine.setState({ 
        showRegistrationForm: false,
        isAuthenticated: true,
        currentUser: mockUser,
        authLoaded: true 
      });
      
      expect(authStateMachine.getCurrentState()).toBe('authenticated');
    });

    it('should handle loading states correctly', () => {
      authStateMachine.setState({ 
        authLoaded: false
      });
      
      expect(authStateMachine.getCurrentState()).toBe('checking');
    });
  });

  describe('Error Handling', () => {
    it('should handle session function failures gracefully', () => {
      mockIsAuthenticatedFromSession.mockImplementation(() => {
        throw new Error('Session check failed');
      });
      
      // Should not throw and should default to unauthenticated
      expect(() => {
        authStateMachine.updateAuthState();
      }).not.toThrow();
      
      const state = authStateMachine.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.currentUser).toBe(null);
    });

    it('should handle auth store errors', () => {
      const errorMessage = 'Network error';
      
      authStateMachine.handleAuthStoreChange({ 
        state: 'error', 
        error: errorMessage 
      });
      
      const state = authStateMachine.getState();
      expect(state.authError).toBe(errorMessage);
    });

    it('should handle malformed event data', () => {
      // Should not throw with undefined or null event data
      expect(() => {
        authStateMachine.handleSessionUpdate(undefined);
      }).not.toThrow();
      
      expect(() => {
        authStateMachine.handleSessionUpdate(null);
      }).not.toThrow();
    });
  });
});