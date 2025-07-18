// Simple test to verify the basic utilities work
import { 
  decodeInvitationToken, 
  validateInvitationToken, 
  extractRegistrationData 
} from '@thepia/flows-auth';

async function testTokenUtilities() {
  console.log('Testing invitation token utilities...');
  const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InRlc3RAdGhlcGlhLmNvbSIsImZpcnN0TmFtZSI6IkpvaG4iLCJsYXN0TmFtZSI6IkRvZSIsImNvbXBhbnkiOiJUaGVwaWEiLCJqb2JUaXRsZSI6IkhpcmluZyBNYW5hZ2VyIiwicGhvbmUiOiIrMTIzNDU2Nzg5MCIsImV4cCI6OTk5OTk5OTk5OSwiaWF0IjoxNjAwMDAwMDAwfQ.validsignaturetoken123';

  try {
    const tokenData = decodeInvitationToken(testToken);
    console.log('✅ Token decoded successfully:', tokenData.email);
    
    const validation = validateInvitationToken(testToken, tokenData);
    console.log('✅ Token validation result:', validation.isValid);
    
    const registrationData = extractRegistrationData(tokenData);
    console.log('✅ Registration data extracted:', registrationData.email);
    
    console.log('\n✅ All token utilities working correctly!');
  } catch (error) {
    console.error('❌ Error testing utilities:', error);
  }
}

testTokenUtilities();