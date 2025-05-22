import { DataSanitizer } from "../transformers/BaseTransformer";

/**
 * Base sanitizer class with common functionality
 */
abstract class BaseSanitizer implements DataSanitizer {
  protected columns: string[] = [];

  /**
   * Set columns to sanitize (if empty, all columns will be sanitized)
   * @param columns Columns to sanitize
   */
  setColumns(columns: string[]): this {
    this.columns = columns;
    return this;
  }

  /**
   * Sanitize the data
   * @param data Data to sanitize
   */
  abstract sanitize(data: any[]): Promise<any[]>;

  /**
   * Check if a column should be sanitized
   * @param column Column name
   */
  protected shouldSanitizeColumn(column: string): boolean {
    return this.columns.length === 0 || this.columns.includes(column);
  }
}

/**
 * Sanitizer that removes special characters from text
 */
export class SpecialCharSanitizer extends BaseSanitizer {
  private preserveChars: string;
  private replaceWithSpace: boolean;

  /**
   * @param preserveChars Characters to preserve (in addition to alphanumerics)
   * @param replaceWithSpace Whether to replace special chars with spaces or remove them entirely
   */
  constructor(preserveChars: string = "", replaceWithSpace: boolean = false) {
    super();
    this.preserveChars = preserveChars;
    this.replaceWithSpace = replaceWithSpace;
  }

  /**
   * Sanitize the data by removing special characters
   * @param data Data to sanitize
   */
  async sanitize(data: any[]): Promise<any[]> {
    if (!Array.isArray(data)) {
      return data;
    }

    // Create a regex that preserves alphanumerics and specified characters
    const preservePattern = `[^a-zA-Z0-9\\s${this.escapeRegExp(this.preserveChars)}]`;
    const regex = new RegExp(preservePattern, "g");

    return data.map((row) => {
      const newRow = { ...row };

      Object.keys(newRow).forEach((key) => {
        if (typeof newRow[key] === "string" && this.shouldSanitizeColumn(key)) {
          newRow[key] = this.replaceWithSpace
            ? newRow[key].replace(regex, " ").replace(/\s+/g, " ").trim()
            : newRow[key].replace(regex, "");
        }
      });

      return newRow;
    });
  }

  /**
   * Escape special characters in a string for use in a regex
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}

/**
 * Sanitizer for ZIP codes
 */
export class ZipCodeSanitizer extends BaseSanitizer {
  private countryFormat: "US" | "CA" | "UK" | "other";
  private keepExtendedFormat: boolean;

  /**
   * @param countryFormat Country format for ZIP/postal codes
   * @param keepExtendedFormat Keep the extended format (e.g., 9-digit ZIP+4 format)
   */
  constructor(
    countryFormat: "US" | "CA" | "UK" | "other" = "US",
    keepExtendedFormat: boolean = false,
  ) {
    super();
    this.countryFormat = countryFormat;
    this.keepExtendedFormat = keepExtendedFormat;
  }

  /**
   * Sanitize ZIP/postal codes according to country format
   * @param data Data to sanitize
   */
  async sanitize(data: any[]): Promise<any[]> {
    if (!Array.isArray(data)) {
      return data;
    }

    return data.map((row) => {
      const newRow = { ...row };

      Object.keys(newRow).forEach((key) => {
        if (typeof newRow[key] === "string" && this.shouldSanitizeColumn(key)) {
          newRow[key] = this.formatZipCode(newRow[key]);
        }
      });

      return newRow;
    });
  }

  /**
   * Format a ZIP/postal code according to country format
   * @param zip ZIP/postal code to format
   */
  private formatZipCode(zip: string): string {
    if (!zip) return "";

    // Remove all non-alphanumeric characters first
    const cleanZip = zip.replace(/[^a-zA-Z0-9]/g, "");

    switch (this.countryFormat) {
      case "US":
        // US: 5 digits or 5+4 format (12345 or 12345-6789)
        if (cleanZip.length <= 5) {
          return cleanZip.padStart(5, "0");
        } else if (this.keepExtendedFormat && cleanZip.length <= 9) {
          return `${cleanZip.substring(0, 5)}-${cleanZip.substring(5).padEnd(4, "0")}`;
        } else if (this.keepExtendedFormat) {
          return `${cleanZip.substring(0, 5)}-${cleanZip.substring(5, 9)}`;
        } else {
          // Return just the 5-digit ZIP if extended format not requested
          return cleanZip.substring(0, 5);
        }

      case "CA":
        // Canada: A1A 1A1 format
        if (cleanZip.length <= 6) {
          return cleanZip.toUpperCase().padEnd(6, "0");
        } else {
          const formatted = cleanZip.toUpperCase().substring(0, 6);
          return `${formatted.substring(0, 3)} ${formatted.substring(3)}`;
        }

      case "UK":
        // UK: Variable length, typically 5-7 characters with a space
        if (cleanZip.length <= 4) {
          return cleanZip.toUpperCase();
        } else {
          const outcode = cleanZip.substring(0, cleanZip.length - 3);
          const incode = cleanZip.substring(cleanZip.length - 3);
          return `${outcode} ${incode}`.toUpperCase();
        }

      default:
        // For other countries, just return cleaned alphanumeric value
        return cleanZip;
    }
  }
}

/**
 * Sanitizer that removes HTML/rich text formatting
 */
export class HtmlSanitizer extends BaseSanitizer {
  private preserveLineBreaks: boolean;

