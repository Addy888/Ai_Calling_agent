import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PaginationDto, createPaginatedResponse } from '@/common/dto/pagination.dto';
import { ContactFilterDto, BulkUpdateContactDto } from './dto/contact.dto';
import csv from 'csv-parser';
import * as XLSX from 'xlsx';
import { Readable } from 'stream';
import { parseAsync } from 'json2csv';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, data: any) {
    // Check for duplicate phone
    if (data.phone) {
      const existing = await this.prisma.contact.findFirst({
        where: {
          companyId,
          phone: data.phone,
          deletedAt: null,
        },
      });

      if (existing) {
        throw new BadRequestException('Contact with this phone number already exists');
      }
    }

    if (data.email) {
      const existingEmail = await this.prisma.contact.findFirst({
        where: {
          companyId,
          email: data.email,
          deletedAt: null,
        },
      });

      if (existingEmail) {
        throw new BadRequestException('Contact with this email already exists');
      }
    }

    const contact = await this.prisma.contact.create({
      data: {
        ...data,
        fullName: `${data.firstName} ${data.lastName}`.trim(),
        companyId,
      },
    });

    return {
      success: true,
      data: contact,
      message: 'Contact created successfully',
    };
  }

  async findAll(companyId: string, paginationDto: PaginationDto, filters: ContactFilterDto) {
    const { page, limit, sortBy, sortOrder } = paginationDto;
    const skip = (page - 1) * limit;

    const where: any = {
      companyId,
      deletedAt: null,
    };

    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search } },
        { lastName: { contains: filters.search } },
        { fullName: { contains: filters.search } },
        { email: { contains: filters.search } },
        { phone: { contains: filters.search } },
        { company: { contains: filters.search } },
      ];
    }

    if (filters.status) where.status = filters.status;
    if (filters.language) where.language = filters.language;
    if (filters.country) where.country = filters.country;
    if (filters.campaignId) where.campaignId = filters.campaignId;
    
    if (filters.isDuplicate !== undefined) {
      where.isDuplicate = filters.isDuplicate;
    }

    if (filters.tags && filters.tags.length > 0) {
      // Basic JSON tag filtering placeholder since tags is Json
      // In production Prisma JSON filtering can be complex, skipping strict JSON match for now
      // where.tags = { array_contains: filters.tags } (Not supported generically in MySQL json without raw query)
    }

    if (filters.createdAfter || filters.createdBefore) {
      where.createdAt = {};
      if (filters.createdAfter) where.createdAt.gte = new Date(filters.createdAfter);
      if (filters.createdBefore) where.createdAt.lte = new Date(filters.createdBefore);
    }

    const [contacts, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return {
      success: true,
      data: createPaginatedResponse(contacts, total, page, limit),
    };
  }

  async findOne(id: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      include: {
        calls: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!contact || contact.deletedAt) {
      throw new NotFoundException('Contact not found');
    }

    return {
      success: true,
      data: contact,
    };
  }

  async update(id: string, data: any) {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact || contact.deletedAt) {
      throw new NotFoundException('Contact not found');
    }

    if (data.firstName || data.lastName) {
      data.fullName = `${data.firstName || contact.firstName} ${data.lastName || contact.lastName}`.trim();
    }

    const updated = await this.prisma.contact.update({
      where: { id },
      data,
    });

    return {
      success: true,
      data: updated,
      message: 'Contact updated successfully',
    };
  }

  async remove(id: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact || contact.deletedAt) {
      throw new NotFoundException('Contact not found');
    }

    await this.prisma.contact.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      success: true,
      message: 'Contact deleted successfully',
    };
  }

  async exportContacts(companyId: string, filters: ContactFilterDto): Promise<string> {
    const where: any = {
      companyId,
      deletedAt: null,
    };

    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search } },
        { lastName: { contains: filters.search } },
        { email: { contains: filters.search } },
        { phone: { contains: filters.search } },
        { company: { contains: filters.search } },
      ];
    }

    const contacts = await this.prisma.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const fields = ['firstName', 'lastName', 'phone', 'countryCode', 'email', 'language', 'company', 'designation', 'status', 'createdAt'];
    const csv = await parseAsync(contacts, { fields });
    return csv;
  }

  async importFromCSV(companyId: string, fileBuffer: Buffer) {
    const results: any[] = [];
    const errors: any[] = [];
    let imported = 0;
    let skipped = 0;
    let duplicates = 0;
    let invalid = 0;

    return new Promise((resolve, reject) => {
      const stream = Readable.from(fileBuffer.toString());
      
      stream
        .pipe(csv())
        .on('data', (row) => {
          results.push(row);
        })
        .on('end', async () => {
          console.log(`📊 [CSV IMPORT] Starting import: ${results.length} rows`);

          for (let i = 0; i < results.length; i++) {
            const row = results[i];
            
            console.log(`📋 [CSV IMPORT] Row ${i + 1} - Raw data:`, row);

            try {
              // Map common column name variations
              const mappedRow = this.mapExcelColumns(row);
              
              console.log(`🔄 [CSV IMPORT] Row ${i + 1} - Mapped data:`, mappedRow);

              // Validate required fields
              const missingFields: string[] = [];
              
              // Phone is required
              if (!mappedRow.phone) {
                missingFields.push('phone');
              }

              // At least name OR (firstName + lastName) is required
              if (!mappedRow.firstName && !mappedRow.lastName && !mappedRow.name) {
                missingFields.push('name or firstName/lastName');
              }

              if (missingFields.length > 0) {
                const errorMsg = `Missing required field(s): ${missingFields.join(', ')}`;
                console.log(`❌ [CSV IMPORT] Row ${i + 1} - ${errorMsg}`);
                errors.push({ row: i + 1, error: errorMsg });
                invalid++;
                continue;
              }

              // Split full name if provided
              let firstName = mappedRow.firstName || '';
              let lastName = mappedRow.lastName || '';
              
              if (mappedRow.name && !firstName && !lastName) {
                const nameParts = String(mappedRow.name).trim().split(/\s+/);
                firstName = nameParts[0] || '';
                lastName = nameParts.slice(1).join(' ') || '';
              }

              // Normalize phone number
              const phone = String(mappedRow.phone).trim();

              // Check for duplicate phone
              const existingPhone = await this.prisma.contact.findFirst({
                where: { companyId, phone, deletedAt: null },
              });

              if (existingPhone) {
                console.log(`⚠️ [CSV IMPORT] Row ${i + 1} - Duplicate phone: ${phone}`);
                errors.push({ row: i + 1, error: 'Duplicate phone number' });
                duplicates++;
                continue;
              }

              // Check for duplicate email if provided
              if (mappedRow.email) {
                const existingEmail = await this.prisma.contact.findFirst({
                  where: { companyId, email: mappedRow.email, deletedAt: null },
                });
                if (existingEmail) {
                  console.log(`⚠️ [CSV IMPORT] Row ${i + 1} - Duplicate email: ${mappedRow.email}`);
                  errors.push({ row: i + 1, error: 'Duplicate email address' });
                  duplicates++;
                  continue;
                }
              }

              // Create contact
              await this.prisma.contact.create({
                data: {
                  companyId,
                  firstName,
                  lastName,
                  fullName: mappedRow.fullName || `${firstName} ${lastName}`.trim() || phone,
                  email: mappedRow.email || null,
                  phone,
                  countryCode: mappedRow.countryCode || '+91',
                  language: mappedRow.language || 'en',
                  company: mappedRow.company || null,
                  designation: mappedRow.designation || null,
                  tags: mappedRow.tags ? String(mappedRow.tags).split(',') : [],
                  notes: mappedRow.notes || null,
                },
              });

              console.log(`✅ [CSV IMPORT] Row ${i + 1} - Imported: ${firstName} ${lastName} (${phone})`);
              imported++;
            } catch (error: any) {
              console.log(`❌ [CSV IMPORT] Row ${i + 1} - Error:`, error.message, error.stack);
              errors.push({ row: i + 1, error: error.message || 'Unknown error' });
              invalid++;
            }
          }

          console.log(`📊 [CSV IMPORT] Complete: ${imported} imported, ${duplicates} duplicates, ${invalid} invalid`);

          resolve({
            success: true,
            data: {
              totalRows: results.length,
              imported,
              duplicates,
              invalid,
              failed: invalid + duplicates,
              errors,
            },
            message: `Import completed: ${imported} imported, ${duplicates} duplicates, ${invalid} invalid`,
          });
        })
        .on('error', (error) => {
          console.error('❌ [CSV IMPORT] Failed to parse CSV file:', error);
          reject(new BadRequestException('Failed to parse CSV file'));
        });
    });
  }

  async importFromExcel(companyId: string, fileBuffer: Buffer) {
    try {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      const errors: any[] = [];
      let imported = 0;
      let duplicates = 0;
      let invalid = 0;

      console.log(`📊 [EXCEL IMPORT] Starting import: ${data.length} rows`);

      for (let i = 0; i < data.length; i++) {
        const row: any = data[i];
        
        console.log(`📋 [EXCEL IMPORT] Row ${i + 1} - Raw data:`, row);

        try {
          // Map common column name variations to standard fields
          const mappedRow = this.mapExcelColumns(row);
          
          console.log(`🔄 [EXCEL IMPORT] Row ${i + 1} - Mapped data:`, mappedRow);

          // Validate required fields
          const missingFields: string[] = [];
          
          // Phone is required
          if (!mappedRow.phone) {
            missingFields.push('phone');
          }

          // At least name OR (firstName + lastName) is required
          if (!mappedRow.firstName && !mappedRow.lastName && !mappedRow.name) {
            missingFields.push('name or firstName/lastName');
          }

          if (missingFields.length > 0) {
            const errorMsg = `Missing required field(s): ${missingFields.join(', ')}`;
            console.log(`❌ [EXCEL IMPORT] Row ${i + 1} - ${errorMsg}`);
            errors.push({ row: i + 1, error: errorMsg });
            invalid++;
            continue;
          }

          // Split full name if provided
          let firstName = mappedRow.firstName || '';
          let lastName = mappedRow.lastName || '';
          
          if (mappedRow.name && !firstName && !lastName) {
            const nameParts = String(mappedRow.name).trim().split(/\s+/);
            firstName = nameParts[0] || '';
            lastName = nameParts.slice(1).join(' ') || '';
          }

          // Normalize phone number
          const phone = String(mappedRow.phone).trim();

          // Check for duplicate phone
          const existingPhone = await this.prisma.contact.findFirst({
            where: { companyId, phone, deletedAt: null },
          });

          if (existingPhone) {
            console.log(`⚠️ [EXCEL IMPORT] Row ${i + 1} - Duplicate phone: ${phone}`);
            errors.push({ row: i + 1, error: 'Duplicate phone number' });
            duplicates++;
            continue;
          }

          // Create contact
          await this.prisma.contact.create({
            data: {
              companyId,
              firstName,
              lastName,
              fullName: mappedRow.fullName || `${firstName} ${lastName}`.trim() || phone,
              email: mappedRow.email || null,
              phone,
              countryCode: mappedRow.countryCode || '+91',
              language: mappedRow.language || 'en',
              company: mappedRow.company || null,
              designation: mappedRow.designation || null,
              tags: mappedRow.tags ? String(mappedRow.tags).split(',') : [],
              notes: mappedRow.notes || null,
            },
          });

          console.log(`✅ [EXCEL IMPORT] Row ${i + 1} - Imported: ${firstName} ${lastName} (${phone})`);
          imported++;
        } catch (error: any) {
          console.log(`❌ [EXCEL IMPORT] Row ${i + 1} - Error:`, error.message, error.stack);
          errors.push({ row: i + 1, error: error.message || 'Unknown error' });
          invalid++;
        }
      }

      console.log(`📊 [EXCEL IMPORT] Complete: ${imported} imported, ${duplicates} duplicates, ${invalid} invalid`);

      return {
        success: true,
        data: {
          totalRows: data.length,
          imported,
          duplicates,
          invalid,
          failed: invalid + duplicates,
          errors,
        },
        message: `Import completed: ${imported} imported, ${duplicates} duplicates, ${invalid} invalid`,
      };
    } catch (error) {
      console.error('❌ [EXCEL IMPORT] Failed to parse Excel file:', error);
      throw new BadRequestException('Failed to parse Excel file');
    }
  }

  /**
   * Map common Excel column name variations to standard field names
   */
  private mapExcelColumns(row: any): any {
    const mapped: any = {};

    // Map name variations (full name)
    mapped.name = 
      row.name || 
      row.Name || 
      row.NAME || 
      row['Full Name'] || 
      row['full name'] || 
      row.fullName || 
      row['Contact Name'] || 
      row['contact name'] ||
      row.contactName ||
      null;

    // Map firstName variations
    mapped.firstName = 
      row.firstName || 
      row.FirstName || 
      row.first_name || 
      row['First Name'] || 
      row.firstname ||
      null;

    // Map lastName variations
    mapped.lastName = 
      row.lastName || 
      row.LastName || 
      row.last_name || 
      row['Last Name'] || 
      row.lastname ||
      null;

    // Map fullName variations
    mapped.fullName = 
      row.fullName || 
      row.FullName || 
      row['Full Name'] || 
      row.full_name ||
      null;

    // Map phone variations
    mapped.phone = 
      row.phone || 
      row.Phone || 
      row.PHONE || 
      row.phoneNumber || 
      row.PhoneNumber || 
      row['Phone Number'] || 
      row.phone_number ||
      row.mobile || 
      row.Mobile || 
      row.mobileNumber || 
      row.MobileNumber || 
      row['Mobile Number'] ||
      row.contact ||
      row.Contact ||
      null;

    // Map email variations
    mapped.email = 
      row.email || 
      row.Email || 
      row.EMAIL || 
      row['Email Address'] || 
      row.email_address ||
      null;

    // Map language variations
    mapped.language = 
      row.language || 
      row.Language || 
      row.lang ||
      null;

    // Map company variations
    mapped.company = 
      row.company || 
      row.Company || 
      row.organization || 
      row.Organization ||
      null;

    // Map designation variations
    mapped.designation = 
      row.designation || 
      row.Designation || 
      row.title || 
      row.Title || 
      row.position || 
      row.Position ||
      null;

    // Map countryCode variations
    mapped.countryCode = 
      row.countryCode || 
      row.CountryCode || 
      row['Country Code'] || 
      row.country_code ||
      null;

    // Map tags variations
    mapped.tags = 
      row.tags || 
      row.Tags || 
      row.TAGS ||
      null;

    // Map notes variations
    mapped.notes = 
      row.notes || 
      row.Notes || 
      row.NOTES || 
      row.comments || 
      row.Comments ||
      null;

    return mapped;
  }

  async bulkDelete(companyId: string, contactIds: string[]) {
    await this.prisma.contact.updateMany({
      where: {
        id: { in: contactIds },
        companyId,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
      data: { deleted: contactIds.length },
      message: `${contactIds.length} contacts deleted successfully`,
    };
  }

  async bulkUpdate(companyId: string, dto: BulkUpdateContactDto) {
    const { contactIds, status, campaignId } = dto;
    const dataToUpdate: any = {};
    if (status) dataToUpdate.status = status;
    if (campaignId) dataToUpdate.campaignId = campaignId;

    if (Object.keys(dataToUpdate).length > 0) {
      await this.prisma.contact.updateMany({
        where: { id: { in: contactIds }, companyId, deletedAt: null },
        data: dataToUpdate,
      });
    }

    return {
      success: true,
      data: { updated: contactIds.length },
      message: `${contactIds.length} contacts updated successfully`,
    };
  }

  async getImportHistory(companyId: string) {
    return {
      success: true,
      data: [],
      message: 'Import history retrieved successfully',
    };
  }
}
