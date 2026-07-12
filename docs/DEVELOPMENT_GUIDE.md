# Development Guide - AI Calling Agent Platform

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Conventions](#project-conventions)
3. [Backend Development](#backend-development)
4. [Frontend Development](#frontend-development)
5. [Database Management](#database-management)
6. [API Development](#api-development)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)

## Getting Started

### Development Environment Setup

1. **Install Required Tools**
   - Node.js 18+ and npm 9+
   - MySQL 8.0+
   - VS Code (recommended) with extensions:
     - ESLint
     - Prettier
     - Prisma
     - TypeScript
     - Tailwind CSS IntelliSense

2. **Clone and Install**
   ```bash
   git clone <repo-url>
   cd ai-calling-agent
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   cp apps/web/.env.local.example apps/web/.env.local
   ```

4. **Database Setup**
   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

5. **Start Development**
   ```bash
   npm run dev
   ```

## Project Conventions

### Code Style

- Use TypeScript for all new code
- Follow ESLint and Prettier configurations
- Use meaningful variable and function names
- Write self-documenting code with comments for complex logic

### File Naming

- **Components**: PascalCase (`UserProfile.tsx`)
- **Utilities**: camelCase (`formatDate.ts`)
- **Constants**: UPPER_SNAKE_CASE (`API_URL`)
- **Types/Interfaces**: PascalCase (`UserProfile`)

### Commit Messages

Follow conventional commits:
```
feat: add user authentication
fix: resolve login redirect issue
docs: update API documentation
style: format code with prettier
refactor: simplify user service logic
test: add unit tests for auth service
chore: update dependencies
```

## Backend Development

### Creating a New Module

1. **Generate Module Structure**
   ```bash
   cd apps/api/src/modules
   mkdir my-module
   cd my-module
   mkdir dto
   ```

2. **Create Module Files**

   `my-module.module.ts`:
   ```typescript
   import { Module } from '@nestjs/common';
   import { MyModuleController } from './my-module.controller';
   import { MyModuleService } from './my-module.service';

   @Module({
     controllers: [MyModuleController],
     providers: [MyModuleService],
     exports: [MyModuleService],
   })
   export class MyModuleModule {}
   ```

   `my-module.service.ts`:
   ```typescript
   import { Injectable } from '@nestjs/common';
   import { PrismaService } from '@/common/prisma/prisma.service';

   @Injectable()
   export class MyModuleService {
     constructor(private readonly prisma: PrismaService) {}

     async findAll() {
       return this.prisma.myModel.findMany();
     }
   }
   ```

   `my-module.controller.ts`:
   ```typescript
   import { Controller, Get, UseGuards } from '@nestjs/common';
   import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
   import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
   import { MyModuleService } from './my-module.service';

   @ApiTags('My Module')
   @Controller('my-module')
   @UseGuards(JwtAuthGuard)
   @ApiBearerAuth()
   export class MyModuleController {
     constructor(private readonly service: MyModuleService) {}

     @Get()
     findAll() {
       return this.service.findAll();
     }
   }
   ```

3. **Import in App Module**
   ```typescript
   // apps/api/src/app.module.ts
   import { MyModuleModule } from './modules/my-module/my-module.module';

   @Module({
     imports: [
       // ...other modules
       MyModuleModule,
     ],
   })
   export class AppModule {}
   ```

### Adding DTOs

```typescript
// dto/create-my-entity.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMyEntityDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;
}
```

### Using Guards and Roles

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'manager')
@Get('protected')
protectedRoute() {
  return 'This is protected';
}
```

## Frontend Development

### Creating a New Page

1. **Create Page Directory**
   ```bash
   mkdir apps/web/src/app/dashboard/my-page
   ```

2. **Create page.tsx**
   ```typescript
   'use client';

   import { Card } from '@/components/ui/card';

   export default function MyPage() {
     return (
       <div className="space-y-6">
         <h2 className="text-3xl font-bold">My Page</h2>
         <Card>
           {/* Your content */}
         </Card>
       </div>
     );
   }
   ```

3. **Add to Sidebar**
   ```typescript
   // apps/web/src/components/layout/sidebar.tsx
   const navigation = [
     // ...existing items
     { name: 'My Page', href: '/dashboard/my-page', icon: IconName },
   ];
   ```

### Using API Hooks

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function MyComponent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['myData'],
    queryFn: async () => {
      const response = await api.get('/my-endpoint');
      return response.data;
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading data</div>;

  return <div>{/* Render data */}</div>;
}
```

### Creating UI Components

```typescript
// components/my-component.tsx
import { cn } from '@/lib/utils';

interface MyComponentProps {
  className?: string;
  title: string;
}

export function MyComponent({ className, title }: MyComponentProps) {
  return (
    <div className={cn('p-4 rounded-lg border', className)}>
      <h3>{title}</h3>
    </div>
  );
}
```

## Database Management

### Adding a New Model

1. **Update schema.prisma**
   ```prisma
   model MyModel {
     id        String   @id @default(uuid())
     name      String   @db.VarChar(255)
     isActive  Boolean  @default(true)
     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt
     deletedAt DateTime?

     @@index([name])
     @@index([isActive])
     @@map("my_models")
   }
   ```

2. **Create Migration**
   ```bash
   cd database/prisma
   npx prisma migrate dev --name add_my_model
   ```

3. **Generate Client**
   ```bash
   npx prisma generate
   ```

### Updating an Existing Model

1. Modify the model in `schema.prisma`
2. Run migration:
   ```bash
   npm run db:migrate
   ```
3. Update seed file if needed

### Seeding Data

```typescript
// database/seed/seed.ts
async function main() {
  await prisma.myModel.createMany({
    data: [
      { name: 'Item 1' },
      { name: 'Item 2' },
    ],
  });
}
```

## API Development

### Request Validation

Use class-validator decorators:
```typescript
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsOptional()
  phone?: string;
}
```

### Error Handling

```typescript
import { NotFoundException, BadRequestException } from '@nestjs/common';

async findOne(id: string) {
  const item = await this.prisma.myModel.findUnique({ where: { id } });
  if (!item) {
    throw new NotFoundException('Item not found');
  }
  return item;
}
```

### Pagination

```typescript
import { PaginationDto, createPaginatedResponse } from '@/common/dto/pagination.dto';

async findAll(paginationDto: PaginationDto) {
  const { page, limit, search } = paginationDto;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    this.prisma.myModel.findMany({ skip, take: limit }),
    this.prisma.myModel.count(),
  ]);

  return createPaginatedResponse(items, total, page, limit);
}
```

### API Response Format

Always return consistent responses:
```typescript
return {
  success: true,
  data: result,
  message: 'Operation successful',
};
```

## Testing

### Unit Tests (Backend)

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MyService } from './my.service';

describe('MyService', () => {
  let service: MyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MyService],
    }).compile();

    service = module.get<MyService>(MyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

### Integration Tests

```bash
# Run API tests
cd apps/api
npm test

# Run with coverage
npm test -- --coverage
```

## Deployment

### Production Build

```bash
# Build all apps
npm run build

# Or individually
npm run build:web
npm run build:api
```

### Environment Variables

Ensure all production environment variables are set:
- Database connection strings
- JWT secrets (use strong, random values)
- API URLs
- Logging configurations

### Database Migration

```bash
# Run migrations in production
cd database/prisma
npx prisma migrate deploy
```

### Deployment Checklist

- [ ] Update environment variables
- [ ] Run database migrations
- [ ] Build applications
- [ ] Test API endpoints
- [ ] Verify authentication
- [ ] Check database connections
- [ ] Test file uploads
- [ ] Verify CORS settings
- [ ] Enable logging
- [ ] Set up monitoring

## Troubleshooting

### Common Issues

**Database Connection Failed**
- Check MySQL is running
- Verify DATABASE_URL in .env
- Check database exists
- Verify credentials

**Prisma Client Not Generated**
```bash
npm run db:generate
```

**Migration Errors**
```bash
# Reset database (DEVELOPMENT ONLY)
npx prisma migrate reset
npm run db:seed
```

**Frontend Build Errors**
```bash
# Clear Next.js cache
rm -rf apps/web/.next
npm run build:web
```

**API Not Starting**
- Check port 3001 is available
- Verify all dependencies installed
- Check for TypeScript errors
- Review application logs

### Debugging

**Backend Debugging**
```bash
# Start in debug mode
npm run start:debug
```

**Frontend Debugging**
- Use browser DevTools
- Check Console for errors
- Use React DevTools extension
- Check Network tab for API calls

### Logs

**Backend Logs**
- Check terminal output
- Review error messages
- Use logger service

**Database Logs**
```bash
# View Prisma queries
cd database/prisma
npx prisma studio
```

## Best Practices

1. **Always use TypeScript**
2. **Write descriptive comments**
3. **Follow SOLID principles**
4. **Use DTOs for validation**
5. **Implement proper error handling**
6. **Keep components small and focused**
7. **Use environment variables for config**
8. **Never commit sensitive data**
9. **Write tests for critical features**
10. **Keep dependencies updated**

## Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)

---

Happy Coding! 🚀
