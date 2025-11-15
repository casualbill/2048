#!/usr/bin/env python3

import requests
import json

BASE_URL = "http://localhost:8080/api/v1"

def test_submit_game_record():
    """Test submitting a game record"""
    url = f"{BASE_URL}/game/record"
    
    payload = {
        "player_name": "TestPlayer",
        "score": 2048,
        "game_time": 123456,
        "operations": [
            {
                "direction": 1,
                "timestamp": 1234567890,
                "score": 4,
                "score_change": 2,
                "game_time_elapsed": 1000
            }
        ],
        "size": 4,
        "won": True,
        "over": True
    }
    
    response = requests.post(url, json=payload)
    print(f"Submit Game Record: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
    return response.json()

def test_get_score_leaderboard():
    """Test getting score leaderboard"""
    url = f"{BASE_URL}/game/leaderboard/score"
    response = requests.get(url)
    print(f"\nScore Leaderboard: {response.status_code}")
    print(json.dumps(response.json(), indent=2))

def test_get_time_leaderboard():
    """Test getting time leaderboard"""
    url = f"{BASE_URL}/game/leaderboard/time"
    response = requests.get(url)
    print(f"\nTime Leaderboard: {response.status_code}")
    print(json.dumps(response.json(), indent=2))

def test_get_player_records():
    """Test getting player records"""
    url = f"{BASE_URL}/game/player/TestPlayer"
    response = requests.get(url)
    print(f"\nPlayer Records: {response.status_code}")
    print(json.dumps(response.json(), indent=2))

if __name__ == "__main__":
    print("Testing 2048 Game API...")
    test_submit_game_record()
    test_get_score_leaderboard()
    test_get_time_leaderboard()
    test_get_player_records()