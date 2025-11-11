# Database Structure Documentation

## Overview
This document describes the complete database schema including all tables, columns, foreign keys, and relationships.

---

## Table: `users`

**Primary Key:** `id` (String, CUID)

### Columns
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PRIMARY KEY, CUID | Unique user identifier |
| `username` | String | UNIQUE, NOT NULL | Username for login |
| `email` | String | UNIQUE, NULLABLE | User email address |
| `createdAt` | DateTime | NOT NULL, DEFAULT now() | Account creation timestamp |
| `updatedAt` | DateTime | NOT NULL, AUTO UPDATE | Last update timestamp |

### Foreign Keys
- None (root table)

### Relationships
- **1:1** → `profiles` (one user has one profile)
- **1:N** → `conversations` (one user has many conversations)
- **1:N** → `resumes` (one user has many resumes)
- **1:N** → `career_suggestions` (one user has many career suggestions)
- **1:N** → `feedbacks` (one user has many feedback entries)
- **1:N** → `quiz_responses` (one user has many quiz responses)
- **1:N** → `learning_paths` (one user has many learning paths)
- **1:N** → `interview_sessions` (one user has many interview sessions)
- **1:N** → `recommendations` (one user has many recommendations)

---

## Table: `profiles`

**Primary Key:** `id` (String, CUID)  
**Foreign Key:** `userId` → `users.id` (CASCADE DELETE)

### Columns
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PRIMARY KEY, CUID | Unique profile identifier |
| `userId` | String | FOREIGN KEY, UNIQUE, NOT NULL | References `users.id` |
| `skills` | String | NOT NULL, DEFAULT "[]" | JSON array of skills |
| `interests` | String | NOT NULL, DEFAULT "[]" | JSON array of interests |
| `educationLevel` | String | NULLABLE | e.g., "High School", "Bachelor's", "Master's", "PhD" |
| `major` | String | NULLABLE | Academic major |
| `currentYear` | String | NULLABLE | e.g., "Freshman", "Sophomore", "Junior", "Senior", "Graduate" |
| `goals` | String | NULLABLE | Career goals description |
| `createdAt` | DateTime | NOT NULL, DEFAULT now() | Profile creation timestamp |
| `updatedAt` | DateTime | NOT NULL, AUTO UPDATE | Last update timestamp |

### Foreign Keys
- `userId` → `users.id` (ON DELETE CASCADE)

### Relationships
- **N:1** → `users` (many profiles belong to one user, but enforced as 1:1 via UNIQUE constraint)

---

## Table: `career_suggestions`

**Primary Key:** `id` (String, CUID)  
**Foreign Key:** `userId` → `users.id` (CASCADE DELETE)

### Columns
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PRIMARY KEY, CUID | Unique suggestion identifier |
| `userId` | String | FOREIGN KEY, NOT NULL | References `users.id` |
| `title` | String | NOT NULL | Career title |
| `skillsRequired` | String | NOT NULL | JSON array or comma-separated skills |
| `summary` | Text | NOT NULL | Career description |
| `salaryGuideline` | String | NULLABLE | Salary range or guideline |
| `nextSteps` | Text | NULLABLE | Recommended next steps |
| `confidenceScore` | Float | NULLABLE | 0-1 confidence score |
| `verificationPlan` | Text | NULLABLE | How to verify key facts |
| `createdAt` | DateTime | NOT NULL, DEFAULT now() | Suggestion creation timestamp |

### Foreign Keys
- `userId` → `users.id` (ON DELETE CASCADE)

### Indexes
- `userId` (for user queries)
- `(userId, createdAt)` (composite, for sorted user queries)
- `confidenceScore` (for filtering by confidence)

### Relationships
- **N:1** → `users` (many suggestions belong to one user)

---

## Table: `conversations`

**Primary Key:** `id` (String, CUID)  
**Foreign Key:** `userId` → `users.id` (CASCADE DELETE)

### Columns
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PRIMARY KEY, CUID | Unique conversation identifier |
| `userId` | String | FOREIGN KEY, NOT NULL | References `users.id` |
| `title` | String | NULLABLE | Optional conversation title |
| `archived` | Boolean | NOT NULL, DEFAULT false | Archive status |
| `messageCount` | Int | NOT NULL, DEFAULT 0 | Number of messages |
| `lastMessageAt` | DateTime | NOT NULL, DEFAULT now() | Last message timestamp |
| `createdAt` | DateTime | NOT NULL, DEFAULT now() | Conversation creation timestamp |
| `updatedAt` | DateTime | NOT NULL, AUTO UPDATE | Last update timestamp |

