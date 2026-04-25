package com.smartcampus.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;


@Service
public class FileStorageService {

    @Value("${app.upload.dir:uploads/tickets}")
    private String uploadDir;         

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;            

    private static final long MAX_FILE_BYTES = 5L * 1024 * 1024; // 5 MB
    private static final String[] ALLOWED_EXT = { ".jpg", ".jpeg", ".png", ".webp", ".gif" };

    /**
     * Saves the multipart file to disk and returns its public URL.
     *
     * @param file  the uploaded image
     * @return      full URL the frontend can load directly, e.g.
     *              http://localhost:8080/uploads/tickets/abc123.jpg
     */
    public String store(MultipartFile file) throws IOException {

        // ── 1. Validate ───────────────────────────────────────────────────────
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Cannot store an empty file");
        }
        if (file.getSize() > MAX_FILE_BYTES) {
            throw new IllegalArgumentException(
                    "Image exceeds 5 MB limit (" + file.getSize() / 1024 + " KB received)");
        }

        // ── 2. Sanitise extension ─────────────────────────────────────────────
        String originalName = file.getOriginalFilename();
        String ext = ".jpg"; // safe default
        if (originalName != null && originalName.contains(".")) {
            String raw = originalName.substring(originalName.lastIndexOf('.')).toLowerCase();
            for (String allowed : ALLOWED_EXT) {
                if (raw.equals(allowed)) { ext = raw; break; }
            }
        }

        // ── 3. Build save path ────────────────────────────────────────────────
        
        Path projectRoot = Paths.get(System.getProperty("user.dir"));

        
        Path saveDir  = projectRoot.resolve(uploadDir).normalize();
        Files.createDirectories(saveDir);   

        String filename = UUID.randomUUID() + ext;
        Path   target   = saveDir.resolve(filename);
        file.transferTo(target.toFile());

        

        String cleanBase = baseUrl.replaceAll("/+$", "");

        
        String publicPath = "/" + uploadDir.replaceAll("^/+", "") + "/" + filename;

        return cleanBase + publicPath;
    }
}