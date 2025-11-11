# Improved Architecture Plan
## Chatbot Companion: AI-Powered Career Pathway Explorer

**Version:** 2.0  
**Date:** 2025-01-27  
**Status:** Proposed

---

## 1. Architecture Overview

### 1.1 Current Architecture
```
┌─────────────┐
│   Client    │ (Next.js App Router)
│  (React)    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  API Routes │ (Next.js API Routes)
│  (Node.js)  │
└──────┬──────┘
       │
       ├──► Prisma ORM ──► MySQL Database
       │
       └──► AI APIs (Perplexity/OpenAI)
```

### 1.2 Improved Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Pages   │  │Components│  │  Hooks   │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│       │             │             │                    │
│       └─────────────┴─────────────┘                    │
│                    │                                    │
│              ┌─────▼─────┐                             │
│              │  State    │ (Zustand/Context)           │
│              └─────┬─────┘                             │
└────────────────────┼───────────────────────────────────┘
                    │
┌────────────────────▼───────────────────────────────────┐
│                  API Layer                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │            Middleware Stack                      │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐         │  │
│  │  │  Auth    │ │  Rate    │ │  Error   │         │  │
│  │  │          │ │  Limit   │ │  Handler │         │  │
│  │  └──────────┘ └──────────┘ └──────────┘         │  │
│  └──────────────────────────────────────────────────┘  │
│                    │                                    │
│  ┌─────────────────▼─────────────────────────────────┐ │
│  │              API Routes                           │ │
│  │  /api/ai/chat                                    │ │
│  │  /api/careers/suggest                            │ │
│  │  /api/resume/analyze                             │ │
│  │  /api/interview/generate                         │ │
│  │  /api/profile                                    │ │
│  └─────────────────┬─────────────────────────────────┘ │
└────────────────────┼───────────────────────────────────┘
                    │
┌────────────────────▼───────────────────────────────────┐
│                Service Layer                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │   AI     │  │ Profile  │  │  Resume  │             │
│  │ Service  │  │ Service  │  │ Service  │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│       │             │             │                    │
│       └─────────────┴─────────────┘                    │
│                    │                                    │
│  ┌─────────────────▼─────────────────────────────────┐ │
│  │            Data Access Layer                      │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐        │ │
│  │  │ Prisma   │  │  Cache   │  │  Logger  │        │ │
│  │  │  Client  │  │ (Redis)  │  │ (Pino)   │        │ │
│  │  └──────────┘  └──────────┘  └──────────┘        │ │
│  └─────────────────┬─────────────────────────────────┘ │
└────────────────────┼───────────────────────────────────┘
                    │
┌────────────────────▼───────────────────────────────────┐
│              External Services                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  MySQL   │  │  OpenAI  │  │  Redis   │             │
│  │ Database │  │   API    │  │  Cache   │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure

