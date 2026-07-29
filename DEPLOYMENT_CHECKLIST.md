# Company User Panel - Deployment Checklist

## ✅ Pre-Deployment Verification (COMPLETE)

### Code Quality
- [x] TypeScript compilation: No errors
- [x] Frontend build: Successful (74 routes)
- [x] Backend build: Successful (Webpack compiled)
- [x] Prisma schema: Synced
- [x] Migrations: Applied
- [x] Seed data: Available

### Functionality
- [x] Login redirection: Working (role-based)
- [x] Company sidebar: 10 modules visible
- [x] Dashboard: Company-specific stats only
- [x] CRUD operations: All isolated by companyId
- [x] API filtering: Automatic from JWT
- [x] Data isolation: Zero leaks verified

### Security
- [x] JWT authentication: Implemented
- [x] Role-based access: Working
- [x] Permission checks: Configured
- [x] CompanyId extraction: From JWT (secure)
- [x] Cross-company access: Blocked (403)
- [x] Super admin bypass: Working

### Documentation
- [x] Audit report: Created
- [x] Developer guide: Created
- [x] Architecture docs: Available
- [x] Testing guide: Available
- [x] Quick summary: Created

---

## 🔧 Environment Configuration (TODO)

### Required Environment Variables

#### Backend (.env)
```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production-use-at-least-32-characters"
JWT_EXPIRATION="7d"

# Redis (Optional)
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""

# Application
NODE_ENV="production"
PORT="4000"
API_PREFIX="api"

# CORS
CORS_ORIGINS="https://your-domain.com,https://www.your-domain.com"

# Rate Limiting (Recommended)
RATE_LIMIT_TTL="60"
RATE_LIMIT_MAX="100"
```

#### Frontend (.env.local)
```bash
# API
NEXT_PUBLIC_API_URL="https://api.your-domain.com"
NEXT_PUBLIC_API_TIMEOUT="30000"

# Application
NEXT_PUBLIC_APP_NAME="AI Calling Agent"
NEXT_PUBLIC_APP_VERSION="1.0.0"
```

---

## 🚀 Deployment Steps

### Step 1: Database Setup
```bash
# 1. Create production database
createdb ai_calling_agent_prod

# 2. Set DATABASE_URL in .env

# 3. Run migrations
cd database
npx prisma migrate deploy

# 4. Generate Prisma Client
npx prisma generate

# 5. Seed initial data (optional)
npx prisma db seed
```

### Step 2: Backend Deployment
```bash
cd apps/api

# 1. Install production dependencies
npm ci --production

# 2. Build application
npm run build

# 3. Start with PM2 (recommended)
pm2 start dist/main.js --name "ai-calling-api" --instances 2

# OR with node directly
node dist/main.js

# 4. Verify API is running
curl http://localhost:4000/api/health
```

### Step 3: Frontend Deployment
```bash
cd apps/web

# 1. Install production dependencies
npm ci --production

# 2. Build application
npm run build

# 3. Start Next.js server
npm start

# OR export static files
npm run export

# 4. Verify frontend is running
curl http://localhost:3000
```

### Step 4: Reverse Proxy (Nginx)
```nginx
# /etc/nginx/sites-available/ai-calling-agent

# API
server {
    listen 80;
    server_name api.your-domain.com;
    
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Frontend
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Step 5: SSL/TLS Setup (Let's Encrypt)
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificates
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
sudo certbot --nginx -d api.your-domain.com

# Auto-renewal (cron job)
sudo certbot renew --dry-run
```

---

## ✅ Post-Deployment Verification

### Test Login & Routing
```bash
# Test Super Admin Login
curl -X POST https://api.your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aicallingagent.com","password":"Admin@123"}'

# Should return JWT with role: super-admin
# Frontend should route to /dashboard

# Test Company Admin Login
curl -X POST https://api.your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"company@aicallingagent.com","password":"Admin@123"}'

# Should return JWT with role: company-admin
# Frontend should route to /company
```

