# DocStacker ERD & Data Dictionary
Logical ERD and relational schema guidance
Date: 2026-01-31

## Document Control
| Version | 1.0 |
| --- | --- |
| Status | Draft |
| Last updated | 2026-01-31 |
| Owner | Engineering |

# 1. Overview
This document describes the proposed relational model for DocStacker. It supports multi-tenancy, template versioning, document instance versioning, field placement, signing sessions, and audit logs.
ERD (logical):

# 2. Conventions
Primary keys use UUIDs (uuid).
Timestamps use timestamptz.
Large JSON structures use jsonb; use constrained schemas at the application layer.
All tenant-scoped tables include tenant_id and must be filtered by tenant_id in every query.
Immutable artifacts (uploaded templates and generated PDFs) are stored in object storage; DB stores references (file_ref).
# 3. Core Entities
## tenants
Top-level tenant record for multi-tenant deployments.
| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| id | uuid | PK | Tenant identifier. |
| name | text | NOT NULL | Tenant display name. |
| plan | text | NULL | Billing plan or entitlement tier. |
| status | text | NOT NULL | ACTIVE / SUSPENDED / DELETED. |
| created_at | timestamptz | NOT NULL | Creation timestamp. |
| updated_at | timestamptz | NOT NULL | Last update timestamp. |

## users
Authenticated users within a tenant (internal staff).
| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| id | uuid | PK | User identifier. |
| tenant_id | uuid | FK tenants(id), NOT NULL | Owning tenant. |
| email | text | UNIQUE(tenant_id,email), NOT NULL | Login email. |
| name | text | NOT NULL | Full name. |
| status | text | NOT NULL | ACTIVE / INVITED / DISABLED. |
| created_at | timestamptz | NOT NULL | Creation timestamp. |
| updated_at | timestamptz | NOT NULL | Last update timestamp. |

## roles
Tenant-scoped roles used for RBAC.
| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| id | uuid | PK | Role identifier. |
| tenant_id | uuid | FK tenants(id), NOT NULL | Owning tenant. |
| name | text | NOT NULL | Role name (Admin, TemplateArchitect, Creator, Auditor). |
| created_at | timestamptz | NOT NULL | Creation timestamp. |

## user_roles
Join table between users and roles (many-to-many).
| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| id | uuid | PK | Record identifier. |
| user_id | uuid | FK users(id), NOT NULL | User. |
| role_id | uuid | FK roles(id), NOT NULL | Role. |
| created_at | timestamptz | NOT NULL | Creation timestamp. |

## templates
Template package container (logical template). Versions hold the immutable published configurations.
| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| id | uuid | PK | Template identifier. |
| tenant_id | uuid | FK tenants(id), NOT NULL | Owning tenant. |
| name | text | NOT NULL | Template name (e.g., Service Contract v2). |
| status | text | NOT NULL | DRAFT / ACTIVE / RETIRED. |
| created_by | uuid | FK users(id) | User who created the template. |
| created_at | timestamptz | NOT NULL | Creation timestamp. |
| updated_at | timestamptz | NOT NULL | Last update timestamp. |

## template_versions
Immutable published versions of a template package.
| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| id | uuid | PK | Template version identifier. |
| template_id | uuid | FK templates(id), NOT NULL | Owning template. |
| version | int | NOT NULL | Monotonic version number per template. |
| status | text | NOT NULL | DRAFT / PUBLISHED / ARCHIVED. |
| render_profile_id | uuid | FK render_profiles(id) | Pinned rendering settings (fonts/page size). |
| schema_json | jsonb | NOT NULL | Master variable schema snapshot for this version. |
| created_by | uuid | FK users(id) | Publisher. |
| created_at | timestamptz | NOT NULL | Publish timestamp. |

## template_assets
Files backing a template version (letterhead, cover, body, terms). Stored in object storage, referenced here.
| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| id | uuid | PK | Asset identifier. |
| template_version_id | uuid | FK template_versions(id), NOT NULL | Owning template version. |
| asset_type | text | NOT NULL | LETTERHEAD_PDF / COVER_DOCX / BODY_DOCX / BODY_PDF / TERMS_PDF, etc. |
| file_ref | text | NOT NULL | Object storage key/URI. |
| checksum_sha256 | text | NOT NULL | Content hash for immutability and caching. |
| metadata_json | jsonb | NULL | Page size, safe zones, locale, etc. |
| created_at | timestamptz | NOT NULL | Upload timestamp. |

## variable_definitions
Optional normalized table for variables (in addition to schema_json snapshot). Useful for querying and UI.
| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| id | uuid | PK | Variable definition id. |
| template_version_id | uuid | FK template_versions(id), NOT NULL | Owning template version. |
| name | text | NOT NULL | Variable name (e.g., customer_name). |
| data_type | text | NOT NULL | string/number/date/currency/boolean. |
| required | boolean | NOT NULL | Required flag. |
| format_json | jsonb | NULL | Formatting rules, regex validation, etc. |
| created_at | timestamptz | NOT NULL | Creation timestamp. |

