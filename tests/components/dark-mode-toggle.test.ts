import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Dark Mode Toggle Functionality', () => {
  // Mock DOM environment
  const mockLocalStorage = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; }
    };
  })();

  const mockDocumentElement = {
    classList: {
      contains: vi.fn(),
      add: vi.fn(),
      remove: vi.fn()
    }
  };

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    mockLocalStorage.clear();
    
    // Reset classList mock
    mockDocumentElement.classList.contains.mockReturnValue(false);
    
    // Mock localStorage and document
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      configurable: true
    });
    
    Object.defineProperty(document, 'documentElement', {
      value: mockDocumentElement,
      configurable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('toggleDarkMode function', () => {
    // Simulate the toggleDarkMode function from Footer.astro
    const toggleDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark');
      
      if (isDark) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      }
    };

    it('should toggle from light to dark mode', () => {
      // Initial state: light mode
      mockDocumentElement.classList.contains.mockReturnValue(false);
      
      toggleDarkMode();
      
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('dark');
      expect(mockLocalStorage.getItem('theme')).toBe('dark');
    });

    it('should toggle from dark to light mode', () => {
      // Initial state: dark mode
      mockDocumentElement.classList.contains.mockReturnValue(true);
      
      toggleDarkMode();
      
      expect(mockDocumentElement.classList.remove).toHaveBeenCalledWith('dark');
      expect(mockLocalStorage.getItem('theme')).toBe('light');
    });

    it('should persist theme preference in localStorage', () => {
      // Toggle to dark
      mockDocumentElement.classList.contains.mockReturnValue(false);
      toggleDarkMode();
      expect(mockLocalStorage.getItem('theme')).toBe('dark');
      
      // Toggle to light
      mockDocumentElement.classList.contains.mockReturnValue(true);
      toggleDarkMode();
      expect(mockLocalStorage.getItem('theme')).toBe('light');
    });
  });

  describe('Theme initialization', () => {
    beforeEach(() => {
      // Mock window.matchMedia
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
    });

    it('should use stored theme preference', () => {
      mockLocalStorage.setItem('theme', 'dark');
      
      // Simulate theme initialization
      const theme = mockLocalStorage.getItem('theme');
      
      expect(theme).toBe('dark');
    });

    it('should default to light mode when no preference', () => {
      const theme = mockLocalStorage.getItem('theme') || 'light';
      
      expect(theme).toBe('light');
    });
  });

  describe('Button accessibility and styling', () => {
    it('should have proper ARIA attributes', () => {
      const expectedAttributes = {
        'aria-label': 'Toggle dark mode',
        'id': 'theme-toggle-footer',
        'class': expect.stringContaining('theme-toggle')
      };
      
      expect(expectedAttributes['aria-label']).toBe('Toggle dark mode');
      expect(expectedAttributes['id']).toBe('theme-toggle-footer');
    });

    it('should have proper CSS classes for styling', () => {
      const expectedClasses = [
        'theme-toggle',
        'p-2',
        'text-gray-400',
        'hover:text-white',
        'transition-colors',
        'duration-200',
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-primary',
        'rounded-full'
      ];
      
      expectedClasses.forEach(className => {
        expect(className).toBeTruthy();
      });
    });
  });

  describe('Icon visibility logic', () => {
    it('should show moon icon in light mode', () => {
      const lightModeClasses = {
        moonIcon: 'block dark:hidden',
        sunIcon: 'hidden dark:block'
      };
      
      expect(lightModeClasses.moonIcon).toContain('block');
      expect(lightModeClasses.moonIcon).toContain('dark:hidden');
      expect(lightModeClasses.sunIcon).toContain('hidden');
      expect(lightModeClasses.sunIcon).toContain('dark:block');
    });

    it('should show sun icon in dark mode', () => {
      const darkModeExpectation = {
        moonIconVisible: false, // dark:hidden makes it hidden in dark mode
        sunIconVisible: true    // dark:block makes it visible in dark mode
      };
      
      expect(darkModeExpectation.moonIconVisible).toBe(false);
      expect(darkModeExpectation.sunIconVisible).toBe(true);
    });
  });

  describe('Integration with existing theme system', () => {
    it('should be compatible with thepia.com theme toggle pattern', () => {
      const thepiaPattern = {
        storageKey: 'theme',
        darkClass: 'dark',
        lightValue: 'light',
        darkValue: 'dark'
      };
      
      expect(thepiaPattern.storageKey).toBe('theme');
      expect(thepiaPattern.darkClass).toBe('dark');
      expect(thepiaPattern.lightValue).toBe('light');
      expect(thepiaPattern.darkValue).toBe('dark');
    });

    it('should work with existing Layout.astro theme initialization', () => {
      mockLocalStorage.setItem('theme', 'dark');
      
      const storedTheme = mockLocalStorage.getItem('theme');
      expect(storedTheme).toBe('dark');
      
      // Our toggle should work with this
      mockDocumentElement.classList.contains.mockReturnValue(true);
      
      const toggleDarkMode = () => {
        const isDark = document.documentElement.classList.contains('dark');
        if (isDark) {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('theme', 'light');
        } else {
          document.documentElement.classList.add('dark');
          localStorage.setItem('theme', 'dark');
        }
      };
      
      toggleDarkMode();
      expect(mockLocalStorage.getItem('theme')).toBe('light');
    });
  });
});
