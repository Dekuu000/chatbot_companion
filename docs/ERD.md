# Entity Relationship Diagram (ERD)

## Database Schema Overview

### Relationships

```
┌─────────────┐
│    User     │
├─────────────┤
│ id (PK)     │
│ username    │
│ email       │
│ createdAt   │
│ updatedAt   │
└──────┬──────┘
       │
       │ 1:1
       ├─────────────────┐
       │                 │
       │ 1:N             │ 1:N
       │                 │
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│   Profile   │   │Conversation │
├─────────────┤   ├─────────────┤
│ id (PK)     │   │ id (PK)     │
│ userId (FK) │   │ userId (FK) │
│ skills      │   │ title       │
│ interests   │   │ msgCount    │
│ education   │   │ lastMsgAt   │
│ major       │   └─────────────┘
│ currentYear │
│ goals       │
└─────────────┘
       │
       │ User profile used for AI personalization
       │
┌──────────────────────────────┐
│                             │
│  ┌─────────────┐            │
│  │    Resume   │            │
│  ├─────────────┤            │
│  │ id (PK)     │            │
│  │ userId (FK) │            │
│  │ fileName    │            │
│  │ fileData    │◄─── BLOB storage
│  │ fileSize    │            │
│  │ extractedText│            │
│  │ analysisResult│           │
│  │ careerAlign │            │
│  │ suggestions │            │
│  │ overallScore│            │
│  └─────────────┘            │
│                             │
│  ┌─────────────┐            │
│  │CareerSuggstn│            │
│  ├─────────────┤            │
│  │ id (PK)     │            │
│  │ userId (FK) │            │
│  │ title       │            │
│  │ skillsReq   │            │
│  │ summary     │            │
│  │ salaryGuide │            │
│  │ nextSteps   │            │
│  │ confidence  │            │
│  │ verification│            │
│  └─────────────┘            │
│                             │
│  ┌─────────────┐            │
│  │  Feedback   │            │
│  ├─────────────┤            │
│  │ id (PK)     │            │
│  │ userId (FK) │            │
│  │ type        │            │
│  │ content     │            │
│  │ metadata    │            │
│  └─────────────┘            │
│                             │
└─────────────────────────────┘

       Independent
       │
       ▼
┌─────────────┐
│  AuditLog   │
├─────────────┤
│ id (PK)     │
│ userId (FK?)│
│ action      │
│ entityType  │
│ entityId    │
│ metadata    │
│ createdAt   │
└─────────────┘
```

## Key Design Decisions

1. **User-Profile 1:1**: Each user has exactly one profile for consistency
2. **Conversation Metadata**: Only metadata stored (chat history client-side)
3. **Resume BLOB**: PDF files stored as MySQL BLOB for demo
4. **CareerSuggestion**: Includes confidence and verification per requirements
5. **AuditLog**: Minimal logging, independent table for flexibility
6. **Cascade Deletes**: User deletion removes all related data

## Indexes

- `User.username` - Unique
- `User.email` - Unique (nullable)
- `Profile.userId` - Unique (1:1 relationship)
- `CareerSuggestion.userId` - Indexed for queries
- `Conversation.userId` - Indexed for queries
- `Resume.userId` - Indexed for queries
- `Feedback.userId` - Indexed for queries
- `AuditLog.userId` - Indexed for queries
- `AuditLog.createdAt` - Indexed for time-based queries
