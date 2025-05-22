import React, { useState, useEffect, useMemo } from "react";
import { FileUpload } from "@/components/FileUpload";
import {
  DataPreview,
  ColumnSanitizationSettings,
  ColumnType,
} from "@/components/DataPreview";
import { DataFilters } from "@/components/DataFilters";
import {
  DataSanitization,
  SanitizationOptions,
} from "@/components/DataSanitization";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { Download, RefreshCw, Bug, FilterX, FileType } from "lucide-react";
import {
  ExcelTransformer,
  ExcelLoadOptions,
} from "@/lib/transformers/ExcelTransformer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RowInfo = {
  index: number;
  cells: number;
  nonEmpty: number;
  strings: number;
  numbers: number;
  stringPercent: number;
};

// Column filter type from DataFilters component
interface ColumnFilter {
  column: string;
  type: string;
  operation: string;
  value: any;
}

/**
 * Format a string as a phone number (123-456-7890)
 */
const formatPhoneNumber = (value: string): string => {
  // Remove all non-digit characters
  const digitsOnly = value.replace(/\D/g, "");

  // Format based on length
  if (digitsOnly.length === 10) {
    // Standard 10-digit US phone number
    return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
    // US phone with country code
    return `${digitsOnly.slice(1, 4)}-${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7)}`;
  } else {
    // Other formats - try to format sensibly
    if (digitsOnly.length >= 7) {
      // At least has area code and local number
      const localNumber = digitsOnly.slice(-7);
      const areaCode = digitsOnly.slice(-10, -7);
      const countryCode = digitsOnly.slice(0, -10);

      if (areaCode) {
        return countryCode
          ? `${countryCode}-${areaCode}-${localNumber.slice(0, 3)}-${localNumber.slice(3)}`
          : `${areaCode}-${localNumber.slice(0, 3)}-${localNumber.slice(3)}`;
      } else {
        // Just format with hyphens at standard positions
        return `${localNumber.slice(0, 3)}-${localNumber.slice(3)}`;
      }
    }
    // For very short numbers, return as is
    return digitsOnly;
  }
};

/**
 * Format a string as a ZIP code
 * @param value The value to format
 * @param truncate Whether to truncate to 5 digits
 */
const formatZipCode = (value: string, truncate: boolean = false): string => {
  // Remove all non-digit characters
  const digitsOnly = value.replace(/\D/g, "");

  // Check if we should truncate to 5 digits
  if (truncate || digitsOnly.length <= 5) {
    // Return just the first 5 digits (padded if shorter)
    return digitsOnly.slice(0, 5).padEnd(5, "0");
  } else if (digitsOnly.length <= 9) {
    // ZIP+4 format
    return `${digitsOnly.slice(0, 5)}-${digitsOnly.slice(5)}`;
  } else {
    // Truncate to ZIP+4 if longer
    return `${digitsOnly.slice(0, 5)}-${digitsOnly.slice(5, 9)}`;
  }
};

/**
 * Format an email address (basic validation and lowercase)
 */
const formatEmailAddress = (value: string): string => {
  // Trim and lowercase
  return value.trim().toLowerCase();
};

/**
 * Format currency value
 */
const formatCurrency = (value: string): string => {
  // Keep dollar sign, commas, and decimal point
  if (!/^[$¥€£]/.test(value)) {
    // If no currency symbol, add dollar sign
    return `$${value}`;
  }
  return value;
};

/**
 * Format Social Security Number
 */
const formatSSN = (value: string): string => {
  // Remove all non-digit characters
  const digitsOnly = value.replace(/\D/g, "");

  // Format as XXX-XX-XXXX
  if (digitsOnly.length <= 3) {
    return digitsOnly;
  } else if (digitsOnly.length <= 5) {
    return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3)}`;
  } else {
    return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 5)}-${digitsOnly.slice(5, 9)}`;
  }
};

/**
 * Try to detect the data type of a column based on its values
 */
