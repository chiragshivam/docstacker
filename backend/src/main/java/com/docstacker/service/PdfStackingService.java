package com.docstacker.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.io.RandomAccessReadBuffer;
import org.apache.pdfbox.multipdf.Overlay;
import org.apache.pdfbox.multipdf.PDFMergerUtility;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service for PDF stacking operations:
 * - Stitching multiple PDFs together (cover + body + terms)
 * - Applying letterhead as background underlay on all pages
 */
@Service
@Slf4j
public class PdfStackingService {

    /**
     * Stitch multiple PDFs together in order.
     * Order: cover (page 1) + body (pages 2 to N-1) + terms (last page(s))
     *
     * @param pdfParts List of PDF byte arrays to merge
     * @return Merged PDF as byte array
     */
    public byte[] stitchPdfs(List<byte[]> pdfParts) throws IOException {
        log.info("Stitching {} PDF parts together", pdfParts.size());
        
        PDFMergerUtility merger = new PDFMergerUtility();
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        
        for (byte[] part : pdfParts) {
            if (part != null && part.length > 0) {
                merger.addSource(new RandomAccessReadBuffer(part));
            }
        }
        
        merger.setDestinationStream(output);
        merger.mergeDocuments(null);
        
        byte[] result = output.toByteArray();
        log.info("Stitched PDF created, size: {} bytes", result.length);
        return result;
    }

    /**
     * Apply letterhead PDF as a background (underlay) on all pages of the document.
     * This method renders each page as an image, composites it over the letterhead,
     * and creates a new PDF - ensuring the letterhead is always visible.
     *
     * @param documentPdf The main document PDF
     * @param letterheadPdf The letterhead PDF (typically single page)
     * @return Document with letterhead applied as background
     */
    public byte[] applyLetterheadUnderlay(byte[] documentPdf, byte[] letterheadPdf) throws IOException {
        log.info("Applying letterhead underlay to document using image composition");
        
        try (PDDocument document = Loader.loadPDF(documentPdf);
             PDDocument letterheadDoc = Loader.loadPDF(letterheadPdf);
             PDDocument resultDoc = new PDDocument()) {
            
            // Render letterhead at high DPI
            PDFRenderer letterheadRenderer = new PDFRenderer(letterheadDoc);
            float dpi = 150f; // Good quality for print
            float scale = dpi / 72f;
            
            BufferedImage letterheadImage = letterheadRenderer.renderImage(0, scale);
            log.info("Letterhead rendered: {}x{} pixels", letterheadImage.getWidth(), letterheadImage.getHeight());
            
            // Process each page of the document
            PDFRenderer docRenderer = new PDFRenderer(document);
            
            for (int i = 0; i < document.getNumberOfPages(); i++) {
                PDPage sourcePage = document.getPage(i);
                PDRectangle pageBox = sourcePage.getMediaBox();
                
                // Render document page at same DPI
                BufferedImage pageImage = docRenderer.renderImage(i, scale);
                
                // Create composite image: letterhead + document content
                int width = Math.max(letterheadImage.getWidth(), pageImage.getWidth());
                int height = Math.max(letterheadImage.getHeight(), pageImage.getHeight());
                
                BufferedImage composite = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
                Graphics2D g2d = composite.createGraphics();
                
                // Set high quality rendering
                g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
                g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
                
                // Draw white background first
                g2d.setColor(Color.WHITE);
                g2d.fillRect(0, 0, width, height);
                
                // Draw letterhead (centered if sizes differ)
                int lhX = (width - letterheadImage.getWidth()) / 2;
                int lhY = (height - letterheadImage.getHeight()) / 2;
                g2d.drawImage(letterheadImage, lhX, lhY, null);
                
                // Draw document page content on top (centered if sizes differ)
                // Create a version of the page image with transparency for white pixels
                BufferedImage transparentPage = makeWhiteTransparent(pageImage);
                int pgX = (width - transparentPage.getWidth()) / 2;
                int pgY = (height - transparentPage.getHeight()) / 2;
                g2d.drawImage(transparentPage, pgX, pgY, null);
                
                g2d.dispose();
                
                // Convert composite to JPEG (smaller file size)
                BufferedImage jpegImage = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
                Graphics2D jpegG2d = jpegImage.createGraphics();
                jpegG2d.drawImage(composite, 0, 0, null);
                jpegG2d.dispose();
                
                ByteArrayOutputStream imgOutput = new ByteArrayOutputStream();
                ImageIO.write(jpegImage, "JPEG", imgOutput);
                byte[] imageBytes = imgOutput.toByteArray();
                
                // Create new PDF page with the composite image
                PDPage newPage = new PDPage(pageBox);
                resultDoc.addPage(newPage);
                
                PDImageXObject pdImage = PDImageXObject.createFromByteArray(resultDoc, imageBytes, "page_" + i);
                
                try (PDPageContentStream contentStream = new PDPageContentStream(resultDoc, newPage)) {
                    // Draw the composite image to fill the entire page
                    contentStream.drawImage(pdImage, 0, 0, pageBox.getWidth(), pageBox.getHeight());
                }
                
                log.debug("Processed page {} with letterhead background", i + 1);
            }
            
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            resultDoc.save(output);
            
            byte[] result = output.toByteArray();
            log.info("Letterhead applied to {} pages using image composition, final size: {} bytes", 
                    document.getNumberOfPages(), result.length);
            return result;
        }
    }
    
