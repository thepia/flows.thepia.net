/**
 * WebAuthn Registration Flow Test
 * Tests the complete registration flow step by step to identify failure points
 */

// Node.js polyfills for browser globals
if (typeof global !== 'undefined' && typeof global.btoa === 'undefined') {
  global.btoa = (str) => Buffer.from(str).toString('base64');
}

// Configuration
const API_BASE_URL = 'https://dev.thepia.com:8443';
const TEST_USER_EMAIL = 'test-webauthn-' + Date.now() + '@thepia.net';
const TEST_USER_DATA = {
  email: TEST_USER_EMAIL,
  firstName: 'Test',
  lastName: 'User',
  acceptedTerms: true,
  acceptedPrivacy: true
};

// Generate a proper test invitation token
function generateTestInvitationToken(email) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  const payload = {
    email: email,
    name: 'Test User',
    firstName: 'Test',
    lastName: 'User',
    company: 'Test Company',
    workflowType: 'Employee Onboarding',
    comment: 'Test request for WebAuthn registration flow',
    demoDuration: '14_days',
    teamSize: '2-5',
    timeline: 'this_week',
    role: 'Developer',
    requestId: 'test_' + Date.now(),
    createdAt: new Date().toISOString(),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days from now
  };
  
  // Create a simple JWT-like token (for testing purposes)
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signature = 'test-signature-' + Date.now();
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

const MOCK_INVITATION_TOKEN = generateTestInvitationToken(TEST_USER_EMAIL);

console.log('🧪 Starting WebAuthn Registration Flow Test');
console.log('📧 Test email:', TEST_USER_EMAIL);
console.log('🔗 API Base URL:', API_BASE_URL);

/**
 * Test Step 1: Check API Health
 */
async function testApiHealth() {
  console.log('\n🔍 Step 1: Testing API Health');
  
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ API Health check passed:', data);
    return true;
  } catch (error) {
    console.error('❌ API Health check failed:', error.message);
    return false;
  }
}

/**
 * Test Step 2: Check User Existence
 */
async function testCheckUser() {
  console.log('\n🔍 Step 2: Testing User Check');
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/check-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        email: TEST_USER_EMAIL
      })
    });
    
    if (!response.ok) {
      throw new Error(`User check failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ User check passed:', data);
    
    if (data.exists) {
      console.log('⚠️ User already exists - may need cleanup');
    }
    
    return data;
  } catch (error) {
    console.error('❌ User check failed:', error.message);
    return null;
  }
}

/**
 * Test Step 3: User Registration
 */
async function testUserRegistration() {
  console.log('\n🔍 Step 3: Testing User Registration');
  
  try {
    const registrationData = {
      ...TEST_USER_DATA,
      invitationToken: MOCK_INVITATION_TOKEN
    };
    
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(registrationData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Registration failed: ${response.status} - ${errorData.error}`);
    }
    
    const data = await response.json();
    console.log('✅ User registration passed:', data);
    
    if (data.user && data.user.id) {
      console.log('👤 User created with ID:', data.user.id);
      return data.user;
    } else {
      console.log('⚠️ User data missing or incomplete');
      return null;
    }
  } catch (error) {
    console.error('❌ User registration failed:', error.message);
    return null;
  }
}

/**
 * Test Step 4: WebAuthn Registration Options
 */
