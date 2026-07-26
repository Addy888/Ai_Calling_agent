import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ParsedContact } from './contact-parser.service';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ValidatedContact extends ParsedContact {
  validationResult: ValidationResult;
  isDuplicate: boolean;
}

@Injectable()
export class ContactValidationService {
  private readonly logger = new Logger(ContactValidationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate a batch of contacts
   */
  async validateContacts(
    contacts: ParsedContact[],
    campaignId: string,
    companyId: string
  ): Promise<ValidatedContact[]> {
    this.logger.log(`Validating ${contacts.length} contacts for campaign ${campaignId}`);

    // Get existing phone numbers in this campaign
    const existingContacts = await this.prisma.campaignContact.findMany({
      where: {
        campaignId,
        companyId,
      },
      select: {
        phone: true,
        email: true,
      },
    });

    const existingPhones = new Set(existingContacts.map(c => c.phone));
    const existingEmails = new Set(existingContacts.filter(c => c.email).map(c => c.email!));

    // Track duplicates within the upload
    const uploadPhones = new Set<string>();
    const uploadEmails = new Set<string>();

    const validatedContacts: ValidatedContact[] = [];

    for (const contact of contacts) {
      const errors: string[] = [];
      let isDuplicate = false;

      // Validate phone number
      if (!this.isValidPhone(contact.phone)) {
        errors.push('Invalid phone number format');
      }

      // Check for duplicate phone in campaign
      if (existingPhones.has(contact.phone)) {
        errors.push('Phone number already exists in campaign');
        isDuplicate = true;
      }

      // Check for duplicate phone in current upload
      if (uploadPhones.has(contact.phone)) {
        errors.push('Duplicate phone number in upload');
        isDuplicate = true;
      }

      // Validate email if provided
      if (contact.email && !this.isValidEmail(contact.email)) {
        errors.push('Invalid email format');
      }

      // Check for duplicate email
      if (contact.email) {
        if (existingEmails.has(contact.email)) {
          errors.push('Email already exists in campaign');
          isDuplicate = true;
        }
        if (uploadEmails.has(contact.email)) {
          errors.push('Duplicate email in upload');
          isDuplicate = true;
        }
      }

      // Validate name lengths
      if (contact.firstName.length < 2) {
        errors.push('First name must be at least 2 characters');
      }
      if (contact.lastName.length < 2) {
        errors.push('Last name must be at least 2 characters');
      }

      // Validate language code
      if (contact.language && !this.isValidLanguageCode(contact.language)) {
        errors.push('Invalid language code');
      }

      // Add to tracking sets
      uploadPhones.add(contact.phone);
      if (contact.email) {
        uploadEmails.add(contact.email);
      }

      validatedContacts.push({
        ...contact,
        validationResult: {
          isValid: errors.length === 0,
          errors,
        },
        isDuplicate,
      });
    }

    const validCount = validatedContacts.filter(c => c.validationResult.isValid).length;
    const invalidCount = validatedContacts.length - validCount;
    const duplicateCount = validatedContacts.filter(c => c.isDuplicate).length;

    this.logger.log(
      `Validation complete: ${validCount} valid, ${invalidCount} invalid, ${duplicateCount} duplicates`
    );

    return validatedContacts;
  }

  /**
   * Validate phone number
   */
  private isValidPhone(phone: string): boolean {
    // Indian phone number: 10 digits
    // Can optionally start with country code +91
    const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Validate email address
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate language code
   */
  private isValidLanguageCode(code: string): boolean {
    const validLanguages = ['en', 'hi', 'mr', 'te', 'ta', 'kn', 'gu', 'bn', 'ml', 'pa'];
    return validLanguages.includes(code.toLowerCase());
  }
}
