#!/usr/bin/env python3
import requests
import json

BASE_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Health check: {response.status_code} - {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_auth():
    """Test authentication endpoints"""
    # Test registration
    test_user = {
        "username": f"testuser_{hash('test')}",
        "email": f"test_{hash('test')}@example.com",
        "password": "Test123!",
        "full_name": "Test User"
    }
    
    try:
        # Register
        response = requests.post(f"{BASE_URL}/auth/register", json=test_user)
        print(f"Registration: {response.status_code}")
        if response.status_code == 200:
            print(f"Registration successful: {response.json()}")
            
            # Login
            login_data = {
                "username": test_user["username"],
                "password": test_user["password"]
            }
            login_response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
            print(f"Login: {login_response.status_code}")
            if login_response.status_code == 200:
                token = login_response.json().get("access_token")
                print(f"Login successful, token: {token[:20]}...")
                return True
        else:
            print(f"Registration failed: {response.text}")
            
    except Exception as e:
        print(f"Auth test failed: {e}")
    
    return False

def main():
    print("Testing InvestAI API endpoints...")
    
    health_ok = test_health()
    auth_ok = test_auth()
    
    print(f"\nResults:")
    print(f"Health check: {'✓' if health_ok else '✗'}")
    print(f"Authentication: {'✓' if auth_ok else '✗'}")
    
    if health_ok and auth_ok:
        print("\n✅ All API tests passed!")
        return 0
    else:
        print("\n❌ Some API tests failed!")
        return 1

if __name__ == "__main__":
    exit(main())