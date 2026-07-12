# AI Calling Agent - Enterprise Platform

## Phase 1 - Enterprise Foundation

A production-ready, scalable foundation for an Enterprise AI Calling Agent platform built with modern technologies.

## 📋 Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Default Credentials](#default-credentials)
- [Development Guide](#development-guide)
- [Architecture](#architecture)

## 🎯 Overview

This is Phase 1 of the AI Calling Agent platform, focusing on building a solid enterprise foundation. This phase does NOT include AI calling, voice engine, speech recognition, or telephony features - those are planned for future phases.

### What's Included in Phase 1:

✅ Complete authentication system with JWT
✅ Role-based access control (RBAC)
✅ User management
✅ Campaign management
✅ Contact management with CSV/Excel import
✅ Script management
✅ Prompt management
✅ Knowledge base
✅ Voice profile placeholder (database ready)
✅ Call history placeholder (database ready)
✅ Analytics dashboard placeholder
✅ Modern, responsive UI with dark/light mode
✅ Professional dashboard with sidebar navigation
✅ RESTful API with Swagger documentation

### What's NOT Included (Future Phases):

❌ AI Calling functionality
❌ Voice engine integration
❌ Speech-to-text
❌ Text-to-speech
❌ Telephony integration
❌ Real-time conversation AI

## 🚀 Technology Stack

### Frontend
- **Next.js 16** - React framework
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **TanStack Query** - Data fetching
- **Zustand** - State management
- **Axios** - HTTP client

### Backend
- **NestJS** - Node.js framework
- **TypeScript** - Type safety
- **Prisma ORM** - Database ORM
- **MySQL** - Database
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **Zod** - Validation
- **Swagger** - API documentation
- **Passport** - Authentication middleware

## 📁 Project Structure

```
AI-CALLING-AGENT/
├── apps/
│   ├── web/                    # Next.js frontend application
│   │   ├── src/
│   │   │   ├── app/           # Next.js app router
│   │   │   ├── components/    # React components
│   │   │   ├── lib/           # Utility libraries
│   │   │   └── hooks/         # Custom React hooks
│   │   ├── public/            # Static assets
│   │   └── package.json
│   │
│   └── api/                    # NestJS backend application
│       ├── src/
│       │   ├── modules/       # Feature modules
│       │   │   ├── auth/
│       │   │   ├── users/
│       │   │   ├── campaigns/
│       │   │   ├── contacts/
│       │   │   └── ...
│       │   ├── common/        # Shared code
│       │   │   ├── guards/
│       │   │   ├── filters/
│       │   │   ├── interceptors/
│       │   │   └── decorators/
│       │   ├── app.module.ts
│       │   └── main.ts
│       └── package.json
│
├── packages/
│   ├── types/                  # Shared TypeScript types
│   ├── utils/                  # Shared utilities
│   ├── config/                 # Shared configuration
│   └── shared/                 # Shared code
│
├── database/
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   └── seed/
│       └── seed.ts            # Database seeding
│
├── storage/                    # File storage
│   ├── contacts/
│   ├── recordings/
│   ├── transcripts/
│   ├── knowledge-base/
│   └── voices/
│
├── docs/                       # Documentation
├── .env.example               # Environment variables template
├── package.json               # Root package.json
└── README.md
```

## ✨ Features

### Authentication & Authorization
- JWT-based authentication
- Refresh token mechanism
- Role-based access control (RBAC)
- Permission-based authorization
- Protected routes

### User Management
- Create, read, update, delete users
- Assign roles to users
- User profile management
- Activity tracking

### Role Management
- Admin, Manager, Agent roles
- Custom role creation
- Permission management
- Fine-grained access control

### Campaign Management
- Create and manage campaigns
- Campaign status management (Draft, Scheduled, Active, Paused, Completed, Cancelled)
- Schedule campaigns
- Link scripts, prompts, and voice profiles

### Contact Management
- Manual contact creation
- CSV file import
- Excel file import
- Duplicate detection
- Phone validation
- Search and filter contacts

### Script Management
- Create call scripts
- Multi-language support
- Version control
- Script templates

### Prompt Management
- Create AI prompts
- Version control
- Status management
- Prompt templates

### Knowledge Base
- FAQ management
- Policy documents
- Pricing information
- Multi-format support (PDF, DOCX, Website)

### Voice Library (Placeholder)
- Voice profile database structure
- UI ready for Phase 2 implementation

### Analytics Dashboard
- Campaign statistics
- Call metrics
- Performance charts (placeholder)
- Recent activity feed

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **MySQL** >= 8.0
- **Git**

## 🔧 Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd ai-calling-agent
```

2. **Install dependencies**

```bash
npm install
```

This will install dependencies for all workspaces (root, web, api, and packages).

## ⚙️ Configuration

1. **Create environment files**

```bash
# Copy root environment file
cp .env.example .env

# Copy web environment file
cp apps/web/.env.local.example apps/web/.env.local
```

2. **Configure Database**

Edit the `.env` file and update the database connection string:

```env
DATABASE_URL="mysql://user:password@localhost:3306/ai_calling_agent"
```

3. **Configure JWT Secrets**

Update the following in `.env`:

```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-token-key-change-this
```

4. **Configure API URL**

Update `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

## 🗄️ Database Setup

1. **Generate Prisma Client**

```bash
npm run db:generate
```

2. **Run Migrations**

```bash
npm run db:migrate
```

This will create all database tables based on the Prisma schema.

3. **Seed Database**

```bash
npm run db:seed
```

This will populate the database with:
- Default company
- Admin, Manager, and Agent roles
- Permissions
- Admin user
- Sample data

## 🚀 Running the Application

### Development Mode

**Run both frontend and backend concurrently:**

```bash
npm run dev
```

This starts:
- Frontend at http://localhost:3000
- Backend at http://localhost:3001

**Or run separately:**

```bash
# Run frontend only
npm run dev:web

# Run backend only
npm run dev:api
```

### Production Mode

```bash
# Build all applications
npm run build

# Start frontend
npm run start:web

# Start backend
npm run start:api
```

## 📚 API Documentation

Once the backend is running, access the Swagger API documentation at:

**http://localhost:3001/api/docs**

The documentation includes:
- All API endpoints
- Request/response schemas
- Authentication requirements
- Try-it-out functionality

## 🔑 Default Credentials

After seeding the database, use these credentials to log in:

```
Email: admin@aicallingagent.com
Password: Admin@123
```

**⚠️ IMPORTANT: Change these credentials in production!**

## 👨‍💻 Development Guide

### Adding a New API Module

1. Create module directory:
```bash
mkdir apps/api/src/modules/your-module
```

2. Create module files:
- `your-module.module.ts` - Module definition
- `your-module.controller.ts` - Controller with routes
- `your-module.service.ts` - Business logic
- `dto/your-module.dto.ts` - Data transfer objects

3. Import module in `app.module.ts`

### Adding a New Frontend Page

1. Create page directory under `apps/web/src/app/dashboard/`:
```bash
mkdir apps/web/src/app/dashboard/your-page
```

2. Create `page.tsx` with your component

3. Add route to sidebar navigation in `apps/web/src/components/layout/sidebar.tsx`

### Database Schema Changes

1. Modify `database/prisma/schema.prisma`
2. Run migration:
```bash
npm run db:migrate
```
3. Regenerate Prisma client:
```bash
npm run db:generate
```

### Adding UI Components

Use shadcn/ui CLI (if needed) or create manually in `apps/web/src/components/ui/`

## 🏗️ Architecture

### Backend Architecture

The backend follows clean architecture principles:

- **Controllers**: Handle HTTP requests/responses
- **Services**: Business logic
- **Repositories**: Data access through Prisma
- **DTOs**: Data validation and transformation
- **Guards**: Authentication and authorization
- **Filters**: Exception handling
- **Interceptors**: Logging and transformation

### Frontend Architecture

- **App Router**: Next.js 16 app router
- **Server Components**: Default rendering
- **Client Components**: Interactive UI
- **API Layer**: Centralized API calls with Axios
- **State Management**: Zustand for global state
- **Data Fetching**: TanStack Query for server state

### Security

- **JWT Authentication**: Stateless authentication
- **Refresh Tokens**: Long-lived sessions
- **Password Hashing**: bcrypt with salt rounds
- **RBAC**: Role-based access control
- **Input Validation**: Zod and class-validator
- **SQL Injection Prevention**: Prisma parameterized queries

## 🎨 UI/UX Features

- Professional enterprise design
- Dark/Light mode support
- Responsive layout (mobile, tablet, desktop)
- Modern card-based UI
- Smooth animations
- Accessible components (ARIA)
- Loading states
- Error handling
- Toast notifications

## 📊 Database Models

- **Company**: Multi-tenant support
- **Users**: User accounts
- **Roles**: RBAC roles
- **Permissions**: Granular permissions
- **Campaigns**: Campaign management
- **Contacts**: Contact database
- **Scripts**: Call scripts
- **Prompts**: AI prompts
- **KnowledgeBase**: FAQ and documentation
- **VoiceProfiles**: Voice configurations (placeholder)
- **Calls**: Call records (placeholder)
- **CallTranscripts**: Call transcripts (placeholder)
- **CallRecordings**: Call recordings (placeholder)
- **Analytics**: Analytics data (placeholder)
- **Settings**: System settings
- **ActivityLogs**: Audit trail

All models include:
- UUID primary keys
- Soft delete support
- Timestamps (createdAt, updatedAt)
- Proper indexes
- Foreign key relationships

## 🔮 Future Phases

### Phase 2 (Planned)
- AI calling integration
- Voice engine implementation
- Speech-to-text functionality
- Text-to-speech functionality
- Real-time conversation AI

### Phase 3 (Planned)
- Telephony integration
- Voice training
- Advanced analytics
- Real-time monitoring
- Call recording and playback

## 📝 Code Quality

The codebase follows:

- **SOLID Principles**
- **DRY (Don't Repeat Yourself)**
- **Clean Architecture**
- **Repository Pattern**
- **Service Pattern**
- **TypeScript Strict Mode**
- **ESLint Configuration**
- **Prettier Formatting**

## 🤝 Contributing

This is an enterprise internal project. For contributions:

1. Follow the existing code structure
2. Write clean, documented code
3. Use TypeScript strictly
4. Test your changes
5. Update documentation

## 📄 License

Copyright © 2026 AI Calling Agent. All rights reserved.

## 🆘 Support

For issues, questions, or contributions, contact the development team.

---

**Built with ❤️ for Enterprise Excellence**