## signature_zone_defs
Default signature field definitions stored at template-time. Document instances copy these into document_fields.
| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| id | uuid | PK | Signature zone definition id. |
| template_version_id | uuid | FK template_versions(id), NOT NULL | Owning template version. |
| field_type | text | NOT NULL | signature/initials/name/date/text/checkbox. |
| signer_role | text | NOT NULL | Logical signer role (signer_1, approver, witness). |
| anchor_logic | text | NOT NULL | FIRST_PAGE / LAST_PAGE / ALL_PAGES / PAGE_N / SECTION_*. |
| page_number | int | NULL | Used when anchor_logic is PAGE_N. |
| x_norm | numeric | NOT NULL | Normalized x coordinate. |
| y_norm | numeric | NOT NULL | Normalized y coordinate. |
| w_norm | numeric | NOT NULL | Normalized width. |
| h_norm | numeric | NOT NULL | Normalized height. |
| required | boolean | NOT NULL | Whether field must be completed. |
| created_at | timestamptz | NOT NULL | Creation timestamp. |

## documents
Document instances generated from a template version. Content is versioned via document_versions.
| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| id | uuid | PK | Document identifier. |
| tenant_id | uuid | FK tenants(id), NOT NULL | Owning tenant. |
| template_version_id | uuid | FK template_versions(id), NOT NULL | Template version used. |
| status | text | NOT NULL | CREATED / PREVIEW_READY / SENT / COMPLETED / FAILED. |
| created_by | uuid | FK users(id) | Creator user. |
| created_at | timestamptz | NOT NULL | Creation timestamp. |
| updated_at | timestamptz | NOT NULL | Last update timestamp. |

## document_versions
Immutable render artifacts for a document. A new version is created when inputs or assets change (if allowed).
| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| id | uuid | PK | Document version identifier. |
| document_id | uuid | FK documents(id), NOT NULL | Owning document. |
| version | int | NOT NULL | Monotonic version number per document. |
| input_hash | text | NOT NULL | Hash of input payload (after normalization). |
| input_encrypted_ref | text | NULL | Reference to encrypted payload blob (optional). |
| preview_pdf_ref | text | NULL | Object storage ref for unsigned preview. |
| final_pdf_ref | text | NULL | Object storage ref for final signed PDF. |
| page_count | int | NULL | Number of pages in assembled document. |
| render_metadata_json | jsonb | NULL | Page sizes, ranges, and render diagnostics. |
| status | text | NOT NULL | RENDERING / PREVIEW_READY / FINALIZING / COMPLETED / FAILED. |
| created_at | timestamptz | NOT NULL | Creation timestamp. |

## document_fields
Field placements for a specific document version. Coordinates are stored as normalized values and resolved at render time.
| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| id | uuid | PK | Field identifier. |
| doc_version_id | uuid | FK document_versions(id), NOT NULL | Owning document version. |
| field_type | text | NOT NULL | signature/initials/name/date/text/checkbox. |
| signer_role | text | NOT NULL | Role responsible for the field. |
| anchor_logic | text | NOT NULL | FIRST_PAGE/LAST_PAGE/ALL_PAGES/PAGE_N/SECTION_*. |
| page_number | int | NULL | Resolved or configured page for PAGE_N. |
| x_norm | numeric | NOT NULL | Normalized x coordinate. |
| y_norm | numeric | NOT NULL | Normalized y coordinate. |
| w_norm | numeric | NOT NULL | Normalized width. |
| h_norm | numeric | NOT NULL | Normalized height. |
| status | text | NOT NULL | PLACED / COMPLETED / VOID. |
| created_at | timestamptz | NOT NULL | Creation timestamp. |
| completed_at | timestamptz | NULL | Completion timestamp. |

## signers
Signer records (internal or external). Used in portal signing mode.
| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| id | uuid | PK | Signer identifier. |
| doc_version_id | uuid | FK document_versions(id), NOT NULL | Document version being signed. |
| role | text | NOT NULL | Matches signer_role in document_fields. |
| name | text | NOT NULL | Signer name. |
| email | text | NOT NULL | Signer email. |
| routing_order | int | NULL | Sequential signing order (optional). |
| status | text | NOT NULL | PENDING / INVITED / VIEWED / SIGNED / DECLINED. |
| created_at | timestamptz | NOT NULL | Creation timestamp. |

## signing_sessions
Short-lived sessions that allow a signer to access the signing portal. Tokens are stored hashed.
| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| id | uuid | PK | Session identifier. |
| signer_id | uuid | FK signers(id), NOT NULL | Signer. |
| token_hash | text | NOT NULL | Hash of the session token. |
| expires_at | timestamptz | NOT NULL | Expiry timestamp. |
| status | text | NOT NULL | ACTIVE / USED / EXPIRED / REVOKED. |
| created_at | timestamptz | NOT NULL | Creation timestamp. |

## audit_events
Append-only audit event log. Events should be immutable and never updated in place.
| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| id | uuid | PK | Audit event identifier. |
| doc_version_id | uuid | FK document_versions(id), NOT NULL | Related document version. |
| event_type | text | NOT NULL | DOCUMENT_CREATED, PREVIEW_READY, SENT, VIEWED, SIGNED, COMPLETED, etc. |
| payload_json | jsonb | NULL | Event payload (IP, user agent, metadata). |
| created_at | timestamptz | NOT NULL | Event timestamp. |

# 4. Suggested Indexes
users: UNIQUE(tenant_id, email)
templates: INDEX(tenant_id, status)
template_versions: UNIQUE(template_id, version)
template_assets: INDEX(template_version_id, asset_type)
documents: INDEX(tenant_id, status), INDEX(template_version_id)
document_versions: UNIQUE(document_id, version), INDEX(status)
document_fields: INDEX(doc_version_id, signer_role)
signers: INDEX(doc_version_id, role), INDEX(email)
signing_sessions: UNIQUE(token_hash), INDEX(expires_at)
audit_events: INDEX(doc_version_id, created_at)
