package com.docstacker.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Request DTO for applying signatures to a document.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SignRequest {
    
    /**
     * Map of field ID to signature data.
     */
    private Map<String, SignatureData> signatures;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SignatureData {
        /**
         * Base64-encoded signature image (PNG/JPEG).
         * May include data URI prefix (e.g., "data:image/png;base64,...").
         */
        private String imageBase64;
        
        /**
         * ID of the field where this signature should be applied.
         */
        private String fieldId;
    }
}
