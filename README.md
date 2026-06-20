# FocusMeet AI 🎙️

An AI-powered meeting assistant that transcribes meetings in real time, generates summaries, extracts action items, and lets users search past meetings using natural language.

## Architecture

```
FocusMeet AI/
├── docker-compose.yml      # PostgreSQL 15 (pgvector) + Redis 7
├── infra/
│   └── postgres/init.sql   # Enables pgvector extension
├── backend/                # Spring Boot 3 (Java 17) — Port 8080
│   ├── focusmeet-common/   # Shared DTOs, ApiResponse, GlobalExceptionHandler
│   ├── focusmeet-auth/     # JWT auth + User entity (runnable Spring Boot app)
│   └── focusmeet-meetings/ # Meeting entity + REST controller
├── ai-service/             # FastAPI (Python 3.11) — Port 8000
│   ├── main.py
│   ├── config.py
│   └── routers/            # transcribe, summarize, search, ask
└── frontend/               # React 18 + TypeScript + Vite + Tailwind v4 — Port 5173
    └── src/
        ├── api/axios.ts    # Axios instance → localhost:8080 + JWT interceptor
        ├── socket.ts       # Socket.io-client → localhost:8000
        └── pages/          # Login, Register, Dashboard, Room, Detail, Search
```

---

## Prerequisites

- Docker & Docker Compose
- Java 17 + Maven 3.9+
- Python 3.11 + pip
- Node.js 20+ + npm

---

## 1. Start Infrastructure (PostgreSQL + Redis)

```bash
docker compose up -d
```

Verify:
```bash
docker compose ps          # both services should be "healthy"
```

---

## 2. Backend — Spring Boot

```bash
cd backend

# Build all modules (skips tests for speed)
mvn clean package -DskipTests

# Run the application (auth + meetings combined)
cd focusmeet-auth
mvn spring-boot:run
```

The API starts on **http://localhost:8080**.

**Health check:**
```bash
curl http://localhost:8080/api/health
# → { "success": true, "data": { "status": "ok", "timestamp": "..." } }
```

**Environment variables** (optional — have dev defaults):

| Variable | Default | Description |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5432/focusmeet` | PostgreSQL JDBC URL |
| `DB_USER` | `focusmeet` | DB username |
| `DB_PASS` | `focusmeet_secret` | DB password |
| `REDIS_HOST` | `localhost` | Redis hostname |
| `REDIS_PORT` | `6379` | Redis port |
| `JWT_SECRET` | *(dev default)* | Min-32-char secret — **change in production** |

---

## 3. AI Service — FastAPI

```bash
cd ai-service

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

pip install -r requirements.txt

# Copy and configure environment
copy .env.example .env        # Windows
# cp .env.example .env        # macOS/Linux

uvicorn main:app --reload --port 8000
```

The service starts on **http://localhost:8000**.

- API docs: http://localhost:8000/docs
- Health: `GET http://localhost:8000/health`

**Optional `.env` file:**
```env
GEMINI_API_KEY=your_gemini_api_key
WHISPER_MODEL_SIZE=base
WHISPER_DEVICE=cpu
```

---

## 4. Frontend — React + Vite

```bash
cd frontend
npm install
npm run dev
```

App opens at **http://localhost:5173**.

**Optional `.env.local` file:**
```env
VITE_API_URL=http://localhost:8080
VITE_AI_SERVICE_URL=http://localhost:8000
```

---

## API Endpoints

### Spring Boot (port 8080)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | ❌ | Health check |
| POST | `/api/auth/register` | ❌ | Create account |
| POST | `/api/auth/login` | ❌ | Login, get JWT |
| GET | `/api/meetings` | ✅ | List my meetings |
| POST | `/api/meetings` | ✅ | Create meeting |
| GET | `/api/meetings/{id}` | ✅ | Get meeting by ID |

### FastAPI (port 8000)

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/transcribe/` | Transcription status |
| GET | `/api/summarize/` | Summarization status |
| GET | `/api/search/` | Search status |
| GET | `/api/ask/` | Q&A status |

---

## Frontend Pages

| Route | Page | Auth |
|---|---|---|
| `/login` | Login | Public |
| `/register` | Register | Public |
| `/` | Dashboard | Protected |
| `/meetings/:id` | Meeting Detail | Protected |
| `/meetings/:id/room` | Meeting Room (live) | Protected |
| `/search` | Semantic Search | Protected |

---

## Development Tips

- **Hot reload** is enabled for all three services in dev mode
- **JWT tokens** are stored in `localStorage` under key `fm_token`
- **pgvector** is automatically enabled via the `infra/postgres/init.sql` init script
- **Socket.io** client uses lazy connect — call `socket.connect()` only in authenticated pages

---

## AWS Deployment Notes

- Spring Boot → ECS Fargate task, RDS PostgreSQL
- FastAPI → ECS Fargate task (GPU instance for Whisper)
- Frontend → S3 + CloudFront
- Secrets → AWS Secrets Manager (replace env var defaults)
- S3 → store audio recordings and transcript artifacts
