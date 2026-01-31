package com.docstacker.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Request DTO for document stacking via JSON (alternative to multipart).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StackRequest {
    
    /**
     * Base64-encoded letterhead PDF (optional).
     */
    private String letterheadBase64;
    
    /**
     * Base64-encoded cover page PDF.
     */
    private String coverBase64;
    
    /**
     * Base64-encoded body PDF.
     */
    private String bodyBase64;
    
    /**
     * Base64-encoded terms and conditions PDF (optional).
     */
    private String termsBase64;
    
    /**
     * Variables for placeholder replacement (if using DOCX templates).
     */
    private Map<String, String> variables;
}
