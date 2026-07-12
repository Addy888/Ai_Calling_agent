import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  // Security - Helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // Enable CORS
  const corsOrigins = configService.get<string>('CORS_ORIGINS')?.split(',') || ['http://localhost:3000'];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Global prefix
  const apiPrefix = configService.get<string>('API_PREFIX') || 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      stopAtFirstError: false,
      errorHttpStatusCode: 422,
    })
  );

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('AI Calling Agent API')
    .setDescription(`
      Enterprise AI Calling Agent Platform API Documentation
      
      ## Authentication
      All protected endpoints require a valid JWT token in the Authorization header:
      \`Authorization: Bearer <your-token>\`
      
      ## Default Login Credentials
      - Email: admin@callingagent.local
      - Password: Admin@123
      
      ## Roles & Permissions
      - **Super Admin**: Full system access
      - **Admin**: Administrative access without user management
      - **Manager**: Campaign and contact management
      - **Viewer**: Read-only access
    `)
    .setVersion('1.0.0')
    .setContact(
      'AI Calling Agent Support',
      'https://aicallingagent.com',
      'support@aicallingagent.com'
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'User authentication and authorization endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Roles', 'Role and permission management endpoints')
    .addTag('Permissions', 'Permission management endpoints')
    .addTag('Companies', 'Company management endpoints')
    .addTag('Campaigns', 'Campaign management endpoints')
    .addTag('Contacts', 'Contact management endpoints')
    .addTag('Scripts', 'Script management endpoints')
    .addTag('Prompts', 'AI prompt management endpoints')
    .addTag('Knowledge Base', 'Knowledge base management endpoints')
    .addTag('Voice Profiles', 'Voice profile management endpoints')
    .addTag('Calls', 'Call management endpoints')
    .addTag('Analytics', 'Analytics and reporting endpoints')
    .addTag('Settings', 'Settings management endpoints')
    .addTag('Activity Logs', 'Activity log endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'AI Calling Agent API Documentation',
    customfavIcon: 'https://avatars.githubusercontent.com/u/6936373?s=200&v=4',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
    ],
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.css',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.css',
    ],
  });

  const port = configService.get<number>('API_PORT') || 3001;
  const host = configService.get<string>('API_HOST') || 'localhost';
  
  await app.listen(port, () => {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                                                               ║');
    console.log('║        🚀 AI CALLING AGENT API - PHASE 1.4 + 1.5            ║');
    console.log('║                                                               ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    console.log(`✅ Environment:        ${configService.get<string>('NODE_ENV') || 'development'}`);
    console.log(`✅ API Server:         http://${host}:${port}/${apiPrefix}`);
    console.log(`✅ API Documentation:  http://${host}:${port}/api/docs`);
    console.log(`✅ Database:           ${configService.get<string>('DATABASE_URL')?.split('@')[1]?.split('?')[0] || 'MySQL'}`);
    console.log(`✅ CORS Origins:       ${corsOrigins.join(', ')}`);
    console.log(`✅ JWT Expiration:     ${configService.get<string>('JWT_EXPIRES_IN') || '15m'}`);
    console.log('\n📚 Default Login:');
    console.log('   Email:    admin@callingagent.local');
    console.log('   Password: Admin@123\n');
    console.log('═══════════════════════════════════════════════════════════════\n');
  });
}

bootstrap();
