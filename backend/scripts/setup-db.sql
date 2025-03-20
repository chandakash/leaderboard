
DROP TABLE IF EXISTS leaderboard;
DROP TABLE IF EXISTS game_sessions;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE game_sessions (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  score INT NOT NULL,
  game_mode VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_game_sessions_user_id ON game_sessions(user_id);

CREATE TABLE leaderboard (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  total_score INT NOT NULL,
  rank INT
);
CREATE INDEX idx_leaderboard_user_id ON leaderboard(user_id);
CREATE INDEX idx_leaderboard_rank ON leaderboard(rank);
CREATE INDEX idx_leaderboard_total_score ON leaderboard(total_score DESC);

INSERT INTO users (username) VALUES
  ('akash'),
  ('aman'),
  ('hello'),
  ('jenny'),
  ('bob');


INSERT INTO game_sessions (user_id, score, game_mode) VALUES
  (1, 100, 'solo'),
  (1, 150, 'solo'),
  (2, 200, 'pvp'),
  (2, 250, 'pvp'),
  (3, 300, 'pvp'),
  (3, 350, 'rumble'),
  (4, 400, 'rumble'),
  (4, 450, 'rumble'),
  (5, 500, 'rumble'),
  (5, 550, 'rumble');

INSERT INTO leaderboard (user_id, total_score, rank) VALUES
  (1, 250, 5),
  (2, 450, 4),
  (3, 650, 3),
  (4, 850, 2),
  (5, 1050, 1);

UPDATE leaderboard
SET rank = ranks.rank
FROM (
  SELECT 
    id,
    RANK() OVER (ORDER BY total_score DESC) as rank
  FROM leaderboard
) ranks
WHERE leaderboard.id = ranks.id; 