  /**
   * @param preserveLineBreaks Convert HTML line breaks to plain text line breaks
   */
  constructor(preserveLineBreaks: boolean = true) {
    super();
    this.preserveLineBreaks = preserveLineBreaks;
  }

  /**
   * Sanitize the data by removing HTML tags and entities
   * @param data Data to sanitize
   */
  async sanitize(data: any[]): Promise<any[]> {
    if (!Array.isArray(data)) {
      return data;
    }

    return data.map((row) => {
      const newRow = { ...row };

      Object.keys(newRow).forEach((key) => {
        if (typeof newRow[key] === "string" && this.shouldSanitizeColumn(key)) {
          let sanitized = newRow[key];

          // Replace line breaks with placeholder if preserving
          if (this.preserveLineBreaks) {
            sanitized = sanitized
              .replace(/<br\s*\/?>/gi, "{LINEBREAK}")
              .replace(/<\/p>/gi, "{LINEBREAK}")
              .replace(/<\/div>/gi, "{LINEBREAK}");
          }

          // Remove HTML tags
          sanitized = sanitized.replace(/<[^>]*>/g, "");

          // Replace common HTML entities
          sanitized = sanitized
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");

          // Restore line breaks
          if (this.preserveLineBreaks) {
            sanitized = sanitized.replace(/{LINEBREAK}/g, "\n");
          }

          // Normalize multiple line breaks and spaces
          sanitized = sanitized
            .replace(/\n{3,}/g, "\n\n")
            .replace(/[ \t]+/g, " ");

          newRow[key] = sanitized;
        }
      });

      return newRow;
    });
  }
}

/**
 * Sanitizer for insurance policy numbers
 */
export class PolicyNumberSanitizer extends BaseSanitizer {
  private format: string;
  private separator: string;
  private autoDetect: boolean;

  /**
   * @param format Format pattern (e.g., 'XXX-XX-XXXX')
   * @param separator Separator character
   * @param autoDetect Try to auto-detect the policy format
   */
  constructor(
    format: string = "XXX-XX-XXXX",
    separator: string = "-",
    autoDetect: boolean = true,
  ) {
    super();
    this.format = format;
    this.separator = separator;
    this.autoDetect = autoDetect;
  }

  /**
   * Sanitize policy numbers according to format
   * @param data Data to sanitize
   */
  async sanitize(data: any[]): Promise<any[]> {
    if (!Array.isArray(data)) {
      return data;
    }

    // Count number of parts and their lengths
    const parts = this.format.split(this.separator);
    const partLengths = parts.map((part) => part.length);

    return data.map((row) => {
      const newRow = { ...row };

      Object.keys(newRow).forEach((key) => {
        if (typeof newRow[key] === "string" && this.shouldSanitizeColumn(key)) {
          newRow[key] = this.formatPolicyNumber(newRow[key], partLengths);
        }
      });

      return newRow;
    });
  }

  /**
   * Format a policy number according to format
   * @param policy Policy number to format
   * @param partLengths Lengths of each part
   */
  private formatPolicyNumber(policy: string, partLengths: number[]): string {
    // Remove all non-alphanumeric characters
    const cleanPolicy = policy.replace(/[^a-zA-Z0-9]/g, "");

    if (cleanPolicy.length === 0) {
      return "";
    }

    // Auto-detect common insurance policy formats if enabled
    if (this.autoDetect) {
      // Check for standard formats
      if (cleanPolicy.length === 10 && /^\d+$/.test(cleanPolicy)) {
        // Common 10-digit policy number: XXX-XXX-XXXX
        return `${cleanPolicy.substring(0, 3)}-${cleanPolicy.substring(3, 6)}-${cleanPolicy.substring(6)}`;
      }
    }

    // Format according to part lengths
    const formattedParts: string[] = [];
    let currentPos = 0;

    for (let i = 0; i < partLengths.length; i++) {
      const length = partLengths[i];

      if (currentPos >= cleanPolicy.length) {
        break;
      }

      const part = cleanPolicy.substring(currentPos, currentPos + length);
      formattedParts.push(part);
      currentPos += length;
    }

    // Add any remaining characters
    if (currentPos < cleanPolicy.length) {
      formattedParts.push(cleanPolicy.substring(currentPos));
    }

    return formattedParts.join(this.separator);
  }
}

/**
 * Sanitizer for Social Security Numbers
 */
export class SsnSanitizer extends BaseSanitizer {
  private format: "XXX-XX-XXXX" | "XXXXXXXXX" | "XXX-XX-****";

