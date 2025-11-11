# Recommendations Table - Database Schema

## Overview

The `recommendations` table is a general-purpose table for storing various types of recommendations for users. This table can store career recommendations, course suggestions, resource recommendations, skill development suggestions, and action items.

---

## Schema Definition

### Model: Recommendation

```prisma
model Recommendation {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Recommendation details
  type          String   // "career", "course", "resource", "skill", "action", etc.
  title         String
  description   String?  @db.Text
  category      String?  // e.g., "technical", "soft-skills", "networking"
  
  // Recommendation content
  content       Json     // Flexible JSON structure for recommendation-specific data
  priority      Int      @default(5) // 1-10 priority score
  relevanceScore Float?  // 0-1 relevance score based on user profile
  
  // Action items
  actionUrl     String?  // Optional URL to take action
  actionText    String?  // Optional action button text
  
  // Status tracking
  viewed        Boolean  @default(false)
  saved         Boolean  @default(false)
  completed     Boolean  @default(false)
  dismissed     Boolean  @default(false)
  
  // Metadata
  source        String?  // e.g., "ai_analysis", "resume_review", "quiz_results"
  metadata      String?  @db.Text // Additional JSON metadata
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  viewedAt      DateTime?
  completedAt   DateTime?
  
  @@map("recommendations")
  @@index([userId])
  @@index([userId, type])
  @@index([userId, saved])
  @@index([userId, completed])
  @@index([relevanceScore])
  @@index([createdAt])
}
```

---

## Fields Description

### Core Fields

- **id**: Unique identifier (CUID)
- **userId**: Foreign key to User table
- **type**: Type of recommendation (career, course, resource, skill, action)
- **title**: Recommendation title
- **description**: Optional detailed description
- **category**: Optional category (technical, soft-skills, networking, etc.)

### Content Fields

- **content**: JSON field for flexible recommendation-specific data
  - Example for career: `{ "careerId": "...", "matchReasons": [...] }`
  - Example for course: `{ "courseId": "...", "provider": "...", "duration": "..." }`
  - Example for resource: `{ "url": "...", "resourceType": "article" }`

- **priority**: Priority score (1-10, default: 5)
- **relevanceScore**: Relevance score (0-1) based on user profile matching

### Action Fields

- **actionUrl**: Optional URL to take action on the recommendation
- **actionText**: Optional text for action button (e.g., "Enroll Now", "Learn More")

### Status Fields

- **viewed**: Whether user has viewed the recommendation
- **saved**: Whether user has saved/bookmarked the recommendation
- **completed**: Whether user has completed the recommended action
- **dismissed**: Whether user has dismissed the recommendation

### Metadata Fields

- **source**: Source of the recommendation (ai_analysis, resume_review, quiz_results, etc.)
- **metadata**: Additional JSON metadata for extensibility

### Timestamps

- **createdAt**: When recommendation was created
- **updatedAt**: When recommendation was last updated
- **viewedAt**: When recommendation was first viewed
- **completedAt**: When recommendation was completed

---

## Indexes

1. **userId**: Fast lookup of all recommendations for a user
2. **userId, type**: Fast lookup by user and recommendation type
3. **userId, saved**: Fast lookup of saved recommendations
4. **userId, completed**: Fast lookup of completed recommendations
5. **relevanceScore**: Sorting by relevance
6. **createdAt**: Sorting by creation date

---

## Use Cases

### 1. Career Recommendations
```json
{
  "type": "career",
  "title": "Software Engineer",
  "description": "Based on your skills in Python and JavaScript...",
  "category": "technical",
  "content": {
    "careerId": "software-engineer",
    "matchReasons": ["Strong programming skills", "Interest in technology"],
    "requiredSkills": ["Python", "JavaScript", "Problem Solving"],
    "salaryRange": "$80k - $120k"
  },
  "relevanceScore": 0.85,
  "source": "ai_analysis"
}
```

