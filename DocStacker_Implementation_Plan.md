# DocStacker Implementation Plan
Phased delivery plan, milestones, and work breakdown
Date: 2026-01-31

## Document Control
| Version | 1.0 |
| --- | --- |
| Status | Draft |
| Last updated | 2026-01-31 |
| Owner | Product & Engineering |

# 1. Delivery Principles
De-risk layout determinism first. If rendering is unstable, signature coordinates and variable overlays will fail.
Version everything (templates, letterheads, T&Cs, documents). Freeze content once a document is sent for signature.
Prefer constrained, reliable capabilities over broad, brittle ones (e.g., PDF form fill over arbitrary PDF text replacement).
Build preview-first workflows: every major step should be verifiable in a stitched preview before production use.
# 2. Workstreams
Platform foundation: auth, RBAC, tenanting, storage, database, job queue, CI/CD.
Template system: asset upload, placeholder extraction, schema editor, versioning, publish workflow.
Rendering engine: DOCX hydration, DOCX->PDF conversion, PDF stitching, letterhead underlay, artifact storage.
Preview and mapping UI: PDF viewer, stitched preview, safe zones, variable list, field placement UI.
Signing: stamping mode and/or interactive signer portal, finalization, audit trail.
Quality & ops: observability, regression tests, performance tuning, failure handling.
# 3. Phased Plan (Recommended)
## Phase 0 — Foundations
Repository setup, branching strategy, CI (unit tests, linting), container build pipeline.
PostgreSQL schema migrations (Flyway/Alembic).
Object storage integration and signed URL support.
Auth and tenant model, RBAC scaffolding.
Job queue + worker framework (Celery/RQ).
Audit events framework (append-only table + helpers).
Exit criteria:
Users can authenticate; tenant scoping enforced.
Files can be uploaded to object storage and retrieved via signed URLs.
Background jobs can run, report status, and persist results.
## Phase 1 — Deterministic Rendering Spike (Critical)
Implement DOCX hydration for simple placeholders (no loops yet).
Implement DOCX->PDF conversion in a pinned LibreOffice container.
Implement PDF stitching: cover + body + T&C.
Implement letterhead underlay on all pages (configurable).
Create a minimal preview endpoint returning a preview PDF link.
Create regression harness: convert preview PDFs to images and compare across runs.
Exit criteria:
Same input + same template version produces identical output across repeated runs (visual diff within tolerance).
Preview generation works for representative templates (tables, multi-page).
## Phase 2 — Template Package Manager (MVP core)
Template Package CRUD with versioning and publish workflow.
Upload assets for letterhead, cover, body, T&C; validate page sizes and formats.
Placeholder extraction across slices; master variable list generation.
Schema editor (types, required/optional, format rules) and validation at generation time.
Stitched preview UI (Template Studio) with warnings (overflow risk, unsafe placements).
Exit criteria:
Template Architects can publish immutable template versions with validated assets and schema.
Creators can generate preview documents by providing input JSON.
## Phase 3 — Field Placement + Signature Stamping (MVP signing)
PDF viewer in Generator UI with drag-and-drop field placement.
Field types: signature, initials, name, date; assignment to signer role.
Anchor logic: FIRST_PAGE, LAST_PAGE, ALL_PAGES, PAGE_N.
Persist fields in DB and validate safe zones.
Stamp signature images via API finalize endpoint and produce final flattened PDF.
Audit log of finalization and hashes.
Exit criteria:
Placed fields render at expected coordinates in final PDF.
Last-page anchors remain correct across variable-length bodies.
Final PDFs are flattened and hashed; audit events recorded.
## Phase 4 — Interactive Signing Portal (Optional / Next)
Signer identity model and routing (sequential or parallel signing).
Magic-link and/or OTP authentication for signers.
Signer portal shows assigned fields only; capture signature via draw/type/upload.
Document completion logic and notifications; webhook callbacks.
Optional: audit report PDF generation.
Exit criteria:
End-to-end send → sign → complete works for multiple signers.
All events are captured in audit trail; final output reproducible.
## Phase 5 — Hardening & Enterprise Features
Repeaters (invoice_items tables) with controlled template patterns.
Conditional blocks (boolean show/hide) with deterministic evaluation.
PDF body support: AcroForm fill (recommended) and overlay token mode with manual mapping UI.
Cryptographic signatures (PAdES) if compliance requires.
Admin controls: retention policies, template approvals, jurisdiction-based T&C selection.
Performance tuning: worker scaling, caching, parallelism at job level.
# 4. Detailed Work Breakdown (MVP)
## 4.1 Backend
Template versioning model and migrations.
Asset ingestion pipeline (virus scan, MIME validation, storage).
Placeholder extraction service (DOCX parse; PDF form field parse).
Render job orchestration with state machine: CREATED → RENDERING → PREVIEW_READY → FINALIZING → COMPLETED / FAILED.
Signed URL service for previews/finals.
Audit event helper library with consistent event schemas.
## 4.2 Rendering Workers
Hydrate DOCX with docxtpl; enforce placeholder rules (no split runs).
Pinned LibreOffice conversion; timeout and crash recovery.
PDF stitching and letterhead underlay; safe-zone metadata output (page dims).
Overlay rendering for signature fields and signature images using ReportLab.
Final flattening and metadata stripping policy (remove edit history, optionally).
## 4.3 Frontend
Template Studio: asset upload, placeholder list, schema editor, preview viewer.
Document Generator: input form generation from schema, preview, field placement.
Field placement: drag/drop, resize, signer role assignment, anchor selection, validation warnings.
Preview rendering: PDF.js canvas with correct coordinate transform.
# 5. Testing Strategy
Unit tests: placeholder parsing, schema validation, coordinate conversions, anchor resolution.
Integration tests: render pipeline for representative templates; verify page counts and stable placement.
Golden-file tests: store expected output PDFs and run pixel-diff on each build.
Load tests: generate N documents concurrently; measure queue depth, p95 latency, failure rate.
Security tests: tenant isolation, signed URL expiry, token replay prevention.
# 6. Release and Rollout
Internal alpha: 2–3 templates, controlled users, monitor rendering stability and coordinate accuracy.
Beta: broader template set, external signers if portal enabled, add operational dashboards.
GA: enforce versioning rules and retention policies; establish support runbooks.
# 7. Key Risks and Mitigations
DOCX→PDF drift across environments: mitigate with pinned containers and curated fonts.
Unreliable PDF placeholder replacement: prioritize PDF forms; offer overlay mapping as a later feature.
LibreOffice stability: isolate per-worker process, timeouts, and auto-restart.
User templates that violate rules: publish a Template Authoring Guide; validate on upload.
