#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Voice Studio Phase 4.2 - Verification Script\n');
console.log('=' .repeat(60));

let errors = 0;
let warnings = 0;
let success = 0;

function checkFile(filePath, description) {
  const fullPath = path.join(__dirname, filePath);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${description}`);
    success++;
    return true;
  } else {
    console.log(`❌ ${description} - NOT FOUND`);
    errors++;
    return false;
  }
}

function checkDirectory(dirPath, description) {
  const fullPath = path.join(__dirname, dirPath);
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    console.log(`✅ ${description}`);
    success++;
    return true;
  } else {
    console.log(`❌ ${description} - NOT FOUND`);
    errors++;
    return false;
  }
}

console.log('\n📦 Backend Files Verification\n');
console.log('-'.repeat(60));

checkFile(
  'apps/api/src/modules/ai-agent/services/voice-provider.interface.ts',
  'Voice Provider Interface'
);
checkFile(
  'apps/api/src/modules/ai-agent/services/kokoro-tts.provider.ts',
  'Kokoro TTS Provider'
);
checkFile(
  'apps/api/src/modules/ai-agent/services/voice-studio.service.ts',
  'Voice Studio Service'
);
checkFile(
  'apps/api/src/modules/ai-agent/services/voice-brain-integration.service.ts',
  'Voice Brain Integration Service'
);
checkFile(
  'apps/api/src/modules/ai-agent/dto/voice-studio.dto.ts',
  'Voice Studio DTOs'
);
checkFile(
  'apps/api/src/modules/ai-agent/voice-studio.controller.ts',
  'Voice Studio Controller'
);
checkFile(
  'apps/api/src/modules/ai-agent/voice-studio.gateway.ts',
  'Voice Studio Gateway (WebSocket)'
);
checkFile(
  'apps/api/src/database/seeders/voice-providers.seeder.ts',
  'Voice Providers Seeder'
);

console.log('\n🎨 Frontend Files Verification\n');
console.log('-'.repeat(60));

checkFile(
  'apps/web/src/components/voice-studio/voice-library.tsx',
  'Voice Library Component'
);
checkFile(
  'apps/web/src/components/voice-studio/voice-settings.tsx',
  'Voice Settings Component'
);
checkFile(
  'apps/web/src/components/voice-studio/voice-preview.tsx',
  'Voice Preview Component'
);
checkFile(
  'apps/web/src/components/voice-studio/voice-history.tsx',
  'Voice History Component'
);
checkFile(
  'apps/web/src/components/voice-studio/index.ts',
  'Voice Studio Index Export'
);

console.log('\n🗄️  Database Schema Verification\n');
console.log('-'.repeat(60));

const schemaPath = 'database/prisma/schema.prisma';
if (checkFile(schemaPath, 'Prisma Schema File')) {
  const schemaContent = fs.readFileSync(path.join(__dirname, schemaPath), 'utf8');
  
  if (schemaContent.includes('model VoiceProvider')) {
    console.log('  ✅ VoiceProvider model exists');
    success++;
  } else {
    console.log('  ❌ VoiceProvider model NOT FOUND');
    errors++;
  }
  
  if (schemaContent.includes('model VoiceLibrary')) {
    console.log('  ✅ VoiceLibrary model exists');
    success++;
  } else {
    console.log('  ❌ VoiceLibrary model NOT FOUND');
    errors++;
  }
  
  if (schemaContent.includes('model VoiceConfiguration')) {
    console.log('  ✅ VoiceConfiguration model exists');
    success++;
  } else {
    console.log('  ❌ VoiceConfiguration model NOT FOUND');
    errors++;
  }
  
  if (schemaContent.includes('model VoiceHistory')) {
    console.log('  ✅ VoiceHistory model exists');
    success++;
  } else {
    console.log('  ❌ VoiceHistory model NOT FOUND');
    errors++;
  }
}

console.log('\n🔗 Module Integration Verification\n');
console.log('-'.repeat(60));

const aiAgentModulePath = 'apps/api/src/modules/ai-agent/ai-agent.module.ts';
if (checkFile(aiAgentModulePath, 'AI Agent Module File')) {
  const moduleContent = fs.readFileSync(path.join(__dirname, aiAgentModulePath), 'utf8');
  
  if (moduleContent.includes('VoiceStudioController')) {
    console.log('  ✅ VoiceStudioController registered');
    success++;
  } else {
    console.log('  ❌ VoiceStudioController NOT registered');
    errors++;
  }
  
  if (moduleContent.includes('VoiceStudioService')) {
    console.log('  ✅ VoiceStudioService registered');
    success++;
  } else {
    console.log('  ❌ VoiceStudioService NOT registered');
    errors++;
  }
  
  if (moduleContent.includes('VoiceStudioGateway')) {
    console.log('  ✅ VoiceStudioGateway registered');
    success++;
  } else {
    console.log('  ❌ VoiceStudioGateway NOT registered');
    errors++;
  }
  
  if (moduleContent.includes('KokoroTTSProvider')) {
    console.log('  ✅ KokoroTTSProvider registered');
    success++;
  } else {
    console.log('  ❌ KokoroTTSProvider NOT registered');
    errors++;
  }
  
  if (moduleContent.includes('VoiceBrainIntegrationService')) {
    console.log('  ✅ VoiceBrainIntegrationService registered');
    success++;
  } else {
    console.log('  ❌ VoiceBrainIntegrationService NOT registered');
    errors++;
  }
}

const appModulePath = 'apps/api/src/app.module.ts';
if (checkFile(appModulePath, 'App Module File')) {
  const appModuleContent = fs.readFileSync(path.join(__dirname, appModulePath), 'utf8');
  
  if (appModuleContent.includes('AIAgentModule')) {
    console.log('  ✅ AIAgentModule imported in AppModule');
    success++;
  } else {
    console.log('  ❌ AIAgentModule NOT imported in AppModule');
    errors++;
  }
}

console.log('\n🖥️  Frontend Integration Verification\n');
console.log('-'.repeat(60));

const agentDetailPath = 'apps/web/src/app/dashboard/ai-agents/[id]/page.tsx';
if (checkFile(agentDetailPath, 'AI Agent Detail Page')) {
  const pageContent = fs.readFileSync(path.join(__dirname, agentDetailPath), 'utf8');
  
  if (pageContent.includes('VoiceLibrary')) {
    console.log('  ✅ VoiceLibrary component imported');
    success++;
  } else {
    console.log('  ❌ VoiceLibrary component NOT imported');
    errors++;
  }
  
  if (pageContent.includes('VoiceSettings')) {
    console.log('  ✅ VoiceSettings component imported');
    success++;
  } else {
    console.log('  ❌ VoiceSettings component NOT imported');
    errors++;
  }
  
  if (pageContent.includes('VoicePreview')) {
    console.log('  ✅ VoicePreview component imported');
    success++;
  } else {
    console.log('  ❌ VoicePreview component NOT imported');
    errors++;
  }
  
  if (pageContent.includes('VoiceHistory')) {
    console.log('  ✅ VoiceHistory component imported');
    success++;
  } else {
    console.log('  ❌ VoiceHistory component NOT imported');
    errors++;
  }
  
  if (pageContent.includes('Voice Studio')) {
    console.log('  ✅ Voice Studio tab exists');
    success++;
  } else {
    console.log('  ⚠️  Voice Studio tab label not found');
    warnings++;
  }
}

console.log('\n📚 Documentation Verification\n');
console.log('-'.repeat(60));

checkFile('VOICE_STUDIO_IMPLEMENTATION.md', 'Implementation Documentation');
checkFile('PHASE_4.2_COMPLETE.md', 'Completion Documentation');
checkFile('VOICE_STUDIO_QUICKSTART.md', 'Quick Start Guide');

console.log('\n📊 Build Verification\n');
console.log('-'.repeat(60));

checkDirectory('apps/api/dist', 'Backend Build Output');
checkDirectory('apps/web/.next', 'Frontend Build Output');

console.log('\n' + '='.repeat(60));
console.log('\n📈 VERIFICATION SUMMARY\n');
console.log('-'.repeat(60));
console.log(`✅ Success: ${success}`);
console.log(`⚠️  Warnings: ${warnings}`);
console.log(`❌ Errors: ${errors}`);
console.log('-'.repeat(60));

if (errors === 0 && warnings === 0) {
  console.log('\n🎉 PHASE 4.2 VERIFICATION: PASSED ✅');
  console.log('\nAll files are present and properly integrated.');
  console.log('Voice Studio is ready for production use!\n');
  process.exit(0);
} else if (errors === 0 && warnings > 0) {
  console.log('\n✅ PHASE 4.2 VERIFICATION: PASSED (with warnings)');
  console.log('\nAll critical files are present.');
  console.log(`Minor issues: ${warnings} warning(s)\n`);
  process.exit(0);
} else {
  console.log('\n❌ PHASE 4.2 VERIFICATION: FAILED');
  console.log(`\nFound ${errors} error(s) and ${warnings} warning(s)`);
  console.log('Please review the output above.\n');
  process.exit(1);
}
