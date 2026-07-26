import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import csv from 'csv-parser';

export interface ParsedContact {
  firstName: string;
  lastName: string;
  phone: string;
  countryCode?: string;
  email?: string;
  language?: string;
  city?: string;
  state?: string;
  country?: string;
  customFields?: Record<string, any>;
  rowNumber: number;
}

@Injectable()
export class ContactParserService {
  private readonly logger = new Logger(ContactParserService.name);

  /**
   * Parse contact file (CSV or XLSX)
   */
  async parseFile(filePath: string, fileType: string): Promise<ParsedContact[]> {
    this.logger.log(`Parsing file: ${filePath}, type: ${fileType}`);

    try {
      if (fileType === 'CSV') {
        return await this.parseCSV(filePath);
      } else if (fileType === 'XLSX' || fileType === 'XLS') {
        return this.parseExcel(filePath);
      } else {
        throw new BadRequestException(`Unsupported file type: ${fileType}`);
      }
    } catch (error) {
      this.logger.error(`Failed to parse file: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to parse file: ${error.message}`);
    }
  }

  /**
   * Parse CSV file
   */
  private parseCSV(filePath: string): Promise<ParsedContact[]> {
    return new Promise((resolve, reject) => {
      const contacts: ParsedContact[] = [];
      let rowNumber = 1; // Start from 1 (header is row 0)

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          rowNumber++;
          try {
            const contact = this.mapRowToContact(row, rowNumber);
            if (contact) {
              contacts.push(contact);
            }
          } catch (error) {
            this.logger.warn(`Failed to parse row ${rowNumber}: ${error.message}`);
          }
        })
        .on('end', () => {
          this.logger.log(`Parsed ${contacts.length} contacts from CSV`);
          resolve(contacts);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Parse Excel file (XLSX/XLS)
   */
  private parseExcel(filePath: string): ParsedContact[] {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    const contacts: ParsedContact[] = [];
    let rowNumber = 1; // Header is row 0

    for (const row of rows) {
      rowNumber++;
      try {
        const contact = this.mapRowToContact(row, rowNumber);
        if (contact) {
          contacts.push(contact);
        }
      } catch (error) {
        this.logger.warn(`Failed to parse row ${rowNumber}: ${error.message}`);
      }
    }

    this.logger.log(`Parsed ${contacts.length} contacts from Excel`);
    return contacts;
  }

  /**
   * Map a row to a contact object
   */
  private mapRowToContact(row: any, rowNumber: number): ParsedContact | null {
    // Required fields mapping (case-insensitive)
    const firstName = this.getFieldValue(row, ['firstName', 'first_name', 'fname', 'First Name']);
    const lastName = this.getFieldValue(row, ['lastName', 'last_name', 'lname', 'Last Name']);
    const phone = this.getFieldValue(row, ['phone', 'phoneNumber', 'phone_number', 'mobile', 'Phone', 'Mobile']);

    // Skip rows without required fields
    if (!firstName || !lastName || !phone) {
      this.logger.warn(`Row ${rowNumber}: Missing required fields (firstName, lastName, phone)`);
      return null;
    }

    // Optional fields
    const countryCode = this.getFieldValue(row, ['countryCode', 'country_code', 'code', 'Country Code']) || '+91';
    const email = this.getFieldValue(row, ['email', 'Email', 'emailAddress', 'email_address']);
    const language = this.getFieldValue(row, ['language', 'Language', 'lang']) || 'en';
    const city = this.getFieldValue(row, ['city', 'City']);
    const state = this.getFieldValue(row, ['state', 'State']);
    const country = this.getFieldValue(row, ['country', 'Country']) || 'India';

    // Collect custom fields (any field not in standard mapping)
    const standardFields = [
      'firstname', 'first_name', 'fname',
      'lastname', 'last_name', 'lname',
      'phone', 'phonenumber', 'phone_number', 'mobile',
      'countrycode', 'country_code', 'code',
      'email', 'emailaddress', 'email_address',
      'language', 'lang',
      'city', 'state', 'country'
    ];

    const customFields: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      if (!standardFields.includes(key.toLowerCase().replace(/\s+/g, ''))) {
        customFields[key] = value;
      }
    }

    return {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: this.normalizePhone(phone),
      countryCode,
      email: email ? email.trim().toLowerCase() : undefined,
      language,
      city: city ? city.trim() : undefined,
      state: state ? state.trim() : undefined,
      country: country ? country.trim() : undefined,
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
      rowNumber,
    };
  }

  /**
   * Get field value from row (case-insensitive match)
   */
  private getFieldValue(row: any, possibleKeys: string[]): string | undefined {
    for (const key of possibleKeys) {
      // Exact match
      if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
        return String(row[key]).trim();
      }

      // Case-insensitive match
      const foundKey = Object.keys(row).find(
        (k) => k.toLowerCase() === key.toLowerCase()
      );
      if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && row[foundKey] !== '') {
        return String(row[foundKey]).trim();
      }
    }
    return undefined;
  }

  /**
   * Normalize phone number (remove spaces, dashes, etc.)
   */
  private normalizePhone(phone: string): string {
    // Remove all non-digit characters except +
    let normalized = phone.replace(/[^\d+]/g, '');

    // If starts with country code, keep it
    if (normalized.startsWith('+')) {
      return normalized;
    }

    // If starts with 0, remove it (Indian format)
    if (normalized.startsWith('0')) {
      normalized = normalized.substring(1);
    }

    return normalized;
  }

  /**
   * Generate CSV template
   */
  generateTemplate(): string {
    const headers = [
      'firstName',
      'lastName',
      'phone',
      'countryCode',
      'email',
      'language',
      'city',
      'state',
      'country'
    ];

    const sampleRows = [
      {
        firstName: 'John',
        lastName: 'Doe',
        phone: '9876543210',
        countryCode: '+91',
        email: 'john.doe@example.com',
        language: 'en',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India'
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '9876543211',
        countryCode: '+91',
        email: 'jane.smith@example.com',
        language: 'hi',
        city: 'Delhi',
        state: 'Delhi',
        country: 'India'
      }
    ];

    // Create CSV
    const csvHeaders = headers.join(',');
    const csvRows = sampleRows.map(row =>
      headers.map(header => row[header] || '').join(',')
    );

    return [csvHeaders, ...csvRows].join('\n');
  }
}