### 2. Course Recommendations
```json
{
  "type": "course",
  "title": "Advanced React Development",
  "description": "Master React hooks and advanced patterns",
  "category": "technical",
  "content": {
    "courseId": "react-advanced-101",
    "provider": "Coursera",
    "duration": "8 weeks",
    "level": "intermediate"
  },
  "priority": 8,
  "actionUrl": "https://coursera.org/...",
  "actionText": "Enroll Now",
  "source": "skill_gap_analysis"
}
```

### 3. Resource Recommendations
```json
{
  "type": "resource",
  "title": "System Design Interview Guide",
  "description": "Comprehensive guide to system design interviews",
  "category": "interview-prep",
  "content": {
    "url": "https://example.com/system-design",
    "resourceType": "article",
    "estimatedReadTime": "30 minutes"
  },
  "priority": 7,
  "actionUrl": "https://example.com/system-design",
  "actionText": "Read Article",
  "source": "resume_review"
}
```

### 4. Skill Development Recommendations
```json
{
  "type": "skill",
  "title": "Improve Communication Skills",
  "description": "Based on your interview feedback, focus on clear communication",
  "category": "soft-skills",
  "content": {
    "skillName": "Communication",
    "currentLevel": "intermediate",
    "targetLevel": "advanced",
    "suggestedActivities": ["Join Toastmasters", "Practice presentations"]
  },
  "priority": 6,
  "source": "interview_feedback"
}
```

---

## Relationship with Other Tables

### User Relationship
- **One-to-Many**: One user can have many recommendations
- **Cascade Delete**: When user is deleted, all recommendations are deleted

### Integration Points

1. **CareerSuggestion**: Career suggestions can be converted to recommendations
2. **Resume Analysis**: Resume analysis can generate skill/resource recommendations
3. **Quiz Results**: Quiz results can generate career/skill recommendations
4. **Interview Feedback**: Interview feedback can generate skill development recommendations

---

## Migration

### Migration File
- **Path**: `prisma/migrations/20250130000000_add_recommendations_table/migration.sql`
- **Status**: Created, ready to apply

### To Apply Migration

```bash
# Development
npx prisma migrate dev

# Production
npx prisma migrate deploy
```

---

## API Integration

### Example: Create Recommendation

```typescript
await prisma.recommendation.create({
  data: {
    userId: "user123",
    type: "career",
    title: "Data Scientist",
    description: "Based on your profile...",
    category: "technical",
    content: {
      matchReasons: ["Strong math skills", "Interest in data"],
      requiredSkills: ["Python", "Statistics", "Machine Learning"]
    },
    priority: 9,
    relevanceScore: 0.88,
    source: "ai_analysis"
  }
})
```

### Example: Get User Recommendations

```typescript
const recommendations = await prisma.recommendation.findMany({
  where: {
    userId: "user123",
    dismissed: false,
  },
  orderBy: [
    { relevanceScore: 'desc' },
    { priority: 'desc' },
    { createdAt: 'desc' }
  ]
})
```

### Example: Mark as Viewed

```typescript
await prisma.recommendation.update({
  where: { id: "rec123" },
  data: {
    viewed: true,
    viewedAt: new Date()
  }
})
```

---

## Status

✅ **Schema Created**: Recommendation model added to Prisma schema  
✅ **Migration Created**: Migration file created  
⏳ **Migration Pending**: Migration needs to be applied to database  
✅ **Indexes Defined**: All necessary indexes for performance  
✅ **Relationships**: User relationship established  

---

## Next Steps

1. **Apply Migration**: Run `npx prisma migrate dev` to apply the migration
2. **Generate Prisma Client**: Run `npx prisma generate` to update TypeScript types
3. **Create API Routes**: Create API endpoints for recommendation CRUD operations
4. **Integrate with Services**: Connect recommendation generation to existing services
5. **Create UI Components**: Build UI components to display recommendations

---

**Created**: 2025-01-30  
**Status**: Ready for migration application







