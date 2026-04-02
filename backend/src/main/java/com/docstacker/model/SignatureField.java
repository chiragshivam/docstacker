package com.docstacker.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents a signature field placement on a PDF document.
 * Coordinates are stored as normalized values (0.0 to 1.0) for stability
 * across different zoom levels and renderings.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SignatureField {
    
    /**
     * Unique identifier for the field.
     */
    @JsonProperty("id")
    private String id;
    
    /**
     * Type of field: "signature", "initials", "date", "text"
     */
    @JsonProperty("fieldType")
    private String fieldType;
    
    /**
     * Page number (0-indexed) where the field is placed.
     */
    @JsonProperty("pageNumber")
    private int pageNumber;
    
    /**
     * Normalized X coordinate (0.0 to 1.0).
     * 0.0 = left edge, 1.0 = right edge
     */
    @JsonProperty("xNorm")
    private double xNorm;
    
    /**
     * Normalized Y coordinate (0.0 to 1.0).
     * 0.0 = top edge, 1.0 = bottom edge (browser convention)
     */
    @JsonProperty("yNorm")
    private double yNorm;
    
    /**
     * Normalized width (0.0 to 1.0).
     */
    @JsonProperty("widthNorm")
    private double widthNorm;
    
    /**
     * Normalized height (0.0 to 1.0).
     */
    @JsonProperty("heightNorm")
    private double heightNorm;
    
    /**
     * Role of the signer for this field (e.g., "signer_1", "witness", "approver").
     */
    @JsonProperty("signerRole")
    private String signerRole;
    
    /**
     * Whether this field is required for document completion.
     */
    @JsonProperty("required")
    private boolean required;
    
    /**
     * Anchor logic for dynamic field positioning.
     * Values: "FIRST_PAGE", "LAST_PAGE", "ALL_PAGES", "PAGE_N"
     */
    @JsonProperty("anchorLogic")
    private String anchorLogic;
}
