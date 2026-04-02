package com.docstacker.service;

import com.docstacker.model.SignatureField;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/**
 * Service for applying signatures to PDF documents at specified coordinates.
 * Handles coordinate transformation from normalized (0-1) to PDF points.
 */
@Service
@Slf4j
public class SignatureService {

    /**
     * Apply a single signature image to a PDF at the specified field location.
     *
     * @param pdf The PDF document
     * @param field The signature field with coordinates
     * @param signatureImage The signature image (PNG/JPEG bytes)
     * @return PDF with signature applied
     */
    public byte[] applySignature(byte[] pdf, SignatureField field, byte[] signatureImage) throws IOException {
        return applySignature(pdf, field, signatureImage, null);
    }

    /**
     * Apply a single signature image to a PDF at the specified field location,
     * with optional stamp as background. Signature overlays the stamp,
     * positioned slightly towards the bottom-right of the stamp.
     *
     * @param pdf The PDF document
     * @param field The signature field with coordinates
     * @param signatureImage The signature image (PNG/JPEG bytes)
     * @param stampImage Optional stamp image - signature overlays on bottom-right area
     * @return PDF with signature (and stamp) applied
     */
    public byte[] applySignature(byte[] pdf, SignatureField field, byte[] signatureImage, 
                                 byte[] stampImage) throws IOException {
        log.info("Applying signature to page {} at ({}, {}), stamp: {}", 
                field.getPageNumber(), field.getXNorm(), field.getYNorm(),
                stampImage != null ? "yes" : "no");
        
        try (PDDocument document = Loader.loadPDF(pdf)) {
            PDPage page = document.getPage(field.getPageNumber());
            PDRectangle pageBox = page.getMediaBox();
            
            // Convert normalized coordinates to PDF points (this is where user placed the field)
            float fieldX = (float) (field.getXNorm() * pageBox.getWidth());
            float fieldWidth = (float) (field.getWidthNorm() * pageBox.getWidth());
            float fieldHeight = (float) (field.getHeightNorm() * pageBox.getHeight());
            // Flip Y axis: browser Y increases downward, PDF Y increases upward
            float fieldY = (float) ((1 - field.getYNorm() - field.getHeightNorm()) * pageBox.getHeight());
            
            log.debug("Field coordinates: x={}, y={}, w={}, h={}", fieldX, fieldY, fieldWidth, fieldHeight);
            
            try (PDPageContentStream contentStream = new PDPageContentStream(
                    document, page, PDPageContentStream.AppendMode.APPEND, true, true)) {
                
                // If stamp is provided, draw it FIRST as BACKGROUND
                if (stampImage != null) {
                    PDImageXObject stamp = PDImageXObject.createFromByteArray(
                            document, stampImage, "stamp");
                    
                    // Calculate stamp dimensions - maintain aspect ratio
                    float stampAspectRatio = (float) stamp.getWidth() / stamp.getHeight();
                    
                    // Stamp size based on field dimensions (slightly larger to accommodate signature)
                    float stampWidth = fieldWidth * 1.4f;
                    float stampHeight = stampWidth / stampAspectRatio;
                    
                    // Cap stamp height
                    float maxStampHeight = fieldHeight * 2.5f;
                    if (stampHeight > maxStampHeight) {
                        stampHeight = maxStampHeight;
                        stampWidth = stampHeight * stampAspectRatio;
                    }
                    
                    // Position stamp at the field location (stamp is the background)
                    float stampX = fieldX;
                    float stampY = fieldY;
                    
                    // Make sure stamp doesn't go off the page
                    if (stampX < 5) stampX = 5;
                    if (stampY < 5) stampY = 5;
                    if (stampX + stampWidth > pageBox.getWidth() - 5) {
                        stampX = pageBox.getWidth() - stampWidth - 5;
                    }
                    if (stampY + stampHeight > pageBox.getHeight() - 5) {
                        stampY = pageBox.getHeight() - stampHeight - 5;
                    }
                    
                    log.debug("Stamp (background): x={}, y={}, w={}, h={}", 
                            stampX, stampY, stampWidth, stampHeight);
                    
                    // Draw stamp as background layer
                    contentStream.drawImage(stamp, stampX, stampY, stampWidth, stampHeight);
                    
                    // Now position signature ON TOP of stamp, shifted to BOTTOM-RIGHT of stamp
                    float sigWidth = fieldWidth;
                    float sigHeight = fieldHeight;
                    // Shift signature to bottom-right within the stamp area
                    float sigX = stampX + (stampWidth - sigWidth) * 0.7f;  // 70% towards right
                    float sigY = stampY + (stampHeight - sigHeight) * 0.2f; // 20% from bottom (PDF Y is up)
                    
                    log.debug("Signature (overlay, bottom-right): x={}, y={}, w={}, h={}", 
                            sigX, sigY, sigWidth, sigHeight);
                    
                    // Draw signature on top of stamp
                    PDImageXObject signature = PDImageXObject.createFromByteArray(
                            document, signatureImage, "signature");
                    contentStream.drawImage(signature, sigX, sigY, sigWidth, sigHeight);
                    
                } else {
                    // No stamp - just draw signature at field location
                    PDImageXObject signature = PDImageXObject.createFromByteArray(
                            document, signatureImage, "signature");
                    contentStream.drawImage(signature, fieldX, fieldY, fieldWidth, fieldHeight);
                }
            }
            
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            document.save(output);
            return output.toByteArray();
        }
    }

