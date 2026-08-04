#!/usr/bin/env node

/**
 * Production Diagnostics Script
 * Tests Redis and Asterisk AMI connectivity
 */

const net = require('net');
const { createClient } = require('redis');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
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

// Load environment variables
require('dotenv').config();

const config = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  asterisk: {
    host: process.env.ASTERISK_HOST || '192.168.1.4',
    port: parseInt(process.env.ASTERISK_AMI_PORT || '5038'),
    username: process.env.ASTERISK_AMI_USERNAME || 'admin',
    secret: process.env.ASTERISK_AMI_SECRET || '',
  },
};

async function testRedis() {
  log('\n═══════════════════════════════════════', 'bright');
  log('Testing Redis Connection', 'bright');
  log('═══════════════════════════════════════', 'bright');

  info(`Host: ${config.redis.host}`);
  info(`Port: ${config.redis.port}`);
  info(`Password: ${config.redis.password ? '***' : '(none)'}`);

  const client = createClient({
    socket: {
      host: config.redis.host,
      port: config.redis.port,
      connectTimeout: 5000,
    },
    password: config.redis.password,
  });

  return new Promise((resolve) => {
    client.on('error', (err) => {
      error(`Redis connection failed: ${err.message}`);
      warn('Redis is not available');
      warn('Application will use in-memory cache as fallback');
      info('To fix: Install and start Redis');
      info('  Windows: choco install redis-64 && redis-server');
      info('  Linux: sudo systemctl start redis');
      resolve(false);
    });

    client.on('connect', async () => {
      try {
        await client.ping();
        success('Redis connection successful!');
        success('Redis is healthy and ready');
        
        // Get info
        const info = await client.info();
        const lines = info.split('\r\n');
        const version = lines.find(l => l.startsWith('redis_version:'))?.split(':')[1];
        if (version) {
          success(`Redis version: ${version}`);
        }
        
        await client.disconnect();
        resolve(true);
      } catch (err) {
        error(`Redis ping failed: ${err.message}`);
        await client.disconnect();
        resolve(false);
      }
    });

    client.connect();
  });
}

async function testAsteriskAMI() {
  log('\n═══════════════════════════════════════', 'bright');
  log('Testing Asterisk AMI Connection', 'bright');
  log('═══════════════════════════════════════', 'bright');

  info(`Host: ${config.asterisk.host}`);
  info(`Port: ${config.asterisk.port}`);
  info(`Username: ${config.asterisk.username}`);
  info(`Secret: ${config.asterisk.secret ? '***' : '(not set)'}`);

  if (config.asterisk.port === 5060 || config.asterisk.port === 5061) {
    warn('WARNING: Port looks like SIP port, not AMI port!');
    warn('AMI usually runs on port 5038, not 5060/5061');
  }

  return new Promise((resolve) => {
    let greeterReceived = false;
    let authenticated = false;
    let buffer = '';

    const socket = new net.Socket();
    socket.setTimeout(10000);

    socket.on('connect', () => {
      success('TCP connection established');
      info('Waiting for Asterisk greeter message...');
    });

    socket.on('data', (data) => {
      buffer += data.toString();
      
      if (!greeterReceived && buffer.includes('Asterisk Call Manager')) {
        greeterReceived = true;
        const greeter = buffer.split('\r\n')[0];
        success(`Received greeter: ${greeter}`);
        info('Sending login credentials...');
        
        // Send login
        const login = `Action: Login\r\nUsername: ${config.asterisk.username}\r\nSecret: ${config.asterisk.secret}\r\nEvents: on\r\n\r\n`;
        socket.write(login);
      }
      
      if (greeterReceived && !authenticated) {
        if (buffer.includes('Response: Success')) {
          authenticated = true;
          success('Authentication successful!');
          success('Asterisk AMI is ready');
          
          // Send logoff
          socket.write('Action: Logoff\r\n\r\n');
          setTimeout(() => {
            socket.destroy();
            resolve(true);
          }, 500);
        } else if (buffer.includes('Response: Error')) {
          error('Authentication failed!');
          error('Check username and password in manager.conf');
          socket.destroy();
          resolve(false);
        }
      }
    });

    socket.on('error', (err) => {
      error(`Connection failed: ${err.message}`);
      
      if (err.code === 'ECONNREFUSED') {
        warn('Connection refused');
        info('Possible causes:');
        info('  1. Asterisk is not running');
        info('  2. AMI is not enabled in manager.conf');
        info('  3. Firewall blocking port ' + config.asterisk.port);
        info('  4. Wrong IP address');
      } else if (err.code === 'ETIMEDOUT') {
        warn('Connection timeout');
        info('Possible causes:');
        info('  1. Network connectivity issue');
        info('  2. Firewall blocking traffic');
        info('  3. Wrong IP address or port');
      }
      
      resolve(false);
    });

    socket.on('timeout', () => {
      error('Socket timeout');
      
      if (greeterReceived && !authenticated) {
        warn('Greeter received but authentication failed');
        warn('Possible causes:');
        info('  1. Wrong username or password');
        info('  2. manager.conf not configured correctly');
      } else if (!greeterReceived) {
        warn('No greeter message received');
        warn('This is NOT an AMI port!');
        info('  Expected: port 5038 (AMI)');
        info(`  Got: port ${config.asterisk.port}`);
        info('  SIP ports are 5060/5061 (wrong)');
      }
      
      socket.destroy();
      resolve(false);
    });

    socket.on('close', () => {
      if (!authenticated && !greeterReceived) {
        warn('Connection closed without greeter');
      }
    });

    info('Connecting to Asterisk AMI...');
    socket.connect(config.asterisk.port, config.asterisk.host);
  });
}

async function main() {
  log('\n╔═══════════════════════════════════════╗', 'bright');
  log('║   Production Connectivity Diagnostics  ║', 'bright');
  log('╚═══════════════════════════════════════╝\n', 'bright');

  const results = {
    redis: false,
    asterisk: false,
  };

  // Test Redis
  try {
    results.redis = await testRedis();
  } catch (err) {
    error(`Redis test error: ${err.message}`);
  }

  // Test Asterisk
  try {
    results.asterisk = await testAsteriskAMI();
  } catch (err) {
    error(`Asterisk test error: ${err.message}`);
  }

  // Summary
  log('\n═══════════════════════════════════════', 'bright');
  log('Summary', 'bright');
  log('═══════════════════════════════════════', 'bright');

  log(`Redis:    ${results.redis ? '✅ Ready' : '❌ Not Available'}`, results.redis ? 'green' : 'red');
  log(`Asterisk: ${results.asterisk ? '✅ Ready' : '❌ Not Available'}`, results.asterisk ? 'green' : 'red');

  if (results.redis && results.asterisk) {
    success('\n🎉 All systems ready for production!');
  } else if (!results.redis && results.asterisk) {
    warn('\n⚠️  Application will run with in-memory cache');
    info('Recommendation: Install Redis for production use');
  } else if (results.redis && !results.asterisk) {
    error('\n❌ Asterisk AMI not available');
    info('Fix Asterisk configuration before deploying');
  } else {
    error('\n❌ Both Redis and Asterisk have issues');
    info('Review configuration and connectivity');
  }

  log('');
  process.exit(results.asterisk ? 0 : 1);
}

main().catch((err) => {
  error(`Diagnostic script failed: ${err.message}`);
  process.exit(1);
});