async function testWebAuthnRegistrationOptions(user) {
  console.log('\n🔍 Step 4: Testing WebAuthn Registration Options');
  
  if (!user || !user.id) {
    console.error('❌ No user provided for WebAuthn registration');
    return null;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/webauthn/register-options`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        email: TEST_USER_EMAIL,
        userId: user.id
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`WebAuthn options failed: ${response.status} - ${errorData.error}`);
    }
    
    const data = await response.json();
    console.log('✅ WebAuthn registration options passed');
    console.log('🔑 Challenge length:', data.challenge?.length);
    console.log('🏢 RP ID:', data.rp?.id);
    console.log('👤 User ID type:', typeof data.user?.id);
    console.log('🔧 Authenticator selection:', data.authenticatorSelection);
    
    return data;
  } catch (error) {
    console.error('❌ WebAuthn registration options failed:', error.message);
    return null;
  }
}

/**
 * Test Step 5: Mock WebAuthn Credential Creation
 * (This simulates what the browser would do)
 */
async function testMockCredentialCreation(registrationOptions) {
  console.log('\n🔍 Step 5: Testing Mock Credential Creation');
  
  if (!registrationOptions) {
    console.error('❌ No registration options provided');
    return null;
  }
  
  try {
    // Create a mock credential response that matches what a real browser would send
    // Note: This uses proper base64url encoding and realistic format
    const credentialId = 'mock-credential-id-' + Date.now();
    const mockCredentialResponse = {
      id: credentialId,
      rawId: credentialId,
      response: {
        clientDataJSON: btoa(JSON.stringify({
          type: 'webauthn.create',
          challenge: registrationOptions.challenge,
          origin: 'https://dev.thepia.com:8443',
          crossOrigin: false
        })),
        attestationObject: 'mock-attestation-object-' + Date.now(),
        transports: ['internal']
      },
      type: 'public-key',
      clientExtensionResults: {},
      authenticatorAttachment: 'platform'
    };
    
    console.log('✅ Mock credential created:', {
      id: mockCredentialResponse.id,
      type: mockCredentialResponse.type,
      hasResponse: !!mockCredentialResponse.response,
      challengeLength: registrationOptions.challenge.length
    });
    
    console.log('⚠️ Note: This mock credential will likely fail cryptographic verification');
    console.log('   Real WebAuthn requires proper attestation object and signature validation');
    
    return mockCredentialResponse;
  } catch (error) {
    console.error('❌ Mock credential creation failed:', error.message);
    return null;
  }
}

/**
 * Test Step 6: WebAuthn Registration Verification
 */
async function testWebAuthnRegistrationVerification(user, mockCredential) {
  console.log('\n🔍 Step 6: Testing WebAuthn Registration Verification');
  
  if (!user || !mockCredential) {
    console.error('❌ Missing user or credential for verification');
    return false;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/webauthn/register-verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        userId: user.id,
        registrationResponse: mockCredential
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ WebAuthn verification response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData.error,
        details: errorData.details
      });
      throw new Error(`WebAuthn verification failed: ${response.status} - ${errorData.error}`);
    }
    
    const data = await response.json();
    console.log('✅ WebAuthn registration verification passed:', data);
    
    return data.success;
  } catch (error) {
    console.error('❌ WebAuthn registration verification failed:', error.message);
    return false;
  }
}

/**
 * Test Step 7: Verify Auth0 Device Linking
 */
async function testAuth0DeviceLinking() {
  console.log('\n🔍 Step 7: Testing Auth0 Device Linking');
  
  try {
    const userCheck = await fetch(`${API_BASE_URL}/auth/check-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        email: TEST_USER_EMAIL
      })
    });
    
    if (!userCheck.ok) {
      throw new Error(`User check failed: ${userCheck.status}`);
    }
    
    const userData = await userCheck.json();
    console.log('✅ Auth0 device linking check:', userData);
    
    if (userData.exists && userData.hasWebAuthn) {
      console.log('✅ User has WebAuthn credentials linked');
      return true;
    } else {
      console.log('⚠️ User exists but no WebAuthn credentials found');
      return false;
    }
  } catch (error) {
    console.error('❌ Auth0 device linking check failed:', error.message);
    return false;
  }
}

/**
 * Run Complete Test Suite
 */