    /**
     * Apply multiple signatures to a PDF document.
     *
     * @param pdf The PDF document
     * @param signatures Map of field ID to signature image bytes
     * @param fields List of signature fields
     * @return PDF with all signatures applied
     */
    public byte[] applyMultipleSignatures(byte[] pdf, Map<String, byte[]> signatures, 
                                          List<SignatureField> fields) throws IOException {
        return applyMultipleSignatures(pdf, signatures, fields, null);
    }

    /**
     * Apply multiple signatures to a PDF document with optional stamp.
     *
     * @param pdf The PDF document
     * @param signatures Map of field ID to signature image bytes
     * @param fields List of signature fields
     * @param stampImage Optional stamp image to place below each signature
     * @return PDF with all signatures (and stamps) applied
     */
    public byte[] applyMultipleSignatures(byte[] pdf, Map<String, byte[]> signatures, 
                                          List<SignatureField> fields, byte[] stampImage) throws IOException {
        log.info("Applying {} signatures to document, stamp: {}", 
                signatures.size(), stampImage != null ? "yes" : "no");
        
        byte[] result = pdf;
        for (SignatureField field : fields) {
            byte[] signatureImage = signatures.get(field.getId());
            if (signatureImage != null) {
                result = applySignature(result, field, signatureImage, stampImage);
            }
        }
        return result;
    }

    /**
     * Decode a base64-encoded signature image.
     *
     * @param base64Image Base64-encoded image string (may include data URI prefix)
     * @return Decoded image bytes
     */
    public byte[] decodeBase64Image(String base64Image) {
        // Remove data URI prefix if present (e.g., "data:image/png;base64,")
        String base64Data = base64Image;
        if (base64Image.contains(",")) {
            base64Data = base64Image.substring(base64Image.indexOf(",") + 1);
        }
        return Base64.getDecoder().decode(base64Data);
    }

    /**
     * Convert signature image to PNG format (for consistency).
     *
     * @param imageBytes Raw image bytes
     * @return PNG-formatted image bytes
     */
    public byte[] convertToPng(byte[] imageBytes) throws IOException {
        BufferedImage image = ImageIO.read(new ByteArrayInputStream(imageBytes));
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "PNG", output);
        return output.toByteArray();
    }

    /**
     * Flatten a PDF document (merge all layers, remove form fields).
     * This makes the document non-editable.
     *
     * @param pdf The PDF document
     * @return Flattened PDF
     */
    public byte[] flattenPdf(byte[] pdf) throws IOException {
        log.info("Flattening PDF document");
        
        try (PDDocument document = Loader.loadPDF(pdf)) {
            // PDFBox 3.x automatically handles basic flattening
            // For more complex flattening, we'd iterate through annotations
            
            // Remove interactive form if present
            if (document.getDocumentCatalog().getAcroForm() != null) {
                document.getDocumentCatalog().getAcroForm().flatten();
            }
            
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            document.save(output);
            return output.toByteArray();
        }
    }

    /**
     * Calculate PDF coordinates from normalized coordinates.
     * 
     * PDF coordinate system:
     * - Origin at bottom-left
     * - Units in points (1/72 inch)
     * 
     * Normalized coordinates:
     * - Origin at top-left (browser convention)
     * - Values from 0.0 to 1.0
     *
     * @param field The signature field with normalized coordinates
     * @param pageWidth Page width in points
     * @param pageHeight Page height in points
     * @return Array of [x, y, width, height] in PDF points
     */
    public float[] calculatePdfCoordinates(SignatureField field, float pageWidth, float pageHeight) {
        float x = (float) (field.getXNorm() * pageWidth);
        // Flip Y axis: browser Y increases downward, PDF Y increases upward
        float y = (float) ((1 - field.getYNorm() - field.getHeightNorm()) * pageHeight);
        float width = (float) (field.getWidthNorm() * pageWidth);
        float height = (float) (field.getHeightNorm() * pageHeight);
        
        return new float[] { x, y, width, height };
    }
}
