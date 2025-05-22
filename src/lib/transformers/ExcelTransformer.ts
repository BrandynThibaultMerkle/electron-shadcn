import * as XLSX from "xlsx";

/**
 * Options for loading Excel files
 */
export interface ExcelLoadOptions {
  headerRow?: number; // Which row contains headers (0-based index)
  skipRows?: number; // Number of rows to skip from the top
  sheetName?: string; // Name of the sheet to load (defaults to first sheet)
  detectHeaders?: boolean; // Try to auto-detect header row
}

/**
 * Simple transformer for Excel files
 */
export class ExcelTransformer {
  private data: any[] = [];
  private originalWorkbook: XLSX.WorkBook | null = null;
  private sheetNames: string[] = [];

  /**
   * Load data from an Excel file
   * @param file The Excel file to load
   * @param options Options for loading the file
   * @returns A promise resolving to the parsed data
   */
  async loadFile(file: File, options: ExcelLoadOptions = {}): Promise<any[]> {
    try {
      console.log("Loading file:", file.name);

      // Read the file as an array buffer
      const buffer = await file.arrayBuffer();

      // Parse the Excel file
      this.originalWorkbook = XLSX.read(buffer, { type: "array" });

      if (!this.originalWorkbook.SheetNames.length) {
        throw new Error("No sheets found in the workbook");
      }

      // Store sheet names for later use
      this.sheetNames = this.originalWorkbook.SheetNames;

      // Get the requested sheet or the first sheet by default
      const sheetName =
        options.sheetName || this.originalWorkbook.SheetNames[0];
      const worksheet = this.originalWorkbook.Sheets[sheetName];

      if (!worksheet) {
        throw new Error(`Sheet "${sheetName}" not found in workbook`);
      }

      // Process the worksheet based on options
      if (options.skipRows || options.headerRow !== undefined) {
        return this.processSheetWithCustomHeaders(worksheet, options);
      } else {
        // Default processing - assume first row is headers
        this.data = XLSX.utils.sheet_to_json(worksheet, {
          defval: "", // Default empty cells to empty string
          blankrows: false, // Skip blank rows
        });

        console.log(`Loaded ${this.data.length} rows from ${file.name}`);
        return this.data;
      }
    } catch (error) {
      console.error("Error loading Excel file:", error);
      throw new Error(
        `Failed to load Excel file: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Process a worksheet with custom header options
   * @param worksheet The worksheet to process
   * @param options Options for processing the sheet
   * @returns The processed data as an array of objects
   */
  private processSheetWithCustomHeaders(
    worksheet: XLSX.Sheet,
    options: ExcelLoadOptions,
  ): any[] {
    // Convert the sheet to an array of arrays first
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1, // Return an array of arrays
      defval: "", // Default empty cells to empty string
      blankrows: false, // Skip blank rows
    }) as any[][];

    if (rawData.length === 0) {
      return [];
    }

    // Determine which row contains headers
    const headerRowIndex =
      options.headerRow !== undefined
        ? options.headerRow
        : options.skipRows || 0;

    // Ensure the header row exists
    if (headerRowIndex >= rawData.length) {
      throw new Error(`Header row index ${headerRowIndex} is out of bounds`);
    }

    // Extract headers
    const headers = rawData[headerRowIndex].map((header, index) =>
      header ? String(header).trim() : `Column${index + 1}`,
    );

    // Process data rows
    const dataStartRow = headerRowIndex + 1;
    const result = [];

    for (let i = dataStartRow; i < rawData.length; i++) {
      const row = rawData[i];
      const obj: Record<string, any> = {};

      // Map each column to its header
      for (let j = 0; j < headers.length; j++) {
        if (j < row.length) {
          obj[headers[j]] = row[j];
        } else {
          obj[headers[j]] = "";
        }
      }

      result.push(obj);
    }

    this.data = result;
    return result;
  }

  /**
   * Get all available sheet names from the workbook
   * @returns Array of sheet names
   */
  getSheetNames(): string[] {
    return this.sheetNames;
  }

  /**
   * Load a specific sheet from the workbook
   * @param file The Excel file to load
   * @param sheetName The name of the sheet to load
   * @param options Options for loading the sheet
   * @returns A promise resolving to the parsed data
   */
  async loadSheet(
    file: File,
    sheetName: string,
    options: ExcelLoadOptions = {},
  ): Promise<any[]> {
    return this.loadFile(file, { ...options, sheetName });
  }

  /**
   * Get the loaded data
   * @returns The currently loaded data
   */
  getData(): any[] {
    return this.data;
  }

  /**
   * Set the data directly
   * @param newData New data to use for export
   */
  setData(newData: any[]): void {
    this.data = newData;
  }

  /**
   * Export the data to an Excel file
   * @param filename The name of the file to export
   * @returns A Blob containing the Excel file
   */
  exportToExcel(filename: string = "export.xlsx"): Blob {
    try {
      // Create a new workbook
      const workbook = XLSX.utils.book_new();

      // Create a worksheet from the data
      const worksheet = XLSX.utils.json_to_sheet(this.data);

      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

      // Generate the Excel file
      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      // Return as blob
      return new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      throw new Error(
        `Failed to export to Excel: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Analyze the file and suggest where the header row might be
   * Uses multiple heuristics to find the most likely header row
   * @param file The Excel file to analyze
   * @returns Promise resolving to the suggested header row index
   */
  async detectHeaderRow(file: File): Promise<number> {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });

      if (!workbook.SheetNames.length) {
        throw new Error("No sheets found in the workbook");
      }

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert to array of arrays for analysis
      const rawData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "",
        blankrows: false,
      }) as any[][];