async function runCompleteTest() {
  console.log('🚀 Starting Complete WebAuthn Registration Test');
  
  const results = {
    apiHealth: false,
    userCheck: null,
    userRegistration: null,
    webauthnOptions: null,
    mockCredential: null,
    webauthnVerification: false,
    auth0DeviceLinking: false
  };
  
  // Step 1: API Health
  results.apiHealth = await testApiHealth();
  if (!results.apiHealth) {
    console.log('❌ Test failed at API Health check');
    return results;
  }
  
  // Step 2: Check User
  results.userCheck = await testCheckUser();
  if (!results.userCheck) {
    console.log('❌ Test failed at User Check');
    return results;
  }
  
  // Step 3: User Registration
  results.userRegistration = await testUserRegistration();
  if (!results.userRegistration) {
    console.log('❌ Test failed at User Registration');
    return results;
  }
  
  // Step 4: WebAuthn Registration Options
  results.webauthnOptions = await testWebAuthnRegistrationOptions(results.userRegistration);
  if (!results.webauthnOptions) {
    console.log('❌ Test failed at WebAuthn Registration Options');
    return results;
  }
  
  // Step 5: Mock Credential Creation
  results.mockCredential = await testMockCredentialCreation(results.webauthnOptions);
  if (!results.mockCredential) {
    console.log('❌ Test failed at Mock Credential Creation');
    return results;
  }
  
  // Step 6: WebAuthn Registration Verification
  results.webauthnVerification = await testWebAuthnRegistrationVerification(
    results.userRegistration,
    results.mockCredential
  );
  if (!results.webauthnVerification) {
    console.log('❌ Test failed at WebAuthn Registration Verification');
    return results;
  }
  
  // Step 7: Auth0 Device Linking
  results.auth0DeviceLinking = await testAuth0DeviceLinking();
  if (!results.auth0DeviceLinking) {
    console.log('❌ Test failed at Auth0 Device Linking');
    return results;
  }
  
  console.log('\n🎉 All tests passed! WebAuthn registration flow is working correctly.');
  return results;
}

/**
 * Print Test Summary
 */
function printTestSummary(results) {
  console.log('\n📊 Test Summary:');
  console.log('================');
  console.log('✅ API Health:', results.apiHealth ? 'PASS' : 'FAIL');
  console.log('✅ User Check:', results.userCheck ? 'PASS' : 'FAIL');
  console.log('✅ User Registration:', results.userRegistration ? 'PASS' : 'FAIL');
  console.log('✅ WebAuthn Options:', results.webauthnOptions ? 'PASS' : 'FAIL');
  console.log('✅ Mock Credential:', results.mockCredential ? 'PASS' : 'FAIL');
  console.log('✅ WebAuthn Verification:', results.webauthnVerification ? 'PASS' : 'FAIL');
  console.log('✅ Auth0 Device Linking:', results.auth0DeviceLinking ? 'PASS' : 'FAIL');
  
  const passCount = Object.values(results).filter(r => r === true || (r && typeof r === 'object')).length;
  const totalCount = Object.keys(results).length;
  
  console.log(`\n📈 Overall: ${passCount}/${totalCount} tests passed`);
  
  if (passCount === totalCount) {
    console.log('🎉 All tests passed! WebAuthn registration flow is working correctly.');
  } else {
    console.log('❌ Some tests failed. Check the logs above for details.');
  }
}

// Export functions for ES module usage
export {
  runCompleteTest,
  testApiHealth,
  testCheckUser,
  testUserRegistration,
  testWebAuthnRegistrationOptions,
  testMockCredentialCreation,
  testWebAuthnRegistrationVerification,
  testAuth0DeviceLinking,
  printTestSummary
};

// Run the test if this file is executed directly
if (typeof window === 'undefined') {
  // Running in Node.js environment
  runCompleteTest().then(results => {
    printTestSummary(results);
  }).catch(error => {
    console.error('💥 Test suite failed:', error);
  });
}

// Export for browser usage
if (typeof window !== 'undefined') {
  window.webauthnTest = {
    runCompleteTest,
    testApiHealth,
    testCheckUser,
    testUserRegistration,
    testWebAuthnRegistrationOptions,
    testMockCredentialCreation,
    testWebAuthnRegistrationVerification,
    testAuth0DeviceLinking
  };
}