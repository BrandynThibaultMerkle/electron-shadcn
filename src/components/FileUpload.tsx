import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileType } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  acceptedFileTypes?: string[];
}

export function FileUpload({
  onFileUpload,
  acceptedFileTypes = [".xlsx", ".xls", ".csv"],
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convert file types array to accept attribute format
  const acceptString = acceptedFileTypes.join(",");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("File selected:", file.name);
      setSelectedFile(file);
      onFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      // Check file extension
      const fileExt = file.name.split(".").pop()?.toLowerCase();
      if (acceptedFileTypes.includes(`.${fileExt}`)) {
        console.log("File dropped:", file.name);
        setSelectedFile(file);
        onFileUpload(file);
      } else {
        alert(
          `Unsupported file format. Please upload one of: ${acceptedFileTypes.join(", ")}`,
        );
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25",
          selectedFile ? "bg-muted/10" : "",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div
          className={cn(
            "mb-4 rounded-full p-2",
            isDragging ? "text-primary" : "text-muted-foreground",
          )}
        >
          {selectedFile ? (
            <FileType className="size-8" />
          ) : (
            <Upload className="size-8" />
          )}
        </div>

        <input
          type="file"
          accept={acceptString}
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
          ref={fileInputRef}
        />

        {selectedFile ? (
          <div className="flex flex-col items-center">
            <p className="font-medium">{selectedFile.name}</p>
            <p className="text-muted-foreground text-sm">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
            <Button
              variant="link"
              size="sm"
              className="mt-2"
              onClick={handleButtonClick}
            >
              Change File
            </Button>
          </div>
        ) : (
          <>
            <p className="mb-2 text-sm font-medium">
              Drag & drop your Excel file here or click to browse
            </p>
            <p className="text-muted-foreground mb-4 text-xs">
              Supports Excel and CSV files
            </p>
            <Button onClick={handleButtonClick}>Choose File</Button>
          </>
        )}
      </div>
    </div>
  );
}
