# Testing Guide - AI Calling Agent Platform

## Quick Start Testing

### Step 1: Start Backend API
```bash
cd apps/api
npm run start:dev
```
**Expected Output**: 
```
[Nest] Application successfully started
[Nest] API running on: http://localhost:3001
```

### Step 2: Start Frontend
```bash
cd apps/web
npm run dev
```
**Expected Output**:
```
ready - started server on 0.0.0.0:3000
```

### Step 3: Open Browser
Navigate to: `http://localhost:3000`

---

## Testing Checklist

### ✅ Authentication Testing

#### Test 1: Login
1. Navigate to `/login`
2. Enter credentials
3. Click Login
4. **Verify**: Redirected to `/dashboard`
5. **Verify**: Token stored in localStorage/sessionStorage
6. **Verify**: No console errors

#### Test 2: Protected Routes
1. Open new incognito window
2. Navigate to `/dashboard`
3. **Verify**: Redirected to `/login`
4. **Verify**: No 401 errors in console

#### Test 3: Token Injection
1. Login successfully
2. Open DevTools > Network tab
3. Navigate to any dashboard page
4. **Verify**: All API requests have `Authorization: Bearer <token>` header

---

### ✅ Page Navigation Testing

Navigate to each page and check for errors:

#### Core Pages:
- [ ] `/dashboard` - Main dashboard
- [ ] `/dashboard/analytics` - Analytics page
- [ ] `/dashboard/companies` - Companies list
- [ ] `/dashboard/users` - Users management
- [ ] `/dashboard/contacts` - Contacts list
- [ ] `/dashboard/campaigns` - Campaigns list
- [ ] `/dashboard/scripts` - Scripts list
- [ ] `/dashboard/prompts` - Prompts list
- [ ] `/dashboard/knowledge-base` - Knowledge base
- [ ] `/dashboard/voice-library` - Voice profiles (calls endpoint)
- [ ] `/dashboard/calls` - Call history
- [ ] `/dashboard/reports` - Reports page
- [ ] `/dashboard/settings` - Settings page

#### Admin Pages (Settings > Advanced):
- [ ] `/dashboard/roles` - Roles management
- [ ] `/dashboard/permissions` - Permissions management
- [ ] `/dashboard/activity-logs` - Activity logs
- [ ] `/dashboard/system-health` - System health
- [ ] `/dashboard/script-builder` - Script builder

#### Profile Pages:
- [ ] `/dashboard/profile` - User profile
- [ ] `/dashboard/notifications` - Notifications

**For Each Page, Verify**:
- ✅ No console errors
- ✅ No 404 API errors
- ✅ UI loads properly
- ✅ Data displays (real or mock)
- ✅ No hydration errors

---

### ✅ CRUD Operations Testing

#### Test Campaign CRUD:
1. **Create**:
   - Navigate to `/dashboard/campaigns`
   - Click "Create Campaign"
   - Fill form
   - Click Submit
   - **Verify**: No 422 validation errors
   - **Verify**: Success message shown
   - **Verify**: Redirected to list page

2. **Read**:
   - Navigate to `/dashboard/campaigns`
   - **Verify**: Campaigns list loads
   - Click on a campaign
   - **Verify**: Campaign details load

3. **Update**:
   - Click "Edit" on a campaign
   - Modify fields
   - Click Save
   - **Verify**: No 422 validation errors
   - **Verify**: Changes saved

4. **Delete**:
   - Click "Delete" on a campaign
   - Confirm deletion
   - **Verify**: Campaign removed from list

#### Test Contact CRUD:
- [ ] Create contact - `/dashboard/contacts/add`
- [ ] Import contacts - `/dashboard/contacts/import`
- [ ] View contact - `/dashboard/contacts/[id]`
- [ ] Edit contact - `/dashboard/contacts/[id]/edit`
- [ ] Delete contact

#### Test Script CRUD:
- [ ] Create script - `/dashboard/scripts`
- [ ] View script - `/dashboard/scripts/[id]`
- [ ] Edit script - `/dashboard/scripts/[id]/edit`
- [ ] Delete script

