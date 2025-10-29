# Setup Instructions

## Initial Database Setup

### 1. Create MySQL Database

If you haven't created the database yet, run this in MySQL:

```sql
CREATE DATABASE chatbot_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Create .env File

Copy `env.example` to `.env` and update with your actual values:

```bash
cp env.example .env
```

Then edit `.env` with your actual values:
- `DATABASE_URL`: Your MySQL connection string
- `OPENAI_API_KEY`: Your OpenAI API key

### 3. Install Dependencies

```bash
npm install
```

### 4. Generate Prisma Client

```bash
npm run db:generate
```

### 5. Run Database Migrations

```bash
npm run db:migrate
```

Or if you want to push schema without migrations:

```bash
npm run db:push
```

### 6. Verify Database Setup

You can use Prisma Studio to view your database:

```bash
npm run db:studio
```

This will open a GUI at `http://localhost:5555` to view and edit your database.

## Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

See `docs/ARCHITECTURE.md` and `docs/ERD.md` for detailed schema documentation.
