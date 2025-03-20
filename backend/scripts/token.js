const crypto = require('crypto');

function createSecureRequest(userId, method, path, body = {}) {
  const timestamp = Date.now();
  const apiSecret = 'a1k2a3s4h5c6h7a8n9d'; 
  
  const payload = `${userId}:${timestamp}:${path}:${method}:${JSON.stringify(body)}`;
  
  const token = crypto
    .createHmac('sha256', apiSecret)
    .update(payload)
    .digest('hex');
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'X-Request-Timestamp': timestamp,
    'Content-Type': 'application/json'
  };
  
  return { headers, body };
}

const userId = "user_1";
const { headers, body } = createSecureRequest(
  userId,
  'POST',
  '/api/leaderboard/submit',
  { user_id: userId, score: 1000, game_mode: 'solo' }
);

console.log('Generated Headers:');
console.log(JSON.stringify(headers, null, 2));
console.log('\nRequest Body:');
console.log(JSON.stringify(body, null, 2));