const detectColumnType = (columnValues: string[]): ColumnType => {
  // Ensure we have data to analyze
  if (!columnValues || columnValues.length === 0) {
    return "auto";
  }

  // Get non-empty values for analysis (max 100 for performance)
  const sampleValues = columnValues
    .filter((v) => v && typeof v === "string" && v.trim() !== "")
    .slice(0, 100);

  if (sampleValues.length === 0) {
    return "auto";
  }

  // Count matches for each type
  let zipMatches = 0;
  let phoneMatches = 0;
  let emailMatches = 0;
  let currencyMatches = 0;
  let ssnMatches = 0;
  let dateMatches = 0;
  let numberMatches = 0;

  // Patterns for each type
  const zipPattern = /^\d{5}(-\d{4})?$/;
  const phonePattern =
    /^(\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const currencyPattern = /^\s*[£$€¥]?\s*[\d,.]+\s*$/;
  const ssnPattern = /^\d{3}-\d{2}-\d{4}$/;
  const datePattern =
    /^(\d{1,4}[-/\.]\d{1,2}[-/\.]\d{1,4})|(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})$/;
  const numberPattern = /^-?\d+(\.\d+)?$/;

  // Check each value against patterns
  sampleValues.forEach((value) => {
    if (zipPattern.test(value)) zipMatches++;
    if (phonePattern.test(value)) phoneMatches++;
    if (emailPattern.test(value)) emailMatches++;
    if (currencyPattern.test(value)) currencyMatches++;
    if (ssnPattern.test(value)) ssnMatches++;
    if (datePattern.test(value)) dateMatches++;
    if (numberPattern.test(value)) numberMatches++;
  });

  // Calculate percentage matches
  const total = sampleValues.length;
  const zipPercent = (zipMatches / total) * 100;
  const phonePercent = (phoneMatches / total) * 100;
  const emailPercent = (emailMatches / total) * 100;
  const currencyPercent = (currencyMatches / total) * 100;
  const ssnPercent = (ssnMatches / total) * 100;
  const datePercent = (dateMatches / total) * 100;
  const numberPercent = (numberMatches / total) * 100;

  // Determine the most likely type (must have at least 60% match)
  const threshold = 60;

  if (emailPercent >= threshold) return "email";
  if (zipPercent >= threshold) return "zipcode";
  if (phonePercent >= threshold) return "phone";
  if (ssnPercent >= threshold) return "ssn";
  if (currencyPercent >= threshold) return "currency";
  if (datePercent >= threshold) return "date";
  if (numberPercent >= threshold) return "number";

  // Default to text if no strong pattern match
  return "text";
};

/**
 * Get default characters to preserve based on data type
 */
const getDefaultPreserveCharacters = (
  type: ColumnType,
  currentPreserved?: string,
): string => {
  switch (type) {
    case "zipcode":
      return "-";
    case "phone":
      return "()-. ";
    case "email":
      return "@._-";
    case "currency":
      return "$,.€£¥";
    case "ssn":
      return "-";
    default:
      return currentPreserved || "";
  }
};