### Foreign Keys
- `userId` → `users.id` (ON DELETE CASCADE)

### Indexes
- `userId` (for user queries)

### Relationships
- **N:1** → `users` (many conversations belong to one user)
- **1:N** → `chat_messages` (one conversation has many messages)

---

## Table: `chat_messages`

**Primary Key:** `id` (String, CUID)  
**Foreign Key:** `conversationId` → `conversations.id` (CASCADE DELETE)

### Columns
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PRIMARY KEY, CUID | Unique message identifier |
| `conversationId` | String | FOREIGN KEY, NOT NULL | References `conversations.id` |
| `role` | String | NOT NULL | "user" or "assistant" |
| `content` | Text | NOT NULL | Message content |
| `createdAt` | DateTime | NOT NULL, DEFAULT now() | Message timestamp |

### Foreign Keys
- `conversationId` → `conversations.id` (ON DELETE CASCADE)

### Indexes
- `conversationId` (for conversation queries)
- `(conversationId, createdAt)` (composite, for sorted message queries)

### Relationships
- **N:1** → `conversations` (many messages belong to one conversation)

---

## Table: `resumes`

**Primary Key:** `id` (String, CUID)  
**Foreign Key:** `userId` → `users.id` (CASCADE DELETE)

### Columns
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PRIMARY KEY, CUID | Unique resume identifier |
| `userId` | String | FOREIGN KEY, NOT NULL | References `users.id` |
| `fileName` | String | NOT NULL | Original file name |
| `fileData` | Bytes (BLOB) | NOT NULL | PDF file binary data |
| `fileSize` | Int | NOT NULL | File size in bytes |
| `mimeType` | String | NOT NULL, DEFAULT "application/pdf" | MIME type |
| `extractedText` | Text | NULLABLE | Extracted text content |
| `analysisResult` | Text | NULLABLE | JSON string with AI analysis |
| `careerAlignment` | Text | NULLABLE | JSON string with career match results |
| `improvementSuggestions` | Text | NULLABLE | JSON string with suggestions |
| `overallScore` | Float | NULLABLE | 0-100 overall score |
| `createdAt` | DateTime | NOT NULL, DEFAULT now() | Upload timestamp |

### Foreign Keys
- `userId` → `users.id` (ON DELETE CASCADE)

### Indexes
- `userId` (for user queries)
- `(userId, createdAt)` (composite, for sorted user queries)
- `overallScore` (for filtering by score)

### Relationships
- **N:1** → `users` (many resumes belong to one user)

---

## Table: `feedbacks`

**Primary Key:** `id` (String, CUID)  
**Foreign Key:** `userId` → `users.id` (CASCADE DELETE)

### Columns
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PRIMARY KEY, CUID | Unique feedback identifier |
| `userId` | String | FOREIGN KEY, NOT NULL | References `users.id` |
| `type` | String | NOT NULL | e.g., "resume", "interview", "career" |
| `content` | Text | NOT NULL | Feedback content |
| `metadata` | Text | NULLABLE | JSON string for additional data |
| `createdAt` | DateTime | NOT NULL, DEFAULT now() | Feedback timestamp |

### Foreign Keys
- `userId` → `users.id` (ON DELETE CASCADE)

### Indexes
- `userId` (for user queries)

### Relationships
- **N:1** → `users` (many feedbacks belong to one user)

---

## Table: `audit_logs`

**Primary Key:** `id` (String, CUID)  
**Foreign Key:** `userId` → `users.id` (NULLABLE, NO CASCADE)

### Columns
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PRIMARY KEY, CUID | Unique log identifier |
| `userId` | String | FOREIGN KEY, NULLABLE | References `users.id` (nullable for anonymous actions) |
| `action` | String | NOT NULL | e.g., "chat_message", "career_suggestion", "resume_upload" |
| `entityType` | String | NULLABLE | e.g., "conversation", "resume", "career" |
| `entityId` | String | NULLABLE | Related entity ID |
| `metadata` | Text | NULLABLE | JSON string for minimal logs |
| `createdAt` | DateTime | NOT NULL, DEFAULT now() | Log timestamp |

