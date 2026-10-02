# Prisma Press Backend

A blogging platform REST API built with **Express 5**, **Prisma 7**, **PostgreSQL** and **TypeScript**.
Users can register, write posts, comment, and subscribe through **Stripe** to unlock premium posts.

> This is a learning project. It covers Prisma
> modelling and relations, searching/filtering/pagination, transactions, JWT authentication with
> role-based access, and Stripe subscriptions with webhooks.

---

## Table of Contents

- [Prisma Press Backend](#prisma-press-backend)
  - [Table of Contents](#table-of-contents)
  - [Tech Stack](#tech-stack)
  - [Features](#features)
  - [Project Structure](#project-structure)
  - [Architecture](#architecture)
  - [Database Schema](#database-schema)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Useful Prisma commands](#useful-prisma-commands)
  - [Environment Variables](#environment-variables)
  - [Scripts](#scripts)
  - [Authentication \& Roles](#authentication--roles)
  - [API Reference](#api-reference)
    - [Users: `/api/users`](#users-apiusers)
    - [Auth: `/api/auth`](#auth-apiauth)
    - [Posts: `/api/posts`](#posts-apiposts)
    - [Comments: `/api/comments`](#comments-apicomments)
    - [Subscription: `/api/subscription`](#subscription-apisubscription)
    - [Premium: `/api/premium`](#premium-apipremium)
  - [Searching, Filtering \& Pagination](#searching-filtering--pagination)
  - [Stripe Subscription Flow](#stripe-subscription-flow)
    - [Testing webhooks locally](#testing-webhooks-locally)
  - [Response Format](#response-format)
  - [Testing with Postman](#testing-with-postman)
  - [What I Learned](#what-i-learned)

---

## Tech Stack

| Area | Technology |
|---|---|
| Runtime | Node.js (ES Modules) |
| Language | TypeScript |
| Framework | Express 5 |
| ORM | Prisma 7 (`prisma-client` generator + `@prisma/adapter-pg`) |
| Database | PostgreSQL |
| Auth | JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, `cookie-parser` |
| Payments | Stripe (Checkout + Webhooks) |
| Dev tooling | `tsx` (watch mode), Stripe CLI |

---

## Features

- **Users**: register (a profile is created along with the user), view and update your own profile
- **Auth**: login with access and refresh tokens (httpOnly cookies), get a new access token with the refresh token
- **Role-based access**: `USER`, `AUTHOR`, `ADMIN`, plus blocked-account checks
- **Posts**: CRUD with ownership checks (admins can manage any post), view counter, "my posts", admin stats
- **Search, filter, sort & paginate** posts from query parameters
- **Comments**: create/update/delete your own comments, list by post or by author, admin moderation
- **Subscriptions**: Stripe Checkout, webhook syncing, cancel at period end, status check
- **Premium posts**: only users with an active subscription can read and manage them
- **Centralized error handling** that maps Prisma errors to readable messages

---

## Project Structure

```
Prisma-Press-Backend/
├── prisma/
│   ├── schema/                  # Multi-file Prisma schema
│   │   ├── schema.prisma        # generator + datasource
│   │   ├── enums.prisma         # Role, ActiveStatus, PostStatus, CommentStatus, SubscriptionStatus
│   │   ├── user.prisma
│   │   ├── profile.prisma
│   │   ├── post.prisma
│   │   ├── comment.prisma
│   │   └── subscription.prisma
│   └── migrations/              # Migration history
├── generated/prisma/            # Generated Prisma Client (git-ignored)
├── prisma7.config.ts            # Prisma config (schema path, migrations path, DATABASE_URL)
├── src/
│   ├── server.ts                # Connects to the DB, then starts the HTTP server
│   ├── app.ts                   # Express app: middlewares + route registration
│   ├── config/index.ts          # Reads environment variables in one place
│   ├── lib/
│   │   ├── prisma.ts            # PrismaClient with the pg driver adapter
│   │   └── stripe.ts            # Stripe client
│   ├── middlewares/
│   │   ├── auth.ts              # JWT verification + role check
│   │   ├── premiumGuards.ts     # Requires an ACTIVE subscription
│   │   ├── globalErrorHandler.ts
│   │   └── notFound.ts
│   ├── utils/
│   │   ├── catchAsync.ts        # Wraps async handlers and forwards errors to next()
│   │   ├── sendResponse.ts      # Consistent JSON response shape
│   │   └── jwt.ts               # createToken / verifyToken
│   └── modules/
│       ├── auth/
│       ├── user/
│       ├── post/
│       ├── comment/
│       ├── premium/
│       └── subscription/
├── Prisma Press Backend.postman_collection.json
├── .env.example
└── package.json
```

Every module follows the same file layout:

| File | Responsibility |
|---|---|
| `*.route.ts` | Defines endpoints and attaches middlewares (`auth`, guards) |
| `*.controller.ts` | Reads `req` (params, body, query, user), calls the service, sends the response |
| `*.service.ts` | Business logic and database queries with Prisma |
| `*.interface.ts` | TypeScript types for payloads and queries |
| `*.utils.ts` | Module-specific helpers (e.g. Stripe webhook handlers) |

---

## Architecture

```
Request
  │
  ▼
app.ts ── cors ── express.raw (webhook only) ── express.json ── cookieParser
  │
  ▼
Route ──► auth(...roles) ──► subscriptionGuard() ──► Controller ──► Service ──► Prisma ──► PostgreSQL
                                                         │
                                                         ▼
                                                   sendResponse()

Any thrown error ──► catchAsync ──► next(error) ──► globalErrorHandler
Unknown route    ──► notFound
```

- **Controllers stay thin.** They don't touch the database; that is the service's job.
- **`catchAsync`** removes repeated `try/catch` blocks from every controller.
- **The Stripe webhook route** receives the **raw** body (`express.raw`), which is registered
  **before** `express.json()`. Stripe needs the untouched body to verify the signature.

---

## Database Schema

```
User 1 ── 1 Profile
User 1 ── 1 Subscription
User 1 ── * Post
User 1 ── * Comment
Post 1 ── * Comment
```

| Model | Key fields |
|---|---|
| **User** | `name`, `email` (unique), `password` (hashed), `role`, `activeStatus` |
| **Profile** | `profilePhoto`, `bio`, `userId` (unique) |
| **Post** | `title`, `content`, `thumbnail`, `isFeatured`, `isPremium`, `status`, `tags[]`, `views` |
| **Comment** | `content`, `status`, `postId`, `authorId` |
| **Subscription** | `status`, `currentPeriodEnd`, `cancelAtPeriodEnd`, `stripeCustomerId`, `stripeSubscriptionId` |

**Enums**

| Enum | Values |
|---|---|
| `Role` | `USER`, `AUTHOR`, `ADMIN` |
| `ActiveStatus` | `ACTIVE`, `BLOCKED` |
| `PostStatus` | `DRAFT`, `PUBLISHED`, `ARCHIVED` |
| `CommentStatus` | `APPROVED`, `REJECT` |
| `SubscriptionStatus` | `ACTIVE`, `CANCELED`, `EXPIRED` |

Posts, comments and subscriptions use `onDelete: Cascade`, so they are removed when their parent is
deleted. `postId` and `authorId` are indexed for faster lookups.

---

## Getting Started

### Prerequisites

- Node.js 20+
- A PostgreSQL database (local, or a hosted one such as Prisma Postgres)
- A Stripe account (test mode) and the [Stripe CLI](https://docs.stripe.com/stripe-cli) for webhooks

### Installation

```bash
# 1. Clone and install
git clone https://github.com/ashikurriyal/Prisma-Press-Backend.git
cd Prisma-Press-Backend
npm install

# 2. Create your env file and fill in the values
cp .env.example .env

# 3. Run migrations (this also generates the Prisma Client)
npx prisma migrate dev --config prisma7.config.ts

# 4. Start the dev server
npm run dev
```

The server prints `Connected to the database successfully` and `Server is running on port <PORT>`.
Open `http://localhost:<PORT>/` to see **"Prisma Press is Running!"**.

> The Prisma config file is named `prisma7.config.ts` (not the default `prisma.config.ts`), so pass
> `--config prisma7.config.ts` to Prisma CLI commands. The generated client lives in
> `generated/prisma`, which is git-ignored. Run `npx prisma generate --config prisma7.config.ts`
> after cloning or after changing the schema.

### Useful Prisma commands

```bash
npx prisma migrate dev --name <name> --config prisma7.config.ts   # create + apply a migration
npx prisma generate --config prisma7.config.ts                    # regenerate the client
npx prisma studio --config prisma7.config.ts                      # browse the database in the browser
```

---

## Environment Variables

Copy `.env.example` to `.env`:

| Variable | Description | Example |
|---|---|---|
| `PORT` | Server port | `5000` |
| `APP_URL` | App URL (used for CORS and Stripe redirect URLs) | `http://localhost:5000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://USER:PASSWORD@HOST:5432/DB?sslmode=require` |
| `BCRYPT_SALT_ROUNDS` | bcrypt cost factor | `10` |
| `JWT_ACCESS_SECRET` | Secret for access tokens | random string |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens | random string |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime | `1d` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime | `7d` |
| `STRIPE_PRODUCT_PRICE_ID` | Stripe Price ID of the subscription plan | `price_...` |
| `STRIPE_SECRET_KEY` | Stripe secret key (test mode) | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Signing secret printed by `stripe listen` | `whsec_...` |

Generate strong secrets with `openssl rand -base64 32`. Never commit your real `.env` file.

---

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Starts the server with `tsx watch` (restarts when files change) |
| `npm run build` | Compiles TypeScript with `tsc` into `dist/` |
| `npm start` | Runs the compiled server from `dist/` |
| `npm run stripe:webhook` | Forwards Stripe events to `localhost:5001/api/subscription/webhook` |

> `stripe:webhook` forwards to port **5001**. Set `PORT=5001` in `.env`, or change the port in the script to match your server.

---

## Authentication & Roles

1. `POST /api/auth/login` checks the password with bcrypt and returns:
   - an **access token** (cookie `accessToken`, 1 day)
   - a **refresh token** (cookie `refreshToken`, 7 days)

   Both cookies are `httpOnly`, and the tokens are also returned in the response body.
2. Protected routes use the `auth(...roles)` middleware. It reads the token from:
   - the `accessToken` cookie, **or**
   - the `Authorization` header (`Bearer <token>` or the raw token)
3. The middleware verifies the token, checks the role, makes sure the user still exists and is not
   `BLOCKED`, then sets `req.user = { id, name, email, role }`.
4. When the access token expires, call `POST /api/auth/refresh-token` (it uses the `refreshToken`
   cookie) to get a new access token.

Premium routes also use `subscriptionGuard()`, which allows the request only if the user's
subscription status is `ACTIVE`.

---

## API Reference

Base URL: `http://localhost:<PORT>/api`

Legend: 🌐 public · 🔒 logged in (roles listed) · ⭐ active subscription required

### Users: `/api/users`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/register` | 🌐 | Register a user and create their profile |
| GET | `/me` | 🔒 ADMIN, USER, AUTHOR | Get my user + profile |
| PUT | `/my-profile` | 🔒 ADMIN, USER, AUTHOR | Update name, email, profilePhoto, bio |

```json
// POST /api/users/register
{ "name": "Lionel Messi", "email": "messi@example.com", "password": "secret123", "profilePhoto": "https://..." }
```

### Auth: `/api/auth`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/login` | 🌐 | Log in, sets `accessToken` + `refreshToken` cookies |
| POST | `/refresh-token` | 🌐 (needs `refreshToken` cookie) | Get a new access token |

```json
// POST /api/auth/login
{ "email": "messi@example.com", "password": "secret123" }
```

### Posts: `/api/posts`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/` | 🔒 USER, ADMIN, AUTHOR | Create a post (`isPremium: true` needs an active subscription) |
| GET | `/` | 🌐 | List non-premium posts with search/filter/pagination |
| GET | `/stats` | 🔒 ADMIN | Post, comment and view statistics |
| GET | `/my-posts` | 🔒 ADMIN, AUTHOR, USER | Posts written by me |
| GET | `/:postId` | 🌐 | Get a single non-premium post (adds 1 to `views`) |
| PATCH | `/:postId` | 🔒 ADMIN, AUTHOR, USER | Update a post (owner or admin) |
| DELETE | `/:postId` | 🔒 ADMIN, AUTHOR, USER | Delete a post (owner or admin) |

```json
// POST /api/posts
{
  "title": "My First Post",
  "content": "This is the content of my first post.",
  "thumbnail": "https://...",
  "tags": ["football", "messi"],
  "isFeatured": false,
  "isPremium": false,
  "status": "PUBLISHED"
}
```

`GET /stats` returns `totalPosts`, `totalPublishedPosts`, `totalDraftPosts`, `totalArchivedPosts`,
`totalComments`, `totalApprovedComments`, `totalRejectedComments` and `totalPostViews` (calculated
with `aggregate._sum`).

### Comments: `/api/comments`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/author/:authorId` | 🌐 | Comments written by an author (includes the post) |
| GET | `/:postId` | 🌐 | Comments of a post |
| POST | `/` | 🔒 USER, ADMIN | Create a comment on an existing post |
| PATCH | `/:commentId` | 🔒 USER, ADMIN | Update my comment |
| DELETE | `/:commentId` | 🔒 USER, ADMIN | Delete my comment |
| PATCH | `/:commentId/moderate` | 🔒 ADMIN | Set the status to `APPROVED` or `REJECT` |

```json
// POST /api/comments
{ "postId": "<post-uuid>", "content": "Great post!" }

// PATCH /api/comments/:commentId/moderate
{ "status": "REJECT" }
```

### Subscription: `/api/subscription`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/checkout` | 🔒 USER, AUTHOR, ADMIN | Create a Stripe Checkout session, returns `paymentUrl` |
| GET | `/status` | 🔒 USER, AUTHOR, ADMIN | Status, `isSubscribed`, `cancelAtPeriodEnd`, `currentPeriodEnd` |
| POST | `/cancel` | 🔒 USER, AUTHOR, ADMIN | Cancel at the end of the current billing period |
| POST | `/webhook` | Stripe only (signature verified) | Receives Stripe events |

### Premium: `/api/premium`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | 🔒⭐ USER, AUTHOR, ADMIN | List premium posts (same query params as `/api/posts`) |
| PATCH | `/:postId` | 🔒⭐ USER, AUTHOR, ADMIN | Update a premium post (owner or admin) |
| DELETE | `/:postId` | 🔒⭐ USER, AUTHOR, ADMIN | Delete a premium post (owner or admin) |

---

## Searching, Filtering & Pagination

`GET /api/posts` and `GET /api/premium` accept these query parameters:

| Param | Type | Behaviour |
|---|---|---|
| `searchTerm` | string | Case-insensitive **partial** match on `title` **OR** `content` |
| `title` | string | **Exact** match |
| `content` | string | **Exact** match |
| `authorId` | string | Posts by this author |
| `isFeatured` | `true` / `false` | Featured filter |
| `status` | `DRAFT` / `PUBLISHED` / `ARCHIVED` | Status filter |
| `tags` | JSON array string | Posts having **any** of the tags (`hasSome`) |
| `page` | number | Page number (default `1`) |
| `limit` | number | Page size (default `10`) |
| `sortBy` | field name | Sort field (default `createdAt`) |
| `sortOrder` | `asc` / `desc` | Sort direction (default `desc`) |

```
GET /api/posts?searchTerm=mes&tags=["football"]&page=2&limit=5&sortBy=views&sortOrder=desc
```

**How it works.** Each filter that is present adds a condition to an `andConditions` array, and the
array is passed as `where: { AND: andConditions }`. Pagination uses `take = limit` and
`skip = (page - 1) * limit`. The response includes:

```json
"meta": { "page": 2, "limit": 5, "total": 23, "totalPages": 5 }
```

Quick rules (from my notes in `post.service.ts`):

```
field: "x"                                     → EXACT match
field: { contains: "x" }                       → PARTIAL match
field: { contains: "x", mode: "insensitive" }  → partial match, ignores case
AND: [ ... ]                                   → ALL conditions must be true
OR:  [ ... ]                                   → AT LEAST ONE condition must be true
```

---

## Stripe Subscription Flow

```
Client                      Backend                              Stripe
  │  POST /checkout           │                                    │
  │ ─────────────────────────►│  create customer (first time)      │
  │                           │  create checkout session ─────────►│
  │ ◄──────── paymentUrl ──── │                                    │
  │  pays on Stripe page ─────────────────────────────────────────►│
  │                           │◄── checkout.session.completed ─────│  upsert Subscription (ACTIVE)
  │                           │◄── customer.subscription.updated ──│  sync status / cancelAtPeriodEnd / period end
  │                           │◄── customer.subscription.deleted ──│  mark CANCELED
```

**Webhook events handled** (see `subscription.utils.ts`):

| Event | Handler | Result |
|---|---|---|
| `checkout.session.completed` | `handleCheckoutCompleted` | Creates or updates the subscription as `ACTIVE` with `currentPeriodEnd` |
| `customer.subscription.updated` | `handleChangeSubscription` | Maps Stripe status → `ACTIVE` / `CANCELED` / `EXPIRED`, updates `cancelAtPeriodEnd` |
| `customer.subscription.deleted` | `handleChangeSubscription` | Marks the subscription `CANCELED` |

**Cancel flow.** `POST /cancel` sets `cancel_at_period_end: true` on Stripe, so the user keeps access
until `currentPeriodEnd`. Stripe then sends `customer.subscription.updated` straight away, and
`customer.subscription.deleted` when the period ends.

### Testing webhooks locally

```bash
stripe login
npm run stripe:webhook            # copy the printed whsec_... into STRIPE_WEBHOOK_SECRET
```

- Test card: `4242 4242 4242 4242`, any future date, any CVC.
- To trigger the deleted event manually: `stripe subscriptions cancel <sub_id>`

---

## Response Format

Every success response uses `sendResponse`:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Post retrieved successfully",
  "data": { },
  "meta": { "page": 1, "limit": 10, "total": 42 }
}
```

Errors are handled by `globalErrorHandler`. It turns Prisma errors into readable messages
(`P2002` duplicate key, `P2003` foreign key, `P2025` record not found, `P1000`/`P1001` database
connection problems):

```json
{
  "success": false,
  "statusCode": 400,
  "name": "PrismaClientKnownRequestError",
  "message": "Duplicate Key Error",
  "error": "<stack trace>"
}
```

Unknown routes return `404` with `{ message: "Route not found", path, date }`.

---

## Testing with Postman

Import **`Prisma Press Backend.postman_collection.json`**. It has folders for Users, Auth, Post,
Comments, Subscription and Premium Posts. Log in first: the cookies are set automatically, or you can
copy the `accessToken` into the `Authorization` header.

---

## What I Learned

- **Prisma 7 setup**: the new `prisma-client` generator, the `@prisma/adapter-pg` driver adapter,
  a `prisma.config.ts`-style config file, and splitting the schema across multiple `.prisma` files
- **Modelling relations**: one-to-one (User ↔ Profile, User ↔ Subscription), one-to-many
  (User → Posts, Post → Comments), cascade deletes, indexes, enums, `@@map` table names
- **Nested writes**: creating a profile together with the user (`profile: { create: {...} }`)
- **`omit`** to keep `password` out of responses, and **`include`** / **`_count`** for related data
- **Dynamic search, filtering, sorting and pagination** with `AND`/`OR`, `contains`,
  `mode: "insensitive"`, `hasSome`, `take`/`skip`
- **Transactions** (`$transaction`): incrementing views and reading the post together, and
  collecting stats with `Promise.all`
- **Aggregations**: `count` and `aggregate({ _sum })` instead of looping over every row
- **JWT auth**: access and refresh tokens, httpOnly cookies, role-based middleware
- **Stripe**: Checkout sessions, customers, webhooks with signature verification on the raw body,
  cancel-at-period-end
- **Clean module structure**: route → controller → service, plus `catchAsync`, `sendResponse` and a
  global error handler
