import { BaseTransformer, TransformationConfig } from "./BaseTransformer";
import * as pdfjs from "pdfjs-dist";

/**
 * Transformer for PDF files
 */
export class PdfTransformer extends BaseTransformer {
  private pdfDocument: any = null;
  private extractedText: string = "";
  private tableData: any[] = [];

  /**
   * Load data from a PDF file or buffer
   * @param source File object, path, or buffer
   */
  async loadData(source: File | ArrayBuffer): Promise<void> {
    try {
      let data: ArrayBuffer;

      if (source instanceof File) {
        data = await source.arrayBuffer();
      } else {
        data = source;
      }

      // Load the PDF document
      const loadingTask = pdfjs.getDocument({ data });
      this.pdfDocument = await loadingTask.promise;

      // Extract text and table data
      await this.extractContent();
    } catch (error) {
      console.error("Error loading PDF file:", error);
      throw error;
    }
  }

  /**
   * Extract content from the PDF document
   */
  private async extractContent(): Promise<void> {
    if (!this.pdfDocument) {
      throw new Error("No PDF document loaded");
    }

    const numPages = this.pdfDocument.numPages;
    let textContent = "";
    let extractedTables: any[] = [];

    // Process each page
    for (let i = 1; i <= numPages; i++) {
      const page = await this.pdfDocument.getPage(i);

      // Extract text
      const content = await page.getTextContent();
      const pageText = content.items.map((item: any) => item.str).join(" ");

      textContent += pageText + "\n\n";

      // Try to extract tables from the page (simplified implementation)
      const tableCandidates = this.extractTablesFromText(pageText);
      if (tableCandidates.length > 0) {
        extractedTables = [...extractedTables, ...tableCandidates];
      }
    }

    this.extractedText = textContent;

    // If we found structured tables, use them as sourceData
    if (extractedTables.length > 0) {
      this.sourceData = extractedTables;
    } else {
      // Otherwise, provide the text content as sourceData
      this.sourceData = { text: textContent };
    }

    this.tableData = extractedTables;
  }

  /**
   * Extract tables from text (simplified implementation)
   * This is a simplified approach that looks for consistent patterns
   * In a real implementation, this would be more sophisticated
   */
  private extractTablesFromText(text: string): any[] {
    const lines = text.split("\n").filter((line) => line.trim() !== "");
    const tables: any[] = [];

    // Simple heuristic: Look for lines with multiple delimiters that might be tables
    let currentTable: string[] = [];
    let isInTable = false;
    let columnCount = 0;

    for (const line of lines) {
      // Check if this line might be part of a table
      // Look for multiple spaces, tabs, or common delimiters
      const delimiterCount = (line.match(/\s{2,}|\t|,|\|/g) || []).length;

      if (delimiterCount >= 2) {
        if (!isInTable) {
          // Starting a new table
          isInTable = true;
          currentTable = [line];
          columnCount = delimiterCount + 1;
        } else {
          // Continue current table
          currentTable.push(line);
        }
      } else if (isInTable && currentTable.length > 0) {
        // End of table, process it
        tables.push(this.parseTableData(currentTable, columnCount));
        currentTable = [];
        isInTable = false;
      }
    }

    // Don't forget to process the last table if we're still in one
    if (isInTable && currentTable.length > 0) {
      tables.push(this.parseTableData(currentTable, columnCount));
    }

    return tables.flat();
  }

  /**
   * Parse table data from lines of text
   */
  private parseTableData(tableLines: string[], columnCount: number): any[] {
    if (tableLines.length < 2) {
      return [];
    }

    // Try to determine column headers from the first line
    const headerLine = tableLines[0];
    const headers = this.splitLineIntoColumns(headerLine, columnCount);

    // Process data rows
    const rows = [];
    for (let i = 1; i < tableLines.length; i++) {
      const values = this.splitLineIntoColumns(tableLines[i], columnCount);

      // Create object with header keys and row values
      const row: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        let header = headers[j] || `Column${j + 1}`;
        // Clean up header name
        header = header.trim().replace(/\s+/g, "_");
        row[header] = values[j] || "";
      }

      rows.push(row);
    }

