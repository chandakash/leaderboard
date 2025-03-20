import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { Counter, Rate, Trend } from 'k6/metrics';

const scoreSubmissions = new Counter('score_submissions');
const leaderboardReads = new Counter('leaderboard_reads');
const failedSubmissions = new Counter('failed_submissions');
const submissionLatency = new Trend('submission_latency');
const leaderboardLatency = new Trend('leaderboard_latency');
const successRate = new Rate('success_rate');

// const API_BASE_URL = 'http://localhost:3000/api';
const API_BASE_URL = 'https://da2b-2401-4900-6307-ddd4-f134-ac68-f0e8-b108.ngrok-free.app/api'
const TEST_USERS = [];

export const options = {
  // Test scenarios
    cloud: {
        projectID: 3755790,
        name: "Leaderboard Load Test",
        distribution: {
          'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 100 },
    },
},
  scenarios: {
    // Warmup: Create test users
    // warmup: {
    //   executor: 'shared-iterations',
    //   vus: 5,
    //   iterations: 5,
    //   maxDuration: '30s',
    //   exec: 'createTestUsers'
    // },
    
    // // Read heavy: simulate leaderboard viewing
    // read_heavy: {
    //   executor: 'ramping-vus',
    //   startVUs: 5,
    //   stages: [
    //     { duration: '5s', target: 30 },  // Ramp up
    //     { duration: '5s', target: 30 },   // Stay at peak
    //     { duration: '5s', target: 0 },   // Ramp down
    //   ],
    //   exec: 'readLeaderboard',
    //   startTime: '10s'
    // },
    
    // Write heavy: simulate concurrent score submissions
    write_heavy: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '5s', target: 50 },  // Ramp up faster
        { duration: '5s', target: 50 },   // Stay at peak 
        { duration: '5s', target: 0 },   // Ramp down
      ],
      exec: 'submitScores',
      startTime: '1s'
    },
    
    // // Mixed: combines read and write operations
    // mixed_load: {
    //   executor: 'constant-arrival-rate',
    //   rate: 30,                        
    //   timeUnit: '1s',
    //   duration: '2m',
    //   preAllocatedVUs: 40,
    //   maxVUs: 100,
    //   exec: 'mixedWorkload',
    //   startTime: '10s'
    // }
  },
  
  thresholds: {
    // Success rate should be at least 95%
    'success_rate': ['rate>0.95'],
    
    // 95% of score submissions should be under 500ms
    'submission_latency': ['p(95)<500'],
    
    // 95% of leaderboard reads should be under 200ms
    'leaderboard_latency': ['p(95)<200'],
    
    // HTTP errors should be less than 5%
    'http_req_failed': ['rate<0.05'],
  },
  
};

export function setup() {
  console.log('Setup: Warming up API and validating connection');
  const res = http.get(`${API_BASE_URL}/leaderboard/top`);
  check(res, {
    'Leaderboard API is accessible': (r) => r.status === 200,
  });
  
  return {
    startTime: new Date().toISOString()
  };
}

export function createTestUsers() {
  const username = `user_${randomIntBetween(1000, 9999)}`;
  
  const res = http.post(`${API_BASE_URL}/users`, JSON.stringify({
    username: username,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (res.status === 201) {
    const userId = JSON.parse(res.body).id;
    TEST_USERS.push(userId);
    console.log(`Created test user ${username} with ID: ${userId}`);
  }
  
  check(res, {
    'User created successfully': (r) => r.status === 201,
  });
  
  sleep(1);
}

export function submitScores() {
  const userId = TEST_USERS.length > 0 
    ? TEST_USERS[randomIntBetween(0, TEST_USERS.length - 1)] 
    : randomIntBetween(1, 5); 
  
  const score = randomIntBetween(10, 1000);
  const gameModes = ['standard', 'time-attack', 'survival', 'multiplayer'];
  const gameMode = gameModes[randomIntBetween(0, gameModes.length - 1)];
  
  const startTime = new Date();
  
  const res = http.post(`${API_BASE_URL}/leaderboard/submit`, JSON.stringify({
    user_id: userId,
    score: score,
    game_mode: gameMode,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  const endTime = new Date();
  const latency = endTime - startTime;
  
  submissionLatency.add(latency);
  scoreSubmissions.add(1);
  
  const success = check(res, {
    'Score submitted successfully': (r) => r.status === 200,
  });
  
  successRate.add(success);
  
  if (!success) {
    failedSubmissions.add(1);
    console.log(`Failed to submit score: ${res.status} - ${res.body}`);
  }

  sleep(randomIntBetween(1, 3) / 10);
}


export function readLeaderboard() {
  group('Leaderboard Reads', () => {
    const startTime = new Date();
    
    const res = http.get(`${API_BASE_URL}/leaderboard/top?limit=10`);
    
    const endTime = new Date();
    const latency = endTime - startTime;
    
    leaderboardLatency.add(latency);
    leaderboardReads.add(1);
    
    const success = check(res, {
      'Leaderboard retrieved successfully': (r) => r.status === 200,
      'Leaderboard has entries': (r) => {
        const data = JSON.parse(r.body);
        return Array.isArray(data.data) && data.data.length > 0;
      },
    });
    
    successRate.add(success);
    
    if (Math.random() < 0.3 && TEST_USERS.length > 0) {
      const userId = TEST_USERS[randomIntBetween(0, TEST_USERS.length - 1)];
      const userRankRes = http.get(`${API_BASE_URL}/leaderboard/rank/${userId}`);
      
      check(userRankRes, {
        'User rank retrieved successfully': (r) => r.status === 200,
      });
    }
    
    sleep(randomIntBetween(1, 5) / 10);
  });
}

export function mixedWorkload() {
  if (Math.random() < 0.7) {
    readLeaderboard();
  } else {
    submitScores();
  }
}

export function teardown(data) {
  console.log(`Test completed. Started at: ${data.startTime}`);
  console.log(`Total score submissions: ${scoreSubmissions.value}`);
  console.log(`Total leaderboard reads: ${leaderboardReads.value}`);
} 