      if (rawData.length === 0) {
        return 0;
      }

      console.log("Detecting header row...");

      // IMPROVED HEURISTIC: Look for header rows characteristics
      // Header rows often have:
      // 1. More strings than numbers
      // 2. Most cells filled in (unlike title/metadata rows which may have sparse content)
      // 3. Distinct column name patterns (short text values)

      for (let i = 0; i < Math.min(15, rawData.length); i++) {
        const row = rawData[i];
        const nonEmptyCount = row.filter((cell) => cell !== "").length;
        const stringCells = row.filter(
          (cell) => typeof cell === "string" && cell !== "",
        ).length;
        const numberCells = row.filter(
          (cell) => typeof cell === "number",
        ).length;

        // Skip near-empty rows
        if (nonEmptyCount < 3) continue;

        const stringPercent = (stringCells / nonEmptyCount) * 100;
        const columnsWithValues = nonEmptyCount / Math.max(1, row.length);

        console.log(
          `Row ${i}: ${nonEmptyCount} non-empty, ${stringCells} strings, ${numberCells} numbers, ${stringPercent.toFixed(1)}% strings`,
        );

        // Check for column naming pattern - short string values across multiple columns
        const avgStringLength =
          row
            .filter((cell) => typeof cell === "string" && cell !== "")
            .map((s) => String(s).length)
            .reduce((sum, len) => sum + len, 0) / Math.max(1, stringCells);

        const isLikelyHeader =
          // Has multiple string cells
          stringCells >= 3 &&
          // Mostly strings rather than numbers
          stringPercent > 65 &&
          // Good column coverage
          columnsWithValues > 0.5 &&
          // Reasonable average length for column names
          avgStringLength > 0 &&
          avgStringLength < 30;

        // Look for a row that appears to be headers
        if (isLikelyHeader) {
          console.log(
            `Row ${i} looks like headers: avg string length ${avgStringLength.toFixed(1)}, ${stringPercent.toFixed(1)}% strings`,
          );

          // Check if the next row has potential data characteristics (more numbers, etc.)
          if (i < rawData.length - 1) {
            const nextRow = rawData[i + 1];
            const nextRowNonEmpty = nextRow.filter(
              (cell) => cell !== "",
            ).length;
            const nextRowStrings = nextRow.filter(
              (cell) => typeof cell === "string" && cell !== "",
            ).length;
            const nextRowNumbers = nextRow.filter(
              (cell) => typeof cell === "number",
            ).length;

            // If next row has same/more content and contains numbers, this confirms a header pattern
            if (nextRowNonEmpty >= nonEmptyCount && nextRowNumbers > 0) {
              return i;
            }
          }

          // If we can't confirm with next row, still return this as likely header
          return i;
        }
      }

      // HEURISTIC 1: Look for consistent column counts
      // Find where consistent columns begin
      const columnCountConsistencyIndex =
        this.detectConsistentColumnStructure(rawData);
      if (columnCountConsistencyIndex !== -1) {
        console.log(
          `Found consistent column structure starting at row ${columnCountConsistencyIndex}`,
        );

        // IMPORTANT CHANGE: Use the index directly instead of assuming header is the row before
        // Check if this row has header-like characteristics
        const potentialHeaderRow = rawData[columnCountConsistencyIndex];
        const strings = potentialHeaderRow.filter(
          (cell) => typeof cell === "string" && cell !== "",
        ).length;
        const nonEmpty = potentialHeaderRow.filter(
          (cell) => cell !== "",
        ).length;

        if (strings / nonEmpty > 0.6) {
          // This row itself looks like a header (mostly strings)
          return columnCountConsistencyIndex;
        } else if (columnCountConsistencyIndex > 0) {
          // Check the row before - it might be the header
          const rowBefore = rawData[columnCountConsistencyIndex - 1];
          const stringsBefore = rowBefore.filter(
            (cell) => typeof cell === "string" && cell !== "",
          ).length;
          const nonEmptyBefore = rowBefore.filter((cell) => cell !== "").length;

          if (
            stringsBefore / Math.max(1, nonEmptyBefore) > 0.6 &&
            nonEmptyBefore >= 3
          ) {
            return columnCountConsistencyIndex - 1;
          }
        }

        // If no clear header patterns, use the row where consistent data starts
        return columnCountConsistencyIndex;
      }

