# Chatbot Companion: AI-Powered Career Pathway Explorer

A Next.js application that guides students exploring career paths matched to their skills, interests, and academics.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **AI Integration**: Perplexity (OpenAI-compatible API)
- **Database**: MySQL (Railway)
- **ORM**: Prisma
- **Deployment**: Vercel
- **Testing**: Vitest

## Getting Started

### Prerequisites

- **Node.js** 18 or higher (the project uses ES modules and Next.js App Router)
- **npm** (bundled with Node) or **yarn**
- **MySQL** instance – the app expects a MySQL connection URL (Railway, PlanetScale, or local MySQL are all fine)
- **Perplexity (OpenAI-compatible) API key** for the AI mentor responses

### 1. Clone the project

```bash
git clone https://github.com/Dekuu000/chatbot_companion.git
cd chatbot-companion
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

1. Copy the sample env file:
   ```bash
   cp .env.example
   ```
2. Create `.env` file and provide values for:
   - `DATABASE_URL` – MySQL connection string (`mysql://user:password@host:port/db`)
   - `PERPLEXITY_API_KEY` – API key for Perplexity
   - `SYSTEM_PROMPT` / `SYSTEM_PROMPT_DIRECT` (optional overrides for the AI persona)
   - Any other overrides you need from `.env.example`

### 4. Set up the database (Prisma)

Generate the Prisma client and push the schema to your database:

```bash
npx prisma generate
npx prisma db push
```

If you prefer migrations, replace `db push` with:

```bash
npx prisma migrate deploy   # or migrate dev --name init
```

You can verify the connection with:

```bash
npx prisma studio
```

### 5. (Optional) Seed or create a demo user

The app ships with a demo login flow. If you need a clean session, clear `prisma/_seed` data or use the in-app signup to create a new account.

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the UI. The app hot-reloads on file changes.

### 7. Useful scripts

```bash
npm run lint        # run ESLint
npm run test        # Vitest unit tests
npx prisma studio   # browse/edit the database
```

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

## AI Output Validation

The chat assistant now enforces a strict JSON response contract and validates every model reply before showing it to users:

- Primary + corrective prompts instruct the model to return ONLY minified JSON that matches the CareerGuide schema. The UI now renders this JSON directly, so there is no markdown formatting or natural-language wrapper.
- A zod validator checks the payload, including salary formatting (`

## AI Guidance Flow

The chatbot now produces intent-aware markdown responses:

- Each user input is classified (career, skills, salary, interview, resume, internship, industry pivot, etc.).
- Replies include bold headers, short bullet lists, and a follow-up question in **Next Step** to keep the conversation moving.
- If the message is ambiguous, the bot politely asks for clarification before sharing advice.
- Philippine salary/context is included only when relevant, and themes never mix unless the user requests it.

### Local Testing

```bash
# Core helper tests
npx vitest run tests/lib/ai/chat-response.test.ts

# Console demo with interest-aware fallbacks
npx tsx scripts/demo-career-chat.ts
```
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

## AI Output Validation

The chat assistant now enforces a strict JSON response contract and validates every model reply before showing it to users:

- Primary + corrective prompts instruct the model to return ONLY minified JSON that matches the CareerGuide schema. The UI now renders this JSON directly, so there is no markdown formatting or natural-language wrapper.
- A zod validator checks the payload, including salary formatting (`

## AI Guidance Flow

The chatbot now produces intent-aware markdown responses:

- Each user input is classified (career, skills, salary, interview, resume, internship, industry pivot, etc.).
- Replies include bold headers, short bullet lists, and a follow-up question in **Next Step** to keep the conversation moving.
- If the message is ambiguous, the bot politely asks for clarification before sharing advice.
- Philippine salary/context is included only when relevant, and themes never mix unless the user requests it.

### Local Testing

```bash
# Core helper tests
npx vitest run tests/lib/ai/chat-response.test.ts
# Console demo with interest-aware fallbacks
npx tsx scripts/demo-career-chat.ts
```
