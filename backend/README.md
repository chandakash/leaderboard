<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
## Security Measures

The application implements several security measures to protect against common attacks:

### API Security and Rate Limiting

1. **API Token Authentication**
   - All API requests require a valid HMAC token in the `Authorization` header
   - Token must be generated using the request payload, user ID, and timestamp
   - Format: `Authorization: Bearer <token>`

2. **Request Signing Process**
   - Include `X-Request-Timestamp` header with current timestamp in milliseconds
   - Include `X-User-Id` header with the user's ID
   - Create token: `HMAC-SHA256(apiSecret, userId + timestamp + path + method + JSON.stringify(body))`

3. **Rate Limiting**
   - Global rate limits are applied to all API endpoints
   - Each IP is limited to a configurable number of requests per minute
   - User-specific rate limits for score submissions

### Input Validation and Injection Prevention

1. **Input Validation**
   - All request DTOs use class-validator for strict input validation
   - Score values are validated to be positive numbers within reasonable ranges
   - User IDs are validated as positive integers

2. **SQL Injection Prevention**
   - TypeORM with parameterized queries to prevent SQL injection
   - Strict typing and validation prevents malicious inputs

### Data Tampering Prevention

1. **Replay Attack Prevention**
   - Requests include timestamp that must be within 5 minutes of server time
   - Each token can only be used once (tracked in memory)
   - Tokens expire after 5 minutes

2. **Score Validation**
   - Score values are validated against reasonable ranges
   - Suspicious patterns (extremely high scores, rapid submissions) are monitored
   - User submission history is tracked for anomaly detection

### XSS Prevention

1. **Content Security Policy**
   - Helmet middleware with strict CSP directives
   - Restricts resource loading to trusted sources

2. **Output Sanitization**
   - All user-generated content (usernames, etc.) is sanitized before output
   - HTML special characters are escaped to prevent script injection

3. **Additional Headers**
   - X-Content-Type-Options to prevent MIME sniffing
   - X-XSS-Protection enabled
   - Referrer-Policy set to restrict information leakage

### Client Integration

To integrate with the secure API:

```javascript
// Example client-side code to generate a valid request
function createSecureRequest(userId, method, path, body = {}) {
  const timestamp = Date.now();
  const apiSecret = 'your-api-secret-key'; // Should be stored securely
  
  // Create payload for HMAC
  const payload = `${userId}:${timestamp}:${path}:${method}:${JSON.stringify(body)}`;
  
  // Generate HMAC token
  const token = CryptoJS.HmacSHA256(payload, apiSecret).toString(CryptoJS.enc.Hex);
  
  // Set request headers
  const headers = {
    'Authorization': `Bearer ${token}`,
    'X-Request-Timestamp': timestamp,
    'X-User-Id': userId,
    'Content-Type': 'application/json'
  };
  
  return { headers, body };
}

// Example usage for score submission
const { headers, body } = createSecureRequest(
  123, // userId
  'POST',
  '/api/leaderboard/submit',
  { user_id: 123, score: 1000, game_mode: 'solo' }
);

fetch('https://api.example.com/api/leaderboard/submit', {
  method: 'POST',
  headers: headers,
  body: JSON.stringify(body)
})
.then(response => response.json())
.then(data => console.log(data));
```

## Redis-based Leaderboard Implementation

This application uses Redis sorted sets for efficient leaderboard management. This approach provides several benefits:

1. **High Performance**: Redis sorted sets provide O(log(N)) operations for score updates and rank retrievals.
2. **Real-time Rankings**: Ranks are automatically maintained by Redis, eliminating manual rank calculations.
3. **Data Consistency**: Database operations are wrapped in transactions for data integrity.

### Race Condition Prevention

We prevent race conditions through several key mechanisms:

1. **Database-First Approach**: All score submissions are persisted to PostgreSQL first using transactions.
2. **Distributed Locks**: Redis locks prevent concurrent updates to the same user's score, ensuring data integrity.
3. **Atomic Redis Operations**: Redis commands use atomic operations to prevent partial updates.

### Caching Strategy

The system implements an efficient multi-level caching approach:

1. **Raw Leaderboard Cache**: Top scores are cached with a short TTL (1 minute).
2. **Assembled Leaderboard Cache**: Complete responses with usernames are cached separately to avoid repeated database queries.
3. **Automatic Cache Invalidation**: Score updates trigger cache invalidation to ensure data freshness.

### Transaction Flow

When a score is submitted:

1. **Database Transaction**: 
   - Create a game session record
   - Update the user's total score in the leaderboard table
   - Commit the transaction

2. **Redis Update**:
   - Attempt to acquire a lock for the user
   - Update the user's score in the sorted set
   - Release the lock
   
3. **Cache Invalidation**:
   - Invalidate leaderboard caches to ensure data freshness

