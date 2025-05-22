import ExcelJS from "exceljs";
import {
  FileProcessingOptions,
  TransformationRule,
} from "../types/transformation";
import { DataSanitizer } from "./dataSanitizer";

export class ExcelProcessor {
  private sanitizer: DataSanitizer;
  private options: FileProcessingOptions;

  constructor(sanitizer: DataSanitizer, options: FileProcessingOptions = {}) {
    this.sanitizer = sanitizer;
    this.options = options;
  }

  async processFile(
    filePath: string,
    rules: TransformationRule[],
    onRowProcessed?: (row: any) => void,
  ): Promise<any[]> {
    const workbook = new ExcelJS.Workbook();
    const results: any[] = [];

    try {
      await workbook.xlsx.readFile(filePath);

      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        throw new Error("No worksheet found in the Excel file");
      }

      const totalRows = worksheet.rowCount;
      let processedRows = 0;

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row

        const rowData: Record<string, any> = {};
        row.eachCell((cell, colNumber) => {
          const headerCell = worksheet.getRow(1).getCell(colNumber);
          const header = headerCell.value?.toString() || "";
          rowData[header] = cell.value;
        });

        // Apply transformations
        const transformedRow: Record<string, any> = {};
        rules.forEach((rule) => {
          const value = rowData[rule.sourceColumn];
          let transformedValue = value;

          if (rule.transformation) {
            transformedValue = rule.transformation(value);
          }

          if (rule.validation && !rule.validation(transformedValue)) {
            console.warn(
              `Validation failed for column ${rule.sourceColumn} in row ${rowNumber}`,
            );
          }

          transformedRow[rule.targetColumn] = transformedValue;
        });

        // Sanitize the transformed row
        const sanitizedRow = this.sanitizer.sanitizeRow(transformedRow);
        results.push(sanitizedRow);

        processedRows++;
        if (this.options.onProgress) {
          this.options.onProgress((processedRows / totalRows) * 100);
        }

        if (onRowProcessed) {
          onRowProcessed(sanitizedRow);
        }
      });

      return results;
    } catch (error) {
      if (this.options.onError) {
        this.options.onError(error as Error);
      }
      throw error;
    }
  }

  async writeToFile(
    data: any[],
    outputPath: string,
    headers: string[],
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Transformed Data");

    // Add headers
    worksheet.addRow(headers);

    // Add data rows
    data.forEach((row) => {
      const rowData = headers.map((header) => row[header] || "");
      worksheet.addRow(rowData);
    });

    await workbook.xlsx.writeFile(outputPath);
  }
}
