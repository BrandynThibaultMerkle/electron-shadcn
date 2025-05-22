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
import { Search, Undo, Redo, Settings } from "lucide-react";
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

interface DataPreviewProps {
  data: any[];
  title?: string;
  onColumnsChange?: (columns: string[]) => void;
}

interface HistoryState {
  selectedColumns: string[];
}

export function DataPreview({
  data,
  title = "Data Preview",
  onColumnsChange,
}: DataPreviewProps) {
  const [visibleRows, setVisibleRows] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

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
      const columns = Object.keys(data[0]);
      setSelectedColumns(columns);
      setHistory([{ selectedColumns: columns }]);
      setHistoryIndex(0);
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
                        {column}
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
                    {column}
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
                      {column}
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
