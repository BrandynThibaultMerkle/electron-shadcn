import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, X, Plus, Check, ChevronsUpDown } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Define the supported column types
type ColumnType = "string" | "number" | "date" | "boolean" | "unknown";

// Define the filter operations for each column type
type FilterOperation =
  | "equals"
  | "notEquals"
  | "contains"
  | "notContains"
  | "startsWith"
  | "endsWith"
  | "greaterThan"
  | "lessThan"
  | "between"
  | "in"
  | "notIn"
  | "isTrue"
  | "isFalse"
  | "dateRange"
  | "before"
  | "after";

// Filter value can be a string, number, boolean, array, or date range
type FilterValue =
  | string
  | number
  | boolean
  | string[]
  | number[]
  | { from: string; to: string };

interface ColumnFilter {
  column: string;
  type: ColumnType;
  operation: FilterOperation;
  value: FilterValue;
}

// Additional type for column statistics
interface ColumnStats {
  min?: any;
  max?: any;
  distinctValues?: any[];
}

interface DataFilterProps {
  data: any[];
  columns: string[];
  onFilterChange: (filters: ColumnFilter[]) => void;
  maxSampleSize?: number; // Limit the number of rows to analyze for performance
}

export function DataFilters({
  data,
  columns,
  onFilterChange,
  maxSampleSize = 1000,
}: DataFilterProps) {
  const [activeFilters, setActiveFilters] = useState<ColumnFilter[]>([]);
  const [columnTypes, setColumnTypes] = useState<Record<string, ColumnType>>(
    {},
  );
  const [uniqueValues, setUniqueValues] = useState<Record<string, any[]>>({});
  const [columnStats, setColumnStats] = useState<Record<string, ColumnStats>>(
    {},
  );
  const [loadingColumn, setLoadingColumn] = useState<string | null>(null);
  const [expandedColumns, setExpandedColumns] = useState<string[]>([]);
  const [comboboxOpen, setComboboxOpen] = useState<Record<string, boolean>>({});

  // Helper function to detect column type
  const detectColumnType = (column: string, sampleData: any[]): ColumnType => {
    // Get non-null values
    const values = sampleData
      .filter((row) => row[column] !== null && row[column] !== undefined)
      .map((row) => row[column]);

    if (!values.length) return "unknown";

    // Check for boolean
    const boolCount = values.filter(
      (val) =>
        val === true ||
        val === false ||
        val === "true" ||
        val === "false" ||
        val === "yes" ||
        val === "no" ||
        val === "y" ||
        val === "n" ||
        val === 1 ||
        val === 0,
    ).length;

    if (boolCount > 0 && boolCount === values.length) return "boolean";

    // Check for currency values (values with $ or other currency symbols)
    const currencyCount = values.filter((val) => {
      if (typeof val === "string") {
        return /^\s*[£$€¥]\s*[\d,.]+\s*$/.test(val);
      }
      return false;
    }).length;

    if (currencyCount > values.length * 0.5) return "number";

    // Check for dates
    const dateCount = values.filter((val) => {
      if (typeof val === "string") {
        // Exclude values that start with currency symbols from date detection
        if (/^\s*[£$€¥]/.test(val)) return false;
        return !isNaN(Date.parse(val));
      }
      return val instanceof Date;
    }).length;

    if (dateCount > values.length * 0.5) return "date";

    // Check for numbers (including numbers with currency symbols)
    const numberCount = values.filter((val) => {
      if (typeof val === "number") return true;
      if (typeof val === "string") {
        // Try to extract numeric value from strings (including those with currency symbols)
        const numericString = val.replace(/[^0-9.-]/g, "");
        return numericString.length > 0 && !isNaN(Number(numericString));
      }
      return false;
    }).length;

    if (numberCount > values.length * 0.7) return "number";

    // Default to string
    return "string";
  };

  // Extract unique values from a column
  const extractUniqueValues = (
    column: string,
    sampleData: any[],
    type: ColumnType,
  ): any[] => {
    const values = sampleData
      .filter((row) => row[column] !== null && row[column] !== undefined)
      .map((row) => row[column]);

    // For large datasets, limit the number of unique values
    const uniqueSet = new Set();
    let uniqueCount = 0;
    const MAX_UNIQUE_VALUES = 100;

    for (const value of values) {
      if (uniqueCount < MAX_UNIQUE_VALUES) {
        uniqueSet.add(
          type === "date" ? new Date(value).toISOString().split("T")[0] : value,
        );
        uniqueCount = uniqueSet.size;
      } else {
        break;
      }
    }

    const uniqueArray = Array.from(uniqueSet);

    // Sort values appropriately based on type
    if (type === "number") {
      return uniqueArray.sort((a, b) => Number(a) - Number(b));
    } else if (type === "date") {
      return uniqueArray.sort();
    } else {
      return uniqueArray.sort();
    }
  };

  // Calculate column statistics like min/max for numbers and dates
  const calculateColumnStats = (
    column: string,
    sampleData: any[],
    type: ColumnType,
    values: any[],
  ): ColumnStats => {
    const stats: ColumnStats = {
      distinctValues: values,
    };

    if (type === "number") {
      // Find min and max values for numbers
      const validValues = values.filter((v) => !isNaN(Number(v)));
      if (validValues.length > 0) {
        stats.min = Math.min(...validValues.map((v) => Number(v)));
        stats.max = Math.max(...validValues.map((v) => Number(v)));
      }
    } else if (type === "date") {
      // Find min and max dates
      try {
        const validDates = values
          .map((v) => new Date(v))
          .filter((d) => !isNaN(d.getTime()));

        if (validDates.length > 0) {
          stats.min = new Date(Math.min(...validDates.map((d) => d.getTime())))
            .toISOString()
            .split("T")[0];
          stats.max = new Date(Math.max(...validDates.map((d) => d.getTime())))
            .toISOString()
            .split("T")[0];
        }
      } catch (error) {
        console.error(`Error calculating date stats for ${column}:`, error);
      }
    }

    return stats;
  };

  // Get default operation for a column type
  const getDefaultOperation = (type: ColumnType): FilterOperation => {
    switch (type) {
      case "string":
        return "contains";
      case "number":
        return "equals";
      case "date":
        return "dateRange";
      case "boolean":
        return "isTrue";
      default:
        return "equals";
    }
  };

  // Get default value for a column type and operation, with column context
  const getDefaultValue = (
    type: ColumnType,
    operation?: FilterOperation,
    column?: string,
  ): FilterValue => {
    const op = operation || getDefaultOperation(type);
    const stats = column ? columnStats[column] : undefined;

    switch (type) {
      case "number":
        if (op === "between") {
          // If we have stats, use them for range
          if (stats?.min !== undefined && stats?.max !== undefined) {
            return [stats.min, stats.max];
          }
          return [0, 100];
        }
        return 0;

      case "date":
        if (op === "dateRange") {
          // If we have date stats, use min/max dates
          if (stats?.min && stats?.max) {
            return { from: stats.min, to: stats.max };
          }
          return { from: "", to: "" };
        }
        return "";

      case "boolean":
        return true;

      default:
        return op === "in" || op === "notIn" ? [] : "";
    }
  };

  // Get available operations for a column type
  const getAvailableOperations = (
    type: ColumnType,
  ): { value: FilterOperation; label: string }[] => {
    switch (type) {
      case "string":
        return [
          { value: "equals", label: "Equals" },
          { value: "notEquals", label: "Does not equal" },
          { value: "contains", label: "Contains" },
          { value: "notContains", label: "Does not contain" },
          { value: "startsWith", label: "Starts with" },
          { value: "endsWith", label: "Ends with" },
          { value: "in", label: "Is one of" },
          { value: "notIn", label: "Is not one of" },
        ];
      case "number":
        return [
          { value: "equals", label: "Equals" },
          { value: "notEquals", label: "Does not equal" },
          { value: "greaterThan", label: "Greater than" },
          { value: "lessThan", label: "Less than" },
          { value: "between", label: "Between" },
          { value: "in", label: "Is one of" },
          { value: "notIn", label: "Is not one of" },
        ];
      case "date":
        return [
          { value: "dateRange", label: "Date range" },
          { value: "before", label: "Before" },
          { value: "after", label: "After" },
          { value: "equals", label: "On date" },
        ];
      case "boolean":
        return [
          { value: "isTrue", label: "Is true" },
          { value: "isFalse", label: "Is false" },
        ];
      default:
        return [{ value: "equals", label: "Equals" }];
    }
  };

  // Detect column types on initial load
  useEffect(() => {
    if (!data.length) return;

    const types: Record<string, ColumnType> = {};

    columns.forEach((column) => {
      types[column] = detectColumnType(column, data.slice(0, 100)); // Use first 100 rows for initial detection
    });

    setColumnTypes(types);
  }, [data, columns]);

  // Load unique values for a column when it's expanded
  const loadColumnValues = async (column: string) => {
    if (uniqueValues[column]?.length > 0 || !data.length) return;

    setLoadingColumn(column);

    try {
      // Use setTimeout to prevent UI blocking during processing
      setTimeout(() => {
        const sampleData = data.slice(0, maxSampleSize);
        const type = columnTypes[column];

        // Extract unique values from the sample
        const values = extractUniqueValues(column, sampleData, type);

        // Calculate column statistics
        const stats = calculateColumnStats(column, sampleData, type, values);

        setUniqueValues((prev) => ({
          ...prev,
          [column]: values,
        }));

        setColumnStats((prev) => ({
          ...prev,
          [column]: stats,
        }));

        setLoadingColumn(null);
      }, 0);
    } catch (error) {
      console.error(`Error loading values for column ${column}:`, error);
      setLoadingColumn(null);
    }
  };

  // Handle accordion state change
  const handleAccordionChange = (column: string) => {
    const isExpanded = expandedColumns.includes(column);

    if (isExpanded) {
      setExpandedColumns(expandedColumns.filter((col) => col !== column));
    } else {
      setExpandedColumns([...expandedColumns, column]);
      loadColumnValues(column);
    }
  };

  // Add a filter for a column
  const addFilter = (column: string) => {
    const type = columnTypes[column];
    const operation = getDefaultOperation(type);
    const defaultValue = getDefaultValue(type, operation, column);

    const newFilter: ColumnFilter = {
      column,
      type,
      operation,
      value: defaultValue,
    };

    const updatedFilters = [...activeFilters, newFilter];
    setActiveFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  // Update an existing filter
  const updateFilter = (index: number, updates: Partial<ColumnFilter>) => {
    const updatedFilters = [...activeFilters];
    updatedFilters[index] = { ...updatedFilters[index], ...updates };

    // If operation changed, reset value to appropriate default
    if (
      updates.operation &&
      updates.operation !== activeFilters[index].operation
    ) {
      const defaultValue = getDefaultValue(
        updatedFilters[index].type,
        updates.operation as FilterOperation,
        updatedFilters[index].column,
      );
      updatedFilters[index].value = defaultValue;
    }

    setActiveFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  // Remove a filter
  const removeFilter = (index: number) => {
    const updatedFilters = activeFilters.filter((_, i) => i !== index);
    setActiveFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  // Render filter input based on column type and operation
  const renderFilterInput = (filter: ColumnFilter, index: number) => {
    const { type, operation, value, column } = filter;

    switch (type) {
      case "string":
        if (operation === "in" || operation === "notIn") {
          return (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1">
                {Array.isArray(value) &&
                  value.map((val, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {val}
                      <button
                        onClick={() => {
                          const newValues = (value as string[]).filter(
                            (_, valueIndex) => valueIndex !== i,
                          );
                          updateFilter(index, { value: newValues });
                        }}
                        className="ml-1 text-xs opacity-70 hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
              </div>
              <div className="flex gap-2">
                <Select
                  onValueChange={(newVal) => {
                    const newValues = [...(value as string[]), newVal];
                    updateFilter(index, { value: newValues });
                  }}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select a value" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueValues[column]?.map((val) => (
                      <SelectItem key={String(val)} value={String(val)}>
                        {String(val)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        } else {
          // For simple string operations, show both dropdown and input
          return (
            <div className="flex flex-col gap-1">
              <Select
                value={value as string}
                onValueChange={(val) => updateFilter(index, { value: val })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select a value" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueValues[column]?.map((val) => (
                    <SelectItem key={String(val)} value={String(val)}>
                      {String(val)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-muted-foreground text-xs">
                or type value:
              </div>
              <Input
                value={value as string}
                onChange={(e) => updateFilter(index, { value: e.target.value })}
                placeholder="Type a value..."
                className="h-8"
              />
            </div>
          );
        }

      case "number":
        if (operation === "between") {
          const numValues = value as number[];
          const stats = columnStats[column];
          const min = stats?.min !== undefined ? stats.min : 0;
          const max = stats?.max !== undefined ? stats.max : 100;

          return (
            <div className="space-y-4">
              <div className="flex justify-between text-xs">
                <span>{numValues[0]}</span>
                <span>{numValues[1]}</span>
              </div>
              <Slider
                value={numValues}
                min={min}
                max={max}
                step={(max - min) / 100}
                onValueChange={(newValues: number[]) =>
                  updateFilter(index, { value: newValues })
                }
              />
            </div>
          );
        } else if (operation === "in" || operation === "notIn") {
          // For "is one of" operations, use multi-select
          return (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1">
                {Array.isArray(value) &&
                  value.map((val, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {val}
                      <button
                        onClick={() => {
                          const newValues = (value as number[]).filter(
                            (_, valueIndex) => valueIndex !== i,
                          );
                          updateFilter(index, { value: newValues });
                        }}
                        className="ml-1 text-xs opacity-70 hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
              </div>
              <div className="flex gap-2">
                <Select
                  onValueChange={(newVal) => {
                    const numVal = Number(newVal);
                    const newValues = [...(value as number[]), numVal];
                    updateFilter(index, { value: newValues });
                  }}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select a value" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueValues[column]?.map((val) => (
                      <SelectItem key={String(val)} value={String(val)}>
                        {val}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        } else {
          // For other operations like equals, less than, etc.
          return (
            <div className="flex flex-col gap-1">
              <Select
                value={String(value)}
                onValueChange={(val) =>
                  updateFilter(index, { value: Number(val) })
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select a value" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueValues[column]?.map((val) => (
                    <SelectItem key={String(val)} value={String(val)}>
                      {val}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-muted-foreground text-xs">
                or enter value:
              </div>
              <Input
                type="number"
                value={value as number}
                onChange={(e) =>
                  updateFilter(index, { value: Number(e.target.value) })
                }
                placeholder="0"
                className="h-8"
              />
            </div>
          );
        }

      case "date":
        if (operation === "dateRange") {
          const dateRange = value as { from: string; to: string };
          return (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="w-8 text-xs">From:</Label>
                <Input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) =>
                    updateFilter(index, {
                      value: { ...dateRange, from: e.target.value },
                    })
                  }
                  className="h-8"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="w-8 text-xs">To:</Label>
                <Input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) =>
                    updateFilter(index, {
                      value: { ...dateRange, to: e.target.value },
                    })
                  }
                  className="h-8"
                />
              </div>
            </div>
          );
        } else {
          return (
            <div className="flex flex-col gap-1">
              <Select
                value={value as string}
                onValueChange={(val) => updateFilter(index, { value: val })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select a date" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueValues[column]?.map((val) => (
                    <SelectItem key={String(val)} value={String(val)}>
                      {val}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-muted-foreground text-xs">
                or select date:
              </div>
              <Input
                type="date"
                value={value as string}
                onChange={(e) => updateFilter(index, { value: e.target.value })}
                className="h-8"
              />
            </div>
          );
        }

      case "boolean":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={value as boolean}
              onCheckedChange={(checked) =>
                updateFilter(index, { value: !!checked })
              }
              id={`bool-filter-${index}`}
            />
            <label
              htmlFor={`bool-filter-${index}`}
              className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {operation === "isTrue" ? "True" : "False"}
            </label>
          </div>
        );

      default:
        return (
          <Input
            value={value as string}
            onChange={(e) => updateFilter(index, { value: e.target.value })}
            placeholder="Filter value..."
            className="h-8"
          />
        );
    }
  };

  // Render active filters
  const renderActiveFilters = () => {
    if (activeFilters.length === 0) {
      return (
        <div className="text-muted-foreground py-2 text-center text-sm">
          No filters applied
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {activeFilters.map((filter, index) => {
          const operations = getAvailableOperations(filter.type);

          return (
            <div key={index} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">{filter.column}</div>
                <button
                  onClick={() => removeFilter(index)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2">
                <Select
                  value={filter.operation}
                  onValueChange={(value) =>
                    updateFilter(index, { operation: value as FilterOperation })
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {operations.map((op) => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {renderFilterInput(filter, index)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active filters section */}
        {renderActiveFilters()}

        {/* Add new filter section */}
        <Accordion type="multiple" className="w-full">
          {columns.map((column) => (
            <AccordionItem key={column} value={column}>
              <AccordionTrigger
                onClick={() => handleAccordionChange(column)}
                className="py-2 text-sm hover:no-underline"
              >
                <div className="flex w-full items-center justify-between">
                  <span>{column}</span>
                  <Badge variant="outline" className="ml-2">
                    {columnTypes[column] || "unknown"}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {loadingColumn === column ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="py-2">
                    <Button
                      onClick={() => addFilter(column)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add filter for {column}
                    </Button>

                    {/* Show sample values for string columns */}
                    {columnTypes[column] === "string" &&
                      uniqueValues[column]?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-muted-foreground mb-1 text-xs">
                            Sample values (click to filter):
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {uniqueValues[column]
                              .slice(0, 10)
                              .map((value, i) => (
                                <Badge
                                  key={i}
                                  variant="secondary"
                                  className="cursor-pointer text-xs"
                                  onClick={() => {
                                    // Add this value as a filter when clicked
                                    addFilter(column);
                                    const newFilterIndex = activeFilters.length;
                                    updateFilter(newFilterIndex, {
                                      operation: "equals",
                                      value: value,
                                    });
                                  }}
                                >
                                  {String(value)}
                                </Badge>
                              ))}
                            {uniqueValues[column].length > 10 && (
                              <Badge variant="outline" className="text-xs">
                                +{uniqueValues[column].length - 10} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                    {/* Show range and values for number columns */}
                    {columnTypes[column] === "number" &&
                      uniqueValues[column]?.length > 0 && (
                        <div className="mt-2 space-y-2">
                          <p className="text-muted-foreground text-xs">
                            Range:{" "}
                            {Math.min(...uniqueValues[column].map(Number))} -{" "}
                            {Math.max(...uniqueValues[column].map(Number))}
                          </p>
                          <p className="text-muted-foreground mb-1 text-xs">
                            Common values (click to filter):
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {uniqueValues[column]
                              .slice(0, 10)
                              .map((value, i) => (
                                <Badge
                                  key={i}
                                  variant="secondary"
                                  className="cursor-pointer text-xs"
                                  onClick={() => {
                                    // Add this value as a filter when clicked
                                    addFilter(column);
                                    const newFilterIndex = activeFilters.length;
                                    updateFilter(newFilterIndex, {
                                      operation: "equals",
                                      value: Number(value),
                                    });
                                  }}
                                >
                                  {value}
                                </Badge>
                              ))}
                          </div>
                        </div>
                      )}

                    {/* Show date range for date columns */}
                    {columnTypes[column] === "date" &&
                      uniqueValues[column]?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-muted-foreground mb-1 text-xs">
                            Date range:
                          </p>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between text-xs">
                              <span>
                                From: {columnStats[column]?.min || "N/A"}
                              </span>
                              <span>
                                To: {columnStats[column]?.max || "N/A"}
                              </span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-1 text-xs"
                              onClick={() => {
                                // Add a date range filter for this column
                                addFilter(column);
                                const newFilterIndex = activeFilters.length;
                                const stats = columnStats[column];
                                if (stats?.min && stats?.max) {
                                  updateFilter(newFilterIndex, {
                                    operation: "dateRange",
                                    value: { from: stats.min, to: stats.max },
                                  });
                                }
                              }}
                            >
                              Filter by date range
                            </Button>
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
