import { DataFormatter } from "../transformers/BaseTransformer";

/**
 * Base formatter class with common functionality
 */
abstract class BaseFormatter implements DataFormatter {
  protected columns: string[] = [];

  /**
   * Set columns to format (if empty, all columns will be formatted)
   * @param columns Columns to format
   */
  setColumns(columns: string[]): this {
    this.columns = columns;
    return this;
  }

  /**
   * Format the data
   * @param data Data to format
   */
  abstract format(data: any[]): Promise<any[]>;

  /**
   * Check if a column should be formatted
   * @param column Column name
   */
  protected shouldFormatColumn(column: string): boolean {
    return this.columns.length === 0 || this.columns.includes(column);
  }
}

/**
 * Formatter that applies text case transformations
 */
export class TextCaseFormatter extends BaseFormatter {
  private caseType: "upper" | "lower" | "title" | "sentence";

  /**
   * @param caseType Type of case transformation to apply
   */
  constructor(caseType: "upper" | "lower" | "title" | "sentence" = "title") {
    super();
    this.caseType = caseType;
  }

  /**
   * Format the data by applying case transformations
   * @param data Data to format
   */
  async format(data: any[]): Promise<any[]> {
    if (!Array.isArray(data)) {
      return data;
    }

    return data.map((row) => {
      const newRow = { ...row };

      Object.keys(newRow).forEach((key) => {
        if (typeof newRow[key] === "string" && this.shouldFormatColumn(key)) {
          newRow[key] = this.applyCase(newRow[key]);
        }
      });

      return newRow;
    });
  }

  /**
   * Apply case transformation to a string
   * @param text Text to transform
   */
  private applyCase(text: string): string {
    switch (this.caseType) {
      case "upper":
        return text.toUpperCase();

      case "lower":
        return text.toLowerCase();

      case "title":
        return text
          .toLowerCase()
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

      case "sentence":
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

      default:
        return text;
    }
  }
}

/**
 * Formatter that applies number formatting
 */
export class NumberFormatter extends BaseFormatter {
  private decimals: number;
  private thousandsSeparator: string;
  private decimalSeparator: string;
  private prefix: string;
  private suffix: string;

  /**
   * @param options Formatting options
   */
  constructor(
    options: {
      decimals?: number;
      thousandsSeparator?: string;
      decimalSeparator?: string;
      prefix?: string;
      suffix?: string;
    } = {},
  ) {
    super();
    this.decimals = options.decimals ?? 2;
    this.thousandsSeparator = options.thousandsSeparator ?? ",";
    this.decimalSeparator = options.decimalSeparator ?? ".";
    this.prefix = options.prefix ?? "";
    this.suffix = options.suffix ?? "";
  }

  /**
   * Format the data by applying number formatting
   * @param data Data to format
   */
  async format(data: any[]): Promise<any[]> {
    if (!Array.isArray(data)) {
      return data;
    }

    return data.map((row) => {
      const newRow = { ...row };

      Object.keys(newRow).forEach((key) => {
        if (this.shouldFormatColumn(key)) {
          const value = newRow[key];
          if (
            typeof value === "number" ||
            (typeof value === "string" && !isNaN(Number(value)))
          ) {
            const num = typeof value === "number" ? value : Number(value);
            newRow[key] = this.formatNumber(num);
          }
        }
      });

      return newRow;
    });
  }

  /**
   * Format a number according to options
   * @param num Number to format
   */
  protected formatNumber(num: number): string {
    // Round to specified decimals
    const rounded = num.toFixed(this.decimals);

    // Split into whole and decimal parts
    const [whole, decimal] = rounded.split(".");

    // Format whole part with thousands separator
    const formattedWhole = whole.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      this.thousandsSeparator,
    );

    // Put it all together
    const formattedNumber = decimal
      ? `${formattedWhole}${this.decimalSeparator}${decimal}`
      : formattedWhole;

    return `${this.prefix}${formattedNumber}${this.suffix}`;
  }
}

/**
 * Formatter that applies currency formatting
 */
export class CurrencyFormatter extends NumberFormatter {
  /**
   * @param currency Currency code or symbol
   * @param options Additional formatting options
   */
  constructor(
    currency: string = "$",
    options: {
      decimals?: number;
      thousandsSeparator?: string;
      decimalSeparator?: string;
    } = {},
  ) {
    super({
      decimals: options.decimals ?? 2,
      thousandsSeparator: options.thousandsSeparator ?? ",",
      decimalSeparator: options.decimalSeparator ?? ".",
      prefix: currency,
      suffix: "",
    });
  }
}

/**
 * Formatter that applies percentage formatting
 */