### 2.1 Proposed Structure
```
chatbot-companion/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth route group
│   │   ├── login/
│   │   └── callback/
│   ├── (dashboard)/              # Protected routes
│   │   ├── chat/
│   │   ├── profile/
│   │   ├── resume/
│   │   ├── interview/
│   │   └── careers/
│   ├── api/                      # API Routes
│   │   ├── middleware.ts         # API middleware
│   │   ├── ai/
│   │   │   └── chat/
│   │   ├── careers/
│   │   │   └── suggest/
│   │   ├── resume/
│   │   │   ├── upload/
│   │   │   └── analyze/
│   │   ├── interview/
│   │   │   └── generate/
│   │   └── profile/
│   ├── layout.tsx
│   └── page.tsx
│
├── components/                   # React Components
│   ├── ui/                       # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   └── Loading.tsx
│   ├── features/                 # Feature-specific components
│   │   ├── chat/
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   └── ConversationSidebar.tsx
│   │   ├── resume/
│   │   │   ├── ResumeUpload.tsx
│   │   │   └── ResumeAnalysis.tsx
│   │   └── interview/
│   │       ├── InterviewQuestion.tsx
│   │       └── InterviewScoring.tsx
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   └── shared/
│       ├── Logo.tsx
│       └── ErrorBoundary.tsx
│
├── lib/                          # Utilities & Services
│   ├── ai/                       # AI-related utilities
│   │   ├── client.ts             # Unified AI client
│   │   ├── prompts/              # Prompt templates
│   │   │   ├── career-guide.ts
│   │   │   ├── resume-analysis.ts
│   │   │   └── interview.ts
│   │   └── cache.ts               # AI response caching
│   ├── services/                 # Business logic services
│   │   ├── profile.service.ts
│   │   ├── resume.service.ts
│   │   ├── career.service.ts
│   │   └── interview.service.ts
│   ├── middleware/               # Middleware utilities
│   │   ├── auth.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   └── error-handler.middleware.ts
│   ├── utils/                    # Pure utility functions
│   │   ├── validation.ts
│   │   ├── sanitization.ts
│   │   └── formatting.ts
│   ├── db/                       # Database utilities
│   │   ├── prisma.ts
│   │   └── migrations/
│   ├── cache/                    # Caching utilities
│   │   └── redis.ts
│   ├── logger/                   # Logging utilities
│   │   └── pino.ts
│   └── errors/                   # Error handling
│       ├── errors.ts
│       └── error-handler.ts
│
├── hooks/                        # Custom React Hooks
│   ├── useAuth.ts
│   ├── useChat.ts
│   ├── useProfile.ts
│   └── useDebounce.ts
│
├── types/                        # TypeScript Type Definitions
│   ├── api.ts                    # API request/response types
│   ├── database.ts               # Database types (from Prisma)
│   ├── ai.ts                     # AI-related types
│   └── common.ts                 # Shared types
│
├── prisma/                       # Prisma Schema & Migrations
│   ├── schema.prisma
│   └── migrations/
│
├── prompts/                      # AI Prompt Templates
│   ├── career-guide.md
│   ├── resume-analysis.md
│   └── interview.md
│
├── tests/                        # Test Files
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docs/                         # Documentation
│   ├── CODE_AUDIT.md
│   ├── ARCHITECTURE_PLAN.md
│   └── API.md
│
├── .github/                      # GitHub Workflows
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
│
├── .husky/                       # Git Hooks
│   └── pre-commit
│
├── public/                       # Static Assets
│
├── .eslintrc.json
├── .prettierrc
├── tsconfig.json
├── next.config.js
└── package.json
```

---

## 3. Core Improvements

### 3.1 Unified AI Client Abstraction

**File:** `lib/ai/client.ts`

```typescript
// Unified AI client supporting multiple providers
export interface AIClient {
  chat(messages: Message[], options?: ChatOptions): Promise<StreamingResponse>
  complete(prompt: string, options?: CompletionOptions): Promise<string>
}

export class UnifiedAIClient implements AIClient {
  private provider: 'openai' | 'perplexity' | 'anthropic'
  private cache: CacheService
  
  constructor(provider: string, cache: CacheService) {
    this.provider = provider as any
    this.cache = cache
  }
  
  async chat(messages: Message[], options?: ChatOptions): Promise<StreamingResponse> {
    // Check cache first
    const cacheKey = this.generateCacheKey(messages)
    const cached = await this.cache.get(cacheKey)
    if (cached) return cached
    
    // Call appropriate provider
    const response = await this.callProvider(messages, options)
    
    // Cache response
    await this.cache.set(cacheKey, response, options?.ttl || 3600)
    
    return response
  }
  
  private async callProvider(messages: Message[], options?: ChatOptions) {
    switch (this.provider) {
      case 'openai':
        return this.callOpenAI(messages, options)
      case 'perplexity':
        return this.callPerplexity(messages, options)
      default:
        throw new Error(`Unsupported provider: ${this.provider}`)
    }
  }
}
```

**Benefits:**
- Single interface for all AI providers
- Easy to switch providers
- Built-in caching
- Retry logic and error handling

### 3.2 Service Layer Pattern

**File:** `lib/services/career.service.ts`

```typescript
export class CareerService {
  constructor(
    private db: PrismaClient,
    private aiClient: AIClient,
    private cache: CacheService,
    private logger: Logger
  ) {}
  
  async suggestCareers(userId: string, query?: string): Promise<CareerSuggestion[]> {
    // 1. Get user profile
    const profile = await this.getProfile(userId)
    
    // 2. Check cache
    const cacheKey = `career-suggestions:${userId}:${this.hashQuery(query)}`
    const cached = await this.cache.get(cacheKey)
    if (cached) return cached
    
    // 3. Generate suggestions
    const suggestions = await this.generateSuggestions(profile, query)
    
    // 4. Save to database
    const saved = await this.saveSuggestions(userId, suggestions)
    
    // 5. Cache results
    await this.cache.set(cacheKey, saved, 86400) // 24 hours
    
    return saved
  }
  
  private async generateSuggestions(profile: Profile, query?: string): Promise<CareerSuggestion[]> {
    const prompt = buildCareerPrompt(profile, query)
    const response = await this.aiClient.complete(prompt, {
      model: 'gpt-4-turbo',
      temperature: 0.7,
      responseFormat: 'json'
    })
    return this.parseSuggestions(response)
  }
}
```

