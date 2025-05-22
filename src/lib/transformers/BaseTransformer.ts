/**
 * Base transformer class that defines the interface for all data transformers
 */
export abstract class BaseTransformer {
  protected sourceData: any;
  protected transformedData: any;
  protected sanitizers: DataSanitizer[] = [];
  protected formatters: DataFormatter[] = [];

  constructor() {
    this.sourceData = null;
    this.transformedData = null;
  }

  /**
   * Load data from a source
   * @param source The source data or file
   */
  abstract loadData(source: any): Promise<void>;

  /**
   * Transform the data according to transformation rules
   * @param config Configuration for the transformation
   */
  abstract transform(config: TransformationConfig): Promise<void>;

  /**
   * Export the transformed data to a target format
   * @param format The output format
   * @param options Export options
   */
  abstract export(format: string, options?: any): Promise<any>;

  /**
   * Add a sanitizer to the transformation pipeline
   * @param sanitizer The sanitizer to add
   */
  addSanitizer(sanitizer: DataSanitizer): this {
    this.sanitizers.push(sanitizer);
    return this;
  }

  /**
   * Add a formatter to the transformation pipeline
   * @param formatter The formatter to add
   */
  addFormatter(formatter: DataFormatter): this {
    this.formatters.push(formatter);
    return this;
  }

  /**
   * Get the raw transformed data
   */
  getData(): any {
    return this.transformedData;
  }

  /**
   * Apply all sanitizers to the data
   * @param data The data to sanitize
   */
  protected async applySanitizers(data: any): Promise<any> {
    let result = data;
    for (const sanitizer of this.sanitizers) {
      result = await sanitizer.sanitize(result);
    }
    return result;
  }

  /**
   * Apply all formatters to the data
   * @param data The data to format
   */
  protected async applyFormatters(data: any): Promise<any> {
    let result = data;
    for (const formatter of this.formatters) {
      result = await formatter.format(result);
    }
    return result;
  }
}

/**
 * Interface for data sanitizers
 */
export interface DataSanitizer {
  sanitize(data: any): Promise<any>;
}

/**
 * Interface for data formatters
 */
export interface DataFormatter {
  format(data: any): Promise<any>;
}

/**
 * Configuration for transformations
 */
export interface TransformationConfig {
  columns?: ColumnConfig[];
  filters?: FilterConfig[];
  [key: string]: any;
}

/**
 * Configuration for a column
 */
export interface ColumnConfig {
  sourceId: string;
  targetId: string;
  targetName: string;
  transform?: (value: any) => any;
}

/**
 * Configuration for a filter
 */
export interface FilterConfig {
  column: string;
  operator:
    | "equals"
    | "contains"
    | "startsWith"
    | "endsWith"
    | "greaterThan"
    | "lessThan";
  value: any;
}