#### Test Prompt CRUD:
- [ ] Create prompt - `/dashboard/prompts`
- [ ] View prompt - `/dashboard/prompts/[id]`
- [ ] Edit prompt - `/dashboard/prompts/[id]/edit`
- [ ] Delete prompt

---

### ✅ Validation Testing (422 Errors)

Test form validations by submitting invalid data:

#### Campaign Creation:
- [ ] Empty name field
- [ ] Invalid date format
- [ ] Missing required fields
- [ ] Invalid phone number format
- **Verify**: Proper error messages shown
- **Verify**: No 422 error in console or proper handling

#### Contact Creation:
- [ ] Invalid email format
- [ ] Invalid phone format
- [ ] Empty required fields
- **Verify**: Client-side validation prevents submission
- **Verify**: Server-side validation returns proper messages

#### Script Creation:
- [ ] Empty name
- [ ] Invalid script content
- [ ] Missing required fields
- **Verify**: Validation errors displayed properly

---

### ✅ Mock Data Verification

Pages that should show mock data (if backend not fully implemented):

1. **Dashboard** (`/dashboard`)
   - Should show: 4 stat cards with numbers
   - Should show: Recent activity list
   - Should show: Quick action cards

2. **Reports** (`/dashboard/reports`)
   - Should show: 3 sample reports
   - Report types: Campaign Performance, Contact Analysis, System Health
   - Should allow: Execute and Export (with info toast)

3. **Profile** (`/dashboard/profile`)
   - Should show: Demo User profile
   - Should show: Email, Name, Phone
   - Should allow: Profile update (with info toast)
   - Should allow: Password change (with info toast)

4. **Notifications** (`/dashboard/notifications`)
   - Should show: 4 sample notifications
   - Types: Campaign Started, Low Balance, Script Updated, Welcome
   - Should allow: Mark as read, Delete
   - Should show: Unread count badge

5. **Activity Logs** (`/dashboard/activity-logs`)
   - Should show: 5 sample activities
   - Actions: Login, Create, Update, Settings
   - Should show: User, IP address, Timestamp
   - Should allow: Search and filter

6. **System Health** (`/dashboard/system-health`)
   - Should show: 3 components (API, Database, Storage)
   - Should show: CPU, Memory, Disk usage
   - Should show: Progress bars
   - Should show: Status badges (Healthy, Warning, Critical)

7. **Settings** (`/dashboard/settings`)
   - Should show: Company info
   - Should show: Security settings
   - Should show: Billing info
   - Should allow: Updates (with info toast)

8. **Analytics** (`/dashboard/analytics`)
   - Should show: Campaign performance chart
   - Should show: Call statistics
   - Should show: Conversion metrics

---

### ✅ Error Handling Verification

#### Test Network Failures:
1. Disconnect from internet
2. Navigate to various pages
3. **Verify**: Mock data still displays
4. **Verify**: Graceful error messages
5. **Verify**: No app crashes

#### Test Backend Unavailable:
1. Stop backend server
2. Navigate to dashboard pages
3. **Verify**: Mock data displays
4. **Verify**: UI remains functional
5. **Verify**: Appropriate messages shown

---

### ✅ Console Monitoring

Keep DevTools console open during all testing:

**Check For**:
- ❌ No uncaught errors
- ❌ No unhandled promise rejections
- ❌ No 404 network errors
- ❌ No hydration errors
- ✅ Only expected console.error() messages with mock data fallback

**Expected Console Messages** (OK to see):
```
Failed to fetch reports: [error details]
Failed to fetch profile: [error details]
Failed to fetch notifications: [error details]
Failed to fetch activity logs: [error details]
Failed to fetch system health: [error details]
```

These indicate mock data fallback is working correctly.

---

### ✅ Browser Testing

Test on multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)

Test on multiple screen sizes:
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

**Verify**:
- ✅ Responsive design works
- ✅ Sidebar collapses on mobile
- ✅ Mobile menu toggle works
- ✅ All functionality accessible

---

## Common Issues & Solutions

### Issue: Cannot login
**Solution**:
1. Verify backend is running
2. Check `/auth/login` endpoint returns 200
3. Verify credentials are correct
4. Check backend database is seeded with users

### Issue: 401 Unauthorized on all API calls
**Solution**:
1. Check token is stored after login
2. Verify axios interceptor is injecting token
3. Check backend JWT secret matches
4. Verify token expiration time

