# 📄 DocStacker

> **Stack PDFs • Place Signature Fields • Sign Documents**

A full-stack document signing application that allows users to merge multiple PDF documents, place signature fields, capture signatures (draw or type), and download the final signed document with optional company stamp overlay.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Java](https://img.shields.io/badge/Java-21-orange.svg)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.x-green.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)

---

## ✨ Features

- **📚 PDF Stacking** - Merge cover page, body content, and terms & conditions into a single document
- **🖼️ Letterhead Underlay** - Apply company letterhead as background on all pages
- **✍️ Signature Fields** - Drag-and-drop signature field placement on any page
- **👥 Multi-Signer Support** - Configure up to 5 signers with color-coded fields
- **🖊️ Signature Capture** - Draw signatures or type with calligraphic fonts
- **🏢 Company Stamp** - Optional stamp overlay positioned behind signatures
- **📱 Preview & Download** - Full document preview with zoom and pagination

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                          │
│                      http://localhost:3000                          │
├─────────────────────────────────────────────────────────────────────┤
│  Upload → Place Fields → Sign → Download                            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ REST API
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        BACKEND (Spring Boot)                        │
│                      http://localhost:8080                          │
├─────────────────────────────────────────────────────────────────────┤
│  PdfStackingService │ SignatureService │ StorageService             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Java 21** (use [SDKMAN](https://sdkman.io/) for easy installation)
- **Node.js 18+** (use [NVM](https://github.com/nvm-sh/nvm) for easy installation)
- **Maven 3.8+**

### Installation

```bash
# Clone the repository
git clone https://github.com/chiragshivam/docstacker.git
cd docstacker

# Start Backend
cd backend
sdk env install  # or ensure Java 21 is active
mvn spring-boot:run

# Start Frontend (new terminal)
cd frontend
nvm use 18  # or ensure Node 18+ is active
npm install
npm run dev
```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080/api

---

## 📁 Project Structure

```
docstacker/
├── backend/                    # Spring Boot application
│   ├── src/main/java/com/docstacker/
│   │   ├── controller/         # REST API endpoints
│   │   ├── service/            # Business logic
│   │   ├── model/              # Data models
│   │   ├── dto/                # Request/Response DTOs
│   │   └── config/             # Configuration classes
│   └── pom.xml                 # Maven dependencies
│
├── frontend/                   # Next.js application
│   ├── src/
│   │   ├── app/                # Next.js App Router pages
│   │   ├── components/steps/   # Step components
│   │   └── api/                # API client
│   └── package.json            # NPM dependencies
│
└── docs/                       # Documentation
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/stack` | Stack PDFs together |
| `GET` | `/api/documents/{id}/preview` | Get PDF preview |
| `GET` | `/api/documents/{id}/info` | Get document metadata |
| `GET` | `/api/documents/{id}/pages/{n}/image` | Render page as PNG |
| `POST` | `/api/documents/{id}/fields` | Save field placements |
| `GET` | `/api/documents/{id}/fields` | Get field placements |
| `POST` | `/api/documents/{id}/sign` | Apply signatures |
| `POST` | `/api/documents/{id}/finalize` | Flatten PDF |
| `GET` | `/api/documents/{id}/download` | Download final PDF |

---

## 🧪 E2E Testing

The application includes built-in E2E test automation buttons:

1. **Upload Step**: Click `🧪 Run E2E Test` to auto-load test documents
2. **Place Fields Step**: Click `🤖 Auto-Place All` to auto-place signature fields
3. **Sign Step**: Click `🤖 Auto-Sign All` to auto-generate signatures

---

## 🛠️ Tech Stack

### Backend
- Java 21
- Spring Boot 3.x
- Apache PDFBox 3.x
- Lombok
- Maven

### Frontend
- Next.js 14 (App Router)
- React 18
- Material UI (MUI) v5
- TypeScript
- Axios

---

## 📋 Workflow

```
┌──────────────────┐
│  1. UPLOAD       │  Upload letterhead, cover, body, T&C PDFs
│     DOCUMENTS    │  Configure signers (1-5)
└────────┬─────────┘  Optional: Upload company stamp
         │
         ▼
┌──────────────────┐
│  2. PLACE        │  View document pages as images
│     FIELDS       │  Drag-drop signature fields per signer
└────────┬─────────┘  Color-coded by signer
         │
         ▼
┌──────────────────┐
│  3. SIGN         │  Each signer draws or types signature
│     DOCUMENT     │  Calligraphic font options for typed
└────────┬─────────┘  Sequential signer flow
         │
         ▼
┌──────────────────┐
│  4. DOWNLOAD     │  Preview final document with zoom
│     PREVIEW      │  Finalize (flatten) option
└──────────────────┘  Download signed PDF
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Chirag Chopra** - [GitHub](https://github.com/chiragshivam)

---

## 🙏 Acknowledgments

- [Apache PDFBox](https://pdfbox.apache.org/) for PDF manipulation
- [Material UI](https://mui.com/) for beautiful React components
- [Google Fonts](https://fonts.google.com/) for calligraphic signature fonts
