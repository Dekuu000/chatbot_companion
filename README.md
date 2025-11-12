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
git clone https://github.com/Dekuu000/chatbot_companion.git
cd chatbot_companion
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
   - **Host** (e.g., `mysql-3baa6ed7-xxxxx.l.aivencloud.com`)
   - **Port** (e.g., `20193` or `3306`)
   - **Database name** (default: `defaultdb`)
   - **Username** (default: `avnadmin`)
   - **Password** (click "Show" to reveal)
   - **Service URI** (complete connection string - copy this!)

#### 3.4 Database Setup

You can use the default `defaultdb` database that comes with your Aiven MySQL service, or create a custom database:

**Option 1: Use Default Database (Recommended)**
- Use `defaultdb` - no additional setup needed
- This is the simplest option and works out of the box

**Option 2: Create Custom Database (Optional)**
1. In the Aiven Console → Your MySQL service → **"Databases"** tab
2. Click **"Create database"**
3. Name it: `chatbot_ai` (or your preferred name)
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
   # Use the Service URI from Aiven Console (Overview → Connection information)
   # Format: mysql://username:password@host:port/database?ssl-mode=REQUIRED
   DATABASE_URL="mysql://avnadmin:YOUR_PASSWORD@YOUR_HOST:PORT/defaultdb?ssl-mode=REQUIRED"
   
   # Perplexity API Key (required)
   PERPLEXITY_API_KEY="your-perplexity-api-key-here"
   
   # Next.js
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   
   # Auth
   # Generate NEXTAUTH_SECRET: openssl rand -base64 32 (or use online generator)
   NEXTAUTH_SECRET="replace-with-strong-random-secret"
   ```

   **Important Notes:**
   - **Easiest**: Copy the **Service URI** directly from Aiven Console (Overview → Connection information)
   - Replace `YOUR_PASSWORD` with your Aiven password
   - Replace `YOUR_HOST` with your Aiven host
   - Replace `PORT` with your Aiven port (usually `20193` or `3306`)
   - Use `defaultdb` as the database name (or `chatbot_ai` if you created a custom database)
   - **Always include** `?ssl-mode=REQUIRED` for SSL connection (this is the format that works with Aiven)
   - Generate `NEXTAUTH_SECRET` using: `openssl rand -base64 32` (or use an online generator like https://generate-secret.vercel.app/32)

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
2. Create an account with email and password
3. Complete your profile with skills, interests, and education level

---

## Vercel Deployment Guide

### Prerequisites for Vercel Deployment

Before deploying to Vercel, ensure you have:

- ✅ **Vercel account** ([Sign up here](https://vercel.com/signup) - free tier available)
- ✅ **GitHub repository** with your code pushed
- ✅ **Aiven MySQL database** already set up and running
- ✅ **All environment variables** ready (DATABASE_URL, PERPLEXITY_API_KEY, etc.)

### Step 1: Connect Repository to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Click **"Import Git Repository"**
4. Select your GitHub repository: `Dekuu000/chatbot_companion`
5. Configure project settings:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)
6. Click **"Deploy"** (you'll configure environment variables next)

### Step 2: Configure Environment Variables in Vercel

After the initial deployment, configure your environment variables:

1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable below:

#### Required Environment Variables

**DATABASE_URL**
- **Variable Name**: `DATABASE_URL`
- **Value**: Copy the **Service URI** from Aiven Console (Overview → Connection information)
- **Format**: `mysql://avnadmin:YOUR_PASSWORD@YOUR_HOST:PORT/defaultdb?ssl-mode=REQUIRED`
- **Example**: `mysql://avnadmin:AVNS_xxxxx@mysql-xxxxx.l.aivencloud.com:20193/defaultdb?ssl-mode=REQUIRED`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

**PERPLEXITY_API_KEY**
- **Variable Name**: `PERPLEXITY_API_KEY`
- **Value**: Your Perplexity API key
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

**NEXTAUTH_SECRET**
- **Variable Name**: `NEXTAUTH_SECRET`
- **Value**: Generate a secure random secret:
  - **Online**: https://generate-secret.vercel.app/32
  - **PowerShell**: `[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))`
  - **Node.js**: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

**NEXT_PUBLIC_APP_URL**
- **Variable Name**: `NEXT_PUBLIC_APP_URL`
- **Value**: Your Vercel deployment URL (e.g., `https://your-project-name.vercel.app`)
- **Note**: Update this after your first deployment with the actual Vercel URL
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

#### Optional Environment Variables

**PERPLEXITY_MODEL** (Optional)
- **Variable Name**: `PERPLEXITY_MODEL`
- **Value**: `sonar` (default), `sonar-pro`, `sonar-reasoning`, `sonar-reasoning-pro`, or `sonar-deep-research`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

**OPENAI_API_KEY** (Optional - fallback)
- **Variable Name**: `OPENAI_API_KEY`
- **Value**: Your OpenAI API key (if using as fallback)
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

### Step 3: Build Configuration

The project is already configured to run database migrations during build:

- **Build Command**: `prisma generate && prisma migrate deploy && next build`
- Migrations run automatically on each deployment
- Database tables are created/updated automatically
- No manual migration steps needed

### Step 4: Deploy and Verify