export function TransformationPage() {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [sanitizedData, setSanitizedData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [filters, setFilters] = useState<ColumnFilter[]>([]);
  const [sanitizationOptions, setSanitizationOptions] =
    useState<SanitizationOptions>({
      removeSpecialChars: false,
      replaceWithSpace: true,
      sanitizeZipCodes: false,
    });
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const [transformer, setTransformer] = useState<ExcelTransformer | null>(null);
  const [skipRows, setSkipRows] = useState(0);
  const [headerRow, setHeaderRow] = useState(0);
  const [loadOptions, setLoadOptions] = useState<ExcelLoadOptions>({});
  const [autoDetectHeaders, setAutoDetectHeaders] = useState(true);
  const [rowAnalysis, setRowAnalysis] = useState<RowInfo[]>([]);
  const [showDebugDialog, setShowDebugDialog] = useState(false);
  const [excelPreview, setExcelPreview] = useState<any[][]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [columnSanitizationSettings, setColumnSanitizationSettings] = useState<
    Record<string, ColumnSanitizationSettings>
  >({});
  const [columnDisplayNames, setColumnDisplayNames] = useState<
    Record<string, string>
  >({});
  const [downloadFormat, setDownloadFormat] = useState<"excel" | "csv">(
    "excel",
  );
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  // Available columns for filtering
  const columns = useMemo(() => {
    if (sanitizedData.length === 0) return [];
    return Object.keys(sanitizedData[0] || {});
  }, [sanitizedData]);

  // Apply sanitization to data when sanitization options change
  useEffect(() => {
    if (!data.length) {
      setSanitizedData([]);
      return;
    }

    const sanitizeData = async () => {
      // Create a deep copy of the data
      const result = JSON.parse(JSON.stringify(data));

      // Process each row and column
      result.forEach((row: any) => {
        Object.keys(row).forEach((key) => {
          // Skip columns where sanitization is disabled or columns that aren't selected
          if (
            columnSanitizationSettings[key]?.enableSanitization === false ||
            !selectedColumns.includes(key)
          ) {
            return;
          }

          // Get column type
          const columnType =
            columnSanitizationSettings[key]?.columnType || "auto";

          // Apply specialized formatting based on column type
          if (typeof row[key] === "string") {
            // Skip empty values
            if (!row[key].trim()) return;

            switch (columnType) {
              case "zipcode":
                // Format ZIP code - truncate if sanitizeZipCodes is enabled
                row[key] = formatZipCode(
                  row[key],
                  sanitizationOptions.sanitizeZipCodes,
                );
                break;

              case "phone":
                // Format phone number
                row[key] = formatPhoneNumber(row[key]);
                break;

              case "email":
                // Format email address
                row[key] = formatEmailAddress(row[key]);
                break;

              case "currency":
                // Format currency
                row[key] = formatCurrency(row[key]);
                break;

              case "ssn":
                // Format SSN
                row[key] = formatSSN(row[key]);
                break;

              default:
                // Check if it's an email address (auto detection)
                const isEmail =
                  columnType === "auto" &&
                  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(
                    row[key],
                  );

                // Check if it's a currency value (auto detection)
                const isCurrency =
                  columnType === "auto" &&
                  /^\s*[£$€¥]\s*[\d,.]+\s*$/.test(row[key]);

                // Check if it looks like a phone number (auto detection)
                const isPhone =
                  columnType === "auto" &&
                  /^(\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(
                    row[key],
                  );

                // Check if it looks like a ZIP code (auto detection)
                const isZip =
                  columnType === "auto" && /^\d{5}(-\d{4})?$/.test(row[key]);

                // Apply general sanitization if not a special format
                if (isEmail) {
                  row[key] = formatEmailAddress(row[key]);
                } else if (isCurrency) {
                  row[key] = formatCurrency(row[key]);
                } else if (isPhone) {
                  row[key] = formatPhoneNumber(row[key]);
                } else if (isZip) {
                  row[key] = formatZipCode(
                    row[key],
                    sanitizationOptions.sanitizeZipCodes,
                  );
                } else if (sanitizationOptions.removeSpecialChars) {
                  // Get preserved characters for this column
                  const preservedChars =
                    columnSanitizationSettings[key]?.preserveCharacters || "";

                  // Create a regex pattern that excludes alphanumerics, whitespace, and preserved chars
                  let pattern = "[^\\w\\s";
                  if (preservedChars) {
                    // Escape special characters for regex
                    const escapedChars = preservedChars.replace(
                      /[-[\]{}()*+?.,\\^$|#]/g,
                      "\\$&",
                    );
                    pattern += escapedChars;
                  }
                  pattern += "]";

                  const regex = new RegExp(pattern, "g");

                  if (sanitizationOptions.replaceWithSpace) {
                    // Replace special chars with spaces
                    row[key] = row[key]
                      .replace(regex, " ")
                      .replace(/\s+/g, " ")
                      .trim();
                  } else {
                    // Remove special chars
                    row[key] = row[key].replace(regex, "");
                  }
                }
            }
          }
        });
      });

      // Apply ZIP code sanitization for columns without special type
      if (sanitizationOptions.sanitizeZipCodes) {
        result.forEach((row: any) => {
          Object.keys(row).forEach((key) => {
            // Skip if column has specialized type or sanitization disabled
            if (
              columnSanitizationSettings[key]?.columnType !== undefined ||
              columnSanitizationSettings[key]?.enableSanitization === false ||
              !selectedColumns.includes(key)
            ) {
              return;
            }

            if (typeof row[key] === "string") {
              // Check if it looks like a ZIP code with extension (12345-1234)
              const zipMatch = row[key].match(/^(\d{5})-\d{4}$/);
              if (zipMatch) {
                row[key] = zipMatch[1]; // Keep only the first 5 digits
              }
            }
          });
        });
      }

      setSanitizedData(result);
    };

    sanitizeData();
  }, [data, sanitizationOptions, columnSanitizationSettings, selectedColumns]);

  // Update filtered data whenever sanitized data or filters change
  useEffect(() => {
    applyFilters();
  }, [sanitizedData, filters]);

  // Apply filters to sanitized data
  const applyFilters = () => {
    if (!sanitizedData.length) {
      setFilteredData([]);
      return;
    }

    if (!filters.length) {
      setFilteredData(sanitizedData);
      return;
    }

    const result = sanitizedData.filter((row) => {
      return filters.every((filter) => {
        const { column, operation, value } = filter;
        const cellValue = row[column];

        if (cellValue === undefined || cellValue === null) {
          return false;
        }

        switch (operation) {
          case "equals":
            return cellValue == value;
          case "notEquals":
            return cellValue != value;
          case "contains":
            return String(cellValue)
              .toLowerCase()
              .includes(String(value).toLowerCase());
          case "notContains":
            return !String(cellValue)
              .toLowerCase()
              .includes(String(value).toLowerCase());
          case "startsWith":
            return String(cellValue)
              .toLowerCase()
              .startsWith(String(value).toLowerCase());
          case "endsWith":
            return String(cellValue)
              .toLowerCase()
              .endsWith(String(value).toLowerCase());
          case "greaterThan":
            return Number(cellValue) > Number(value);
          case "lessThan":
            return Number(cellValue) < Number(value);
          case "between":
            return (
              Array.isArray(value) &&
              Number(cellValue) >= value[0] &&
              Number(cellValue) <= value[1]
            );
          case "in":
            return (
              Array.isArray(value) &&
              value.some(
                (v) =>
                  String(v).toLowerCase() === String(cellValue).toLowerCase(),
              )
            );
          case "notIn":
            return (
              Array.isArray(value) &&
              !value.some(
                (v) =>
                  String(v).toLowerCase() === String(cellValue).toLowerCase(),
              )
            );
          case "isTrue":
            return Boolean(cellValue) === true;
          case "isFalse":
            return Boolean(cellValue) === false;
          case "dateRange":
            if (!value.from || !value.to) return true;
            const dateValue = new Date(cellValue);
            const fromDate = new Date(value.from);
            const toDate = new Date(value.to);
            return dateValue >= fromDate && dateValue <= toDate;
          case "before":
            if (!value) return true;
            return new Date(cellValue) < new Date(value);
          case "after":
            if (!value) return true;
            return new Date(cellValue) > new Date(value);
          default:
            return true;
        }
      });
    });

    setFilteredData(result);
  };

  // Handle filter changes from DataFilters component
  const handleFilterChange = (newFilters: ColumnFilter[]) => {
    setFilters(newFilters);
  };

  // Handle sanitization option changes
  const handleSanitizationChange = (options: SanitizationOptions) => {
    setSanitizationOptions(options);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters([]);
  };

  // Handle file upload
  const handleFileUpload = async (uploadedFile: File) => {
    setFile(uploadedFile);

    try {
      setIsProcessing(true);
      setProgress(20);
      setFilters([]); // Clear filters when loading new file

      // Create Excel transformer to handle the file
      const excelTransformer = new ExcelTransformer();
      setTransformer(excelTransformer);

      // First, load a preview of the raw Excel data to analyze structure
      const rawPreview = await loadRawExcelPreview(uploadedFile);
      setExcelPreview(rawPreview);

      // Analyze the first 15 rows
      const analysis = analyzeRowStructure(rawPreview);
      setRowAnalysis(analysis);

      let detectedHeaderRow = 0;

      if (autoDetectHeaders) {
        // Try to auto-detect header row
        detectedHeaderRow =
          await excelTransformer.detectHeaderRow(uploadedFile);
        setHeaderRow(detectedHeaderRow);
        setLoadOptions({ headerRow: detectedHeaderRow });

        toast({
          title: "Header Detection",
          description: `Auto-detected header row at row ${detectedHeaderRow + 1}`,
        });
      }

      // Load the data from the file with options
      const options = autoDetectHeaders
        ? { headerRow: detectedHeaderRow }
        : { headerRow };

      const loadedData = await excelTransformer.loadFile(uploadedFile, options);

      setProgress(80);
      setData(loadedData);
      setSanitizedData(loadedData); // Initialize sanitized data with all data

      // Initialize selected columns with all available columns
      if (loadedData.length > 0) {
        const newColumns = Object.keys(loadedData[0]);
        setSelectedColumns(newColumns);

        // Preserve existing filters for columns that still exist
        if (filters.length > 0) {
          const updatedFilters = filters.filter((filter) =>
            newColumns.includes(filter.column),
          );
          setFilters(updatedFilters);
        }
      }

      // Auto-detect column types for better user experience
      const detectedColumnTypes: Record<string, ColumnType> = {};
      Object.keys(loadedData[0]).forEach((column) => {
        // Get column values for type detection
        const columnValues = loadedData
          .map((row) => row[column])
          .filter(Boolean);
        const detectedType = detectColumnType(columnValues);

        // Only set type if it's not "auto" or "text"
        if (detectedType !== "auto" && detectedType !== "text") {
          detectedColumnTypes[column] = detectedType;
        }
      });

      // If we detected any specific types, update column settings
      if (Object.keys(detectedColumnTypes).length > 0) {
        const newColumnSettings = { ...columnSanitizationSettings };

        Object.entries(detectedColumnTypes).forEach(([column, type]) => {
          newColumnSettings[column] = {
            ...newColumnSettings[column],
            columnType: type,
            enableSanitization: true,
            preserveCharacters: getDefaultPreserveCharacters(
              type,
              newColumnSettings[column]?.preserveCharacters,
            ),
          };
        });

        setColumnSanitizationSettings(newColumnSettings);

        // Show notification about detected types
        toast({
          title: "Column types detected",
          description: `Detected specialized formats for ${Object.keys(detectedColumnTypes).length} columns`,
        });
      }

      toast({
        title: "File loaded successfully",
        description: `Loaded ${loadedData.length} rows from ${uploadedFile.name}`,
      });

      setProgress(100);
    } catch (error) {
      console.error("Error processing file:", error);
      toast({
        title: "Error",
        description:
          "Failed to process the file: " +
          (error instanceof Error ? error.message : String(error)),
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Load raw Excel data as arrays for structure analysis
  const loadRawExcelPreview = async (file: File): Promise<any[][]> => {
    try {
      const buffer = await file.arrayBuffer();
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buffer, { type: "array" });

      if (!workbook.SheetNames.length) {
        return [];
      }

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert to array of arrays for analysis
      const rawData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "",
        blankrows: false,
      }) as any[][];

      return rawData.slice(0, 15); // Return first 15 rows
    } catch (error) {
      console.error("Error loading Excel preview:", error);
      return [];
    }
  };

  // Analyze row structure for debugging
  const analyzeRowStructure = (rows: any[][]): RowInfo[] => {
    return rows.map((row, index) => {
      const nonEmpty = row.filter((cell) => cell !== "").length;
      const strings = row.filter(
        (cell) => typeof cell === "string" && cell !== "",
      ).length;
      const numbers = row.filter((cell) => typeof cell === "number").length;

      return {
        index,
        cells: row.length,
        nonEmpty,
        strings,
        numbers,
        stringPercent: nonEmpty > 0 ? (strings / nonEmpty) * 100 : 0,
      };
    });
  };

  // Reload the file with new options
  const handleReloadWithOptions = async () => {
    if (!file || !transformer) {
      toast({
        title: "Error",
        description: "No file loaded",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessing(true);
      setProgress(20);
      setFilters([]); // Clear filters when reloading data

      // Use just headerRow and not skipRows since skipRows is redundant
      const options: ExcelLoadOptions = { headerRow };
      setLoadOptions(options);

      // Reload the data with new options
      const loadedData = await transformer.loadFile(file, options);

      setProgress(80);
      setData(loadedData);
      setSanitizedData(loadedData); // Reset sanitized data

      // Reset selected columns to all available columns
      if (loadedData.length > 0) {
        const newColumns = Object.keys(loadedData[0]);
        setSelectedColumns(newColumns);

        // Preserve existing filters for columns that still exist
        if (filters.length > 0) {
          const updatedFilters = filters.filter((filter) =>
            newColumns.includes(filter.column),
          );
          setFilters(updatedFilters);
        }
      }

      toast({
        title: "Data reloaded",
        description: `Applied header row ${headerRow + 1} and loaded ${loadedData.length} rows`,
      });

      setProgress(100);
    } catch (error) {
      console.error("Error reloading data:", error);
      toast({
        title: "Error",
        description: `Failed to reload data: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle column selection change
  const handleColumnSelectionChange = (columns: string[]) => {
    // Store previous selection for comparison
    const previousSelection = selectedColumns;

    // Update selected columns
    setSelectedColumns(columns);

    // If columns were removed, check if any filters need to be removed
    if (previousSelection.length > columns.length) {
      const removedColumns = previousSelection.filter(
        (col) => !columns.includes(col),
      );

      // If we have filters for removed columns, filter them out
      if (
        removedColumns.length > 0 &&
        filters.some((f) => removedColumns.includes(f.column))
      ) {
        const updatedFilters = filters.filter(
          (f) => !removedColumns.includes(f.column),
        );
        setFilters(updatedFilters);
      }

      // Also clean up any column sanitization settings for removed columns
      if (
        removedColumns.length > 0 &&
        Object.keys(columnSanitizationSettings).some((col) =>
          removedColumns.includes(col),
        )
      ) {
        const updatedSettings = { ...columnSanitizationSettings };
        removedColumns.forEach((col) => {
          delete updatedSettings[col];
        });
        setColumnSanitizationSettings(updatedSettings);
      }
    }
  };

  // Handle file download
  const handleDownload = async () => {
    if (!file || !transformer) {
      toast({
        title: "Error",
        description: "Please upload an Excel file first",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsDownloading(true);
      setDownloadProgress(10);

      // Get the filename without extension
      const outputFilename = file.name.replace(/\.[^/.]+$/, "") + "_processed";

      // Create a new array with renamed columns and only selected columns
      const dataToExport = filteredData.map((row) => {
        const newRow: Record<string, any> = {};
        selectedColumns.forEach((col) => {
          // Use the display name (renamed column) as the column header in export
          const displayName = columnDisplayNames[col] || col;
          newRow[displayName] = row[col];
        });
        return newRow;
      });

      setDownloadProgress(40);

      // Update the transformer with the processed data
      transformer.setData(dataToExport);

      let blob: Blob;
      let extension: string;

      // Export based on selected format
      if (downloadFormat === "csv") {
        // Convert to CSV
        extension = "csv";
        setDownloadProgress(60);

        // Simple CSV conversion - could be enhanced with a proper CSV library
        const headers = Object.keys(dataToExport[0] || {}).join(",");
        const rows = dataToExport.map((row) =>
          Object.values(row)
            .map((value) =>
              typeof value === "string"
                ? `"${value.replace(/"/g, '""')}"`
                : value,
            )
            .join(","),
        );
        const csvContent = [headers, ...rows].join("\n");

        blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      } else {
        // Export to Excel
        extension = "xlsx";
        setDownloadProgress(60);
        blob = transformer.exportToExcel(outputFilename, {
          sheetName: "Processed Data",
          styleHeaders: true,
          autoWidth: true,
        });
      }

      setDownloadProgress(80);

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${outputFilename}.${extension}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadProgress(100);

      // Show success message
      toast({
        title: "Download successful",
        description: `File saved as ${outputFilename}.${extension} with ${selectedColumns.length} columns and ${dataToExport.length} rows`,
      });

      // Reset download progress after a delay
      setTimeout(() => {
        setDownloadProgress(0);
        setIsDownloading(false);
      }, 1000);
    } catch (error) {
      console.error("Error downloading file:", error);
      setIsDownloading(false);
      setDownloadProgress(0);

      toast({
        title: "Download failed",
        description:
          "Failed to download file: " +
          (error instanceof Error ? error.message : String(error)),
        variant: "destructive",
      });
    }
  };

  // Handle column sanitization settings change
  const handleColumnSanitizationChange = (
    column: string,
    settings: ColumnSanitizationSettings,
  ) => {
    setColumnSanitizationSettings((prev) => ({
      ...prev,
      [column]: settings,
    }));
  };

  // Handle column rename
  const handleColumnRename = (oldName: string, newName: string) => {
    // Store display name mapping
    setColumnDisplayNames((prev) => ({
      ...prev,
      [oldName]: newName,
    }));
  };

  return (
    <TooltipProvider>
      <div className="container mx-auto p-4">
        {!file ? (
          // File upload view
          <div className="flex min-h-[80vh] flex-col items-center justify-center">
            <Card className="w-full max-w-2xl border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <h2 className="mb-2 text-xl font-bold">
                  Upload Your Excel File
                </h2>
                <p className="text-muted-foreground mb-4 text-center">
                  Drag and drop or select an Excel file to begin
                </p>
                <FileUpload onFileUpload={handleFileUpload} />
              </CardContent>
            </Card>
          </div>
        ) : (
          // Data preview view
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Excel Data Preview</h1>
              <div className="flex gap-2">
                <Dialog
                  open={showDebugDialog}
                  onOpenChange={setShowDebugDialog}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Bug className="mr-2 h-4 w-4" /> Debug View
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>Excel Structure Analysis</DialogTitle>
                      <DialogDescription>
                        Analysis of the first 15 rows to help identify the
                        header row
                      </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-auto">
                      <div className="mb-4">
                        <h3 className="text-lg font-bold">Raw Data Preview</h3>
                        <div className="overflow-x-auto">
                          <table className="min-w-full border-collapse border">
                            <thead>
                              <tr className="bg-muted">
                                <th className="border px-2 py-1">Row</th>
                                <th
                                  className="border px-2 py-1"
                                  colSpan={excelPreview[0]?.length || 1}
                                >
                                  Cell Values
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {excelPreview.map((row, rowIndex) => (
                                <tr
                                  key={rowIndex}
                                  className={
                                    rowIndex === headerRow
                                      ? "bg-green-100 font-bold"
                                      : ""
                                  }
                                >
                                  <td className="border px-2 py-1 whitespace-nowrap">
                                    {rowIndex}{" "}
                                    {rowIndex === headerRow && "(Header)"}
                                  </td>
                                  {row.map((cell, cellIndex) => (
                                    <td
                                      key={cellIndex}
                                      className="border px-2 py-1"
                                    >
                                      {String(cell)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="mb-4">
                        <h3 className="text-lg font-bold">Row Analysis</h3>
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="bg-muted">
                              <th className="border px-2 py-1">Row</th>
                              <th className="border px-2 py-1">Total Cells</th>
                              <th className="border px-2 py-1">Non-Empty</th>
                              <th className="border px-2 py-1">Strings</th>
                              <th className="border px-2 py-1">Numbers</th>
                              <th className="border px-2 py-1">String %</th>
                              <th className="border px-2 py-1">
                                Set as Header
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {rowAnalysis.map((row) => (
                              <tr
                                key={row.index}
                                className={
                                  row.index === headerRow ? "bg-green-100" : ""
                                }
                              >
                                <td className="border px-2 py-1">
                                  {row.index}
                                </td>
                                <td className="border px-2 py-1">
                                  {row.cells}
                                </td>
                                <td className="border px-2 py-1">
                                  {row.nonEmpty}
                                </td>
                                <td className="border px-2 py-1">
                                  {row.strings}
                                </td>
                                <td className="border px-2 py-1">
                                  {row.numbers}
                                </td>
                                <td className="border px-2 py-1">
                                  {row.stringPercent.toFixed(1)}%
                                </td>
                                <td className="border px-2 py-1">
                                  <Button
                                    size="sm"
                                    variant={
                                      row.index === headerRow
                                        ? "default"
                                        : "outline"
                                    }
                                    onClick={() => {
                                      setHeaderRow(row.index);
                                      setAutoDetectHeaders(false);
                                    }}
                                  >
                                    {row.index === headerRow
                                      ? "Selected"
                                      : "Select"}
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="outline"
                  onClick={() => {
                    setFile(null);
                    setData([]);
                    setSanitizedData([]);
                    setFilteredData([]);
                    setFilters([]);
                    setSkipRows(0);
                    setHeaderRow(0);
                  }}
                >
                  Upload New File
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {/* Left column - File info, header controls, sanitization and filters */}
              <div className="relative md:col-span-1">
                <div className="sticky top-0 max-h-[calc(100vh-120px)] space-y-4 overflow-y-auto pr-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>File Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2">
                        <div>
                          <span className="font-semibold">File Name:</span>{" "}
                          {file.name}
                        </div>
                        <div>
                          <span className="font-semibold">Size:</span>{" "}
                          {(file.size / 1024).toFixed(1)} KB
                        </div>
                        <div>
                          <span className="font-semibold">Type:</span>{" "}
                          {file.type || "Unknown"}
                        </div>
                        <div>
                          <span className="font-semibold">Rows:</span>{" "}
                          <Tooltip>
                            <TooltipTrigger className="underline decoration-dotted">
                              {filteredData.length}/{sanitizedData.length}
                            </TooltipTrigger>
                            <TooltipContent>
                              {filteredData.length} rows displayed out of{" "}
                              {sanitizedData.length} total rows
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div>
                          <span className="font-semibold">
                            Selected Columns:
                          </span>{" "}
                          {selectedColumns.length} of{" "}
                          {sanitizedData.length > 0
                            ? Object.keys(sanitizedData[0]).length
                            : 0}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Header Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Label
                          htmlFor="auto-detect"
                          className="flex items-center gap-2"
                        >
                          Auto-detect headers
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="text-muted-foreground h-4 w-4" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Try to automatically detect which row contains
                              column headers
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Switch
                          id="auto-detect"
                          checked={autoDetectHeaders}
                          onCheckedChange={(checked) => {
                            setAutoDetectHeaders(checked);
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="space-y-2">
                          <Label
                            htmlFor="header-row"
                            className="flex items-center gap-2"
                          >
                            Header row
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="text-muted-foreground h-4 w-4" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Row that contains column headers (0-based
                                  index)
                                </p>
                                <p className="font-bold">
                                  Example: If your table headers are on row 4,
                                  enter 3
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <Input
                            id="header-row"
                            type="number"
                            min="0"
                            value={headerRow}
                            onChange={(e) => {
                              setHeaderRow(Number(e.target.value));
                              if (autoDetectHeaders)
                                setAutoDetectHeaders(false);
                            }}
                          />
                          <p className="text-muted-foreground text-xs">
                            Current setting: Using row {headerRow} (Excel row{" "}
                            {headerRow + 1}) as headers
                          </p>
                        </div>

                        <Button
                          className="mt-4 w-full"
                          onClick={handleReloadWithOptions}
                          disabled={isProcessing}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Apply Settings
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {sanitizedData.length > 0 && (
                    <>
                      {/* Data Sanitization */}
                      <DataSanitization
                        options={sanitizationOptions}
                        onOptionsChange={handleSanitizationChange}
                      />

                      {/* Data Filters */}
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Data Filters</h3>
                        {filters.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearFilters}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <FilterX className="mr-1 h-4 w-4" /> Clear all
                          </Button>
                        )}
                      </div>
                      <DataFilters
                        data={sanitizedData}
                        columns={columns}
                        visibleColumns={selectedColumns}
                        onFilterChange={handleFilterChange}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Right column - Data preview */}
              <div className="md:col-span-3">
                <DataPreview
                  data={filteredData}
                  title={`Excel Data ${
                    filteredData.length !== sanitizedData.length
                      ? `(${filteredData.length}/${sanitizedData.length} rows)`
                      : ""
                  }`}
                  onColumnsChange={handleColumnSelectionChange}
                  onColumnRename={handleColumnRename}
                  onColumnSanitizationChange={handleColumnSanitizationChange}
                  sanitizationOptions={sanitizationOptions}
                  columnSanitizationSettings={columnSanitizationSettings}
                />

                {data.length > 0 && (
                  <Card className="mt-4">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium">
                            Download Processed Data
                          </h3>
                          <p className="text-muted-foreground text-sm">
                            Export your filtered and sanitized data in your
                            preferred format
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={downloadFormat}
                            onValueChange={(value: "excel" | "csv") =>
                              setDownloadFormat(value)
                            }
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue placeholder="Format" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="excel">
                                Excel (.xlsx)
                              </SelectItem>
                              <SelectItem value="csv">CSV</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            onClick={handleDownload}
                            disabled={
                              isProcessing ||
                              isDownloading ||
                              filteredData.length === 0
                            }
                            size="lg"
                          >
                            {isDownloading ? (
                              <>
                                <FileType className="mr-2 size-4 animate-pulse" />
                                Exporting...
                              </>
                            ) : (
                              <>
                                <Download className="mr-2 size-4" />
                                Download{" "}
                                {filteredData.length !== sanitizedData.length
                                  ? `(${filteredData.length} rows)`
                                  : `(${selectedColumns.length} columns)`}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      {isDownloading && (
                        <div className="mt-4">
                          <Progress value={downloadProgress} />
                          <p className="mt-2 text-center text-sm">
                            Preparing download... {downloadProgress}%
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {isProcessing && (
                  <div className="mt-4 flex flex-col gap-2">
                    <Progress value={progress} />
                    <p className="text-center text-sm">
                      Processing... {progress}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
