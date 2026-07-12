# Create stub modules for all remaining API endpoints

$modules = @{
    "roles" = "Role"
    "companies" = "Company"
    "campaigns" = "Campaign"
    "contacts" = "Contact"
    "scripts" = "Script"
    "prompts" = "Prompt"
    "knowledge-base" = "KnowledgeBase"
    "voice-profiles" = "VoiceProfile"
    "calls" = "Call"
    "analytics" = "Analytics"
    "settings" = "Setting"
}

foreach ($key in $modules.Keys) {
    $entityName = $modules[$key]
    $modulePath = "apps\api\src\modules\$key"
    
    Write-Host "Creating $entityName module..." -ForegroundColor Green
    
    # Create module file
    $moduleContent = @"
import { Module } from '@nestjs/common';
import { ${entityName}Controller } from './$key.controller';
import { ${entityName}Service } from './$key.service';

@Module({
  controllers: [${entityName}Controller],
  providers: [${entityName}Service],
  exports: [${entityName}Service],
})
export class ${entityName}sModule {}
"@
    
    Set-Content -Path "$modulePath\$key.module.ts" -Value $moduleContent
    
    # Create controller file
    $controllerContent = @"
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ${entityName}Service } from './$key.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@ApiTags('${entityName}s')
@Controller('$key')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ${entityName}Controller {
  constructor(private readonly ${key.replace('-', '')}Service: ${entityName}Service) {}

  @Get()
  findAll() {
    return this.${key.replace('-', '')}Service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.${key.replace('-', '')}Service.findOne(id);
  }

  @Post()
  create(@Body() data: any) {
    return this.${key.replace('-', '')}Service.create(data);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.${key.replace('-', '')}Service.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.${key.replace('-', '')}Service.remove(id);
  }
}
"@
    
    Set-Content -Path "$modulePath\$key.controller.ts" -Value $controllerContent
    
    # Create service file
    $serviceContent = @"
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class ${entityName}Service {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return {
      success: true,
      data: [],
      message: '${entityName}s retrieved successfully',
    };
  }

  async findOne(id: string) {
    return {
      success: true,
      data: null,
      message: '${entityName} retrieved successfully',
    };
  }

  async create(data: any) {
    return {
      success: true,
      data: null,
      message: '${entityName} created successfully',
    };
  }

  async update(id: string, data: any) {
    return {
      success: true,
      data: null,
      message: '${entityName} updated successfully',
    };
  }

  async remove(id: string) {
    return {
      success: true,
      message: '${entityName} deleted successfully',
    };
  }
}
"@
    
    Set-Content -Path "$modulePath\$key.service.ts" -Value $serviceContent
}

Write-Host "`nAll API modules created!" -ForegroundColor Cyan
