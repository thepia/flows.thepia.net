import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import AuthSection from './AuthSection.svelte';

// Mock browser environment
Object.defineProperty(global, 'window', {
  value: {
    location: {
      hostname: 'localhost'
    }
  },
  writable: true
});

describe('AuthSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset DOM
    document.body.innerHTML = '';
  });

  it('renders loading state initially', async () => {
    render(AuthSection);
    
    // Should show loading initially
    expect(screen.getByText('Loading authentication...')).toBeInTheDocument();
  });

  it('renders sign in form after loading', async () => {
    render(AuthSection);
    
    // Wait for component to initialize (mock has 1s delay)
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    expect(screen.getByText('Employee Access Required')).toBeInTheDocument();
    expect(screen.getByText('Sign In with Passkey')).toBeInTheDocument();
  });

  it('shows employee-only access message', async () => {
    render(AuthSection);
    
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    expect(screen.getByText(/This demo is restricted to Thepia employees/)).toBeInTheDocument();
  });

  it('displays security features', async () => {
    render(AuthSection);
    
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    expect(screen.getByText('Secure passkey authentication')).toBeInTheDocument();
    expect(screen.getByText('Privacy-compliant access')).toBeInTheDocument();
    expect(screen.getByText('Employee verification required')).toBeInTheDocument();
  });
});