**Benefits:**
- Separation of concerns
- Reusable business logic
- Easier to test
- Centralized caching and logging

### 3.3 Middleware Stack

**File:** `app/api/middleware.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/middleware/rate-limit.middleware'
import { authenticate } from '@/lib/middleware/auth.middleware'
import { handleError } from '@/lib/middleware/error-handler.middleware'

export type Middleware = (
  req: NextRequest,
  next: () => Promise<NextResponse>
) => Promise<NextResponse>

export function withMiddleware(
  handler: (req: NextRequest) => Promise<NextResponse>,
  middlewares: Middleware[]
) {
  return async (req: NextRequest) => {
    try {
      // Compose middlewares
      let response: NextResponse | null = null
      
      for (const middleware of middlewares) {
        response = await middleware(req, async () => {
          if (response) return response
          return handler(req)
        })
        if (response && response.status !== 200) {
          return response // Early return on middleware failure
        }
      }
      
      return response || handler(req)
    } catch (error) {
      return handleError(error)
    }
  }
}

// Usage in API routes:
export const POST = withMiddleware(
  async (req: NextRequest) => {
    // Route handler
  },
  [
    rateLimit({ requests: 100, window: 3600 }), // 100 requests/hour
    authenticate(), // Verify session
  ]
)
```

**Benefits:**
- Reusable middleware
- Consistent error handling
- Easy to add new middleware
- Type-safe

### 3.4 Enhanced Database Schema

**File:** `prisma/schema.prisma` (additions)

```prisma
model CareerSuggestion {
  // ... existing fields ...
  
  // Add indexes
  @@index([userId, createdAt])
  @@index([confidenceScore])
}

model Resume {
  // ... existing fields ...
  
  // Add indexes
  @@index([userId, createdAt])
  @@index([overallScore])
}

model ChatMessage {
  // ... existing fields ...
  
  // Add index for conversation history queries
  @@index([conversationId, createdAt])
}

// New model for learning paths
model LearningPath {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  title         String
  description   String?  @db.Text
  careerGoal    String
  steps         Json     // Array of learning steps
  progress      Float    @default(0) // 0-1
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([userId])
  @@map("learning_paths")
}

// New model for quiz responses
model QuizResponse {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  quizType      String   // "skills", "interests", "personality"
  responses     Json     // Quiz answers
  results       Json     // Calculated results
  
  createdAt     DateTime @default(now())
  
  @@index([userId, quizType])
  @@map("quiz_responses")
}
```

---

## 4. Feature Enhancements

### 4.1 Career Profiling Quiz

**Implementation Plan:**

1. **Frontend Component:** `components/features/quiz/CareerQuiz.tsx`
   - Multi-step form
   - Skills assessment
   - Interests questionnaire
   - Personality fit questions

2. **API Route:** `app/api/quiz/submit/route.ts`
   - Validate responses
   - Calculate scores
   - Store in database
   - Update user profile

3. **Service:** `lib/services/quiz.service.ts`
   - Score calculation logic
   - Profile update based on results

### 4.2 Mock Interview Scoring

**Implementation Plan:**

1. **Frontend Component:** `components/features/interview/InterviewScoring.tsx`
   - Record audio/video responses
   - Display questions
   - Submit for analysis

2. **API Route:** `app/api/interview/score/route.ts`
   - Receive user response
   - Analyze with AI
   - Generate feedback and score

3. **Service:** `lib/services/interview.service.ts`
   - Response analysis
   - Scoring algorithm
   - Feedback generation

### 4.3 Learning Path Generator

**Implementation Plan:**

1. **Frontend Component:** `components/features/learning/LearningPath.tsx`
   - Display learning path
   - Track progress
   - Mark steps complete

2. **API Route:** `app/api/learning/generate/route.ts`
   - Generate personalized path
   - Based on career goals and current skills

3. **Service:** `lib/services/learning.service.ts`
   - Path generation logic
   - Progress tracking
   - Recommendations

---

## 5. Security Enhancements

### 5.1 Rate Limiting

**Implementation:** `lib/middleware/rate-limit.middleware.ts`

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export const rateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 h'),
  analytics: true,
})

