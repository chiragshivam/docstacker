package com.docstacker.dto;

import com.docstacker.model.SignatureField;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request DTO for saving signature field placements.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FieldsRequest {
    
    /**
     * List of signature fields with their placements.
     */
    private List<SignatureField> fields;
}
