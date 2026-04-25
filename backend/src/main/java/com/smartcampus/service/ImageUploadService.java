package com.smartcampus.service;

import net.coobird.thumbnailator.Thumbnails;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;


import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class ImageUploadService {

    @Value("${app.upload.dir:uploads/tickets}")
    private String uploadDir;

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file
    private static final int MAX_IMAGES = 3;
    private static final int MAX_WIDTH = 1200;
    private static final int MAX_HEIGHT = 900;
    private static final float COMPRESSION_QUALITY = 0.85f;

    public List<String> uploadImages(List<MultipartFile> files) throws IOException {
        if (files == null || files.isEmpty()) return new ArrayList<>();

        if (files.size() > MAX_IMAGES) {
            throw new IllegalArgumentException("Maximum " + MAX_IMAGES + " images allowed");
        }

        long totalSize = files.stream().mapToLong(MultipartFile::getSize).sum();
        if (totalSize > 20 * 1024 * 1024) { // 20MB form limit
            throw new IllegalArgumentException("Total form size must not exceed 20MB");
        }

        List<String> urls = new ArrayList<>();
        Path uploadPath = Paths.get(uploadDir);
        Files.createDirectories(uploadPath);

        for (MultipartFile file : files) {
            if (file.isEmpty()) continue;

            if (file.getSize() > MAX_FILE_SIZE) {
                throw new IllegalArgumentException("Each image must be under 5MB. File '"
                        + file.getOriginalFilename() + "' exceeds limit.");
            }

            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                throw new IllegalArgumentException("Only image files are accepted");
            }

            String ext = getExtension(file.getOriginalFilename());
            String filename = "ticket_" + UUID.randomUUID() + "." + ext;
            Path dest = uploadPath.resolve(filename);

            // Resize and compress using Thumbnailator
            Thumbnails.of(file.getInputStream())
                    .size(MAX_WIDTH, MAX_HEIGHT)
                    .keepAspectRatio(true)
                    .outputQuality(COMPRESSION_QUALITY)
                    .toFile(dest.toFile());

            urls.add(baseUrl + "/uploads/tickets/" + filename);
        }
        return urls;
    }

    public void deleteImages(List<String> urls) {
        if (urls == null) return;
        for (String url : urls) {
            try {
                String filename = url.substring(url.lastIndexOf('/') + 1);
                Path path = Paths.get(uploadDir, filename);
                Files.deleteIfExists(path);
            } catch (IOException ignored) {}
        }
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "jpg";
        String ext = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
        return switch (ext) {
            case "jpg", "jpeg", "png", "gif", "webp" -> ext;
            default -> "jpg";
        };
    }
}