export class PercentageFormatter extends NumberFormatter {
  /**
   * @param options Additional formatting options
   */
  constructor(
    options: {
      decimals?: number;
      thousandsSeparator?: string;
      decimalSeparator?: string;
    } = {},
  ) {
    super({
      decimals: options.decimals ?? 2,
      thousandsSeparator: options.thousandsSeparator ?? ",",
      decimalSeparator: options.decimalSeparator ?? ".",
      prefix: "",
      suffix: "%",
    });
  }

  /**
   * Format the data by applying percentage formatting
   * @param data Data to format
   */
  async format(data: any[]): Promise<any[]> {
    if (!Array.isArray(data)) {
      return data;
    }

    return data.map((row) => {
      const newRow = { ...row };

      Object.keys(newRow).forEach((key) => {
        if (this.shouldFormatColumn(key)) {
          const value = newRow[key];
          if (
            typeof value === "number" ||
            (typeof value === "string" && !isNaN(Number(value)))
          ) {
            // Convert to percentage (multiply by 100)
            const num =
              typeof value === "number" ? value * 100 : Number(value) * 100;
            newRow[key] = this.formatNumber(num);
          }
        }
      });

      return newRow;
    });
  }
}

/**
 * Formatter that applies phone number formatting
 */
export class PhoneNumberFormatter extends BaseFormatter {
  private formatPattern: string;
  private countryCode: string;

  /**
   * @param formatPattern Format pattern (e.g., '(XXX) XXX-XXXX')
   * @param countryCode Country code to prepend
   */
  constructor(
    formatPattern: string = "(XXX) XXX-XXXX",
    countryCode: string = "",
  ) {
    super();
    this.formatPattern = formatPattern;
    this.countryCode = countryCode;
  }

  /**
   * Format the data by applying phone number formatting
   * @param data Data to format
   */
  async format(data: any[]): Promise<any[]> {
    if (!Array.isArray(data)) {
      return data;
    }

    return data.map((row) => {
      const newRow = { ...row };

      Object.keys(newRow).forEach((key) => {
        if (typeof newRow[key] === "string" && this.shouldFormatColumn(key)) {
          newRow[key] = this.formatPhoneNumber(newRow[key]);
        }
      });

      return newRow;
    });
  }

  /**
   * Format a phone number according to format
   * @param phone Phone number to format
   */
  private formatPhoneNumber(phone: string): string {
    // Extract only digits
    const digits = phone.replace(/\D/g, "");

    if (digits.length === 0) {
      return phone;
    }

    // Create a formatter function
    let result = this.formatPattern;
    let digitIndex = 0;

    // Replace X placeholders with digits
    for (let i = 0; i < result.length && digitIndex < digits.length; i++) {
      if (result[i] === "X") {
        result =
          result.substring(0, i) + digits[digitIndex] + result.substring(i + 1);
        digitIndex++;
      }
    }

    // If we have more digits, append them
    if (digitIndex < digits.length) {
      const extra = digits.substring(digitIndex);
      result = result.replace(/X/g, "") + extra;
    } else {
      // If we don't have enough digits, remove remaining X placeholders
      result = result.replace(/X/g, "");
    }

    // Add country code if provided
    if (this.countryCode && this.countryCode.trim() !== "") {
      result = `${this.countryCode} ${result}`;
    }

    return result;
  }
}

/**
 * Formatter that truncates or pads text to a fixed length
 */
export class TextLengthFormatter extends BaseFormatter {
  private maxLength: number;
  private truncationMarker: string;
  private padChar: string;
  private padDirection: "start" | "end";

  /**
   * @param maxLength Maximum length for text
   * @param options Additional formatting options
   */
  constructor(
    maxLength: number = 50,
    options: {
      truncationMarker?: string;
      padChar?: string;
      padDirection?: "start" | "end";
    } = {},
  ) {
    super();
    this.maxLength = maxLength;
    this.truncationMarker = options.truncationMarker ?? "...";
    this.padChar = options.padChar ?? " ";
    this.padDirection = options.padDirection ?? "end";
  }

  /**
   * Format the data by applying text length formatting
   * @param data Data to format
   */
  async format(data: any[]): Promise<any[]> {
    if (!Array.isArray(data)) {
      return data;
    }

    return data.map((row) => {
      const newRow = { ...row };

      Object.keys(newRow).forEach((key) => {
        if (typeof newRow[key] === "string" && this.shouldFormatColumn(key)) {
          newRow[key] = this.formatTextLength(newRow[key]);
        }
      });

      return newRow;
    });
  }

  /**
   * Format text to a fixed length
   * @param text Text to format
   */
  private formatTextLength(text: string): string {
    if (text.length > this.maxLength) {
      // Truncate
      const truncateAt = this.maxLength - this.truncationMarker.length;
      return text.substring(0, truncateAt) + this.truncationMarker;
    } else if (text.length < this.maxLength) {
      // Pad
      if (this.padDirection === "start") {
        return text.padStart(this.maxLength, this.padChar);
      } else {
        return text.padEnd(this.maxLength, this.padChar);
      }
    }

    return text;
  }
}
