import { DataSanitizationOptions } from "../types/transformation";

export class DataSanitizer {
  private options: DataSanitizationOptions;

  constructor(options: DataSanitizationOptions) {
    this.options = options;
  }

  sanitizeZipCode(zipCode: string): string {
    if (!zipCode) return "";

    // Remove any non-digit characters
    const digitsOnly = zipCode.replace(/\D/g, "");

    // If it's a 9-digit code, take only the first 5 digits
    if (digitsOnly.length === 9) {
      return digitsOnly.slice(0, 5);
    }

    // Otherwise return the first 5 digits (or all if less than 5)
    return digitsOnly.slice(0, 5);
  }

  sanitizeSpecialChars(text: string): string {
    if (!text) return "";

    // Remove or replace problematic characters
    // Keep alphanumeric, spaces, and basic punctuation
    return text.replace(/[^\w\s.,-]/g, "");
  }

  sanitizeValue(value: any): any {
    if (value === null || value === undefined) return value;

    const stringValue = String(value);
    let sanitized = stringValue;

    if (this.options.sanitizeZipCodes) {
      sanitized = this.sanitizeZipCode(sanitized);
    }

    if (this.options.removeSpecialChars) {
      sanitized = this.sanitizeSpecialChars(sanitized);
    }

    return sanitized;
  }

  sanitizeRow(row: Record<string, any>): Record<string, any> {
    const sanitizedRow: Record<string, any> = {};

    for (const [key, value] of Object.entries(row)) {
      sanitizedRow[key] = this.sanitizeValue(value);
    }

    return sanitizedRow;
  }
}
