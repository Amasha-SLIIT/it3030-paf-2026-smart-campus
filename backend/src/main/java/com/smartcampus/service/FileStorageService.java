package com.smartcampus.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import lombok.RequiredArgsConstructor;
import java.io.IOException;

@Service
@RequiredArgsConstructor
public class FileStorageService {

    private final CloudinaryService cloudinaryService;

    private static final long MAX_FILE_BYTES = 5L * 1024 * 1024; // 5 MB
    private static final String[] ALLOWED_EXT = { ".jpg", ".jpeg", ".png", ".webp", ".gif" };

    public String store(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Cannot store an empty file");
        }
        if (file.getSize() > MAX_FILE_BYTES) {
            throw new IllegalArgumentException(
                "Image exceeds 5 MB limit (" + file.getSize() / 1024 + " KB received)");
        }

        // Validate extension
        String originalName = file.getOriginalFilename();
        if (originalName != null && originalName.contains(".")) {
            String raw = originalName.substring(originalName.lastIndexOf('.')).toLowerCase();
            boolean allowed = false;
            for (String ext : ALLOWED_EXT) {
                if (raw.equals(ext)) { allowed = true; break; }
            }
            if (!allowed) {
                throw new IllegalArgumentException(
                    "Unsupported file type. Use jpg, jpeg, png, webp, or gif.");
            }
        }

        return cloudinaryService.uploadImage(file, "smart-campus/tickets");
    }
}