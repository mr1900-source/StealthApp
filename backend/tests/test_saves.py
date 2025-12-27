import pytest
from app.models.save import SaveCategory, SaveVisibility


class TestSaves:
    def test_create_save(self, client, auth_headers):
        response = client.post("/saves", json={
            "title": "El Centro",
            "description": "Great tacos and margs",
            "category": "restaurant",
            "location_name": "Georgetown, DC",
            "tags": "mexican,date night"
        }, headers=auth_headers)
        
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "El Centro"
        assert data["category"] == "restaurant"
        assert data["visibility"] == "friends"
    
    def test_create_save_minimal(self, client, auth_headers):
        """Test creating save with just title."""
        response = client.post("/saves", json={
            "title": "Cool spot"
        }, headers=auth_headers)
        
        assert response.status_code == 201
        assert response.json()["title"] == "Cool spot"
    
    def test_create_save_unauthenticated(self, client):
        response = client.post("/saves", json={"title": "Test"})
        assert response.status_code == 403
    
    def test_get_my_saves(self, client, auth_headers):
        # Create a few saves
        client.post("/saves", json={"title": "Save 1"}, headers=auth_headers)
        client.post("/saves", json={"title": "Save 2"}, headers=auth_headers)
        
        response = client.get("/saves", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
    
    def test_get_my_saves_filter_category(self, client, auth_headers):
        client.post("/saves", json={"title": "Restaurant", "category": "restaurant"}, headers=auth_headers)
        client.post("/saves", json={"title": "Bar", "category": "bar"}, headers=auth_headers)
        
        response = client.get("/saves?category=restaurant", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == "Restaurant"
    
    def test_get_single_save(self, client, auth_headers):
        create_resp = client.post("/saves", json={"title": "Test Save"}, headers=auth_headers)
        save_id = create_resp.json()["id"]
        
        response = client.get(f"/saves/{save_id}", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["title"] == "Test Save"
    
    def test_update_save(self, client, auth_headers):
        create_resp = client.post("/saves", json={"title": "Original"}, headers=auth_headers)
        save_id = create_resp.json()["id"]
        
        response = client.patch(f"/saves/{save_id}", json={
            "title": "Updated",
            "description": "New description"
        }, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated"
        assert data["description"] == "New description"
    
    def test_delete_save(self, client, auth_headers):
        create_resp = client.post("/saves", json={"title": "To Delete"}, headers=auth_headers)
        save_id = create_resp.json()["id"]
        
        response = client.delete(f"/saves/{save_id}", headers=auth_headers)
        assert response.status_code == 204
        
        # Verify deleted
        get_resp = client.get(f"/saves/{save_id}", headers=auth_headers)
        assert get_resp.status_code == 404
    
    def test_cannot_update_others_save(self, client, auth_headers, auth_headers2):
        # User 1 creates save
        create_resp = client.post("/saves", json={"title": "User1 Save"}, headers=auth_headers)
        save_id = create_resp.json()["id"]
        
        # User 2 tries to update
        response = client.patch(f"/saves/{save_id}", json={"title": "Hacked"}, headers=auth_headers2)
        assert response.status_code == 404  # Not found because not their save


class TestLinkParser:
    def test_parse_google_maps_link(self, client, auth_headers):
        # Note: This will do a real HTTP request in tests
        # In production, you'd mock this
        response = client.post(
            "/saves/parse-link",
            params={"url": "https://www.google.com/maps/place/Georgetown/@38.9076,-77.0723,15z"},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["source_type"] == "google_maps"
    
    def test_parse_invalid_url(self, client, auth_headers):
        response = client.post(
            "/saves/parse-link",
            params={"url": "not-a-valid-url"},
            headers=auth_headers
        )
        assert response.status_code == 200
        # Should still return a response, just with success=False or partial data
