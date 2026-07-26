# Fix TypeScript Compilation Errors

## The Issue

TypeScript's incremental compilation is caching old project references and not recognizing the new files in `telephony-profile` and `campaign-contacts` modules.

## Quick Fix (Choose One)

### Option 1: Stop Dev Server and Rebuild (RECOMMENDED)

```powershell
# 1. Stop your dev server (Ctrl+C)

# 2. Clean build cache
Remove-Item -Path "apps\api\tsconfig.tsbuildinfo" -ErrorAction SilentlyContinue
Remove-Item -Path "apps\api\dist" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "node_modules\.cache" -Recurse -Force -ErrorAction SilentlyContinue

# 3. Rebuild
cd apps/api
npm run build

# 4. Restart dev server
npm run dev
```

### Option 2: Use the Restart Script

```powershell
# Run the cleanup script
.\restart-api-dev.ps1

# Then manually restart dev server
npm run dev:api
```

### Option 3: Manual File Touch (Force Recompile)

```powershell
# Update the modified time of the files to force recompilation
(Get-Item "apps\api\src\modules\telephony-profile\dto\telephony-profile.dto.ts").LastWriteTime = Get-Date
(Get-Item "apps\api\src\modules\telephony-profile\telephony-profile.service.ts").LastWriteTime = Get-Date
(Get-Item "apps\api\src\modules\telephony-profile\telephony-profile.controller.ts").LastWriteTime = Get-Date
(Get-Item "apps\api\src\modules\campaign-contacts\dto\campaign-contact.dto.ts").LastWriteTime = Get-Date
```

## Verification

After rebuilding, verify the new modules are recognized:

```powershell
cd apps/api
npm run build
```

You should see output like:
```
✔ Compiled successfully
```

## Why This Happens

TypeScript's `incremental` mode caches compilation info in `.tsbuildinfo` files. When new files are added, sometimes the cache gets out of sync and doesn't recognize them even though they match the `include` pattern.

## Prevention

To avoid this in the future:
1. Always stop dev server before adding new modules
2. Run `npm run build` after adding new files
3. Clear cache when seeing TS6307 errors

## Still Not Working?

If the issue persists:

1. **Check file exists:**
   ```powershell
   Test-Path "apps\api\src\modules\telephony-profile\dto\telephony-profile.dto.ts"
   ```
   Should return: `True`

2. **Check tsconfig includes pattern:**
   ```powershell
   Get-Content "apps\api\tsconfig.json" | Select-String "include"
   ```
   Should show: `"include": ["src/**/*"]`

3. **Nuclear option - Delete node_modules:**
   ```powershell
   Remove-Item -Path "node_modules" -Recurse -Force
   npm install
   cd apps/api
   npm run build
   ```

## Files Created

All new files are correctly placed in:
```
apps/api/src/modules/
├── telephony-profile/
│   ├── dto/
│   │   └── telephony-profile.dto.ts ✅
│   ├── telephony-profile.controller.ts ✅
│   ├── telephony-profile.service.ts ✅
│   └── telephony-profile.module.ts ✅
│
└── campaign-contacts/
    ├── dto/
    │   └── campaign-contact.dto.ts ✅
    ├── services/
    │   ├── contact-parser.service.ts ✅
    │   ├── contact-validation.service.ts ✅
    │   └── contact-upload.service.ts ✅
    ├── campaign-contacts.controller.ts ✅
    ├── campaign-contacts.service.ts ✅
    └── campaign-contacts.module.ts ✅
```

All files are within `src/**/*` pattern and should be recognized.

## Alternative: Disable Incremental Compilation (Temporary)

If you need to work immediately, you can temporarily disable incremental compilation:

Edit `apps/api/tsconfig.json`:
```json
{
  "compilerOptions": {
    "incremental": false,  // Change this
    // ... rest of config
  }
}
```

Then rebuild. **Remember to re-enable it later** for faster builds.

---

**TL;DR:** Stop dev server → Clear cache → Rebuild → Restart
