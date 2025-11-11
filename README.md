# Chatbot Companion: AI-Powered Career Pathway Explorer

A Next.js application that guides students exploring career paths matched to their skills, interests, and academics.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **AI Integration**: Perplexity (OpenAI-compatible API)
- **Database**: MySQL (Aiven)
- **ORM**: Prisma
- **Deployment**: Vercel
- **Testing**: Vitest

## Getting Started

### Prerequisites

- **Node.js** 18 or higher (the project uses ES modules and Next.js App Router)
- **npm** (bundled with Node) or **yarn**
- **MySQL** instance – the app expects a MySQL connection URL (Aiven, Railway, PlanetScale, or local MySQL are all fine)
- **Perplexity API key** for the AI mentor responses ([Get one here](https://www.perplexity.ai/))
- **Aiven account** (free tier available) for cloud database hosting

## Complete Setup Guide

### Step 1: Clone the Project

```bash
git clone https://github.com/YOUR_USERNAME/chatbot-companion.git
cd chatbot-companion
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Set Up Aiven MySQL Database

#### 3.1 Create an Aiven Account

1. Go to [https://aiven.io](https://aiven.io) and sign up (free tier available)
2. Verify your email address

#### 3.2 Create MySQL Service

1. In the Aiven Console, click **"Create service"** or **"+ New Service"**
2. Select:
   - **Service type**: MySQL
   - **Cloud provider**: Choose AWS, Google Cloud, or Azure (select a region near you)
   - **Plan**: Start with the free tier or a small plan
   - **Service name**: `chatbot-ai-mysql` (or your preferred name)
3. Click **"Create service"** and wait 2-3 minutes for provisioning

#### 3.3 Get Connection Details

1. Open your MySQL service in the Aiven Console
2. Go to the **"Overview"** tab
3. Find the **"Connection information"** section
4. Note down:
   - **Host** (e.g., `chatbot-ai-mysql-xxxxx.a.aivencloud.com`)
   - **Port** (usually `3306`)
   - **Database name** (default: `defaultdb`)
   - **Username** (default: `avnadmin`)
   - **Password** (click "Show" to reveal)

#### 3.4 Create Your Database

1. In the Aiven Console → Your MySQL service → **"Databases"** tab
2. Click **"Create database"**
3. Name it: `chatbot_ai`
4. Click **"Create"**

Alternatively, you can create it via MySQL client:
```sql
CREATE DATABASE chatbot_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Step 4: Configure Environment Variables

1. Copy the sample environment file:
   ```bash
   # Windows PowerShell
   Copy-Item env.example .env
   
   # Linux/Mac
   cp env.example .env
   ```

2. Open `.env` and update the following variables:

   ```env
   # Database - Aiven MySQL
   DATABASE_URL="mysql://avnadmin:YOUR_PASSWORD@YOUR_HOST:3306/chatbot_ai?sslaccept=strict"
   
   # Perplexity API Key (required)
   PERPLEXITY_API_KEY="your-perplexity-api-key-here"
   
   # Next.js
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   
   # Auth
   NEXTAUTH_SECRET="replace-with-strong-random-secret"
   ```

   **Important Notes:**
   - Replace `YOUR_PASSWORD` with your Aiven password
   - Replace `YOUR_HOST` with your Aiven host
   - **Always include** `?sslaccept=strict` for SSL connection
   - Generate `NEXTAUTH_SECRET` using: `openssl rand -base64 32` (or use an online generator)

### Step 5: Set Up Database Schema with Prisma

#### 5.1 Generate Prisma Client

```bash
npm run db:generate
# or
npx prisma generate
```

**Troubleshooting:** If you encounter file locking errors on Windows:
- Close all running Node processes and dev servers
- Run PowerShell as Administrator
- Delete `.prisma` folder: `Remove-Item -Recurse -Force "node_modules\.prisma" -ErrorAction SilentlyContinue`
- Try generating again

#### 5.2 Push Schema to Database

```bash
npm run db:push
# or
npx prisma db push
```

This will create all tables in your Aiven MySQL database.

**Alternative: Use Migrations**

If you prefer using migrations:

```bash
npm run db:migrate
# or
npx prisma migrate dev --name init
```

#### 5.3 Verify Database Connection

Open Prisma Studio to view and edit your database:

```bash
npm run db:studio
# or
npx prisma studio
```

This opens a GUI at `http://localhost:5555` where you can browse your database.

### Step 6: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The app hot-reloads automatically on file changes.

### Step 7: Create Your First User

1. Navigate to the signup page: `http://localhost:3000/signup`
2. Create an account with username and email
3. Complete your profile with skills, interests, and education level

## Useful Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server

# Database
npm run db:generate      # Generate Prisma Client
npm run db:push          # Push schema changes to database
npm run db:migrate       # Run database migrations
npm run db:studio        # Open Prisma Studio GUI

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors
npm run format           # Format code with Prettier
npm run type-check       # TypeScript type checking

# Testing
npm run test             # Run Vitest unit tests
npm run test:ui          # Run tests with UI
```

## Troubleshooting

### Database Connection Issues

**Error: "Can't reach database server"**
- Verify your `DATABASE_URL` is correct
- Check that your Aiven service is running
- Ensure `?sslaccept=strict` is included in the connection string
- Verify firewall settings in Aiven Console

**Error: "Access denied for user"**
- Double-check username and password
- Ensure the database name exists (`chatbot_ai`)
- Verify user permissions in Aiven

**Error: "SSL connection required"**
- Make sure `?sslaccept=strict` is in your `DATABASE_URL`
- Some clients may need `?sslmode=require` instead

### Prisma Generation Errors (Windows)

**Error: "Cannot rename temporary file"**
- Close all Node processes: `Get-Process node | Stop-Process -Force`
- Delete `.prisma` folder: `Remove-Item -Recurse -Force "node_modules\.prisma" -ErrorAction SilentlyContinue`
- Run PowerShell as Administrator
- Temporarily disable antivirus real-time protection
- Try generating again: `npx prisma generate`

### Environment Variables Not Loading

- Ensure your `.env` file is in the project root
- Restart your dev server after changing `.env`
- Never commit `.env` to version control (it's in `.gitignore`)

## Security Best Practices

1. **Never commit `.env` files** - They contain sensitive credentials
2. **Use different databases** for development and production
3. **Rotate passwords** regularly in Aiven Console
4. **Enable IP allowlist** in Aiven for production environments
5. **Use strong `NEXTAUTH_SECRET`** - Generate with: `openssl rand -base64 32`
6. **Keep dependencies updated**: `npm audit` and `npm update`

## Project Status

✅ **Core Features Complete** - Phases 0-7 Complete

## Development Phases

- [x] Phase 0: Development Environment Setup
- [x] Phase 1: Architecture & Schema Design
- [x] Phase 2: Database Setup
- [x] Phase 3: Authentication (Demo Login)
- [x] Phase 4: AI Chatbot Feature (OpenAI Streaming)
- [x] Phase 5: Personalized Career Suggestions
- [x] Phase 6: Interview Prep Tool
- [x] Phase 7: Resume Review & Analysis (PDF Upload & AI Analysis)
- [ ] Phase 8: Testing
- [ ] Phase 9: Deployment & CI/CD

## Features

### ✅ Implemented

1. **Demo Authentication** - Simple username-based login system
2. **AI Chatbot** - Real-time streaming chat via Perplexity, personalized with user profile
3. **Career Suggestions** - AI-generated personalized career recommendations
4. **Interview Prep** - Generate interview questions based on job title and difficulty
5. **Resume Review** - Upload PDF resumes, extract text, and get AI-powered feedback
6. **Profile Management** - Store and manage user skills, interests, education, and goals

### 🚧 Remaining

- Unit and E2E tests
- Production deployment setup
- CI/CD pipeline

## AI Features

### AI Output Validation

The chat assistant enforces a strict JSON response contract and validates every model reply before showing it to users:

- Primary + corrective prompts instruct the model to return ONLY minified JSON that matches the CareerGuide schema
- The UI renders this JSON directly, so there is no markdown formatting or natural-language wrapper
- A zod validator checks the payload, including salary formatting

### AI Guidance Flow

The chatbot produces intent-aware markdown responses:

- Each user input is classified (career, skills, salary, interview, resume, internship, industry pivot, etc.)
- Replies include bold headers, short bullet lists, and a follow-up question in **Next Step** to keep the conversation moving
- If the message is ambiguous, the bot politely asks for clarification before sharing advice
- Philippine salary/context is included only when relevant, and themes never mix unless the user requests it

### Local Testing

```bash
# Core helper tests
npx vitest run tests/lib/ai/chat-response.test.ts

# Console demo with interest-aware fallbacks
npx tsx scripts/demo-career-chat.ts
```

## Additional Resources

### Database Schema

For detailed database schema documentation, see:
- `docs/ARCHITECTURE.md` - Architecture overview and schema details
- `docs/ERD.md` - Entity Relationship Diagram
- `prisma/schema.prisma` - Prisma schema definition

### Documentation

Additional documentation is available in the `docs/` folder:
- `SETUP.md` - Detailed setup instructions
- `ARCHITECTURE.md` - System architecture
- `DATABASE_STRUCTURE.md` - Database structure details

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Submit a pull request

## License

This project is private and proprietary.
