import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Undo, Redo, Settings, Edit, Check } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SanitizationOptions } from "./DataSanitization";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DataPreviewProps {
  data: any[];
  title?: string;
  onColumnsChange?: (columns: string[]) => void;
  onColumnRename?: (oldName: string, newName: string) => void;
  onColumnSanitizationChange?: (
    column: string,
    settings: ColumnSanitizationSettings,
  ) => void;
  sanitizationOptions?: SanitizationOptions;
  columnSanitizationSettings?: Record<string, ColumnSanitizationSettings>;
}

export interface ColumnSanitizationSettings {
  enableSanitization: boolean;
  preserveCharacters?: string;
  columnType?: ColumnType;
}

interface HistoryState {
  selectedColumns: string[];
}

export type ColumnType =
  | "auto"
  | "text"
  | "number"
  | "date"
  | "zipcode"
  | "phone"
  | "email"
  | "currency"
  | "ssn";

export function DataPreview({
  data,
  title = "Data Preview",
  onColumnsChange,
  onColumnRename,
  onColumnSanitizationChange,
  sanitizationOptions,
  columnSanitizationSettings = {},
}: DataPreviewProps) {
  const [visibleRows, setVisibleRows] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [columnDisplayNames, setColumnDisplayNames] = useState<
    Record<string, string>
  >({});
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [editColumnName, setEditColumnName] = useState("");

  // Determine all available columns from first row
  const allColumns = data.length > 0 ? Object.keys(data[0]) : [];

  // Track selected columns
  const [selectedColumns, setSelectedColumns] = useState<string[]>(allColumns);

  // History for undo/redo functionality
  const [history, setHistory] = useState<HistoryState[]>([
    { selectedColumns: allColumns },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Update selected columns when data changes
  useEffect(() => {
    if (data.length > 0) {
      const availableColumns = Object.keys(data[0]);

      // Initialize display names for new columns
      const newDisplayNames: Record<string, string> = {};
      availableColumns.forEach((col) => {
        if (!columnDisplayNames[col]) {
          newDisplayNames[col] = col;
        }
      });

      if (Object.keys(newDisplayNames).length > 0) {
        setColumnDisplayNames((prev) => ({ ...prev, ...newDisplayNames }));
      }

      // Only reset selected columns if it's our first data load
      // or if none of the currently selected columns exist in the new data
      if (
        selectedColumns.length === 0 ||
        !selectedColumns.some((col) => availableColumns.includes(col))
      ) {
        setSelectedColumns(availableColumns);
        setHistory([{ selectedColumns: availableColumns }]);
        setHistoryIndex(0);
      } else {
        // Keep only the selected columns that still exist in the new data
        const validSelectedColumns = selectedColumns.filter((col) =>
          availableColumns.includes(col),
        );
        if (validSelectedColumns.length !== selectedColumns.length) {
          setSelectedColumns(validSelectedColumns);

          // Update history with the new valid selection
          const newHistory = [
            ...history.slice(0, historyIndex + 1),
            { selectedColumns: validSelectedColumns },
          ];
          setHistory(newHistory);
          setHistoryIndex(newHistory.length - 1);
        }
      }
    }
  }, [data]);

  // Notify parent component when columns change
  useEffect(() => {
    if (onColumnsChange) {
      onColumnsChange(selectedColumns);
    }
  }, [selectedColumns, onColumnsChange]);

  // Filter data based on search term (search in all columns)
  const filteredData = searchTerm
    ? data.filter((row) =>
        Object.values(row).some(
          (value) =>
            value !== null &&
            value !== undefined &&
            String(value).toLowerCase().includes(searchTerm.toLowerCase()),
        ),
      )
    : data;

  // Show more rows when the button is clicked
  const showMoreRows = () => {
    setVisibleRows(Math.min(visibleRows + 10, filteredData.length));
  };

  // Handle column selection
  const toggleColumn = (column: string) => {
    const updatedColumns = selectedColumns.includes(column)
      ? selectedColumns.filter((col) => col !== column)
      : [...selectedColumns, column];

    // Add to history, removing any future states if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ selectedColumns: updatedColumns });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    setSelectedColumns(updatedColumns);
  };

  // Handle undo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setSelectedColumns(history[newIndex].selectedColumns);
    }
  };

  // Handle redo
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setSelectedColumns(history[newIndex].selectedColumns);
    }
  };

  // Select all columns
  const selectAllColumns = () => {
    setSelectedColumns([...allColumns]);

    // Add to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ selectedColumns: [...allColumns] });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Deselect all columns
  const deselectAllColumns = () => {
    setSelectedColumns([]);

    // Add to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ selectedColumns: [] });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Handle column rename
  const handleColumnRename = (column: string) => {
    if (!editColumnName.trim() || editColumnName === column) {
      setEditingColumn(null);
      return;
    }

    // Update display name
    setColumnDisplayNames((prev) => ({
      ...prev,
      [column]: editColumnName,
    }));

    // Notify parent if callback exists
    if (onColumnRename) {
      onColumnRename(column, editColumnName);
    }

    setEditingColumn(null);
  };

  // Handle column sanitization settings change
  const handleColumnSanitizationChange = (
    column: string,
    settings: Partial<ColumnSanitizationSettings>,
  ) => {
    if (!onColumnSanitizationChange) return;

    const currentSettings = columnSanitizationSettings[column] || {
      enableSanitization: true,
    };

    const newSettings = {
      ...currentSettings,
      ...settings,
    };

    onColumnSanitizationChange(column, newSettings);
  };

  // Get display name for a column
  const getColumnDisplayName = (column: string): string => {
    return columnDisplayNames[column] || column;
  };

  // Get format examples for each data type
  const getFormatExample = (type: ColumnType): string => {
    switch (type) {
      case "auto":
        return "Automatically detected";
      case "text":
        return "Plain text";
      case "number":
        return "123";
      case "date":
        return "MM/DD/YYYY";
      case "zipcode":
        return "12345 or 12345-6789 (depends on ZIP sanitization setting)";
      case "phone":
        return "123-456-7890";
      case "email":
        return "user@example.com";
      case "currency":
        return "$1,234.56";
      case "ssn":
        return "XXX-XX-XXXX";
      default:
        return "Standard format";
    }
  };

  // Get default characters to preserve based on data type
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

  // No data to display
  if (data.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-6 text-center">
          <div className="text-muted-foreground">
            No data available. Please upload an Excel file.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <CardTitle>
                {title} ({filteredData.length} rows)
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                  <Input
                    type="search"
                    placeholder="Search..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleUndo}
                      disabled={historyIndex === 0}
                    >
                      <Undo className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Undo</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleRedo}
                      disabled={historyIndex === history.length - 1}
                    >
                      <Redo className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Redo</TooltipContent>
                </Tooltip>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Column Settings</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={selectedColumns.length === allColumns.length}
                      onCheckedChange={() =>
                        selectedColumns.length === allColumns.length
                          ? deselectAllColumns()
                          : selectAllColumns()
                      }
                    >
                      {selectedColumns.length === allColumns.length
                        ? "Deselect All"
                        : "Select All"}
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                    {allColumns.map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column}
                        checked={selectedColumns.includes(column)}
                        onCheckedChange={() => toggleColumn(column)}
                      >
                        {getColumnDisplayName(column)}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {allColumns.map((column) => (
                <div
                  key={column}
                  className={`flex items-center rounded-md border px-2 py-1 text-xs ${
                    selectedColumns.includes(column)
                      ? "bg-primary/10 border-primary/30"
                      : "bg-muted/40 text-muted-foreground"
                  }`}
                >
                  <Checkbox
                    id={`col-${column}`}
                    checked={selectedColumns.includes(column)}
                    onCheckedChange={() => toggleColumn(column)}
                    className="mr-1 h-3 w-3"
                  />
                  <label
                    htmlFor={`col-${column}`}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleColumn(column)}
                  >
                    {getColumnDisplayName(column)}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-auto">
            <Table>
              <TableHeader className="bg-background sticky top-0 z-10">
                <TableRow>
                  {selectedColumns.map((column) => (
                    <TableHead
                      key={column}
                      className="font-bold whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        {editingColumn === column ? (
                          <div className="flex items-center">
                            <Input
                              value={editColumnName}
                              onChange={(e) =>
                                setEditColumnName(e.target.value)
                              }
                              className="h-7 px-1 py-0 text-xs"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  handleColumnRename(column);
                                if (e.key === "Escape") setEditingColumn(null);
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleColumnRename(column)}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span>{getColumnDisplayName(column)}</span>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="ml-1 h-6 w-6"
                                >
                                  <Settings className="h-3 w-3" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80" align="start">
                                <div className="space-y-4">
                                  <h4 className="text-sm font-medium">
                                    Column Settings:{" "}
                                    {getColumnDisplayName(column)}
                                  </h4>

                                  <div className="space-y-2">
                                    <h5 className="text-xs font-medium">
                                      Column Name
                                    </h5>
                                    <div className="flex items-center gap-2">
                                      <Input
                                        defaultValue={getColumnDisplayName(
                                          column,
                                        )}
                                        className="h-8 text-sm"
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            setEditColumnName(
                                              e.currentTarget.value,
                                            );
                                            handleColumnRename(column);
                                          }
                                        }}
                                        onChange={(e) =>
                                          setEditColumnName(e.target.value)
                                        }
                                      />
                                      <Button
                                        size="sm"
                                        className="px-2"
                                        onClick={() =>
                                          handleColumnRename(column)
                                        }
                                      >
                                        <Edit className="mr-1 h-3 w-3" />
                                        Rename
                                      </Button>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <h5 className="text-xs font-medium">
                                      Data Type
                                    </h5>
                                    <div className="space-y-1">
                                      <Label
                                        htmlFor={`column-type-${column}`}
                                        className="text-xs"
                                      >
                                        Specify column data type for special
                                        formatting
                                      </Label>
                                      <Select
                                        value={
                                          columnSanitizationSettings[column]
                                            ?.columnType || "auto"
                                        }
                                        onValueChange={(value: ColumnType) =>
                                          handleColumnSanitizationChange(
                                            column,
                                            {
                                              columnType: value,
                                              // Auto-preserve characters for certain types
                                              preserveCharacters:
                                                getDefaultPreserveCharacters(
                                                  value,
                                                  columnSanitizationSettings[
                                                    column
                                                  ]?.preserveCharacters,
                                                ),
                                            },
                                          )
                                        }
                                      >
                                        <SelectTrigger
                                          className="w-full"
                                          id={`column-type-${column}`}
                                        >
                                          <SelectValue placeholder="Select data type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="auto">
                                            Auto-detect
                                          </SelectItem>
                                          <SelectItem value="text">
                                            Text
                                          </SelectItem>
                                          <SelectItem value="number">
                                            Number
                                          </SelectItem>
                                          <SelectItem value="date">
                                            Date
                                          </SelectItem>
                                          <SelectItem value="zipcode">
                                            ZIP Code
                                          </SelectItem>
                                          <SelectItem value="phone">
                                            Phone Number
                                          </SelectItem>
                                          <SelectItem value="email">
                                            Email Address
                                          </SelectItem>
                                          <SelectItem value="currency">
                                            Currency
                                          </SelectItem>
                                          <SelectItem value="ssn">
                                            Social Security Number
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>

                                      <div className="text-muted-foreground mt-1 text-xs">
                                        Format:{" "}
                                        {getFormatExample(
                                          columnSanitizationSettings[column]
                                            ?.columnType || "auto",
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {sanitizationOptions && (
                                    <div className="space-y-2">
                                      <h5 className="text-xs font-medium">
                                        Sanitization Options
                                      </h5>

                                      <div className="flex items-center justify-between">
                                        <Label
                                          htmlFor={`sanitize-${column}`}
                                          className="text-xs"
                                        >
                                          Apply sanitization to this column
                                        </Label>
                                        <Switch
                                          id={`sanitize-${column}`}
                                          checked={
                                            columnSanitizationSettings[column]
                                              ?.enableSanitization !== false
                                          }
                                          onCheckedChange={(checked) =>
                                            handleColumnSanitizationChange(
                                              column,
                                              { enableSanitization: checked },
                                            )
                                          }
                                        />
                                      </div>

                                      {sanitizationOptions.removeSpecialChars &&
                                        columnSanitizationSettings[column]
                                          ?.columnType !== "zipcode" &&
                                        columnSanitizationSettings[column]
                                          ?.columnType !== "phone" &&
                                        columnSanitizationSettings[column]
                                          ?.columnType !== "email" &&
                                        columnSanitizationSettings[column]
                                          ?.columnType !== "currency" && (
                                          <div className="space-y-2 border-t pt-2">
                                            <Label className="text-xs">
                                              Special characters to preserve:
                                            </Label>
                                            <div className="grid grid-cols-4 gap-2">
                                              {[
                                                "-",
                                                ".",
                                                "/",
                                                "@",
                                                "_",
                                                "&",
                                                "%",
                                                "#",
                                              ].map((char) => (
                                                <div
                                                  key={char}
                                                  className="flex items-center gap-1"
                                                >
                                                  <Checkbox
                                                    id={`preserve-${char}-${column}`}
                                                    checked={columnSanitizationSettings[
                                                      column
                                                    ]?.preserveCharacters?.includes(
                                                      char,
                                                    )}
                                                    onCheckedChange={(
                                                      checked,
                                                    ) => {
                                                      const current =
                                                        columnSanitizationSettings[
                                                          column
                                                        ]?.preserveCharacters ||
                                                        "";
                                                      let newPreserved =
                                                        current;

                                                      if (
                                                        checked &&
                                                        !current.includes(char)
                                                      ) {
                                                        newPreserved += char;
                                                      } else if (!checked) {
                                                        newPreserved =
                                                          newPreserved.replace(
                                                            char,
                                                            "",
                                                          );
                                                      }

                                                      handleColumnSanitizationChange(
                                                        column,
                                                        {
                                                          preserveCharacters:
                                                            newPreserved,
                                                        },
                                                      );
                                                    }}
                                                  />
                                                  <Label
                                                    htmlFor={`preserve-${char}-${column}`}
                                                    className="text-xs"
                                                  >
                                                    {char}
                                                  </Label>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                      {(columnSanitizationSettings[column]
                                        ?.columnType === "zipcode" ||
                                        columnSanitizationSettings[column]
                                          ?.columnType === "phone" ||
                                        columnSanitizationSettings[column]
                                          ?.columnType === "email" ||
                                        columnSanitizationSettings[column]
                                          ?.columnType === "currency") && (
                                        <div className="text-muted-foreground mt-2 rounded-md border p-2 text-xs">
                                          <span className="font-medium">
                                            Note:
                                          </span>{" "}
                                          Specialized formatting for{" "}
                                          {columnSanitizationSettings[column]
                                            ?.columnType === "zipcode"
                                            ? "ZIP codes"
                                            : columnSanitizationSettings[column]
                                                  ?.columnType === "phone"
                                              ? "phone numbers"
                                              : columnSanitizationSettings[
                                                    column
                                                  ]?.columnType === "email"
                                                ? "email addresses"
                                                : "currency values"}{" "}
                                          will override general sanitization
                                          settings.
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.slice(0, visibleRows).map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {selectedColumns.map((column) => (
                      <TableCell key={`${rowIndex}-${column}`}>
                        {row[column] !== undefined && row[column] !== null
                          ? String(row[column])
                          : ""}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredData.length > visibleRows && (
            <div className="flex justify-center p-4">
              <Button variant="outline" onClick={showMoreRows}>
                Load more rows ({visibleRows} of {filteredData.length})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
