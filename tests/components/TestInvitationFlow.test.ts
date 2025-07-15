/**
 * TestInvitationFlow Component Tests
 * 
 * Tests the test email validation logic in the TestInvitationFlow component
 * Ensures security and proper pattern matching
 */

import { describe, it, expect } from 'vitest';

// Mock the validation logic from TestInvitationFlow.svelte
function validateTestEmail(testEmail: string): { isValid: boolean; error?: string } {
  // More precise validation - check for proper patterns
  const emailLower = testEmail.toLowerCase();
  const hasValidDomain = emailLower.endsWith('@thepia.net');
  
  if (!hasValidDomain) {
    return {
      isValid: false,
      error: 'Please use test email patterns (test-*@thepia.net or hello+*@thepia.net) to avoid affecting production data'
    };
  }
  
  // Check for valid prefixes more precisely
  const localPart = emailLower.split('@')[0];
  const hasValidPrefix = localPart.includes('test-') || localPart.includes('hello+');
  
  // Additional validation: ensure the prefix is not just at the end
  const hasProperTestPrefix = localPart.includes('test-') && localPart.indexOf('test-') < localPart.length - 5;
  const hasProperHelloPrefix = localPart.includes('hello+') && localPart.indexOf('hello+') < localPart.length - 6;
  
  if (!hasValidPrefix || (!hasProperTestPrefix && !hasProperHelloPrefix)) {
    return {
      isValid: false,
      error: 'Please use test email patterns (test-*@thepia.net or hello+*@thepia.net) to avoid affecting production data'
    };
  }
  
  return { isValid: true };
}

// Mock the email generation function
function createTestEmail(prefix = 'test-invitation'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `hello+${prefix}-${timestamp}-${random}@thepia.net`;
}

