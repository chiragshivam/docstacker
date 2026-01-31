package com.docstacker.controller;

import com.docstacker.dto.FieldsRequest;
import com.docstacker.dto.SignRequest;
import com.docstacker.dto.StackRequest;
import com.docstacker.dto.StackResponse;
import com.docstacker.model.SignatureField;
import com.docstacker.service.PdfStackingService;
import com.docstacker.service.SignatureService;
import com.docstacker.service.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;

/**
 * REST Controller for document stacking and signing operations.
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*") // Allow frontend to call API
public class DocumentController {

    private final PdfStackingService pdfStackingService;
    private final SignatureService signatureService;
    private final StorageService storageService;
    
    // In-memory storage for demo purposes (replace with database in production)
    private final Map<String, byte[]> documentStore = new HashMap<>();
    private final Map<String, List<SignatureField>> fieldsStore = new HashMap<>();
    private final Map<String, byte[]> stampStore = new HashMap<>();

    /**
     * Stack multiple PDF files together with optional letterhead underlay.
     * 
     * POST /api/stack
     * Content-Type: multipart/form-data
     */
    @PostMapping(value = "/stack", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<StackResponse> stackDocuments(
            @RequestParam(value = "letterhead", required = false) MultipartFile letterhead,
            @RequestParam("cover") MultipartFile cover,
            @RequestParam("body") MultipartFile body,
            @RequestParam(value = "terms", required = false) MultipartFile terms,
            @RequestParam(value = "stamp", required = false) MultipartFile stamp) throws IOException {
        
        log.info("Received stack request - cover: {}, body: {}, stamp: {}", 
                cover.getOriginalFilename(), body.getOriginalFilename(),
                stamp != null ? stamp.getOriginalFilename() : "none");
        
        byte[] letterheadBytes = letterhead != null ? letterhead.getBytes() : null;
        byte[] coverBytes = cover.getBytes();
        byte[] bodyBytes = body.getBytes();
        byte[] termsBytes = terms != null ? terms.getBytes() : null;
        byte[] stampBytes = stamp != null ? stamp.getBytes() : null;
        
        // Assemble document
        byte[] stackedPdf = pdfStackingService.assembleDocument(
                letterheadBytes, coverBytes, bodyBytes, termsBytes);
        
        // Generate document ID and store
        String documentId = UUID.randomUUID().toString();
        documentStore.put(documentId, stackedPdf);
        
        // Store stamp if provided
        if (stampBytes != null) {
            stampStore.put(documentId, stampBytes);
            log.info("Stored stamp for document: {}", documentId);
        }
        
        // Get page info
        int pageCount = pdfStackingService.getPageCount(stackedPdf);
        
        StackResponse response = StackResponse.builder()
                .documentId(documentId)
                .pageCount(pageCount)
                .message("Document stacked successfully")
                .build();
        
        return ResponseEntity.ok(response);
    }

    /**
     * Get preview PDF for a document.
     * 
     * GET /api/documents/{documentId}/preview
     */
    @GetMapping(value = "/documents/{documentId}/preview", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> getPreview(@PathVariable String documentId) {
        log.info("Getting preview for document: {}", documentId);
        
        byte[] pdf = documentStore.get(documentId);
        if (pdf == null) {
            return ResponseEntity.notFound().build();
        }
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=preview.pdf")
                .body(pdf);
    }

    /**
     * Save signature field placements for a document.
     * 
     * POST /api/documents/{documentId}/fields
     */
    @PostMapping("/documents/{documentId}/fields")
    public ResponseEntity<Map<String, Object>> saveFields(
            @PathVariable String documentId,
            @RequestBody FieldsRequest request) {
        
        log.info("Saving {} fields for document: {}", request.getFields().size(), documentId);
        
        // Debug: Log each field's coordinates
        for (var field : request.getFields()) {
            log.info("Field {} - type: {}, page: {}, xNorm: {}, yNorm: {}, widthNorm: {}, heightNorm: {}",
                    field.getId(), field.getFieldType(), field.getPageNumber(),
                    field.getXNorm(), field.getYNorm(), field.getWidthNorm(), field.getHeightNorm());
        }
        
        if (!documentStore.containsKey(documentId)) {
            return ResponseEntity.notFound().build();
        }
        
        fieldsStore.put(documentId, request.getFields());
        
        return ResponseEntity.ok(Map.of(
                "documentId", documentId,
                "fieldCount", request.getFields().size(),
                "message", "Fields saved successfully"
        ));
    }

    /**
     * Get signature field placements for a document.
     * 
     * GET /api/documents/{documentId}/fields
     */
    @GetMapping("/documents/{documentId}/fields")
    public ResponseEntity<List<SignatureField>> getFields(@PathVariable String documentId) {
        log.info("Getting fields for document: {}", documentId);
        
        List<SignatureField> fields = fieldsStore.getOrDefault(documentId, new ArrayList<>());
        return ResponseEntity.ok(fields);
    }

    /**
     * Apply signatures to a document and generate final PDF.
     * 
     * POST /api/documents/{documentId}/sign
     */
    @PostMapping("/documents/{documentId}/sign")
    public ResponseEntity<Map<String, Object>> signDocument(
            @PathVariable String documentId,
            @RequestBody SignRequest request) throws IOException {
        
        log.info("Signing document: {} with {} signatures", documentId, request.getSignatures().size());
        
        byte[] pdf = documentStore.get(documentId);
        if (pdf == null) {
            return ResponseEntity.notFound().build();
        }
        
        List<SignatureField> fields = fieldsStore.getOrDefault(documentId, new ArrayList<>());
        byte[] stampImage = stampStore.get(documentId);
        
        if (stampImage != null) {
            log.info("Using stamp for document: {}", documentId);
        }
        
        // Decode base64 signatures and apply them
        Map<String, byte[]> signatureImages = new HashMap<>();
        for (Map.Entry<String, SignRequest.SignatureData> entry : request.getSignatures().entrySet()) {
            byte[] imageBytes = signatureService.decodeBase64Image(entry.getValue().getImageBase64());
            signatureImages.put(entry.getKey(), imageBytes);
        }
        
        // Apply signatures (with optional stamp)
        byte[] signedPdf = signatureService.applyMultipleSignatures(pdf, signatureImages, fields, stampImage);
        
        // Store signed version
        String signedDocId = documentId + "-signed";
        documentStore.put(signedDocId, signedPdf);
        
        return ResponseEntity.ok(Map.of(
                "documentId", signedDocId,
                "message", "Document signed successfully"
        ));
    }

    /**
     * Finalize a signed document (flatten PDF).
     * 
     * POST /api/documents/{documentId}/finalize
     */
    @PostMapping("/documents/{documentId}/finalize")
    public ResponseEntity<Map<String, Object>> finalizeDocument(
            @PathVariable String documentId) throws IOException {
        
        log.info("Finalizing document: {}", documentId);
        
        byte[] pdf = documentStore.get(documentId);
        if (pdf == null) {
            return ResponseEntity.notFound().build();
        }
        
        // Flatten the PDF
        byte[] finalPdf = signatureService.flattenPdf(pdf);
        
        // Store final version
        String finalDocId = documentId.replace("-signed", "") + "-final";
        documentStore.put(finalDocId, finalPdf);
        
        return ResponseEntity.ok(Map.of(
                "documentId", finalDocId,
                "message", "Document finalized successfully"
        ));
    }

    /**
     * Download the final signed PDF.
     * 
     * GET /api/documents/{documentId}/download
     */
    @GetMapping(value = "/documents/{documentId}/download", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> downloadDocument(@PathVariable String documentId) {
        log.info("Downloading document: {}", documentId);
        
        byte[] pdf = documentStore.get(documentId);
        if (pdf == null) {
            return ResponseEntity.notFound().build();
        }
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=document.pdf")
                .body(pdf);
    }

    /**
     * Get document info (page count, dimensions, etc.)
     * 
     * GET /api/documents/{documentId}/info
     */
    @GetMapping("/documents/{documentId}/info")
    public ResponseEntity<Map<String, Object>> getDocumentInfo(
            @PathVariable String documentId) throws IOException {
        
        byte[] pdf = documentStore.get(documentId);
        if (pdf == null) {
            return ResponseEntity.notFound().build();
        }
        
        int pageCount = pdfStackingService.getPageCount(pdf);
        var dimensions = pdfStackingService.getPageDimensions(pdf, 0);
        
        return ResponseEntity.ok(Map.of(
                "documentId", documentId,
                "pageCount", pageCount,
                "pageWidth", dimensions.getWidth(),
                "pageHeight", dimensions.getHeight()
        ));
    }

    /**
     * Render a specific page of the document as an image.
     * 
     * GET /api/documents/{documentId}/pages/{pageNumber}/image
     */
    @GetMapping(value = "/documents/{documentId}/pages/{pageNumber}/image", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> getPageImage(
            @PathVariable String documentId,
            @PathVariable int pageNumber) throws IOException {
        
        log.info("Rendering page {} for document: {}", pageNumber, documentId);
        
        byte[] pdf = documentStore.get(documentId);
        if (pdf == null) {
            return ResponseEntity.notFound().build();
        }
        
        byte[] pageImage = pdfStackingService.renderPageAsImage(pdf, pageNumber);
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "max-age=300")
                .body(pageImage);
    }
}
