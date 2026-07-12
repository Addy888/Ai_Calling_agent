import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { Response } from 'express';
import {
  CreateContactDto,
  UpdateContactDto,
  ContactFilterDto,
  BulkContactDto,
  BulkUpdateContactDto,
} from './dto/contact.dto';

@ApiTags('Contacts')
@Controller('contacts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  // ── Static routes first (must come before :id) ──────────────────────────

  @Get('template')
  @ApiOperation({ summary: 'Download CSV import template' })
  getTemplate(@Res() res: Response) {
    const header = 'firstName,lastName,phone,countryCode,email,language,company,designation,tags,notes\n';
    const example = 'John,Doe,+15551234567,+1,john@example.com,en,Acme Corp,Manager,"B2B,Lead",Met at conference\n';
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=contacts-template.csv');
    res.send(header + example);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export contacts as CSV' })
  async exportContacts(
    @CurrentUser('companyId') companyId: string,
    @Query() filters: ContactFilterDto,
    @Res() res: Response,
  ) {
    const csvData = await this.contactsService.exportContacts(companyId, filters);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=contacts-export.csv');
    res.send(csvData);
  }

  @Get('import-history')
  @ApiOperation({ summary: 'Get import history' })
  getImportHistory(@CurrentUser('companyId') companyId: string) {
    return this.contactsService.getImportHistory(companyId);
  }

  @Post('bulk-upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Bulk import contacts from CSV or XLSX' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async bulkUpload(
    @CurrentUser('companyId') companyId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const name = file.originalname.toLowerCase();
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      return this.contactsService.importFromExcel(companyId, file.buffer);
    }
    return this.contactsService.importFromCSV(companyId, file.buffer);
  }

  @Post('bulk-delete')
  @ApiOperation({ summary: 'Bulk soft-delete contacts' })
  bulkDelete(
    @CurrentUser('companyId') companyId: string,
    @Body() data: BulkContactDto,
  ) {
    return this.contactsService.bulkDelete(companyId, data.contactIds);
  }

  @Post('bulk-update')
  @ApiOperation({ summary: 'Bulk update contact status / tags / campaign' })
  bulkUpdate(
    @CurrentUser('companyId') companyId: string,
    @Body() data: BulkUpdateContactDto,
  ) {
    return this.contactsService.bulkUpdate(companyId, data);
  }

  // ── CRUD ────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List contacts with pagination, search and filters' })
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query() paginationDto: PaginationDto,
    @Query() filters: ContactFilterDto,
  ) {
    return this.contactsService.findAll(companyId, paginationDto, filters);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new contact' })
  create(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('email') createdBy: string,
    @Body() data: CreateContactDto,
  ) {
    return this.contactsService.create(companyId, { ...data, createdBy });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contact by ID' })
  findOne(@Param('id') id: string) {
    return this.contactsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update contact by ID' })
  update(
    @Param('id') id: string,
    @CurrentUser('email') updatedBy: string,
    @Body() data: UpdateContactDto,
  ) {
    return this.contactsService.update(id, { ...data, updatedBy });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete contact by ID' })
  remove(@Param('id') id: string) {
    return this.contactsService.remove(id);
  }
}
