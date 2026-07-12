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
          for (let i = 0; i < results.length; i++) {
            const row = results[i];
            try {
              if (!row.firstName || !row.lastName || !row.phone) {
                errors.push({ row: i + 1, error: 'Missing required fields (firstName, lastName, phone)' });
                invalid++;
                continue;
              }

              const existingPhone = await this.prisma.contact.findFirst({
                where: { companyId, phone: row.phone, deletedAt: null },
              });

              if (existingPhone) {
                errors.push({ row: i + 1, error: 'Duplicate phone number' });
                duplicates++;
                continue;
              }

              if (row.email) {
                const existingEmail = await this.prisma.contact.findFirst({
                  where: { companyId, email: row.email, deletedAt: null },
                });
                if (existingEmail) {
                  errors.push({ row: i + 1, error: 'Duplicate email address' });
                  duplicates++;
                  continue;
                }
              }

              await this.prisma.contact.create({
                data: {
                  companyId,
                  firstName: row.firstName,
                  lastName: row.lastName,
                  fullName: `${row.firstName} ${row.lastName}`.trim(),
                  email: row.email || null,
                  phone: row.phone,
                  countryCode: row.countryCode || '+1',
                  language: row.language || 'en',
                  company: row.company || null,
                  designation: row.designation || null,
                  tags: row.tags ? row.tags.split(',') : [],
                  notes: row.notes || null,
                },
              });

              imported++;
            } catch (error: any) {
              errors.push({ row: i + 1, error: error.message || 'Unknown error' });
              invalid++;
            }
          }

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

      for (let i = 0; i < data.length; i++) {
        const row: any = data[i];
        try {
          if (!row.firstName || !row.lastName || !row.phone) {
            errors.push({ row: i + 1, error: 'Missing required fields' });
            invalid++;
            continue;
          }

          const existingPhone = await this.prisma.contact.findFirst({
            where: { companyId, phone: String(row.phone), deletedAt: null },
          });

          if (existingPhone) {
            errors.push({ row: i + 1, error: 'Duplicate phone number' });
            duplicates++;
            continue;
          }

          await this.prisma.contact.create({
            data: {
              companyId,
              firstName: row.firstName,
              lastName: row.lastName,
              fullName: `${row.firstName} ${row.lastName}`.trim(),
              email: row.email || null,
              phone: String(row.phone),
              countryCode: row.countryCode || '+1',
              language: row.language || 'en',
              company: row.company || null,
              designation: row.designation || null,
              tags: row.tags ? String(row.tags).split(',') : [],
              notes: row.notes || null,
            },
          });

          imported++;
        } catch (error: any) {
          errors.push({ row: i + 1, error: error.message || 'Unknown error' });
          invalid++;
        }
      }

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
      throw new BadRequestException('Failed to parse Excel file');
    }
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
