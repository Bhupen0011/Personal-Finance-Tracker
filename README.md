# Personal Finance Tracker

A full-stack Personal Finance Tracker web application generated from the Figma design at [Personal Finance Tracker Web UI](https://www.figma.com/design/6gux155u4QswzAcqPhFInv/Personal-Finance-Tracker-Web-UI).

## Tech stack

### Frontend
- React with Vite
- Tailwind CSS
- React Router
- Recharts
- Axios

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT authentication
- bcryptjs password hashing
- express-validator input validation

## Project structure

```text
.
├── src
│   ├── components
│   ├── context
│   ├── hooks
│   ├── pages
│   ├── services
│   └── utils
├── backend
│   ├── config
│   ├── controllers
│   ├── middleware
│   ├── models
│   ├── routes
│   ├── utils
│   ├── app.js
│   └── server.js
├── .env.example
├── index.html
├── package.json
└── tailwind.config.js
```

## Frontend pages

- Login page
- Sign up page
- Dashboard
- Transactions page
- Budget analytics page
- Groups overview page
- Group details page (expenses, balances, members, activity)
- Settlements page
- Shared expense history page
- Profile and settings page
- Add transaction modal for expense and income flows
- Add shared expense modal with split controls

## Backend API routes

### Authentication
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/preferences`

### Transactions
- `POST /api/transactions`
- `GET /api/transactions`
- `PUT /api/transactions/:id`
- `DELETE /api/transactions/:id`

### Budget
- `POST /api/budgets`
- `GET /api/budgets`

### Dashboard analytics
- `GET /api/dashboard/summary`
- `GET /api/dashboard/analytics`

### Group expense sharing
- `POST /api/groups`
- `GET /api/groups`
- `GET /api/groups/:id`
- `POST /api/groups/:id/members`
- `POST /api/groups/:id/expenses`
- `GET /api/groups/:id/expenses`
- `POST /api/groups/:id/expenses/:expenseId/comments`
- `GET /api/groups/:id/balances`
- `POST /api/groups/:id/settlements`
- `GET /api/groups/:id/settlements`
- `POST /api/groups/:id/settlements/:settlementId/payments`
- `GET /api/groups/:id/activity`
- `GET /api/groups/history`
- `GET /api/groups/suggestions/settle-up`
- `GET /api/groups/export/csv`
- `POST /api/groups/templates`
- `GET /api/groups/templates`
- `POST /api/groups/recurring`
- `GET /api/groups/recurring`
- `POST /api/groups/recurring/run`
- `POST /api/groups/drafts`
- `GET /api/groups/drafts`
- `POST /api/groups/drafts/:draftId/sync`
- `GET /api/groups/notifications`
- `PATCH /api/groups/notifications/:notificationId/read`

## Setup

### 1. Install frontend dependencies

```bash
npm install
```

### 2. Create the frontend environment file

```bash
cp .env.example .env
```

Default frontend environment:

```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Install backend dependencies

```bash
cd backend
npm install
cp .env.example .env
```

Suggested backend environment:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/personal-finance-tracker
JWT_SECRET=replace_with_a_secure_random_string
CLIENT_URL=http://localhost:5173
```

### 4. Start MongoDB

Make sure a local MongoDB instance is running, or change `MONGODB_URI` to your MongoDB Atlas connection string.

### 5. Run the backend

```bash
cd backend
npm run dev
```

### 6. Run the frontend

```bash
npm run dev
```

The app will be available at `http://localhost:5173` and the API at `http://localhost:5000`.

## Notes for the university project

- Dashboard analytics and budget insights are backed by MongoDB aggregation queries.
- Transaction list supports pagination, search, category filtering, type filtering, and date range filtering.
- Budget creation uses an upsert pattern so a category limit for the same month/year updates cleanly.
- Group expense sharing supports equal/unequal/percentage/shares splits, settlement tracking, recurring shared expenses, templates, activity log, notifications, and CSV export.
- Shared expense flow includes optional multi-currency rate handling, receipt URL + OCR placeholder text, personal ledger sync option, and offline draft APIs.

## Suggested demo flow

1. Register a new account.
2. Add a few income and expense entries.
3. Create category budgets for the current month.
4. Open the dashboard and budget analytics screens to review charts and progress.
5. Create a group, add shared expenses, and use settle-up suggestions from the Settlements page.
