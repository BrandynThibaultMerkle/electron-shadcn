export interface TransformationRule {
  sourceColumn: string;
  targetColumn: string;
  transformation?: (value: any) => any;
  validation?: (value: any) => boolean;
}

export interface TransformationPreset {
  id: string;
  name: string;
  description?: string;
  inputFormat: {
    type: "excel" | "csv";
    columns: string[];
  };
  outputFormat: {
    type: "excel" | "csv";
    columns: string[];
    rules: TransformationRule[];
  };
  sanitizationRules: {
    removeSpecialChars: boolean;
    sanitizeZipCodes: boolean;
  };
}

export interface FileProcessingOptions {
  chunkSize?: number;
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
}

export interface DataSanitizationOptions {
  removeSpecialChars: boolean;
  sanitizeZipCodes: boolean;
}