      // HEURISTIC 2: Look for rows with string headers vs. numeric data
      const headerByTypeIndex = this.detectHeaderByColumnTypes(rawData);
      if (headerByTypeIndex !== -1) {
        console.log(
          `Found likely header based on data types at row ${headerByTypeIndex}`,
        );
        return headerByTypeIndex;
      }

      // HEURISTIC 3: Find first row with meaningful column count
      for (let i = 0; i < Math.min(10, rawData.length); i++) {
        const nonEmptyCells = rawData[i].filter((cell) => cell !== "").length;
        // If row has at least 3 non-empty cells and is mostly strings
        if (nonEmptyCells >= 3) {
          const stringCells = rawData[i].filter(
            (cell) => typeof cell === "string" && cell !== "",
          ).length;
          if (stringCells / nonEmptyCells > 0.6) {
            console.log(
              `Found row ${i} with ${nonEmptyCells} non-empty cells, mostly strings`,
            );
            return i;
          }
        }
      }

      // Fallback to first non-empty row
      for (let i = 0; i < Math.min(10, rawData.length); i++) {
        const nonEmptyCells = rawData[i].filter((cell) => cell !== "").length;
        if (nonEmptyCells >= 3) {
          return i;
        }
      }

      console.log("Falling back to first row as header");
      return 0;
    } catch (error) {
      console.error("Error detecting header row:", error);
      return 0;
    }
  }

  /**
   * Find where the data has a consistent column structure
   * @param data Array of data rows
   * @returns Index where consistent columns begin, or -1 if not found
   */
  private detectConsistentColumnStructure(data: any[][]): number {
    if (data.length < 3) {
      return -1; // Not enough rows to detect patterns
    }

    // Count non-empty cells per row to find patterns
    const nonEmptyCellsPerRow = data.map(
      (row) => row.filter((cell) => cell !== "").length,
    );

    // Look for where consistent column counts begin
    // Consider it consistent if at least 3 rows have the same count
    for (let i = 0; i < nonEmptyCellsPerRow.length - 2; i++) {
      const currentCount = nonEmptyCellsPerRow[i];
      // Skip rows with few columns as they're likely not part of the main table
      if (currentCount < 3) continue;

      // Check if the next rows have the same number of columns
      if (
        nonEmptyCellsPerRow[i + 1] === currentCount &&
        nonEmptyCellsPerRow[i + 2] === currentCount
      ) {
        return i; // Found where consistent data seems to begin
      }
    }

    return -1;
  }

  /**
   * Try to detect headers by looking at data types
   * (Headers are typically text while data often contains numbers)
   * @param data Array of data rows
   * @returns Index of likely header row, or -1 if not found
   */
  private detectHeaderByColumnTypes(data: any[][]): number {
    if (data.length < 3) {
      return -1; // Not enough rows to analyze
    }

    // Go through the first several rows
    for (let i = 0; i < Math.min(10, data.length - 2); i++) {
      // Skip almost empty rows
      if (data[i].filter((cell) => cell !== "").length < 3) continue;

      // Check if current row is mostly strings and following rows have more numbers
      const currentRowTypes = this.analyzeRowTypes(data[i]);
      const nextRowTypes = this.analyzeRowTypes(data[i + 1]);
      const afterNextRowTypes = this.analyzeRowTypes(data[i + 2]);

      // Header row should be mostly strings
      if (
        currentRowTypes.stringPercent >= 70 &&
        // Data rows often have more numbers
        (nextRowTypes.numberPercent > currentRowTypes.numberPercent ||
          afterNextRowTypes.numberPercent > currentRowTypes.numberPercent)
      ) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Analyze the data types in a row
   * @param row The row to analyze
   * @returns Statistics about the row's data types
   */
  private analyzeRowTypes(row: any[]) {
    const nonEmpty = row.filter((cell) => cell !== "").length;
    if (nonEmpty === 0) return { stringPercent: 0, numberPercent: 0 };

    const strings = row.filter(
      (cell) => typeof cell === "string" && cell !== "",
    ).length;
    const numbers = row.filter((cell) => typeof cell === "number").length;

    return {
      stringPercent: (strings / nonEmpty) * 100,
      numberPercent: (numbers / nonEmpty) * 100,
    };
  }
}
