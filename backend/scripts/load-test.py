import requests
import random
import time

API_BASE_URL = "http://localhost:3000/api/leaderboard"

# Simulate score submission
def submit_score(user_id):
    score = random.randint(1000, 10000)
    requests.post("{}/submit".format(API_BASE_URL), json={"user_id": user_id, "score": score})

# Fetch top players
def get_top_players():
    response = requests.get("{}/top".format(API_BASE_URL))
    return response.json()

# Fetch user rank
def get_user_rank(user_id):
    response = requests.get("{}/rank/{}".format(API_BASE_URL, user_id))
    return response.json()

if __name__ == "__main__":
    while True:
    # for i in range(10000000):
        user_id = random.randint(1, 4)
        submit_score(user_id)
        # print(get_top_players())
        # print(get_user_rank(user_id))
        # time.sleep(random.uniform(0.5, 2))  # Simulate real user interaction