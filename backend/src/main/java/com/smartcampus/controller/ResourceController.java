package com.smartcampus.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
//import org.springframework.security.access.prepost.PreAuthorize;
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
@RequestMapping("/api/v1/resources")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173") // React dev server
@Validated
public class ResourceController {

    private final ResourceService resourceService;

    // GET all resources with optional filters
    // GET /api/v1/resources?type=LAB&status=ACTIVE
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

    // GET single resource by ID
    // GET /api/v1/resources/{id}
    @GetMapping("/{id}")
    public ResponseEntity<ResourceResponseDTO> getResourceById(@PathVariable @Positive(message = "id must be positive") Long id) {
        ResourceResponseDTO resource = resourceService.getResourceById(id);
        return ResponseEntity.ok(resource);
    }

    // GET resource by QR code (novelty feature)
    // GET /api/v1/resources/qr/{qrCode}
    @GetMapping("/qr/{qrCode}")
    public ResponseEntity<ResourceResponseDTO> getResourceByQrCode(@PathVariable @NotBlank(message = "qrCode is required") String qrCode) {
        ResourceResponseDTO resource = resourceService.getResourceByQrCode(qrCode);
        return ResponseEntity.ok(resource);
    }

    // POST create new resource
    // POST /api/v1/resources   
    
    //@PreAuthorize("hasRole('ADMIN')") // Only admins can create resources
    @PostMapping
    public ResponseEntity<ResourceResponseDTO> createResource(@Valid @RequestBody ResourceRequestDTO dto) {
        ResourceResponseDTO created = resourceService.createResource(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // PUT update existing resource
    // PUT /api/v1/resources/{id}
    @PutMapping("/{id}")
    //@PreAuthorize("hasRole('ADMIN')") // Only admins can update resources
    public ResponseEntity<ResourceResponseDTO> updateResource(@PathVariable @Positive(message = "id must be positive") Long id, @Valid @RequestBody ResourceRequestDTO dto) {
        ResourceResponseDTO updated = resourceService.updateResource(id, dto);
        return ResponseEntity.ok(updated);
    }

    //PATCH update resource status (e.g., for check-in/check-out)
    // PATCH /api/v1/resources/{id}/status
    @PatchMapping("/{id}/status")
    //@PreAuthorize("hasRole('ADMIN')") // Only admins can change status
    public ResponseEntity<ResourceResponseDTO> updateResourceStatus(@PathVariable @Positive(message = "id must be positive") Long id, @RequestParam ResourceStatus status) {
        ResourceResponseDTO updated = resourceService.updateResourceStatus(id, status);
        return ResponseEntity.ok(updated);
    }

    // GET resource availability (novelty feature)
    // GET /api/v1/resources/{id}/availability?weekStart=2026-04-07
    @GetMapping("/{id}/availability")
    public ResponseEntity<Map<String, Object>> getResourceAvailability(
            @PathVariable @Positive(message = "id must be positive") Long id,
            @RequestParam(required = false) @Pattern(
                    regexp = "^\\d{4}-\\d{2}-\\d{2}$",
                    message = "weekStart must be in yyyy-MM-dd format"
            ) String weekStart) {
        return ResponseEntity.ok(resourceService.getResourceAvailability(id, weekStart));
    }

    // DELETE a resource
    // DELETE /api/v1/resources/{id}
    @DeleteMapping("/{id}")
    //@PreAuthorize("hasRole('ADMIN')") // Only admins can delete resources
    public ResponseEntity<Void> deleteResource(@PathVariable @Positive(message = "id must be positive") Long id) {
        resourceService.deleteResource(id);
        return ResponseEntity.noContent().build();
    }

    // GET resources due for maintenance
    // GET /api/v1/resources/maintenance/due
    @GetMapping("/maintenance/due")
    //@PreAuthorize("hasRole('ADMIN')") // Only admins can view maintenance info
    public ResponseEntity<List<ResourceResponseDTO>> getResourcesDueForMaintenance() {
        List<ResourceResponseDTO> resources = resourceService.getResourcesDueForMaintenance();
        return ResponseEntity.ok(resources);
    }

    // POST mark maintenance done
    // POST /api/v1/resources/{id}/maintenance/done
    @PostMapping("/{id}/maintenance/done")
    //@PreAuthorize("hasRole('ADMIN')") // Only admins can mark maintenance
    public ResponseEntity<ResourceResponseDTO> markMaintenanceDone(@PathVariable @Positive(message = "id must be positive") Long id) {
        ResourceResponseDTO updated = resourceService.markMaintenanceDone(id);
        return ResponseEntity.ok(updated);
    }

    // Optional file upload endpoint – saves image to /uploads/ folder on server
    @PostMapping("/{id}/image")
    //@PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResourceResponseDTO> uploadImage(
            @PathVariable @Positive(message = "id must be positive") Long id,
            @RequestParam("file") MultipartFile file) throws IOException {
        ResourceResponseDTO updated = resourceService.uploadResourceImage(id, file);
        return ResponseEntity.ok(updated);
    }


}