    return rows;
  }

  /**
   * Split a line into columns
   */
  private splitLineIntoColumns(
    line: string,
    expectedColumns: number,
  ): string[] {
    // Try different delimiters to see which gives us closest to the expected column count
    const delimiters = [/\s{2,}/, "\t", ",", "|"];
    let bestResult: string[] = [];
    let bestDiff = Infinity;

    for (const delimiter of delimiters) {
      const split = line.split(delimiter);
      const diff = Math.abs(split.length - expectedColumns);

      if (diff < bestDiff) {
        bestResult = split;
        bestDiff = diff;
      }
    }

    return bestResult.map((col) => col.trim());
  }

  /**
   * Get the extracted text content
   */
  getExtractedText(): string {
    return this.extractedText;
  }

  /**
   * Get all tables extracted from the PDF
   */
  getExtractedTables(): any[] {
    return this.tableData;
  }

  /**
   * Extract data using a pattern
   * @param pattern Regular expression pattern with named capture groups
   * @param options Options for extraction
   */
  extractDataWithPattern(
    pattern: RegExp,
    options: { global?: boolean; multiline?: boolean } = {},
  ): Record<string, string>[] {
    if (!this.extractedText) {
      throw new Error("No text content extracted");
    }

    const results: Record<string, string>[] = [];
    let text = this.extractedText;

    // Add multiline flag if needed
    if (options.multiline) {
      pattern = new RegExp(pattern.source, pattern.flags + "m");
    }

    if (options.global) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        // Extract named capture groups
        if (match.groups) {
          results.push({ ...match.groups });
        }

        // Avoid infinite loops
        if (!pattern.global) {
          break;
        }
      }
    } else {
      const match = pattern.exec(text);
      if (match && match.groups) {
        results.push({ ...match.groups });
      }
    }

    return results;
  }

  /**
   * Transform the data according to the provided configuration
   * @param config Configuration for the transformation
   */
  async transform(config: TransformationConfig): Promise<void> {
    // If we have table data, transform it like a regular table
    if (this.tableData.length > 0) {
      let transformedData = [...this.tableData];

      // Apply filters if provided
      if (config.filters && config.filters.length > 0) {
        transformedData = transformedData.filter((row) => {
          return config.filters!.every((filter) => {
            const value = row[filter.column];

            switch (filter.operator) {
              case "equals":
                return value === filter.value;
              case "contains":
                return String(value).includes(String(filter.value));
              case "startsWith":
                return String(value).startsWith(String(filter.value));
              case "endsWith":
                return String(value).endsWith(String(filter.value));
              default:
                return true;
            }
          });
        });
      }

      // Transform columns if provided
      if (config.columns && config.columns.length > 0) {
        transformedData = transformedData.map((row: Record<string, any>) => {
          const newRow: Record<string, any> = {};

          config.columns!.forEach((column) => {
            if (column.sourceId in row) {
              let value = row[column.sourceId];

              // Apply custom transformation if provided
              if (column.transform) {
                value = column.transform(value);
              }

              newRow[column.targetId] = value;
            }
          });

          return newRow;
        });
      }

      this.transformedData = transformedData;
    } else if (config.patterns) {
      // For text-based extraction, use patterns from config
      const patterns = config.patterns as Array<{
        pattern: string;
        flags: string;
        field: string;
      }>;

      const extractedData: Record<string, string> = {};

      for (const patternConfig of patterns) {
        const regex = new RegExp(patternConfig.pattern, patternConfig.flags);
        const match = regex.exec(this.extractedText);

        if (match && match[1]) {
          extractedData[patternConfig.field] = match[1].trim();
        }
      }

      this.transformedData = [extractedData];
    }

    // Apply sanitizers
    if (this.transformedData) {
      this.transformedData = await this.applySanitizers(this.transformedData);

      // Apply formatters
      this.transformedData = await this.applyFormatters(this.transformedData);
    }
  }

  /**
   * Export the transformed data to the specified format
   * @param format Output format ('json', 'csv', etc.)
   * @param options Export options
   */
  async export(format: string, options: any = {}): Promise<any> {
    if (!this.transformedData) {
      throw new Error("No transformed data to export");
    }

    switch (format.toLowerCase()) {
      case "json":
        return JSON.stringify(this.transformedData);

      case "csv": {
        // Convert to CSV
        const headers = Object.keys(this.transformedData[0] || {});
        const csvRows = [
          headers.join(","),
          ...this.transformedData.map((row: Record<string, any>) =>
            headers
              .map(
                (header) =>
                  `"${String(row[header] || "").replace(/"/g, '""')}"`,
              )
              .join(","),
          ),
        ];
        return csvRows.join("\n");
      }

      case "array":
        return this.transformedData;

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }
}
