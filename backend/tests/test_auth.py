import pytest


class TestAuth:
    def test_signup_success(self, client):
        response = client.post("/auth/signup", json={
            "email": "new@example.com",
            "username": "newuser",
            "password": "password123",
            "name": "New User",
            "school": "Georgetown"
        })
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "new@example.com"
        assert data["username"] == "newuser"
        assert "id" in data
    
    def test_signup_duplicate_email(self, client, test_user):
        response = client.post("/auth/signup", json={
            "email": "test@example.com",  # Same as test_user
            "username": "different",
            "password": "password123"
        })
        assert response.status_code == 400
        assert "Email already registered" in response.json()["detail"]
    
    def test_signup_duplicate_username(self, client, test_user):
        response = client.post("/auth/signup", json={
            "email": "different@example.com",
            "username": "testuser",  # Same as test_user
            "password": "password123"
        })
        assert response.status_code == 400
        assert "Username already taken" in response.json()["detail"]
    
    def test_login_success(self, client, test_user):
        response = client.post("/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
    
    def test_login_wrong_password(self, client, test_user):
        response = client.post("/auth/login", json={
            "email": "test@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
    
    def test_login_nonexistent_user(self, client):
        response = client.post("/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "password123"
        })
        assert response.status_code == 401
    
    def test_get_me_authenticated(self, client, test_user, auth_headers):
        response = client.get("/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["username"] == "testuser"
    
    def test_get_me_unauthenticated(self, client):
        response = client.get("/auth/me")
        assert response.status_code == 403  # No auth header
    
    def test_get_me_invalid_token(self, client):
        response = client.get("/auth/me", headers={"Authorization": "Bearer invalid"})
        assert response.status_code == 401