### Test Data Isolation
```bash
# 1. Login as Company A, create contact
# 2. Login as Company B, try to fetch Company A's contact
# 3. Should return 404 or empty array

# This verifies:
# - JWT companyId extraction working
# - Service filtering working
# - No cross-company data access
```

### Test API Endpoints
```bash
# Health check
curl https://api.your-domain.com/api/health

# Get contacts (requires auth)
curl https://api.your-domain.com/api/contacts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Should return only user's company contacts
```

### Test Frontend
1. Open `https://your-domain.com`
2. Login with super admin → Should see `/dashboard`
3. Logout
4. Login with company admin → Should see `/company`
5. Verify sidebar shows only 10 modules
6. Check dashboard shows company-specific data
7. Test mobile responsiveness

---

## 📊 Monitoring Setup

### Application Monitoring
```bash
# PM2 Monitoring
pm2 monit

# View logs
pm2 logs ai-calling-api
pm2 logs --lines 100

# Application metrics
pm2 describe ai-calling-api
```

### Database Monitoring
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check slow queries
SELECT pid, now() - query_start as duration, query 
FROM pg_stat_activity 
WHERE state = 'active' 
ORDER BY duration DESC;

-- Check table sizes
SELECT schemaname, tablename, 
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Error Tracking (Optional)
```typescript
// Install Sentry
npm install @sentry/node @sentry/nextjs

// Backend: apps/api/src/main.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

// Frontend: next.config.js
const { withSentryConfig } = require('@sentry/nextjs');
```

---

## 🔒 Security Hardening

### Backend Security
```typescript
// Enable helmet (apps/api/src/main.ts)
import helmet from 'helmet';
app.use(helmet());

// Rate limiting
import { ThrottlerModule } from '@nestjs/throttler';

ThrottlerModule.forRoot({
  ttl: 60,
  limit: 100,
}),

// CORS whitelist
app.enableCors({
  origin: process.env.CORS_ORIGINS.split(','),
  credentials: true,
});
```

### Database Security
```sql
-- Create read-only user for reports
CREATE USER reporting_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE ai_calling_agent TO reporting_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO reporting_user;

-- Regular user with limited permissions
CREATE USER app_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE ai_calling_agent TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
```

### Nginx Security
```nginx
# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

# Hide Nginx version
server_tokens off;

# Rate limiting
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
location /api/auth/login {
    limit_req zone=login burst=2 nodelay;
}
```

---

## 🔄 Backup Strategy

### Database Backup
```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
DB_NAME="ai_calling_agent_prod"

pg_dump $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

# Schedule with cron (daily at 2 AM)
# 0 2 * * * /path/to/backup-script.sh
```

### Application Backup
```bash
# Backup uploads and files
tar -czf /backups/uploads_$(date +%Y%m%d).tar.gz /path/to/uploads/

# Backup environment configs
cp .env /backups/.env.$(date +%Y%m%d)
```

---

## 📈 Performance Optimization

### Database Optimization
```sql
-- Add indexes for company queries
CREATE INDEX CONCURRENTLY idx_contacts_company_deleted 
  ON contacts(company_id, deleted_at);
  
CREATE INDEX CONCURRENTLY idx_campaigns_company_status 
  ON campaigns(company_id, status);
  
CREATE INDEX CONCURRENTLY idx_calls_company_created 
  ON calls(company_id, created_at DESC);

-- Analyze tables
ANALYZE contacts;
ANALYZE campaigns;
ANALYZE calls;

-- Vacuum
VACUUM ANALYZE;
```

### Redis Caching (Optional)
```typescript
// Cache frequently accessed data
await this.cacheManager.set(
  `company:${companyId}:stats`,
  stats,
  { ttl: 300 } // 5 minutes
);

const cached = await this.cacheManager.get(`company:${companyId}:stats`);
```

### CDN Setup (Optional)
```bash
# Use CloudFlare or AWS CloudFront for:
- Static assets (images, CSS, JS)
- API caching (read-only endpoints)
- DDoS protection
```

---

## 🧪 Smoke Tests

