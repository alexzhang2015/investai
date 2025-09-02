// Simple test to verify frontend-backend connection
const testConnection = async () => {
  try {
    // Test health endpoint
    const healthResponse = await fetch('http://localhost:8000/health');
    const healthData = await healthResponse.json();
    console.log('Health check:', healthData);
    
    // Test if frontend is running
    const frontendResponse = await fetch('http://localhost:3000');
    console.log('Frontend status:', frontendResponse.status);
    
    console.log('✅ Connection test passed!');
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
  }
};

testConnection();