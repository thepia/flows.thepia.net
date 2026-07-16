// Test file to verify the new flows-auth utilities work correctly
// @ts-nocheck
import {
  DEFAULT_API_CONFIG,
  decodeInvitationToken,
  detectApiServer,
  extractRegistrationData,
  validateInvitationToken,
} from '@thepia/flows-auth';

async function testUtilities() {
  // Test API detection
  console.log('Testing API detection...');
  const apiResult = await detectApiServer(DEFAULT_API_CONFIG);
  console.log('API Detection Result:', apiResult);

  // Test invitation token utilities
  console.log('\nTesting invitation token utilities...');
  const testToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InRlc3RAdGhlcGlhLmNvbSIsImZpcnN0TmFtZSI6IkpvaG4iLCJsYXN0TmFtZSI6IkRvZSIsImNvbXBhbnkiOiJUaGVwaWEiLCJqb2JUaXRsZSI6IkhpcmluZyBNYW5hZ2VyIiwicGhvbmUiOiIrMTIzNDU2Nzg5MCIsImV4cCI6OTk5OTk5OTk5OSwiaWF0IjoxNjAwMDAwMDAwfQ.validsignaturetoken123';

  try {
    const tokenData = decodeInvitationToken(testToken);
    console.log('Token decoded successfully:', tokenData);

    const validation = validateInvitationToken(testToken, tokenData);
    console.log('Token validation result:', validation);

    const registrationData = extractRegistrationData(tokenData);
    console.log('Registration data:', registrationData);

    console.log('\n✅ All utilities working correctly!');
  } catch (error) {
    console.error('❌ Error testing utilities:', error);
  }
}

testUtilities();
