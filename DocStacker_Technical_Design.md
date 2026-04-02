# DocStacker Technical Design
Layered document assembly, variable rendering, and signing
Date: 2026-01-31

## Document Control
| Version | 1.0 |
| --- | --- |
| Status | Draft |
| Last updated | 2026-01-31 |
| Owner | Engineering |

# 1. Purpose and Scope
This document describes the proposed technical architecture and implementation details for DocStacker: a document generation and signing middleware built around the “Dynamic Sandwich on a Static Base” model.
In scope:
Template package management (letterhead, cover, body, terms and conditions).
Global placeholder extraction, schema definition, validation, and hydration.
Deterministic rendering pipeline (DOCX/RTF to PDF) and PDF assembly (cover + body + T&C).
Letterhead underlay application as a background layer, with safe-zone enforcement.
DocuSign-style field placement with anchor logic (first page / last page / every page / page N).
Signature stamping (API mode) and interactive signer portal (optional phase).
Versioning, audit trail, and security controls suitable for business-critical documents.
Out of scope for MVP:
General-purpose in-browser document editing (Word-like editing).
Perfect placeholder replacement inside arbitrary PDFs without form fields or manual bounding boxes.
Advanced clause libraries or contract lifecycle management (CLM).
# 2. Architecture Overview
DocStacker is split into an API/backend layer, a rendering/worker layer, and two web frontends (Template Studio/Generator and Signer Portal).
High-level component diagram:

