# GitHub Profile Analyzer 🚀

A production-ready REST API that analyzes GitHub user profiles and stores
computed insights in MySQL. Built with Node.js, Express, and MySQL.

## Features

- Fetch and analyze any public GitHub profile
- Compute developer score (0-100) based on followers, stars, repos, activity
- Store insights in MySQL — repositories, languages, activity tier
- Smart caching — avoids redundant GitHub API calls
- Compare two developers side by side
- Platform-wide stats and leaderboard
- Input validation, rate limiting, structured logging

---

## Tech Stack

- **Runtime** — Node.js 18+ (ES Modules)
- **Framework** — Express.js
- **Database** — MySQL (hosted on Railway)
- **External API** — GitHub REST API v3
- **Libraries** — axios, mysql2, helmet, cors, morgan, express-rate-limit

---

## Live API

Base URL: `https://your-app.railway.app`

---

## Local Setup

### Prerequisites
- Node.js 18+
- A Railway account (for MySQL)
- A GitHub Personal Access Token

### 1. Clone the repository
```bash
git clone https://github.com/your-username/github-analyzer.git
cd github-analyzer
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup environment variables
```bash
cp .env.example .env
```

Fill in your `.env`:
```env
PORT=3000
NODE_ENV=development

DB_HOST=your_railway_public_host
DB_PORT=your_railway_public_port
DB_USER=root
DB_PASSWORD=your_railway_password
DB_NAME=railway

GITHUB_TOKEN=your_github_personal_access_token

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CACHE_TTL_SECONDS=3600
```

### 4. Run database migration
```bash
npm run db:migrate
```

### 5. Start the server
```bash
npm run dev
```

Server runs at `http://localhost:3000`

---

## API Endpoints

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server and DB status |
| GET | `/health/github-rate` | GitHub API rate limit |

### Profiles
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analyze/:username` | Analyze and store a GitHub profile |
| GET | `/api/profiles` | List all analyzed profiles |
| GET | `/api/profiles/:username` | Get single profile with full details |
| GET | `/api/profiles/:username/refresh` | Force re-fetch from GitHub |
| GET | `/api/profiles/:username/compare?with=x` | Compare two profiles |
| DELETE | `/api/profiles/:username` | Delete a profile |

### Stats
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Platform-wide overview |
| GET | `/api/stats/leaderboard` | Ranked developer leaderboard |
| GET | `/api/stats/languages` | Language breakdown |

---

## Query Parameters

### GET /api/profiles
| Param | Default | Description |
|-------|---------|-------------|
| page | 1 | Page number |
| limit | 10 | Results per page (max 100) |
| sort | created_at | Sort field |
| order | DESC | ASC or DESC |
| lang | - | Filter by primary language |

### GET /api/stats/leaderboard
| Param | Default | Options |
|-------|---------|---------|
| sort_by | developer_score | followers, total_stars, total_forks, public_repos, account_age_days |
| limit | 10 | max 50 |
| lang | - | e.g. JavaScript, Python |
| tier | - | Inactive, Casual, Active, Power User |

---

## Developer Score

Each profile gets a score from 0-100 computed from:

| Factor | Max Points |
|--------|-----------|
| Followers | 25 |
| Total Stars | 25 |
| Public Repos | 20 |
| Account Age | 15 |
| Profile Completeness | 15 |

---

## Activity Tiers

| Tier | Criteria |
|------|----------|
| Power User | 10+ repos pushed in last 6 months |
| Active | 5-9 repos pushed in last 6 months |
| Casual | 1-4 repos pushed in last 6 months |
| Inactive | No recent activity |

---

## Database Schema

Four tables:
- `profiles` — core GitHub data + computed insights
- `repositories` — top repos per user
- `languages` — language breakdown per user
- `analysis_meta` — cache control and analysis history

Full schema at `/docs/schema.sql`

---

## Running Tests
```bash
npm test
```

---

## Deployment (Railway)

1. Push code to GitHub
2. Go to Railway → New Project → Deploy from GitHub
3. Select your repository
4. Add environment variables in Railway dashboard
5. Railway auto-deploys on every push

---

## Postman Collection

Import `/docs/postman_collection.json` into Postman to test all endpoints.
