package com.docstacker.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

/**
 * Service for storing and retrieving document files.
 * Uses local filesystem for development; can be extended for S3/cloud storage.
 */
@Service
@Slf4j
public class StorageService {

    @Value("${docstacker.storage.base-path:${user.home}/.docstacker/storage}")
    private String basePath;

    @Value("${docstacker.storage.temp-path:${user.home}/.docstacker/temp}")
    private String tempPath;

    /**
     * Initialize storage directories.
     */
    public void init() throws IOException {
        Files.createDirectories(Paths.get(basePath));
        Files.createDirectories(Paths.get(tempPath));
        log.info("Storage initialized at: {}", basePath);
    }

    /**
     * Store a file and return its reference ID.
     */
    public String store(byte[] content, String extension) throws IOException {
        ensureDirectoryExists(basePath);
        
        String fileId = UUID.randomUUID().toString();
        String filename = fileId + "." + extension;
        Path filePath = Paths.get(basePath, filename);
        
        Files.write(filePath, content);
        log.info("Stored file: {}", filePath);
        
        return fileId;
    }

    /**
     * Retrieve a file by its reference ID.
     */
    public byte[] retrieve(String fileId, String extension) throws IOException {
        String filename = fileId + "." + extension;
        Path filePath = Paths.get(basePath, filename);
        
        if (!Files.exists(filePath)) {
            throw new IOException("File not found: " + fileId);
        }
        
        return Files.readAllBytes(filePath);
    }

    /**
     * Store a temporary file (for processing).
     */
    public Path storeTempFile(byte[] content, String prefix, String suffix) throws IOException {
        ensureDirectoryExists(tempPath);
        
        Path tempFile = Files.createTempFile(Paths.get(tempPath), prefix, suffix);
        Files.write(tempFile, content);
        
        return tempFile;
    }

    /**
     * Delete a file by its reference ID.
     */
    public void delete(String fileId, String extension) throws IOException {
        String filename = fileId + "." + extension;
        Path filePath = Paths.get(basePath, filename);
        
        Files.deleteIfExists(filePath);
        log.info("Deleted file: {}", filePath);
    }

    /**
     * Check if a file exists.
     */
    public boolean exists(String fileId, String extension) {
        String filename = fileId + "." + extension;
        Path filePath = Paths.get(basePath, filename);
        return Files.exists(filePath);
    }

    private void ensureDirectoryExists(String path) throws IOException {
        Path dir = Paths.get(path);
        if (!Files.exists(dir)) {
            Files.createDirectories(dir);
        }
    }
}