    /**
     * Make white/near-white pixels transparent in an image.
     * This allows the letterhead to show through.
     */
    private BufferedImage makeWhiteTransparent(BufferedImage image) {
        int width = image.getWidth();
        int height = image.getHeight();
        BufferedImage result = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        
        // Threshold for "white" detection (255 = pure white only, lower = more colors become transparent)
        int threshold = 250;
        
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                int pixel = image.getRGB(x, y);
                int red = (pixel >> 16) & 0xFF;
                int green = (pixel >> 8) & 0xFF;
                int blue = pixel & 0xFF;
                
                // Check if pixel is white or near-white
                if (red >= threshold && green >= threshold && blue >= threshold) {
                    // Make transparent
                    result.setRGB(x, y, 0x00FFFFFF); // Fully transparent
                } else {
                    // Keep original with full opacity
                    result.setRGB(x, y, (0xFF << 24) | (pixel & 0x00FFFFFF));
                }
            }
        }
        
        return result;
    }

    /**
     * Full document assembly pipeline:
     * 1. Stitch PDFs in order (cover + body + terms)
     * 2. Apply letterhead as background on all pages
     *
     * @param letterheadPdf Letterhead PDF for background (can be null)
     * @param coverPdf Cover page PDF
     * @param bodyPdf Body content PDF
     * @param termsPdf Terms and conditions PDF (can be null)
     * @return Fully assembled document
     */
    public byte[] assembleDocument(byte[] letterheadPdf, byte[] coverPdf, 
                                   byte[] bodyPdf, byte[] termsPdf) throws IOException {
        log.info("Starting document assembly");
        
        // Step 1: Stitch PDFs together
        List<byte[]> parts = List.of(coverPdf, bodyPdf, termsPdf).stream()
                .filter(p -> p != null && p.length > 0)
                .toList();
        
        byte[] stitchedPdf = stitchPdfs(parts);
        
        // Step 2: Apply letterhead if provided
        if (letterheadPdf != null && letterheadPdf.length > 0) {
            stitchedPdf = applyLetterheadUnderlay(stitchedPdf, letterheadPdf);
        }
        
        log.info("Document assembly complete");
        return stitchedPdf;
    }

    /**
     * Get page dimensions from a PDF.
     */
    public PDRectangle getPageDimensions(byte[] pdf, int pageIndex) throws IOException {
        try (PDDocument document = Loader.loadPDF(pdf)) {
            PDPage page = document.getPage(pageIndex);
            return page.getMediaBox();
        }
    }

    /**
     * Get total page count of a PDF.
     */
    public int getPageCount(byte[] pdf) throws IOException {
        try (PDDocument document = Loader.loadPDF(pdf)) {
            return document.getNumberOfPages();
        }
    }

    /**
     * Render a specific page of a PDF as a PNG image.
     *
     * @param pdf The PDF document
     * @param pageNumber Page number (0-indexed)
     * @return PNG image bytes
     */
    public byte[] renderPageAsImage(byte[] pdf, int pageNumber) throws IOException {
        try (PDDocument document = Loader.loadPDF(pdf)) {
            if (pageNumber < 0 || pageNumber >= document.getNumberOfPages()) {
                throw new IllegalArgumentException("Invalid page number: " + pageNumber);
            }
            
            PDFRenderer renderer = new PDFRenderer(document);
            float dpi = 150f; // Good quality for web display
            float scale = dpi / 72f;
            
            BufferedImage image = renderer.renderImage(pageNumber, scale);
            
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            ImageIO.write(image, "PNG", output);
            
            log.debug("Rendered page {} as image: {}x{} pixels, {} bytes", 
                    pageNumber, image.getWidth(), image.getHeight(), output.size());
            
            return output.toByteArray();
        }
    }
}