  /**
   * @param format Output format for the SSN
   */
  constructor(
    format: "XXX-XX-XXXX" | "XXXXXXXXX" | "XXX-XX-****" = "XXX-XX-XXXX",
  ) {
    super();
    this.format = format;
  }

  /**
   * Sanitize the data by formatting SSNs
   * @param data Data to sanitize
   */
  async sanitize(data: any[]): Promise<any[]> {
    if (!Array.isArray(data)) {
      return data;
    }

    return data.map((row) => {
      const newRow = { ...row };

      Object.keys(newRow).forEach((key) => {
        if (typeof newRow[key] === "string" && this.shouldSanitizeColumn(key)) {
          newRow[key] = this.formatSSN(newRow[key]);
        }
      });

      return newRow;
    });
  }

  /**
   * Format an SSN according to the selected format
   * @param ssn SSN to format
   */
  private formatSSN(ssn: string): string {
    // Extract only digits
    const digits = ssn.replace(/\D/g, "");

    if (digits.length === 0) {
      return ssn; // Return original if no digits found
    }

    // Ensure we have 9 digits (padded if shorter)
    const paddedDigits = digits.padEnd(9, "0").substring(0, 9);

    switch (this.format) {
      case "XXX-XX-XXXX":
        return `${paddedDigits.substring(0, 3)}-${paddedDigits.substring(3, 5)}-${paddedDigits.substring(5)}`;

      case "XXXXXXXXX":
        return paddedDigits;

      case "XXX-XX-****":
        return `${paddedDigits.substring(0, 3)}-${paddedDigits.substring(3, 5)}-****`;

      default:
        return paddedDigits;
    }
  }
}

/**
 * Sanitizer that normalizes date formats
 */
export class DateSanitizer extends BaseSanitizer {
  private outputFormat: string;

  /**
   * @param outputFormat Output date format (e.g., 'MM/DD/YYYY')
   */
  constructor(outputFormat: string = "MM/DD/YYYY") {
    super();
    this.outputFormat = outputFormat;
  }

  /**
   * Sanitize dates according to output format
   * @param data Data to sanitize
   */
  async sanitize(data: any[]): Promise<any[]> {
    if (!Array.isArray(data)) {
      return data;
    }

    return data.map((row) => {
      const newRow = { ...row };

      Object.keys(newRow).forEach((key) => {
        if (this.shouldSanitizeColumn(key)) {
          const value = newRow[key];
          if (typeof value === "string" || value instanceof Date) {
            try {
              const date = typeof value === "string" ? new Date(value) : value;

              // Check if date is valid
              if (!isNaN(date.getTime())) {
                newRow[key] = this.formatDate(date);
              }
            } catch (e) {
              // Not a valid date, leave as is
            }
          }
        }
      });

      return newRow;
    });
  }

  /**
   * Format a date according to output format
   * @param date Date to format
   */
  private formatDate(date: Date): string {
    const tokens: Record<string, () => string> = {
      YYYY: () => date.getFullYear().toString(),
      YY: () => date.getFullYear().toString().slice(-2),
      MM: () => (date.getMonth() + 1).toString().padStart(2, "0"),
      M: () => (date.getMonth() + 1).toString(),
      DD: () => date.getDate().toString().padStart(2, "0"),
      D: () => date.getDate().toString(),
      HH: () => date.getHours().toString().padStart(2, "0"),
      H: () => date.getHours().toString(),
      mm: () => date.getMinutes().toString().padStart(2, "0"),
      m: () => date.getMinutes().toString(),
      ss: () => date.getSeconds().toString().padStart(2, "0"),
      s: () => date.getSeconds().toString(),
    };

    // Sort tokens by length (longest first) to avoid substring matches
    const sortedTokens = Object.keys(tokens).sort(
      (a, b) => b.length - a.length,
    );

    let result = this.outputFormat;
    for (const token of sortedTokens) {
      if (result.includes(token)) {
        result = result.replace(new RegExp(token, "g"), tokens[token]());
      }
    }

    return result;
  }
}
