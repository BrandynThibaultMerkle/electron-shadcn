# Data Transformation Tool

An Electron desktop application that automates the extraction and transformation of data from various file formats (Excel, CSV, PDF) into customized output formats.

## Features

- **File Upload**: Support for Excel (.xlsx, .xls), CSV, and text-based PDF files
- **Data Preview**: View uploaded data with collapsible interface for large datasets
- **Column Selection**: Choose which columns to include in the output
- **Column Renaming**: Rename columns for the output file
- **Data Sanitization**: Apply data cleaning rules to standardize output
- **Preset Management**: Save and reuse transformation configurations
- **Export**: Download transformed data as CSV

## Development

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone [repository-url]
cd electron-shadcn

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build

```bash
# Build for production
npm run build

# Package the application
npm run package
```

## Technology Stack

- Electron
- React
- TypeScript
- Tailwind CSS v4
- Shadcn UI Components

## License

MIT