### Issue: 422 Validation on form submit
**Solution**:
1. Check form data matches backend DTO
2. Verify required fields are filled
3. Check data types match (string, number, boolean)
4. Review backend ValidationPipe configuration

### Issue: Mock data always shows
**Solution**:
This is intentional during development. To use real data:
1. Ensure backend endpoint is implemented
2. Remove mock data fallback from catch block
3. Backend should return proper response format

### Issue: Hydration error on page load
**Solution**:
1. Check for `Date.now()` or `Math.random()` in render
2. Verify no `window` or `localStorage` without guards
3. Ensure server and client render same initial content
4. Add proper `'use client'` directive

---

## Performance Testing

### Load Time Targets:
- Initial page load: < 3 seconds
- Page navigation: < 500ms
- API response: < 1 second
- Form submission: < 2 seconds

### Tools:
- Chrome DevTools > Lighthouse
- Chrome DevTools > Performance tab
- Network tab for API timing

---

## Security Testing

### Authentication:
- [ ] Cannot access dashboard without login
- [ ] Token expires after configured time
- [ ] Logout clears token properly
- [ ] Refresh token mechanism works

### Authorization:
- [ ] Users can only access permitted resources
- [ ] Role-based access control works
- [ ] Permission checks on sensitive operations

### Input Validation:
- [ ] XSS prevention (< > & chars escaped)
- [ ] SQL injection prevention (parameterized queries)
- [ ] CSRF protection enabled
- [ ] Rate limiting on sensitive endpoints

---

## Automated Testing (Future)

### Unit Tests:
```bash
npm run test
```

### E2E Tests:
```bash
npm run test:e2e
```

### Coverage Report:
```bash
npm run test:cov
```

---

## Success Criteria

Application is considered stable when:

- ✅ All pages load without errors
- ✅ Authentication flow works end-to-end
- ✅ All CRUD operations complete successfully
- ✅ Form validations work properly
- ✅ Console shows no errors
- ✅ Network tab shows no 404/401/422 errors (or proper handling)
- ✅ UI remains responsive and functional
- ✅ Mock data displays when backend unavailable
- ✅ Real data displays when backend available
- ✅ No hydration mismatches
- ✅ Cross-browser compatibility
- ✅ Mobile responsive design works

---

## Next Steps After Testing

1. **Document Issues**: Create a list of any bugs found
2. **Implement Missing APIs**: Based on 404 errors encountered
3. **Fix Validation**: Resolve any 422 validation errors
4. **Fix Auth**: Resolve any 401 authorization errors
5. **Remove Mock Data**: Once APIs are implemented
6. **Add E2E Tests**: Automate critical user flows
7. **Performance Optimization**: Based on Lighthouse scores
8. **Security Audit**: Review auth and input validation
9. **Production Deploy**: After all tests pass

---

## Report Template

Use this template to report testing results:

```
# Testing Report - [Date]

## Environment
- Frontend: [URL]
- Backend: [URL]
- Browser: [Browser Name + Version]
- OS: [Operating System]

## Test Results

### Authentication: [PASS/FAIL]
- Login: [PASS/FAIL] - [Notes]
- Logout: [PASS/FAIL] - [Notes]
- Protected Routes: [PASS/FAIL] - [Notes]

### Page Navigation: [PASS/FAIL]
- Dashboard: [PASS/FAIL]
- Analytics: [PASS/FAIL]
- [... list all pages ...]

### CRUD Operations: [PASS/FAIL]
- Create Campaign: [PASS/FAIL] - [Notes]
- Update Contact: [PASS/FAIL] - [Notes]
- Delete Script: [PASS/FAIL] - [Notes]

### Issues Found:
1. [Issue description] - [Severity: High/Medium/Low]
2. [Issue description] - [Severity: High/Medium/Low]

### Screenshots:
[Attach screenshots of errors if any]

### Conclusion:
[Summary of testing results]
```

---

## Support

If you encounter issues during testing:
1. Check console for error details
2. Check network tab for API errors
3. Review STABILIZATION_REPORT.md
4. Review MODIFIED_FILES_SUMMARY.md
5. Check backend logs for server errors

Happy Testing! 🧪
