# KNMIET ERP — Backend (Node + Express + MongoDB)

Replaces the previous hosted database. The React frontend talks to this server
through `src/lib/api/client.ts` using `VITE_API_URL`.

## Run locally

```bash
cd backend
npm install
cp .env.example .env      # fill in MONGO_URI and JWT_SECRET
npm run seed              # optional demo data
npm run server            # http://localhost:5000
```

Then set the frontend `.env`:

```
VITE_API_URL="http://localhost:5000"
```

For the published site, deploy this folder (Render / Railway / Fly / VPS) and
set `VITE_API_URL` to that public HTTPS URL, plus `CLIENT_ORIGIN` and
`PUBLIC_URL` in the backend `.env`.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/login` | JWT login (bcrypt verified) |
| POST | `/api/auth/register` | Sign up, defaults to `student` role |
| GET | `/api/auth/session` | Current session from Bearer token |
| POST | `/api/auth/password` | Change password |
| POST | `/api/query` | Generic table query (select/insert/update/delete/upsert) |
| POST | `/api/rpc` | Server functions (fees, syllabus progress, directories) |
| POST | `/api/storage/upload` \| `/sign` \| `/remove` | File storage |
| GET | `/api/students/profile`, `/api/faculty`, `/api/timetable`, `/api/announcements`, `/api/events`, `/api/subjects` | Named REST reads |
| POST | `/api/attendance`, `/api/messages/send` | Named REST writes |

Socket.io broadcasts `db_change` events (`{ table, eventType, new, old }`),
which the frontend `channel()` API consumes for live updates.

## Roles

`student` / `faculty` / `admin`, stored in the `user_roles` collection (never on
the profile). Fee editing is limited to `admin` plus employee IDs `FAC003`
(Mr. Nikhil Tyagi) and `FAC008` (Ms. Aditi Gautam).

## Seeded logins

| ID | Password | Role |
| --- | --- | --- |
| ADM001 | admin123 | admin |
| FAC003 / FAC008 / FAC001 | faculty123 | faculty |
| 2200320130001…008 | student123 | student |

Change these before any real deployment.