## 2.1 Services and Responsibilities
Web App (Template Studio + Generator): upload and version template assets, map variables, preview stitched output, place fields, and initiate signing.
Signer Portal (Web): restricted experience for external/internal signers to apply signatures and complete assigned fields.
API Backend: auth/RBAC, template and document orchestration, validation, persistence, job dispatch, webhook dispatch, signed URL generation.
Rendering Service (Workers): deterministic DOCX-to-PDF conversion, PDF merge/underlay, field overlay rendering, final flattening, and artifact creation (audit report).
Object Storage: immutable storage for uploaded templates and generated artifacts (PDF/DOCX/images).
Database: metadata, versions, variables schema, field placement, signing state, and audit logs.
Notification/Webhook Service: email/SMS notifications, callbacks to upstream systems.
## 2.2 Suggested Technology Stack
The stack below is pragmatic and optimized for deterministic rendering and maintainability:
API Backend: Python (FastAPI) or TypeScript (NestJS).
Rendering Workers: Python, containerized, single-render process per container for LibreOffice stability.
Queue: Redis (RQ/Celery) or RabbitMQ (Celery).
Database: PostgreSQL.
Object Storage: S3-compatible (AWS S3, MinIO, GCS with S3 gateway).
PDF operations: pikepdf/qpdf, pypdf, PyMuPDF (metrics/extraction), ReportLab (overlay rendering).
Optional digital signatures: pyHanko (PAdES) for cryptographic signing.
Frontend: React + PDF.js for preview/render; interact.js/react-dnd for drag/drop fields.
Key constraint: DOCX-to-PDF conversion must be deterministic. This implies pinned container images, pinned LibreOffice versions, and managed fonts.
# 3. Core Data Flows
## 3.1 Template Publish Flow
Template Architect uploads assets: Letterhead (PDF), Cover (DOCX), Body (DOCX or PDF), T&C (PDF).
System extracts placeholders from all variable-capable assets and constructs a Master Variable List.
Architect edits the schema: types, required/optional, formatting rules, allowed values, and conditional/repeater patterns.
System generates a stitched preview (cover + sample body + T&C) with letterhead underlay.
Architect places default signature zones (optional) and validates layout constraints (safe zones, overflow rules).
Template Package is published as an immutable version.
## 3.2 Document Generation Flow (Runtime)
Document Creator selects a Template Package version and provides variable inputs (UI form or API JSON).
API validates inputs against the template schema (types, required fields, overflow constraints where possible).
API creates a Document Instance + Document Version (version 1) and enqueues a render job.
Rendering Worker hydrates templates with inputs, converts variable parts to PDF, stitches cover + body + T&C, and applies letterhead underlay.
Worker stores preview PDF and updates Document Version state to PREVIEW_READY.
Creator previews, places fields, and initiates signing or direct stamping mode.
Worker produces the final signed PDF, flattens it, creates audit artifacts, and updates Document Version state to COMPLETED.
## 3.3 Signing Flow (Interactive Portal)
Creator specifies signers (email, role, routing order) and required fields.
System sends signer invitations via email/SMS with single-use tokens.
Signer authenticates (magic link/OTP per policy), views assigned fields, and applies signature/initials.
System embeds signature appearance into the PDF at the stored coordinates and records audit events.
When all required fields are completed, system finalizes and optionally applies cryptographic PDF signatures.
# 4. Rendering and Assembly Engine
The rendering engine is the core risk and must be designed for determinism. All coordinate-based operations (variables overlay, signature placement) depend on stable layout.
## 4.1 Inputs and Outputs
Inputs: letterhead.pdf, cover template (DOCX), body template (DOCX or PDF), terms.pdf, variable JSON, field placements (optional), signature images or signer events.
Outputs: preview.pdf (unsigned), final.pdf (signed/flattened), audit.json (machine), audit.pdf (human-readable, optional).
## 4.2 Deterministic Pipeline
Pipeline stages:
Hydration: fill placeholders and evaluate controlled conditionals/repeaters.
Conversion: render hydrated DOCX/RTF to PDF in a pinned LibreOffice container.
Concatenation: merge PDFs in order: cover → body → terms (multi-page).
Letterhead underlay: apply letterhead as a background to configured pages.
Overlay: render variable overlays (PDF token mode), signature fields, and signature images as a separate overlay PDF, then merge.
Flatten: finalize output to remove editable layers/form fields (policy-driven).
Integrity: compute hashes, write audit events, and store artifacts.
## 4.3 DOCX Hydration Strategy
DOCX hydration should avoid brittle string replacement inside raw XML. Use a templating approach that preserves DOCX structure and supports tables.
Recommended: docxtpl (Jinja2-based) for placeholders and controlled repeaters.
Alternative: python-docx with explicit runs replacement (more brittle; placeholders can be split across runs).
Template authoring rule: placeholders must not be split across different runs; enforce with validation on upload.
## 4.4 DOCX → PDF Conversion
Use headless LibreOffice in a container. Pin the LO version and ship a curated font set inside the image.
Run one conversion per worker process (avoid concurrency inside a single LO instance).
Apply strict timeouts and retry with clean worker if LO crashes/hangs.
Maintain a render profile per template version: page size, margins, default fonts, locale.
## 4.5 PDF Stitching and Letterhead Underlay
After conversion, PDFs are stitched. Letterhead is applied as an underlay (background) on a per-page basis.
Stitching: use pikepdf/qpdf for stable merging and metadata handling.
Underlay: for each target page, merge letterhead page as background. If letterhead is single-page but output is multi-page, repeat by default (configurable).
Safe zones: store reserved header/footer rectangles in normalized coordinates and enforce in UI + server.
## 4.6 PDF Body Modes (Constrained Support)
Body input can be DOCX (preferred) or PDF (constrained).
PDF Form Fill mode:
Map AcroForm field names to variables; fill values; optionally flatten forms.
Best for deterministic placement because fields already have coordinates.
PDF Overlay Token mode:
Detect placeholder tokens and their bounding boxes via PDF text extraction (best effort).
Overlay filled values into bounding box; optionally white-out the token behind.
If auto-detection fails, allow manual mapping UI (click-drag bounding box).
No text reflow; enforce overflow strategy (shrink-to-fit / wrap / hard error).
# 5. Signature and Field Placement System
## 5.1 Field Types
signature: signer’s signature image/appearance
initials: short signature/initial stamp
name: auto-filled from signer profile
date: signing timestamp in a configured format
text: optional free text (policy-controlled)
checkbox: optional acknowledgements (policy-controlled)
## 5.2 Coordinate System and Transformations
PDF coordinates are measured in points (1/72 inch) from the bottom-left origin. Most browser PDF viewers (PDF.js) use a top-left origin. The system stores both normalized coordinates and absolute points to keep placement stable across zoom and differing page sizes.
Definitions:
Page width W and height H in PDF points.
Normalized coordinates: x_norm = x / W, y_norm = y / H, w_norm = w / W, h_norm = h / H.
When UI captures top-left based coordinates: y_norm_ui = 1 - (y_top / H). Convert carefully using field height.
Recommended storage:
Store x_norm, y_norm, w_norm, h_norm and also the resolved x_pt, y_pt, w_pt, h_pt at render time.
Store the page index and page rotation.
Store the anchor logic (FIRST_PAGE, LAST_PAGE, ALL_PAGES, PAGE_N, SECTION_TC_FIRST, etc.).
## 5.3 Anchor Logic Resolution
FIRST_PAGE: apply to page index 0.
LAST_PAGE: apply to page index (total_pages - 1) after full assembly.
ALL_PAGES: replicate onto each page (same normalized coordinates).
PAGE_N: apply to the configured page number (validated against total pages).
SECTION-based anchors (optional): resolve by tracking page ranges for cover/body/terms during stitching.
## 5.4 Field Placement Validation
Prevent placement outside page bounds.
Prevent placement in safe zones unless explicitly permitted.
Prevent overlapping fields if policy disallows.
Enforce required fields for each signer role before sending for signing.
# 6. Versioning, Immutability, and Auditability
Versioning is required to keep documents legally defensible: once a document is sent for signature, the underlying content must not change.
Template Packages are versioned; published versions are immutable.
Document Instances are versioned; generating new previews after sending requires creating a new document version.
Audit events are append-only (immutable).
Final PDF is flattened and hashed; store SHA-256 hash alongside metadata.
# 7. Security Design
## 7.1 Multi-tenancy and RBAC
All records include tenant_id; queries are tenant-scoped.
Role-based access control: Admin, Template Architect, Creator, Signer, Auditor.
Signer access via short-lived tokens scoped to a single document version.
## 7.2 Data Protection
Encrypt sensitive variable payloads at rest using envelope encryption (KMS).
Object storage buckets with server-side encryption and strict IAM policies.
Use signed URLs with short TTL for downloads; require re-authentication for sensitive docs where applicable.
## 7.3 Threat Model Notes
Prevent template poisoning: virus scan uploaded files, restrict MIME types, block macros.
Prevent token leakage: store only token hashes in DB; never store raw magic links.
Prevent document tampering: store hashes and (optionally) apply cryptographic PDF signatures.
# 8. Observability and Quality Controls
Structured logs with correlation IDs (document_id, job_id).
Metrics: render latency p50/p95, conversion failure rate, queue depth, LO crash rate.
Tracing: distributed tracing across API and worker jobs.
Golden-file regression tests: store expected PDF outputs for representative templates and compare on each release.
Pixel-diff testing for layout drift detection (convert PDFs to images and diff within tolerance).
# 9. Open Decisions and Trade-offs
Decisions that must be made early to avoid expensive rewrites:
Primary dynamic format: standardize on DOCX for cover/body, and use PDF forms for PDF-only flows.
Whether to support arbitrary PDF token replacement (best effort) in MVP or defer to a later phase.
Signing mode: API stamping first vs interactive portal first.
Whether cryptographic signing (PAdES) is required for target customers/compliance.
