#!/usr/bin/env node

/**
 * WebAuthn Registration Test Runner
 * Executes the complete WebAuthn registration test suite
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Add Node.js polyfills for browser globals
global.btoa = (str) => Buffer.from(str).toString('base64');

console.log('🧪 WebAuthn Registration Test Runner');
console.log('=====================================');

// Check if API server is running
async function checkApiServer() {
  try {
    const response = await fetch('https://dev.thepia.com:8443/health', {
      method: 'GET',
      timeout: 5000
    });
    
    if (response.ok) {
      console.log('✅ API server is running');
      return true;
    } else {
      console.log('❌ API server returned:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ API server not accessible:', error.message);
    console.log('💡 Please start the API server with: pnpm api:watch');
    return false;
  }
}

// Check if flows.thepia.net dev server is running
async function checkDevServer() {
  try {
    const response = await fetch('https://dev.thepia.net:5176', {
      method: 'GET',
      timeout: 5000
    });
    
    if (response.ok) {
      console.log('✅ flows.thepia.net dev server is running on port 5176');
      return true;
    } else {
      console.log('❌ flows.thepia.net dev server returned:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ flows.thepia.net dev server not accessible:', error.message);
    console.log('💡 Please start the dev server with: pnpm dev');
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('\n🔍 Pre-flight checks...');
  
  // Check API server
  const apiServerRunning = await checkApiServer();
  if (!apiServerRunning) {
    console.log('\n❌ Cannot run tests without API server');
    process.exit(1);
  }
  
  // Check dev server
  const devServerRunning = await checkDevServer();
  if (!devServerRunning) {
    console.log('\n⚠️ Dev server not running - some tests may fail');
  }
  
  console.log('\n🚀 Starting WebAuthn registration tests...');
  
  // Load and run the test suite
  const testPath = path.join(__dirname, '..', 'tests', 'webauthn-registration-test.js');
  
  try {
    // Convert path to file URL for ES module import
    const testFileUrl = `file://${testPath}`;
    const testModule = await import(testFileUrl);
    
    // The test should auto-execute when imported
    console.log('✅ Test module loaded successfully');
  } catch (error) {
    console.error('💥 Test execution failed:', error);
    console.error('Error details:', error.stack);
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});