1. **Redeploy** your project:
   - Go to **Deployments** tab
   - Click **"Redeploy"** on the latest deployment
   - Or push a new commit to trigger automatic deployment

2. **Check Build Logs**:
   - Watch the build process in the Vercel dashboard
   - Look for: `Running migrations...` and `No pending migrations to apply`
   - Build should complete successfully

3. **Verify Database Connection**:
   - Check function logs: **Functions** → `/api/auth/session`
   - Should not show database connection errors

4. **Test Signup Functionality**:
   - Visit your deployed app: `https://your-project-name.vercel.app`
   - Navigate to `/signup`
   - Create a test account
   - Verify you can log in successfully

### Step 5: Post-Deployment Checklist

- [ ] Environment variables are set correctly
- [ ] Build completed without errors
- [ ] Database migrations ran successfully
- [ ] Can access the deployed app
- [ ] Signup functionality works
- [ ] Login functionality works
- [ ] Database connection is stable

## Quick Reference

### Local Development Quick Start

```bash
# 1. Clone and install
git clone https://github.com/Dekuu000/chatbot_companion.git
cd chatbot_companion
npm install

# 2. Set up environment variables
cp env.example .env
# Edit .env with your Aiven DATABASE_URL and PERPLEXITY_API_KEY

# 3. Set up database
npm run db:generate
npm run db:push

# 4. Start development server
npm run dev
```

### Vercel Deployment Quick Start

1. **Connect Repository**: Vercel Dashboard → Import Git Repository → Select `Dekuu000/chatbot_companion`
2. **Add Environment Variables**: Settings → Environment Variables → Add all required variables
3. **Deploy**: Click "Deploy" (migrations run automatically during build)
4. **Verify**: Test signup/login functionality on your deployed app

### Useful Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production (includes migrations)
npm run start            # Start production server

# Database
npm run db:generate      # Generate Prisma Client
npm run db:push          # Push schema changes to database
npm run db:migrate       # Run database migrations (dev)
npm run db:migrate:deploy # Run database migrations (production)
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
- Ensure `?ssl-mode=REQUIRED` is included in the connection string
- Verify firewall settings in Aiven Console
- Check that you're using the correct port (may be `20193` instead of `3306`)

**Error: "Access denied for user"**
- Double-check username and password
- Ensure the database name exists (`defaultdb` or `chatbot_ai`)
- Verify user permissions in Aiven
- Make sure password doesn't contain special characters that need URL encoding

**Error: "SSL connection required" or "SSL certificate verify failed"**
- Make sure `?ssl-mode=REQUIRED` is in your `DATABASE_URL` (this is the format that works with Aiven)
- **For Vercel**: Use the Service URI from Aiven Console which includes `?ssl-mode=REQUIRED`
- **Alternative**: If `ssl-mode=REQUIRED` doesn't work, try `?sslcert=` (empty) to skip certificate verification

**Error: "Unknown database"**
- Verify the database name in your `DATABASE_URL` matches an existing database
- Check Aiven Console → Databases tab to see available databases
- Use `defaultdb` if you haven't created a custom database

### Prisma Generation Errors (Windows)

**Error: "Cannot rename temporary file"**
- Close all Node processes: `Get-Process node | Stop-Process -Force`
- Delete `.prisma` folder: `Remove-Item -Recurse -Force "node_modules\.prisma" -ErrorAction SilentlyContinue`
- Run PowerShell as Administrator
- Temporarily disable antivirus real-time protection
- Try generating again: `npx prisma generate`

### Environment Variables Not Loading

**Local Development:**
- Ensure your `.env` file is in the project root
- Restart your dev server after changing `.env`
- Never commit `.env` to version control (it's in `.gitignore`)

**Vercel Deployment:**
- Environment variables must be set in Vercel Dashboard → Settings → Environment Variables
- `.env` file is NOT used in Vercel (it's gitignored)
- After adding/updating variables, redeploy your project
- Check that variables are set for the correct environment (Production/Preview/Development)
- Variable names are case-sensitive

### Vercel Deployment Issues

**Error: "P1011: SSL certificate verify failed"**
- **Solution**: Use `?ssl-mode=REQUIRED` in your `DATABASE_URL` (copy Service URI from Aiven)
- This is the correct SSL format for Aiven MySQL with Prisma
- Alternative: Use `?sslcert=` (empty) if certificate verification still fails

**Error: "Failed to collect page data for /api/..."**
- This means Prisma is trying to initialize during build
- **Solution**: Already fixed! The codebase uses lazy imports to prevent this
- If you see this error, ensure you're using the latest code from the repository

**Error: "Command 'npm run build' exited with 1"**
- Check build logs in Vercel for specific error messages
- Common causes:
  - Missing environment variables (especially `DATABASE_URL`)
  - Database connection issues
  - TypeScript errors
  - Missing dependencies

**Migrations Not Running**
- Migrations run automatically during build (configured in `package.json`)
- Check build logs for: `Running migrations...`
- If migrations fail, check:
  - `DATABASE_URL` is correct
  - Database exists in Aiven
  - SSL connection is properly configured

**Signup Returns 500 Error**
- Check Vercel function logs: **Functions** → `/api/auth/signup`
- Common causes:
  - Database tables don't exist (migrations didn't run)
  - Database connection failed
  - Missing required environment variables
- Solution: Verify migrations ran successfully and database connection works

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
