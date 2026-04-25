package com.smartcampus.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.smartcampus.dto.ResourceRequestDTO;
import com.smartcampus.dto.ResourceResponseDTO;
import com.smartcampus.model.ResourceStatus;
import com.smartcampus.model.ResourceType;
import com.smartcampus.service.ResourceService;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/resources")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://localhost:5175"}) 
@Validated
public class ResourceController {

    private final ResourceService resourceService;

    @GetMapping
    public ResponseEntity<List<ResourceResponseDTO>> getResources(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) ResourceType type,
            @RequestParam(required = false) ResourceStatus status,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) @Min(value = 1, message = "minCapacity must be at least 1") Integer minCapacity) {
        List<ResourceResponseDTO> resources = resourceService.searchResources(
                name, type, status, location, minCapacity);
        return ResponseEntity.ok(resources);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResourceResponseDTO> getResourceById(@PathVariable @Positive(message = "id must be positive") Long id) {
        ResourceResponseDTO resource = resourceService.getResourceById(id);
        return ResponseEntity.ok(resource);
    }

    @GetMapping("/qr/{qrCode}")
    public ResponseEntity<ResourceResponseDTO> getResourceByQrCode(@PathVariable @NotBlank(message = "qrCode is required") String qrCode) {
        ResourceResponseDTO resource = resourceService.getResourceByQrCode(qrCode);
        return ResponseEntity.ok(resource);
    }

    @PostMapping
    public ResponseEntity<ResourceResponseDTO> createResource(@Valid @RequestBody ResourceRequestDTO dto) {
        ResourceResponseDTO created = resourceService.createResource(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ResourceResponseDTO> updateResource(@PathVariable @Positive(message = "id must be positive") Long id, @Valid @RequestBody ResourceRequestDTO dto) {
        ResourceResponseDTO updated = resourceService.updateResource(id, dto);
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ResourceResponseDTO> updateResourceStatus(@PathVariable @Positive(message = "id must be positive") Long id, @RequestParam ResourceStatus status) {
        ResourceResponseDTO updated = resourceService.updateResourceStatus(id, status);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/{id}/availability")
    public ResponseEntity<Map<String, Object>> getResourceAvailability(
            @PathVariable @Positive(message = "id must be positive") Long id,
            @RequestParam(required = false) @Pattern(
                    regexp = "^\\d{4}-\\d{2}-\\d{2}$",
                    message = "weekStart must be in yyyy-MM-dd format"
            ) String weekStart) {
        return ResponseEntity.ok(resourceService.getResourceAvailability(id, weekStart));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteResource(@PathVariable @Positive(message = "id must be positive") Long id) {
        resourceService.deleteResource(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/maintenance/due")
    public ResponseEntity<List<ResourceResponseDTO>> getResourcesDueForMaintenance() {
        List<ResourceResponseDTO> resources = resourceService.getResourcesDueForMaintenance();
        return ResponseEntity.ok(resources);
    }

    @PostMapping("/{id}/maintenance/done")
    public ResponseEntity<ResourceResponseDTO> markMaintenanceDone(@PathVariable @Positive(message = "id must be positive") Long id) {
        ResourceResponseDTO updated = resourceService.markMaintenanceDone(id);
        return ResponseEntity.ok(updated);
    }

    // --- UPDATED IMAGE UPLOAD ENDPOINT ---
    @PostMapping(value = "/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ResourceResponseDTO> uploadImage(
            @PathVariable @Positive(message = "id must be positive") Long id,
            @RequestParam("file") MultipartFile file) throws IOException {
        
        // This calls the service which handles the Cloudinary upload logic
        ResourceResponseDTO updated = resourceService.uploadResourceImage(id, file);
        return ResponseEntity.ok(updated);
    }
}