
# Project Overview: Data Extraction & Format Conversion Tool

## Goal

Build a desktop application that automates the extraction and transformation of data from various file formats (e.g., Excel, PDF) into customized output formats (e.g., new Excel sheets, PDFs, structured data, or emails). The goal is to eliminate repetitive manual formatting work for recurring reports.

---

## Key Features

### Input Formats
- ✅ Excel (.xlsx, .xls)
- ✅ CSV
- ✅ PDF (text-based; optional: OCR support for scanned PDFs)
- ❌ Image support (future feature)

### Output Formats
- ✅ Excel (transformed layout)
- ✅ PDF (formatted reports)
- ✅ CSV
- ✅ Email output (e.g., attach results, send to predefined addresses)
- ✅ JSON or tabular formats for internal processing

---

## Workflow

1. **User uploads a file** (Excel, PDF, CSV).
2. **User selects or defines a transformation template**, which specifies:
   - What data to extract (columns, keywords, patterns)
   - How to structure the output (rows/columns, formatting)
   - What format to export to (Excel, PDF, email, etc.)
3. **App processes file** using the selected template.
4. **Preview output** (optional).
5. **Export/save/send** result.

---

## Rule Definition (Example)

Transformation rules should be user-definable via:
- JSON config files
- Visual UI (optional future version)

Example:
```json
{
  "inputType": "pdf",
  "fields": [
    { "label": "Invoice Number", "match": "Invoice #:", "after": true },
    { "label": "Total Amount", "regex": "Total:\s+\$([0-9,.]+)" }
  ],
  "output": {
    "type": "excel",
    "columns": ["Invoice Number", "Total Amount"]
  }
}
```

---

## Technical Stack

### Platform
- 🖥 Native Desktop App

### Framework Options
- **Electron** (preferred): full Node.js support and desktop capabilities
- Optional Alternative: **Tauri** for smaller footprint (with some Rust knowledge)

### UI
- **HTML/CSS + Tailwind CSS**
- Optionally React or Svelte inside Electron

### Libraries
- `xlsx` or `exceljs` – Excel parsing and writing
- `pdf-parse` or `pdf-lib` – PDF text extraction
- `nodemailer` – Email output support
- `fs` – Local file system access
- `tailwindcss` – Styling the UI

---

## Future Enhancements
- OCR support for scanned PDFs (via Tesseract.js)
- Drag-and-drop interface for files and rule creation
- Cloud sync or remote processing option
- React Native frontend for light mobile version (paired with backend API)

---

## Notes
- Large Excel files (100k+ rows) must be handled efficiently.
- Keep processing local to maintain privacy unless using a backend.
- Prefer modular and maintainable architecture for rule sets and file processing.
