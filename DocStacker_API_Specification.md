# DocStacker API Specification
REST API for templates, generation, field placement, and signing
Date: 2026-01-31

## Document Control
| Version | 1.0 |
| --- | --- |
| Status | Draft |
| Last updated | 2026-01-31 |
| Owner | Engineering |

# 1. API Principles
Base path: /v1 (versioned).
Authentication: Bearer token (JWT) for internal users and API consumers; short-lived signer tokens for signer portal flows.
Idempotency: POST endpoints that create resources should accept Idempotency-Key headers.
Consistency: all timestamps are ISO-8601 (UTC), all IDs are UUID strings.
Artifacts: PDFs and templates are stored in object storage; API returns signed URLs for downloads.
# 2. Common Error Format
{
 "error": {
 "code": "VALIDATION_ERROR",
 "message": "Missing required variables",
 "details": [
 {"field": "customer_name", "issue": "required"},
 {"field": "contract_date", "issue": "invalid_format", "expected": "YYYY-MM-DD"}
 ],
 "request_id": "req_abc123"
 }
}

# 3. Templates
## 3.1 Create Template
POST /v1/templates
Request:
{
 "name": "service_contract",
 "display_name": "Service Contract",
 "description": "Standard services agreement",
 "status": "DRAFT"
}

Response:
{
 "id": "tmpl_uuid",
 "name": "service_contract",
 "status": "DRAFT",
 "created_at": "2026-01-31T12:00:00Z"
}

## 3.2 Create Draft Template Version
POST /v1/templates/{template_id}/versions
Request:
{
 "based_on_version_id": null,
 "render_profile_id": "rp_uuid"
}

Response:
{
 "id": "tmplv_uuid",
 "template_id": "tmpl_uuid",
 "version": 1,
 "status": "DRAFT"
}

## 3.3 Upload Assets (Letterhead/Cover/Body/T&C)
Recommended approach: API returns a pre-signed upload URL. Client uploads directly to object storage, then calls finalize.
Step A: Request upload URL
POST /v1/template-versions/{template_version_id}/assets/upload-url
Request:
{
 "asset_type": "LETTERHEAD_PDF",
 "filename": "letterhead.pdf",
 "content_type": "application/pdf"
}

Response:
{
 "upload_url": "https://signed-put-url",
 "file_ref": "s3://bucket/key",
 "expires_in_seconds": 900
}

Step B: Register uploaded asset (trigger parsing)
POST /v1/template-versions/{template_version_id}/assets
Request:
{
 "asset_type": "LETTERHEAD_PDF",
 "file_ref": "s3://bucket/key",
 "checksum_sha256": "..."
}

Response:
{
 "id": "asset_uuid",
 "asset_type": "LETTERHEAD_PDF",
 "status": "PROCESSED",
 "metadata": {
 "page_size": "A4",
 "page_width_pt": 595.28,
 "page_height_pt": 841.89
 }
}

## 3.4 Extract Placeholders / Schema Draft
GET /v1/template-versions/{template_version_id}/placeholders
Response:
{
 "template_version_id": "tmplv_uuid",
 "placeholders": [
 {"name": "customer_name", "occurrences": 3, "suggested_type": "string"},
 {"name": "contract_date", "occurrences": 1, "suggested_type": "date"}
 ],
 "warnings": [
 "Placeholder {{customer_name}} appears split across runs in cover.docx; may be unreliable."
 ]
}

## 3.5 Publish Template Version
POST /v1/template-versions/{template_version_id}/publish
Request:
{
 "schema": {
 "customer_name": {"type": "string", "required": true},
 "contract_date": {"type": "date", "required": true, "format": "YYYY-MM-DD"}
 },
 "signature_zone_defaults": [
 {
 "field_type": "signature",
 "signer_role": "signer_1",
 "anchor_logic": "LAST_PAGE",
 "x_norm": 0.62,
 "y_norm": 0.12,
 "w_norm": 0.30,
 "h_norm": 0.08,
 "required": true
 }
 ]
}

Response:
{
 "id": "tmplv_uuid",
 "status": "PUBLISHED",
 "published_at": "2026-01-31T12:05:00Z"
}

# 4. Documents
## 4.1 Create Document + Generate Preview
POST /v1/documents
Request:
{
 "template_version_id": "tmplv_uuid",
 "variables": {
 "customer_name": "Wayne Enterprises",
 "contract_date": "2026-01-31"
 }
}

Response:
{
 "document_id": "doc_uuid",
 "doc_version_id": "docv_uuid",
 "status": "RENDERING",
 "job_id": "job_uuid"
}

## 4.2 Poll Document Version Status
GET /v1/document-versions/{doc_version_id}
Response:
{
 "doc_version_id": "docv_uuid",
 "status": "PREVIEW_READY",
 "page_count": 12,
 "preview_pdf_url": "https://signed-url",
 "warnings": []
}

## 4.3 Save Field Placements
POST /v1/document-versions/{doc_version_id}/fields
Request:
{
 "fields": [
 {
 "field_type": "signature",
 "signer_role": "signer_1",
 "anchor_logic": "LAST_PAGE",
 "x_norm": 0.62,
 "y_norm": 0.12,
 "w_norm": 0.30,
 "h_norm": 0.08,
 "required": true
 }
 ]
}

Response:
{
 "updated": 1
}

## 4.4 Finalize (Signature Stamping Mode)
POST /v1/document-versions/{doc_version_id}/finalize
Request:
{
 "signature_images": {
 "signer_1": {
 "signature_png_base64": "iVBORw0KGgoAAA...",
 "initials_png_base64": null
 }
 }
}

Response:
{
 "status": "FINALIZING",
 "job_id": "job_uuid"
}

## 4.5 Download Final and Audit
GET /v1/document-versions/{doc_version_id}/final
GET /v1/document-versions/{doc_version_id}/audit
Response (final):
{
 "final_pdf_url": "https://signed-url",
 "sha256": "..."
}

Response (audit):
{
 "audit_pdf_url": "https://signed-url",
 "events": [
 {"type": "DOCUMENT_CREATED", "at": "2026-01-31T12:00:00Z"},
 {"type": "PREVIEW_READY", "at": "2026-01-31T12:00:08Z"},
 {"type": "COMPLETED", "at": "2026-01-31T12:02:10Z"}
 ]
}

# 5. Signing Portal (Optional)
## 5.1 Send for Signing
POST /v1/document-versions/{doc_version_id}/send
Request:
{
 "signers": [
 {"role": "signer_1", "name": "Bruce Wayne", "email": "bruce@wayne.com", "routing_order": 1}
 ],
 "auth_method": "MAGIC_LINK"
}

Response:
{
 "status": "SENT",
 "signer_count": 1
}

## 5.2 Signer Session Access
GET /v1/signing-sessions/{token}/document
POST /v1/signing-sessions/{token}/complete
Notes:
These endpoints are publicly accessible but protected by unguessable, short-lived tokens.
Store only token hashes in the database.
Return only fields assigned to the signer.
# 6. Webhooks
Webhook event types:
template.published
document.preview_ready
document.sent
document.viewed
document.signed
document.completed
document.failed
Webhook payload example:
{
 "event": "document.completed",
 "document_id": "doc_uuid",
 "doc_version_id": "docv_uuid",
 "occurred_at": "2026-01-31T12:02:10Z",
 "data": {
 "final_pdf_sha256": "..."
 }
}
