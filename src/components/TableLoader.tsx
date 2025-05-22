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

interface TableLoaderProps {
  data: any[];
  columns: string[];
  initialRows?: number;
  rowIncrement?: number;
  columnLabels?: Record<string, string>; // Map of column IDs to display names
}

export function TableLoader({
  data,
  columns,
  initialRows = 10,
  rowIncrement = 10,
  columnLabels = {},
}: TableLoaderProps) {
  const [visibleRows, setVisibleRows] = useState(initialRows);
  const [loading, setLoading] = useState(false);

  // Reset visible rows when data changes
  useEffect(() => {
    setVisibleRows(initialRows);
  }, [data, initialRows]);

  const showMoreRows = () => {
    setLoading(true);
    // Use setTimeout to prevent UI blocking when loading large datasets
    setTimeout(() => {
      setVisibleRows((prev) => Math.min(prev + rowIncrement, data.length));
      setLoading(false);
    }, 50);
  };

  // Get column display name from columnLabels or use the column ID
  const getColumnLabel = (columnId: string): string => {
    return columnLabels[columnId] || columnId;
  };

  return (
    <div className="w-full">
      <div className="max-h-[600px] overflow-auto rounded-md border">
        <Table>
          <TableHeader className="bg-background sticky top-0 z-10">
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column}
                  className="px-4 py-3 font-bold whitespace-nowrap"
                >
                  {getColumnLabel(column)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(0, visibleRows).map((row, rowIndex) => (
              <TableRow key={rowIndex} className="hover:bg-muted/50">
                {columns.map((column) => (
                  <TableCell
                    key={`${rowIndex}-${column}`}
                    className="border px-4 py-2"
                  >
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

      {data.length > visibleRows && (
        <div className="mt-2 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={showMoreRows}
            disabled={loading}
          >
            {loading
              ? "Loading..."
              : `Load more rows (${visibleRows} of ${data.length})`}
          </Button>
        </div>
      )}
    </div>
  );
}