### Foreign Keys
- `userId` → `users.id` (NULLABLE, no cascade - logs preserved)

### Indexes
- `userId` (for user queries)
- `createdAt` (for time-based queries)

### Relationships
- **N:1** → `users` (many logs belong to one user, but nullable for anonymous)

---

## Table: `quiz_responses`

**Primary Key:** `id` (String, CUID)  
**Foreign Key:** `userId` → `users.id` (CASCADE DELETE)

### Columns
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PRIMARY KEY, CUID | Unique quiz response identifier |
| `userId` | String | FOREIGN KEY, NOT NULL | References `users.id` |
| `quizType` | String | NOT NULL | "skills", "interests", "personality" |
| `responses` | JSON | NOT NULL | Quiz answers (structured JSON) |
| `results` | JSON | NOT NULL | Calculated results (structured JSON) |
| `createdAt` | DateTime | NOT NULL, DEFAULT now() | Response timestamp |

### Foreign Keys
- `userId` → `users.id` (ON DELETE CASCADE)

### Indexes
- `userId` (for user queries)
- `(userId, quizType)` (composite, for user quiz type queries)
- `createdAt` (for time-based queries)

### Relationships
- **N:1** → `users` (many quiz responses belong to one user)

---

## Table: `learning_paths`

**Primary Key:** `id` (String, CUID)  
**Foreign Key:** `userId` → `users.id` (CASCADE DELETE)

### Columns
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PRIMARY KEY, CUID | Unique learning path identifier |
| `userId` | String | FOREIGN KEY, NOT NULL | References `users.id` |
| `title` | String | NOT NULL | Learning path title |
| `description` | Text | NULLABLE | Learning path description |
| `careerGoal` | String | NOT NULL | Target career goal |
| `steps` | JSON | NOT NULL | Array of learning steps |
| `progress` | Float | NOT NULL, DEFAULT 0 | 0-1 progress (0.0 to 1.0) |
| `completed` | Boolean | NOT NULL, DEFAULT false | Completion status |
| `createdAt` | DateTime | NOT NULL, DEFAULT now() | Creation timestamp |
| `updatedAt` | DateTime | NOT NULL, AUTO UPDATE | Last update timestamp |

### Foreign Keys
- `userId` → `users.id` (ON DELETE CASCADE)

