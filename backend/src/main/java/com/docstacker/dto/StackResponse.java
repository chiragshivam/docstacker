package com.docstacker.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO for document stacking operations.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StackResponse {
    
    /**
     * Unique identifier for the stacked document.
     */
    private String documentId;
    
    /**
     * Total number of pages in the stacked document.
     */
    private int pageCount;
    
    /**
     * Status message.
     */
    private String message;
    
    /**
     * URL to download the preview PDF (optional).
     */
    private String previewUrl;
}
