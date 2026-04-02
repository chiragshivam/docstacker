# DocStacker - Phase 1 Implementation Complete

## Overview

DocStacker is a document stacking and signing engine that allows you to:
1. **Stack PDFs** - Combine letterhead (background) + cover + body + terms into a single document
2. **Place Signature Fields** - Drag and drop signature fields at specific x/y coordinates
3. **Sign Documents** - Draw signatures and stamp them onto the PDF
4. **Download** - Get the final signed PDF

## Project Structure

```
document-signer/
├── backend/                    # Java 21 + Spring Boot API
│   ├── src/main/java/com/docstacker/
│   │   ├── controller/         # REST endpoints
│   │   ├── service/            # Business logic
│   │   ├── model/              # Data models
│   │   ├── dto/                # Request/Response DTOs
│   │   └── config/             # Configuration
│   └── pom.xml
├── frontend/                   # Next.js + React + MUI
│   ├── src/
│   │   ├── app/                # Next.js App Router
│   │   ├── components/         # React components
│   │   └── api/                # API client
│   └── package.json
├── berry-template-full-version/ # Reference template (read-only)
└── docs/                       # Documentation
```

## Technology Stack

### Backend
| Component | Technology |
|-----------|------------|
| Runtime | Java 21 |
| Framework | Spring Boot 3.2 |
| PDF Operations | Apache PDFBox 3.0 |
| DOCX Processing | Apache POI 5.2 |

### Frontend
| Component | Technology |
|-----------|------------|
| Framework | Next.js 14 |
| UI Library | Material UI 5 |
| Signature Capture | Custom Canvas |
| HTTP Client | Axios |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stack` | POST | Stack PDFs with letterhead underlay |
| `/api/documents/{id}/preview` | GET | Get PDF preview |
| `/api/documents/{id}/info` | GET | Get document info (pages, dimensions) |
| `/api/documents/{id}/fields` | GET/POST | Get/Save signature field placements |
| `/api/documents/{id}/sign` | POST | Apply signatures to document |
| `/api/documents/{id}/finalize` | POST | Flatten PDF |
| `/api/documents/{id}/download` | GET | Download final PDF |

## Getting Started

### Prerequisites
- Java 21
- Node.js 18+
- Maven

### Backend Setup

```bash
cd backend

# Build and run
mvn spring-boot:run
```

The backend will start on `http://localhost:8080`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local

# Run development server
npm run dev
```

The frontend will start on `http://localhost:3000`

## Usage Flow

1. **Upload Documents**
   - Upload letterhead PDF (optional, applied as background)
   - Upload cover page PDF (required)
   - Upload body content PDF (required)
   - Upload terms & conditions PDF (optional)

2. **Place Signature Fields**
   - Click "Signature", "Date", or "Text" to add fields
   - Drag fields to position them on the document
   - Click "Continue to Sign"

3. **Sign Document**
   - Draw your signature in the canvas
   - Click "Sign Document"

4. **Download**
   - Optionally finalize (flatten) the PDF
   - Download the signed document

## Core Services

### PdfStackingService
- `stitchPdfs()` - Merge multiple PDFs in order
- `applyLetterheadUnderlay()` - Apply letterhead as background on all pages
- `assembleDocument()` - Full pipeline: stitch + letterhead

### SignatureService
- `applySignature()` - Stamp signature image at x/y coordinates
- `applyMultipleSignatures()` - Apply multiple signatures
- `flattenPdf()` - Flatten PDF layers

## Coordinate System

Signatures are placed using **normalized coordinates** (0.0 to 1.0):

```
Browser (top-left origin):          PDF (bottom-left origin):
┌─────────────────┐                 ┌─────────────────┐
│ (0,0)      (1,0)│                 │ (0,H)      (W,H)│
│                 │    Convert:     │                 │
│                 │   ─────────►    │                 │
│ (0,1)      (1,1)│                 │ (0,0)      (W,0)│
└─────────────────┘                 └─────────────────┘

PDF_X = xNorm * pageWidth
PDF_Y = (1 - yNorm - heightNorm) * pageHeight
```

## Next Steps (Phase 2+)

- [ ] DOCX placeholder hydration
- [ ] Template versioning and publishing
- [ ] Multiple signers with routing
- [ ] Email notifications
- [ ] Audit trail
- [ ] S3 storage integration
