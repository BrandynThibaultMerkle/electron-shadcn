import React, { useState, useEffect, useMemo } from "react";
import { FileUpload } from "@/components/FileUpload";
import { DataPreview } from "@/components/DataPreview";
import { DataFilters } from "@/components/DataFilters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { Download, RefreshCw, Bug, FilterX } from "lucide-react";
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

export function TransformationPage() {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [filters, setFilters] = useState<ColumnFilter[]>([]);
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

  // Available columns for filtering
  const columns = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0] || {});
  }, [data]);

  // Update filtered data whenever raw data or filters change
  useEffect(() => {
    applyFilters();
  }, [data, filters]);

  // Apply filters to data
  const applyFilters = () => {
    if (!data.length) {
      setFilteredData([]);
      return;
    }

    if (!filters.length) {
      setFilteredData(data);
      return;
    }

    const result = data.filter((row) => {
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
      setFilteredData(loadedData); // Initialize filtered data with all data

      // Initialize selected columns with all available columns
      if (loadedData.length > 0) {
        setSelectedColumns(Object.keys(loadedData[0]));
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
      setFilteredData(loadedData); // Reset filtered data

      // Reset selected columns to all available columns
      if (loadedData.length > 0) {
        setSelectedColumns(Object.keys(loadedData[0]));
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
    setSelectedColumns(columns);
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
      setIsProcessing(true);
      setProgress(20);

      // Get the filename without extension
      const outputFilename = file.name.replace(/\.[^/.]+$/, "") + "_clean";

      // Use filtered data and only include selected columns
      const dataToExport = filteredData.map((row) => {
        const newRow: Record<string, any> = {};
        selectedColumns.forEach((col) => {
          newRow[col] = row[col];
        });
        return newRow;
      });

      // Update the transformer with filtered data
      transformer.setData(dataToExport);

      // Export to Excel
      const blob = transformer.exportToExcel(outputFilename);
      setProgress(80);

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${outputFilename}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setProgress(100);
      toast({
        title: "Success",
        description: `File saved as ${outputFilename}.xlsx with ${selectedColumns.length} columns and ${dataToExport.length} rows`,
      });
    } catch (error) {
      console.error("Error downloading file:", error);
      toast({
        title: "Error",
        description:
          "Failed to download file: " +
          (error instanceof Error ? error.message : String(error)),
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
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
                    setFilteredData([]);
                    setFilters([]);
                    setSkipRows(0);
                    setHeaderRow(0);
                  }}
                >
                  Upload New File
                </Button>
                <Button onClick={handleDownload} disabled={isProcessing}>
                  <Download className="mr-2 size-4" />
                  Download{" "}
                  {filteredData.length !== data.length
                    ? `(${filteredData.length}/${data.length} rows)`
                    : `(${selectedColumns.length} columns)`}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {/* Left column - File info, header controls, and filters */}
              <div className="space-y-4 md:col-span-1">
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
                            {filteredData.length}/{data.length}
                          </TooltipTrigger>
                          <TooltipContent>
                            {filteredData.length} rows displayed out of{" "}
                            {data.length} total rows
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div>
                        <span className="font-semibold">Selected Columns:</span>{" "}
                        {selectedColumns.length} of{" "}
                        {data.length > 0 ? Object.keys(data[0]).length : 0}
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
                                Row that contains column headers (0-based index)
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
                            if (autoDetectHeaders) setAutoDetectHeaders(false);
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

                {data.length > 0 && (
                  <>
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
                      data={data}
                      columns={columns}
                      onFilterChange={handleFilterChange}
                    />
                  </>
                )}
              </div>

              {/* Right column - Data preview */}
              <div className="md:col-span-3">
                <DataPreview
                  data={filteredData}
                  title={`Excel Data ${
                    filteredData.length !== data.length
                      ? `(${filteredData.length}/${data.length} rows)`
                      : ""
                  }`}
                  onColumnsChange={handleColumnSelectionChange}
                />

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