### Indexes
- `userId` (for user queries)
- `(userId, completed)` (composite, for filtering user's completed paths)
- `createdAt` (for time-based queries)

### Relationships
- **N:1** → `users` (many learning paths belong to one user)

---

## Table: `interview_sessions`

**Primary Key:** `id` (String, CUID)  
**Foreign Key:** `userId` → `users.id` (CASCADE DELETE)

### Columns
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PRIMARY KEY, CUID | Unique interview session identifier |
| `userId` | String | FOREIGN KEY, NOT NULL | References `users.id` |
| `jobTitle` | String | NOT NULL | Job title for interview |
| `difficulty` | String | NOT NULL | "easy", "medium", "hard" |
| `questions` | JSON | NOT NULL | Array of questions |
| `responses` | JSON | NULLABLE | User responses |
| `scores` | JSON | NULLABLE | Scoring results |
| `overallScore` | Float | NULLABLE | 0-100 overall score |
| `feedback` | Text | NULLABLE | AI-generated feedback |
| `createdAt` | DateTime | NOT NULL, DEFAULT now() | Session start timestamp |
| `completedAt` | DateTime | NULLABLE | Session completion timestamp |

### Foreign Keys
- `userId` → `users.id` (ON DELETE CASCADE)

### Indexes
- `userId` (for user queries)
- `(userId, createdAt)` (composite, for sorted user queries)
- `overallScore` (for filtering by score)

### Relationships
- **N:1** → `users` (many interview sessions belong to one user)

---

## Table: `recommendations`

**Primary Key:** `id` (String, CUID)  
**Foreign Key:** `userId` → `users.id` (CASCADE DELETE)

### Columns
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PRIMARY KEY, CUID | Unique recommendation identifier |
| `userId` | String | FOREIGN KEY, NOT NULL | References `users.id` |
| `type` | String | NOT NULL | "career", "course", "resource", "skill", "action", etc. |
| `title` | String | NOT NULL | Recommendation title |
| `description` | Text | NULLABLE | Recommendation description |
| `category` | String | NULLABLE | e.g., "technical", "soft-skills", "networking" |
| `content` | JSON | NOT NULL | Flexible JSON structure for recommendation-specific data |
| `priority` | Int | NOT NULL, DEFAULT 5 | 1-10 priority score |
| `relevanceScore` | Float | NULLABLE | 0-1 relevance score based on user profile |
| `actionUrl` | String | NULLABLE | Optional URL to take action |
| `actionText` | String | NULLABLE | Optional action button text |
| `viewed` | Boolean | NOT NULL, DEFAULT false | View status |
| `saved` | Boolean | NOT NULL, DEFAULT false | Save status |
| `completed` | Boolean | NOT NULL, DEFAULT false | Completion status |
| `dismissed` | Boolean | NOT NULL, DEFAULT false | Dismissal status |
| `source` | String | NULLABLE | e.g., "ai_analysis", "resume_review", "quiz_results" |
| `metadata` | Text | NULLABLE | Additional JSON metadata |
| `createdAt` | DateTime | NOT NULL, DEFAULT now() | Creation timestamp |
| `updatedAt` | DateTime | NOT NULL, AUTO UPDATE | Last update timestamp |
| `viewedAt` | DateTime | NULLABLE | View timestamp |
| `completedAt` | DateTime | NULLABLE | Completion timestamp |

### Foreign Keys
- `userId` → `users.id` (ON DELETE CASCADE)

### Indexes
- `userId` (for user queries)
- `(userId, type)` (composite, for filtering user's recommendations by type)
- `(userId, saved)` (composite, for user's saved recommendations)
- `(userId, completed)` (composite, for user's completed recommendations)
- `relevanceScore` (for sorting by relevance)
- `createdAt` (for time-based queries)

### Relationships
- **N:1** → `users` (many recommendations belong to one user)

---

## Relationship Summary

### One-to-One (1:1)
- **User ↔ Profile**: One user has exactly one profile (enforced by UNIQUE constraint on `profiles.userId`)

### One-to-Many (1:N)
- **User → Conversations**: One user can have many conversations
- **User → Resumes**: One user can have many resumes
- **User → Career Suggestions**: One user can have many career suggestions
- **User → Feedbacks**: One user can have many feedback entries
- **User → Quiz Responses**: One user can have many quiz responses
- **User → Learning Paths**: One user can have many learning paths
- **User → Interview Sessions**: One user can have many interview sessions
- **User → Recommendations**: One user can have many recommendations
- **Conversation → Chat Messages**: One conversation can have many messages

### Cascade Delete Behavior
- When a **User** is deleted, all related records are automatically deleted:
  - Profile
  - Conversations (and their messages)
  - Resumes
  - Career Suggestions
  - Feedbacks
  - Quiz Responses
  - Learning Paths
  - Interview Sessions
  - Recommendations

- **Audit Logs** are preserved (no cascade) even if user is deleted (userId can be NULL)

---

## Index Strategy

### Performance Indexes
- All `userId` foreign keys are indexed for fast user-based queries
- Composite indexes on `(userId, createdAt)` for sorted user queries
- Composite indexes on `(userId, type)` for filtered user queries
- Score-based indexes (`confidenceScore`, `overallScore`, `relevanceScore`) for sorting/filtering

### Unique Constraints
- `users.username` - Unique
- `users.email` - Unique (nullable)
- `profiles.userId` - Unique (enforces 1:1 relationship)

---

## Data Types Notes

- **CUID**: Collision-resistant unique identifier (String)
- **BLOB**: Binary Large Object for storing PDF files (`resumes.fileData`)
- **JSON**: Structured JSON data for flexible schemas
- **Text**: Long text fields (TEXT type in MySQL)
- **DateTime**: Timestamp fields with automatic defaults/updates

---

## Design Decisions

1. **Cascade Deletes**: User deletion removes all related data for data consistency
2. **Audit Log Preservation**: Audit logs are not deleted when users are deleted (userId can be NULL)
3. **JSON Fields**: Used for flexible, schema-less data (quiz responses, learning steps, etc.)
4. **BLOB Storage**: PDF resumes stored as binary data in database
5. **Composite Indexes**: Optimized for common query patterns (user + date, user + type)
6. **1:1 Profile**: Enforced via UNIQUE constraint, not separate primary key relationship





