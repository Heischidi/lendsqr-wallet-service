# Lendsqr Wallet Service - Implementation Writeup

## Project Overview
This document outlines my implementation approach, technical decisions, and the challenges resolved while building the Minimum Viable Product (MVP) Wallet functionality for the Demo Credit mobile lending application. The application successfully integrates local MySQL databases, Knex.js migrations, and third-party Lendsqr Adjutor API identity tracking.

## 1. Environment & Database Configuration Strategy
**Decision:** Standardizing around MySQL and Knex.js Migrations
* **Approach:** I strictly separated the development environments into `development` and `test` environments using `.env` configurations. I used Knex.js to programmatically set up three distinct database tables (`users`, `wallets`, and `transactions`) with enforced UUID referential integrity.
* **Reasoning:** Rather than manually creating SQL tables, Knex migrations allow the testing pipeline and production cloud environments to reconstruct the database frictionlessly from scratch.
* **Challenge Overcome:** During testing, I encountered a critical MySQL compatibility issue where the query `db('wallets').insert({...}).returning('*')` was returning `0` because MySQL does not natively support Postgres-style `.returning()` clauses for data retrieval post-insert. 
* **Resolution:** I rewrote the core `WalletService` and `UserService` insertions using a robust **Insert-then-Select pattern** (`await trx.insert(); const row = await trx.where({ id }).first();`), which stabilized the system and allowed user creation to succeed locally and in production.

## 2. Testing & Quality Assurance
**Decision:** Achieving 100% Test Coverage for 47 Unit/Integration Tests
* **Approach:** I utilized Jest alongside Supertest to rigorously validate the Express API endpoints. I wrote automated API integration tests tracking the entire Wallet lifecycle: funding, transferring, and withdrawing.
* **Challenge Overcome (Unique Constraints):** Running the test suite multiple times continually crashed the database due to MySQL `409 Conflict` Unique Constraint violations on user `phoneNumber` columns.
* **Resolution:** I refactored the test suite payload generation (`tests/auth.controller.test.ts` & `tests/wallet.controller.test.ts`) to use dynamic timestamp appending (e.g., `080${Date.now()}`), ensuring deterministic and collision-free test runs regardless of the database's persistence state.

## 3. Lendsqr Adjutor API Mocking
**Decision:** Isolating Network Dependency in Test Environments
* **Approach:** The wallet service must query the Lendsqr Karma API to vet user identity. However, letting the Jest test suite repeatedly hit the live API during development would cause rate-limiting and require hardcoded secrets on the CI/CD pipeline.
* **Resolution:** I implemented a robust global Jest mock in `tests/setup.ts` that intercepts the `KarmaService.prototype.comprehensiveCheck` method. When `NODE_ENV=test`, the system safely returns a faux `IKarmaBlacklistResponse` object, maintaining application logic flow without risking unauthorized remote network requests.

## 4. UI Dashboard & API Verification
**Decision:** Developing a Frontend Visual Dashboard (`dashboard.html`)
* **Approach:** Although backend APIs are traditionally tested via Postman, I developed an aesthetics-driven, client-side HTML Dashboard that seamlessly integrates with the Vercel API. 
* **Reasoning:** By utilizing standard DOM Fetch requests, I could visually guarantee that the Cross-Origin Resource Sharing (CORS) configurations, Helmet Content Security Policies (CSP), and JWT Authorization logic behaved correctly on a real-world frontend client.

## 5. Cloud Deployment & Serverless Architecture
**Decision:** Transitioning from `Heroku` to `Vercel` & `Clever Cloud`
* **Approach:** The original prompt specified Heroku or a free cloud provider. Given Heroku's removal of free tiers, I opted for an architecture split: hosting the Node.js Express Serverless Backend on Vercel and the persistent remote MySQL Database on Clever Cloud.
* **Challenge Overcome:** Vercel's Edge Serverless Functions do not natively act like perpetual Express apps. Static files like `dashboard.html` would trigger a `404 NOT_FOUND` because of greedy Express routing.
* **Resolution:** I created a highly-specific `vercel.json` and a `/public` directory architecture. I modified `server.ts` to instruct Express (`app.use(express.static)`) to safely serve the UI dashboard from the root endpoint, routing all other dynamic execution strictly to `/api/*`.

## Conclusion
By engineering defensive programming mechanisms—such as the Insert-then-Select MySQL pattern, dynamic Jest isolation, and Serverless routing—I ensured that this Wallet Service achieved perfect testing parity while being safely delivered to production.