export async function rateLimitMiddleware(
  req: NextRequest,
  next: () => Promise<NextResponse>
): Promise<NextResponse> {
  const identifier = req.headers.get('x-user-id') || req.ip || 'anonymous'
  const { success } = await rateLimit.limit(identifier)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }
  
  return next()
}
```

### 5.2 Input Sanitization

**Implementation:** `lib/utils/sanitization.ts`

```typescript
import DOMPurify from 'isomorphic-dompurify'
import validator from 'validator'

export function sanitizeInput(input: string): string {
  // Remove HTML tags
  const cleaned = DOMPurify.sanitize(input, { ALLOWED_TAGS: [] })
  // Trim and normalize whitespace
  return validator.trim(cleaned).normalize('NFKC')
}

export function sanitizeForSQL(input: string): string {
  // Additional SQL injection prevention
  return validator.escape(input)
}
```

### 5.3 Session Management

**Implementation:** `lib/middleware/auth.middleware.ts`

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'

export async function authenticate(
  req: NextRequest,
  next: () => Promise<NextResponse>
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  // Attach user to request
  req.headers.set('x-user-id', session.user.id)
  
  return next()
}
```

---

## 6. Performance Optimizations

### 6.1 Caching Strategy

**Implementation:** `lib/cache/redis.ts`

```typescript
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export class CacheService {
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key)
    return value as T | null
  }
  
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    await redis.set(key, value, { ex: ttl })
  }
  
  async invalidate(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  }
}
```

**Caching Rules:**
- Career suggestions: 24 hours
- Profile-based recommendations: 12 hours
- Resume analysis: 1 hour (if same resume)
- Interview questions: 1 hour (same job title + difficulty)

### 6.2 Database Query Optimization

- Use `select` to fetch only needed fields
- Use `include` to avoid N+1 queries
- Add database indexes
- Use connection pooling

### 6.3 Code Splitting

```typescript
// Lazy load heavy components
const ResumeAnalysis = dynamic(() => import('@/components/features/resume/ResumeAnalysis'), {
  loading: () => <LoadingSkeleton />,
  ssr: false
})
```

---

## 7. Monitoring & Analytics

### 7.1 Structured Logging

**Implementation:** `lib/logger/pino.ts`

```typescript
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined,
})

// Usage
logger.info({ userId, action: 'career_suggestion' }, 'Career suggestion generated')
logger.error({ error, userId }, 'Failed to analyze resume')
```

### 7.2 Error Tracking

**Implementation:** Integrate Sentry

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
})
```

### 7.3 Analytics

**Implementation:** Privacy-compliant analytics

- Track feature usage
- Monitor API performance
- User journey analysis
- A/B testing support

---

## 8. Testing Strategy

### 8.1 Unit Tests

- Test utility functions
- Test service layer
- Test AI client abstraction
- Target: 80%+ coverage

### 8.2 Integration Tests

- Test API routes
- Test database operations
- Test AI integration (mocked)

### 8.3 E2E Tests

- User flows
- Critical paths
- Cross-browser testing

---

## 9. Migration Plan

### Phase 1: Critical Fixes (Week 1)
1. Fix undefined function calls
2. Add rate limiting
3. Implement error handling
4. Add input sanitization

### Phase 2: Architecture Improvements (Week 2-3)
1. Create service layer
2. Implement unified AI client
3. Add middleware stack
4. Enhance database schema

### Phase 3: Feature Enhancements (Week 4-5)
1. Career profiling quiz
2. Mock interview scoring
3. Learning path generator
4. Resume analyzer improvements

### Phase 4: Production Readiness (Week 6)
1. Add comprehensive testing
2. Set up monitoring
3. Performance optimization
4. Security audit

---

## 10. Technology Stack Updates

### Current Stack
- Next.js 14
- TypeScript
- Prisma + MySQL
- Perplexity API
- Tailwind CSS

### Recommended Additions
- **Caching:** Upstash Redis
- **Rate Limiting:** @upstash/ratelimit
- **Logging:** Pino
- **Error Tracking:** Sentry
- **State Management:** Zustand (optional)
- **Testing:** Vitest + Playwright
- **Code Quality:** ESLint + Prettier + Husky

---

## Conclusion

This architecture plan provides a roadmap for transforming the codebase into a production-ready, maintainable, and scalable application. The improvements focus on:

1. **Code Quality:** Better structure, type safety, error handling
2. **Security:** Rate limiting, input sanitization, proper auth
3. **Performance:** Caching, query optimization, code splitting
4. **Maintainability:** Service layer, middleware, reusable components
5. **Features:** Career quiz, interview scoring, learning paths

**Estimated Timeline:** 6 weeks for full implementation  
**Priority:** Start with critical fixes, then architecture improvements, then features