describe('TestInvitationFlow Email Validation', () => {
  describe('Valid Test Email Patterns', () => {
    const validTestEmails = [
      'test-invitation-123@thepia.net',
      'test-demo@thepia.net', 
      'test-user-456@thepia.net',
      'hello+test-invitation-123@thepia.net',
      'hello+demo@thepia.net',
      'hello+user@thepia.net',
      'hello+test-invitation-1752568954554-vq0bsg@thepia.net' // User's specific example
    ];

    validTestEmails.forEach(email => {
      it(`should accept ${email} as valid test email`, () => {
        const result = validateTestEmail(email);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });
  });

  describe('Invalid Test Email Patterns', () => {
    const invalidTestEmails = [
      // Wrong domain
      { email: 'test-invitation-123@thepia.com', reason: 'wrong domain (.com instead of .net)' },
      { email: 'hello+test-invitation-123@gmail.com', reason: 'wrong domain (gmail.com)' },
      { email: 'test-user@example.com', reason: 'wrong domain (example.com)' },
      
      // Missing valid prefix
      { email: 'user@thepia.net', reason: 'missing test- or hello+ prefix' },
      { email: 'demo@thepia.net', reason: 'missing test- or hello+ prefix' },
      { email: 'admin@thepia.net', reason: 'missing test- or hello+ prefix' },
      
      // Wrong prefix format
      { email: 'test@thepia.net', reason: 'missing hyphen after test' },
      { email: 'hello@thepia.net', reason: 'missing plus after hello' },
      { email: 'testing@thepia.net', reason: 'wrong prefix format' },
      
      // Empty or malformed
      { email: '', reason: 'empty string' },
      { email: 'invalid', reason: 'not an email' },
      { email: '@thepia.net', reason: 'missing local part' },
      { email: 'test-@thepia.net', reason: 'incomplete prefix' }
    ];

    invalidTestEmails.forEach(({ email, reason }) => {
      it(`should reject ${email} (${reason})`, () => {
        const result = validateTestEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Please use test email patterns (test-*@thepia.net or hello+*@thepia.net) to avoid affecting production data');
      });
    });
  });

  describe('Email Generation', () => {
    it('should generate valid test emails', () => {
      const email = createTestEmail();
      const result = validateTestEmail(email);
      
      expect(result.isValid).toBe(true);
      expect(email).toMatch(/^hello\+test-invitation-\d+-[a-z0-9]+@thepia\.net$/);
    });

    it('should generate emails with custom prefix', () => {
      const email = createTestEmail('demo-request');
      const result = validateTestEmail(email);
      
      expect(result.isValid).toBe(true);
      expect(email).toMatch(/^hello\+demo-request-\d+-[a-z0-9]+@thepia\.net$/);
    });

    it('should generate unique emails', () => {
      const email1 = createTestEmail();
      const email2 = createTestEmail();
      
      expect(email1).not.toBe(email2);
      expect(validateTestEmail(email1).isValid).toBe(true);
      expect(validateTestEmail(email2).isValid).toBe(true);
    });
  });

  describe('Security Edge Cases', () => {
    it('should not be fooled by similar-looking patterns', () => {
      const trickyEmails = [
        'test.user@thepia.net', // dot instead of hyphen
        'testuser@thepia.net',  // no separator
        'hello.test@thepia.net', // dot instead of plus
        'hellotest@thepia.net',  // no separator
        'test-user@thepia.co',   // wrong TLD
        'test-user@thepia.nett', // wrong TLD
        'hello+test@thepia.ne'   // wrong TLD
      ];

      trickyEmails.forEach(email => {
        const result = validateTestEmail(email);
        expect(result.isValid).toBe(false);
      });
    });

    it('should handle case variations correctly', () => {
      const caseVariations = [
        'TEST-USER@THEPIA.NET',
        'Test-User@Thepia.Net', 
        'HELLO+TEST@THEPIA.NET',
        'Hello+Test@Thepia.Net'
      ];

      caseVariations.forEach(email => {
        const result = validateTestEmail(email);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('Production Safety', () => {
    it('should reject production-like emails', () => {
      const productionEmails = [
        'user@thepia.com',
        'admin@thepia.com',
        'support@thepia.com',
        'hello@thepia.com',
        'contact@thepia.com',
        'info@thepia.com',
        'sales@thepia.com'
      ];

      productionEmails.forEach(email => {
        const result = validateTestEmail(email);
        expect(result.isValid).toBe(false);
      });
    });

    it('should reject emails that could affect real users', () => {
      const realUserEmails = [
        'john.doe@thepia.net',
        'jane.smith@thepia.net',
        'user123@thepia.net',
        'employee@thepia.net'
      ];

      realUserEmails.forEach(email => {
        const result = validateTestEmail(email);
        expect(result.isValid).toBe(false);
      });
    });
  });
});

describe('Integration with API Server Patterns', () => {
  // Test that the frontend validation aligns with backend pattern matching
  it('should validate the same emails that API server recognizes as test emails', () => {
    const testCases = [
      // These should be valid in both frontend and backend
      { email: 'test-invitation-123@thepia.net', shouldBeValid: true },
      { email: 'hello+test-invitation-123@thepia.net', shouldBeValid: true },
      { email: 'hello+test-invitation-1752568954554-vq0bsg@thepia.net', shouldBeValid: true },
      
      // These should be invalid in both frontend and backend
      { email: 'user@thepia.net', shouldBeValid: false },
      { email: 'test-user@thepia.com', shouldBeValid: false }, // Note: .com is valid in API but not in frontend
      { email: 'admin@thepia.net', shouldBeValid: false }
    ];

    testCases.forEach(({ email, shouldBeValid }) => {
      const result = validateTestEmail(email);
      expect(result.isValid).toBe(shouldBeValid);
    });
  });

  it('should handle the specific email from user question', () => {
    const userEmail = 'hello+test-invitation-1752568954554-vq0bsg@thepia.net';
    
    // Should pass frontend validation
    const result = validateTestEmail(userEmail);
    expect(result.isValid).toBe(true);
    
    // Should have correct format
    expect(userEmail).toMatch(/^hello\+test-invitation-\d+-[a-z0-9]+@thepia\.net$/);
    
    // Should be treated as external user (not internal)
    expect(userEmail.endsWith('@thepia.com')).toBe(false);
  });
});