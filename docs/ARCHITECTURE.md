# Architecture Documentation

## Database Schema

### Entity Relationship Overview

```
User (1) ──< (1) Profile
  │
  ├──< (N) Conversation
  ├──< (N) Resume
  ├──< (N) CareerSuggestion
  └──< (N) Feedback

AuditLog (independent, tracks all actions)
```

### Models

#### User
- Basic user information for demo login
- Fields: id, username, email, timestamps
- Relations: Profile (1:1), Conversations, Resumes, CareerSuggestions, Feedbacks

#### Profile
- User profile with skills, interests, education
- Fields: skills (JSON array), interests (JSON array), educationLevel, major, currentYear, goals
- Stores user context for AI personalization

#### CareerSuggestion
- AI-generated career recommendations
- Fields: title, skillsRequired, summary, salaryGuideline, nextSteps
- Includes confidenceScore and verificationPlan per requirements
- Indexed by userId for quick retrieval

#### Conversation
- Metadata only (chat history stored client-side)
- Fields: title, messageCount, lastMessageAt
- Lightweight tracking of conversation sessions

#### Resume
- Real PDF resume storage in BLOB (MySQL Bytes)
- Fields: fileName, fileData (BLOB), fileSize, mimeType
- Extracted text content and AI analysis results
- Fields: extractedText, analysisResult, careerAlignment, improvementSuggestions, overallScore

#### Feedback
- Generic feedback storage
- Fields: type, content, metadata (JSON)
- Used for various feedback types (resume, interview, career)

#### AuditLog
- Minimal logging per requirements
- Fields: userId, action, entityType, entityId, metadata
- Indexed by userId and createdAt

## Application Structure

### Pages (App Router)
- `/` - Home page with feature overview
- `/chat` - AI chatbot interface
- `/profile` - User profile management
- `/resume` - Resume upload and analysis
- `/interview` - Interview preparation tool

### API Routes
- `/api/ai/chat` - Chat endpoint with streaming
- `/api/careers/suggest` - Career recommendation engine
- `/api/interview/generate` - Interview question generator
- `/api/resume/upload` - Resume upload and analysis
- `/api/resume/analyze` - Resume analysis endpoint

### Utilities
- `lib/prisma.ts` - Prisma client singleton
- `lib/openai.ts` - OpenAI client configuration
- `lib/pdf-extractor.ts` - PDF text extraction utility

## AI Integration

### System Prompt
CareerGuideGPT acts as a professional career counselor:
- Provides actionable guidance
- Avoids hallucination
- Includes confidence scores
- Provides verification plans for key facts

### Response Format
All AI responses include:
- `confidenceScore`: 0-1 confidence level
- `verificationPlan`: How to verify factual claims
- Structured JSON for career suggestions

## Data Privacy

- Real resumes stored in MySQL BLOB (demo/prototype)
- Minimal logging (timestamps, job titles, message counts)
- For production scale, migrate to object storage (S3, etc.)
- No sensitive personal data logged unnecessarily

## Technology Stack

- **Frontend**: Next.js 14 App Router, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: MySQL (Railway)
- **ORM**: Prisma
- **AI**: OpenAI GPT-4
- **File Processing**: pdf-parse for PDF extraction
- **Deployment**: Vercel
