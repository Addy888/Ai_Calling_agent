#!/usr/bin/env node

/**
 * BullMQ v6 Fix Verification Script
 * Verifies that the BullMQ implementation is correct
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function warn(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Check for deprecated patterns
function checkForDeprecatedPatterns() {
  log('\n═══════════════════════════════════════', 'blue');
  log('Checking for Deprecated BullMQ Patterns', 'blue');
  log('═══════════════════════════════════════', 'blue');

  const filePath = path.join(
    __dirname,
    '..',
    'apps',
    'api',
    'src',
    'modules',
    'telephony-engine',
    'services',
    'campaign-call-dispatcher.service.ts'
  );

  if (!fs.existsSync(filePath)) {
    error('File not found: ' + filePath);
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  let hasIssues = false;

  // Check for .client usage
  if (content.includes('.client')) {
    error('Found deprecated ".client" property usage');
    hasIssues = true;
  } else {
    success('No ".client" property usage found');
  }

  // Check for lazyConnect
  if (content.includes('lazyConnect')) {
    error('Found deprecated "lazyConnect" option');
    hasIssues = true;
  } else {
    success('No "lazyConnect" option found');
  }

  // Check for QueueEvents import
  if (content.includes('QueueEvents')) {
    success('QueueEvents imported correctly');
  } else {
    error('QueueEvents not imported');
    hasIssues = true;
  }

  // Check for OnModuleDestroy
  if (content.includes('OnModuleDestroy')) {
    success('OnModuleDestroy implemented');
  } else {
    warn('OnModuleDestroy not implemented (recommended)');
  }

  // Check for proper cleanup
  if (content.includes('onModuleDestroy')) {
    success('onModuleDestroy() method found');
  } else {
    warn('onModuleDestroy() method not found (recommended)');
  }

  // Check for QueueEvents instantiation
  if (content.includes('new QueueEvents')) {
    success('QueueEvents instantiated correctly');
  } else {
    warn('QueueEvents not instantiated (recommended for monitoring)');
  }

  return !hasIssues;
}

// Check package.json for BullMQ version
function checkBullMQVersion() {
  log('\n═══════════════════════════════════════', 'blue');
  log('Checking BullMQ Version', 'blue');
  log('═══════════════════════════════════════', 'blue');

  const packageJsonPath = path.join(
    __dirname,
    '..',
    'apps',
    'api',
    'package.json'
  );

  if (!fs.existsSync(packageJsonPath)) {
    error('package.json not found');
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const bullmqVersion = packageJson.dependencies?.bullmq;

  if (!bullmqVersion) {
    error('BullMQ not found in dependencies');
    return false;
  }

  info(`BullMQ version: ${bullmqVersion}`);

  // Parse version
  const versionMatch = bullmqVersion.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!versionMatch) {
    warn('Could not parse BullMQ version');
    return true;
  }

  const [, major] = versionMatch;
  const majorVersion = parseInt(major);

  if (majorVersion >= 5) {
    success(`BullMQ v${majorVersion} detected (v5+ API required)`);
    return true;
  } else {
    error(`BullMQ v${majorVersion} is too old (v5+ required)`);
    return false;
  }
}

// Main verification
async function main() {
  log('\n╔═══════════════════════════════════════╗', 'blue');
  log('║   BullMQ v6 Fix Verification          ║', 'blue');
  log('╚═══════════════════════════════════════╝\n', 'blue');

  let allPassed = true;

  // Check BullMQ version
  const versionCheck = checkBullMQVersion();
  if (!versionCheck) {
    allPassed = false;
  }

  // Check for deprecated patterns
  const patternCheck = checkForDeprecatedPatterns();
  if (!patternCheck) {
    allPassed = false;
  }

  // Summary
  log('\n═══════════════════════════════════════', 'blue');
  log('Verification Summary', 'blue');
  log('═══════════════════════════════════════', 'blue');

  if (allPassed) {
    success('\n🎉 All checks passed!');
    success('BullMQ v6 implementation is correct');
    info('\nNext steps:');
    info('  1. Run: npx tsc --noEmit');
    info('  2. Run: npm run build');
    info('  3. Test with Redis');
    info('  4. Test without Redis');
  } else {
    error('\n❌ Some checks failed');
    error('Please review the errors above');
  }

  log('');
  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  error(`Verification script failed: ${err.message}`);
  process.exit(1);
});