### After Deployment Checklist
```bash
# Test 1: Health Check
curl https://api.your-domain.com/api/health
# Expected: { "status": "ok" }

# Test 2: Super Admin Login
curl -X POST https://api.your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aicallingagent.com","password":"Admin@123"}'
# Expected: JWT token with super-admin role

# Test 3: Company Admin Login
curl -X POST https://api.your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"company@aicallingagent.com","password":"Admin@123"}'
# Expected: JWT token with company-admin role

# Test 4: Protected Route (with JWT)
curl https://api.your-domain.com/api/contacts \
  -H "Authorization: Bearer YOUR_JWT"
# Expected: Company-specific contacts

# Test 5: Frontend
curl https://your-domain.com
# Expected: HTML response with Next.js app
```

---

## 📞 Support & Maintenance

### Daily Tasks
- [ ] Check error logs
- [ ] Monitor API response times
- [ ] Review failed login attempts
- [ ] Check disk space
- [ ] Verify backups completed

### Weekly Tasks
- [ ] Review database performance
- [ ] Check slow queries
- [ ] Monitor memory usage
- [ ] Review user feedback
- [ ] Update documentation

### Monthly Tasks
- [ ] Update dependencies
- [ ] Review security patches
- [ ] Optimize database
- [ ] Clean up old logs
- [ ] Review user permissions
- [ ] Load testing

---

## 🆘 Troubleshooting

### Issue: Login redirects to wrong portal
**Solution:**
```typescript
// Check JWT roles in token
const decoded = jwt.decode(token);
console.log(decoded.roles);

// Verify role-based routing in login/page.tsx
if (roles.includes('super-admin')) {
  router.push('/dashboard');  // Super admin
} else {
  router.push('/company');    // Company admin
}
```

### Issue: Can't see other company's data (as super admin)
**Solution:**
```typescript
// Check CompanyIsolationGuard bypass
const isSuperAdmin = user.roles?.some((role: any) => 
  role.slug === 'super-admin'
);
if (isSuperAdmin) return; // Should allow access
```

### Issue: Company sees another company's data
**Solution:**
```typescript
// Check service filtering
async findAll(companyId: string) {
  const where = { companyId, deletedAt: null }; // ✅ Must have this
  return this.prisma.contact.findMany({ where });
}

// Check companyId extraction
@Get()
findAll(@GetCompanyId() companyId: string) {
  // Should extract from JWT, not query params
}
```

### Issue: JWT token expired
**Solution:**
```bash
# Check JWT expiration in .env
JWT_EXPIRATION="7d"  # Adjust as needed

# Clear token from localStorage
localStorage.removeItem('token');

# Login again
```

---

## ✅ Final Checklist

### Pre-Launch
- [ ] All environment variables set
- [ ] Database migrations applied
- [ ] SSL certificates installed
- [ ] Nginx configured
- [ ] PM2 processes running
- [ ] Monitoring setup complete
- [ ] Backups configured
- [ ] Error tracking enabled (Sentry)
- [ ] Rate limiting configured
- [ ] CORS origins whitelisted

### Launch
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Smoke tests passed
- [ ] Login tested (both user types)
- [ ] Data isolation verified
- [ ] Mobile responsiveness checked
- [ ] Performance acceptable
- [ ] Monitoring active

### Post-Launch
- [ ] Monitor error logs (24h)
- [ ] Review user feedback
- [ ] Check database performance
- [ ] Verify backups working
- [ ] Test disaster recovery
- [ ] Document any issues
- [ ] Plan next iteration

---

## 📚 Resources

- **Audit Report:** `COMPANY_PORTAL_AUDIT_FINAL.md`
- **Developer Guide:** `COMPANY_PORTAL_DEVELOPER_GUIDE.md`
- **Architecture:** `MULTI_TENANT_ISOLATION_COMPLETE.md`
- **Testing:** `TESTING_GUIDE.md`
- **Summary:** `AUDIT_SUMMARY.md`

---

**Deployment Guide Version:** 1.0.0  
**Last Updated:** July 28, 2026  
**Status:** Ready for Production Deployment 🚀
