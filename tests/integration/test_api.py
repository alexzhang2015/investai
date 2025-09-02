"""
API集成测试
"""
import pytest
from fastapi import status


class TestAuthAPI:
    """测试认证API"""
    
    def test_register_user(self, client):
        """测试用户注册"""
        user_data = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "testpassword123",
            "full_name": "Test User"
        }
        
        response = client.post("/auth/register", json=user_data)
        
        assert response.status_code == status.HTTP_200_OK
        assert "access_token" in response.json()
        assert response.json()["token_type"] == "bearer"
    
    def test_login_user(self, client):
        """测试用户登录"""
        # 先注册用户
        user_data = {
            "username": "loginuser",
            "email": "login@example.com",
            "password": "loginpassword123"
        }
        client.post("/auth/register", json=user_data)
        
        # 测试登录
        login_data = {
            "username": "loginuser",
            "password": "loginpassword123"
        }
        
        response = client.post("/auth/login", json=login_data)
        
        assert response.status_code == status.HTTP_200_OK
        assert "access_token" in response.json()
    
    def test_login_invalid_credentials(self, client):
        """测试无效凭据登录"""
        login_data = {
            "username": "nonexistent",
            "password": "wrongpassword"
        }
        
        response = client.post("/auth/login", json=login_data)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestAnalysisAPI:
    """测试分析API"""
    
    @pytest.fixture
    def auth_token(self, client):
        """获取认证token"""
        user_data = {
            "username": "analysisuser",
            "email": "analysis@example.com",
            "password": "analysispass123"
        }
        
        # 注册用户
        client.post("/auth/register", json=user_data)
        
        # 登录获取token
        login_data = {
            "username": "analysisuser",
            "password": "analysispass123"
        }
        
        response = client.post("/auth/login", json=login_data)
        return response.json()["access_token"]
    
    def test_analyze_stock(self, client, auth_token):
        """测试股票分析"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        analysis_request = {
            "stock_code": "00700",
            "analysis_types": ["fundamental", "technical"]
        }
        
        response = client.post(
            "/analysis/stock", 
            json=analysis_request, 
            headers=headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["status"] == "completed"
        assert "task_id" in response.json()
    
    def test_get_analysis_result(self, client, auth_token):
        """测试获取分析结果"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # 先创建一个分析任务
        analysis_request = {
            "stock_code": "00700",
            "analysis_types": ["fundamental"]
        }
        
        create_response = client.post(
            "/analysis/stock", 
            json=analysis_request, 
            headers=headers
        )
        
        task_id = create_response.json()["task_id"]
        
        # 获取分析结果
        response = client.get(f"/analysis/stock/{task_id}", headers=headers)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["task_id"] == task_id
    
    def test_get_analysis_history(self, client, auth_token):
        """测试获取分析历史"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = client.get("/analysis/history", headers=headers)
        
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.json(), list)


class TestHealthAPI:
    """测试健康检查API"""
    
    def test_health_check(self, client):
        """测试健康检查"""
        response = client.get("/health")
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["status"] == "healthy"
        assert "version" in response.json()


class TestRootAPI:
    """测试根API"""
    
    def test_root_endpoint(self, client):
        """测试根端点"""
        response = client.get("/")
        
        assert response.status_code == status.HTTP_200_OK
        assert "message" in response.json()
        assert "version" in response.json()