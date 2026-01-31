# DocStacker Product Requirements Document
Document generation + signing on a layered PDF base
Date: 2026-01-31

## Document Control
| Version | 1.0 |
| --- | --- |
| Status | Draft |
| Last updated | 2026-01-31 |
| Owner | Product |

# 1. Executive Summary
DocStacker is a document generation and signing engine designed to produce branded, legally compliant PDFs at scale. It solves a common operational gap: teams want documents that (a) always use the correct letterhead and terms, (b) can be generated from data inputs, and (c) support precise signature placement without manual PDF editing.
# 2. Core Concept: Layered Architecture
DocStacker uses a 3-layer approach:
Layer 0 — Static Base: A letterhead PDF used as a repeating background (header/footer) across all pages.
Layer 1 — Dynamic Sandwich: A content stream stitched as: First Page (dynamic customer info) + Middle Content (DOCX/PDF body) + Last Page (static Terms & Conditions).
Layer 2 — Overlay: Coordinate-based fields for signatures/initials/stamps, placed via a DocuSign-style UI.
# 3. Problem Statement
Current document workflows often require manual assembly in Word/PDF editors, leading to errors and inconsistent branding.
Standard mail-merge tools don’t handle multi-part templates (cover + dynamic body + static T&C) and are weak on signature placement.
Teams need a repeatable, auditable, API-driven way to produce final PDFs and manage signing flows.
# 4. Goals and Non-Goals
## 4.1 Goals
Generate a final PDF that is visually consistent with the letterhead and template formatting.
Replace placeholders with provided variable values across all slices (first page, body, last page).
Support variable-length documents (body can expand to many pages).
Allow field placement for signing using a drag-and-drop UI with page-aware anchor rules.
Provide an API for integration and automation.
Maintain strong versioning and auditability for compliance.
## 4.2 Non-Goals (MVP)
Full WYSIWYG document authoring inside the web app.
Perfect text reflow edits on arbitrary uploaded PDFs (beyond PDF forms and constrained overlay).
Complex negotiation workflows (redlining, clause libraries, approvals) beyond basic routing.
# 5. Personas
| Persona | Role | Primary Goals |
| --- | --- | --- |
| Template Architect (Admin) | Operations / Legal Ops | Build template packages, define variables, set default signature zones. |
| API Consumer (Developer) | Engineering | Generate documents via API with JSON inputs and retrieve final PDFs. |
| Document Creator | Sales / Ops | Generate correct docs quickly, preview, and send for signing. |
| Signer | Customer / Internal approver | Review and sign easily from any device; trust the document is correct. |

# 6. User Journeys
## 6.1 Template Setup
Admin uploads Letterhead PDF.
Admin uploads First Page template (DOCX) and defines customer/misc placeholders.
Admin uploads Body template (DOCX preferred; PDF supported in constrained modes).
Admin uploads Last Page T&C (PDF; static).
System extracts placeholders across all assets and generates a master variable list.
Admin validates schema, publishes a template version, and sets default signature zones.
## 6.2 Document Generation
Creator selects template version and enters variables (UI form) or an upstream system calls the API.
System validates and generates preview PDF.
Creator reviews preview; if acceptable, proceeds to field placement/signing.
## 6.3 Signing
Creator places signature fields and assigns signers/roles.
System sends invitations or accepts signature images via API (stamping mode).
Signer completes fields; system finalizes and produces a signed PDF plus audit log.
# 7. Functional Requirements
## 7.1 Template Package Manager
Upload and manage assets: Letterhead (PDF), First Page (DOCX), Body (DOCX/PDF), Last Page (PDF).
Validate asset page sizes (A4/Letter) and provide warnings for mismatches.
Versioning: Draft → Published → Archived. Published versions are immutable.
Preview: generate a stitched preview using sample data to verify layout.
## 7.2 Variable and Placeholder Engine
Placeholder syntax: {{variable_name}} (configurable delimiter).
Global extraction: placeholders detected across first page, body, and terms if applicable.
Data types: string, number, currency, date, boolean. Formatting rules per variable.
Conditional blocks and repeaters (Phase 5): allow controlled loops for invoice line items and show/hide sections.
## 7.3 Stitched Document Assembly
Order: First Page (page 1) + Body (page 2..N-1) + Terms (page N).
Apply Letterhead as underlay on all pages by default (configurable to exclude terms or cover if desired).
Ensure a hard page break after First Page to keep it isolated.
Ensure Terms are always last, regardless of body length.
## 7.4 Field Placement (DocuSign-style UI)
Canvas preview with drag-and-drop fields: signature, initials, name, date.
Field boxes are resizable and support alignment aids (snap-to-grid optional).
Anchors: First Page, Last Page (dynamic), All Pages, Page N.
Store coordinates as normalized values to make placement stable across zoom.
## 7.5 Generation and Finalization Engine
Hydrate placeholders, convert to PDF, stitch, apply letterhead, overlay fields/signatures, and flatten.
Expose job status and outputs via API and web UI.
Generate audit trail and document hashes.
# 8. Non-Functional Requirements
Rendering fidelity: must preserve complex formatting (tables, bullets, headers) for DOCX templates.
Determinism: same template version + same input must produce consistent layout (within tolerance).
Performance target: preview render under 3 seconds for a 10-page document under typical load (configurable SLA).
Scalability: support bodies up to 50 pages; workers must scale horizontally.
Security: tenant isolation, encrypted storage of sensitive variables, signed URLs for downloads.
Auditability: append-only audit events; final PDF hashed and optionally cryptographically signed.
# 9. Success Metrics
Reduction in manual document preparation time (baseline vs DocStacker).
Template publish-to-use cycle time.
Render success rate and p95 render latency.
Signature completion rate and time-to-sign.
Support tickets related to layout drift or incorrect placement (should trend down).
# 10. Risks and Mitigations
DOCX conversion drift: mitigate with pinned container + fonts + regression tests.
PDF body placeholder replacement complexity: prioritize PDF forms and manual mapping.
Template authoring issues (placeholders split across runs): add upload validations and authoring guide.
Compliance needs (eIDAS/ESIGN): plan for cryptographic signing and audit exports.
