package com.smartcampus.service;

import com.smartcampus.dto.ResourceRequestDTO;
import com.smartcampus.dto.ResourceResponseDTO;
import com.smartcampus.model.Resource;
import com.smartcampus.model.ResourceStatus;
import com.smartcampus.model.ResourceType;
import com.smartcampus.repository.ResourceRepository;
import com.smartcampus.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ResourceServiceImpl implements ResourceService {

    private final ResourceRepository resourceRepository;
    private final CloudinaryService  cloudinaryService;

    private static final long MAX_UPLOAD_BYTES = 10L * 1024 * 1024;
    private static final Set<String> ALLOWED_IMAGE_EXTENSIONS = new HashSet<>(
            Arrays.asList("jpg", "jpeg", "png", "webp")
    );

    // ── CREATE ────────────────────────────────────────────────────────────────

    @Override
    public ResourceResponseDTO createResource(ResourceRequestDTO dto) {
        Resource resource = Resource.builder()
                .name(dto.getName())
                .type(dto.getType())
                .capacity(dto.getCapacity())
                .location(dto.getLocation())
                .building(dto.getBuilding())
                .floor(dto.getFloor())
                .status(dto.getStatus())
                .description(dto.getDescription())
                .availabilityWindows(dto.getAvailabilityWindows())
                .imageUrl(dto.getImageUrl())
                .qrCode(UUID.randomUUID().toString())
                .maintenanceIntervalDays(dto.getMaintenanceIntervalDays())
                .lastMaintenanceDate(LocalDateTime.now())
                .usageCount(0)
                .build();

        return mapToDTO(resourceRepository.save(resource));
    }

    // ── READ ──────────────────────────────────────────────────────────────────

    @Override
    public ResourceResponseDTO getResourceById(Long id) {
        return mapToDTO(resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + id)));
    }

    @Override
    public List<ResourceResponseDTO> getAllResources() {
        return resourceRepository.findAll()
                .stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Override
    public List<ResourceResponseDTO> searchResources(String name, ResourceType type,
                                                      ResourceStatus status, String location,
                                                      Integer minCapacity) {
        return resourceRepository.searchResources(name, type, status, location, minCapacity)
                .stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Override
    public ResourceResponseDTO getResourceByQrCode(String qrCode) {
        Resource resource = resourceRepository.findByQrCode(qrCode);
        if (resource == null) {
            throw new ResourceNotFoundException("Resource not found with QR code: " + qrCode);
        }
        return mapToDTO(resource);
    }

    // ── UPDATE ────────────────────────────────────────────────────────────────

    @Override
    public ResourceResponseDTO updateResource(Long id, ResourceRequestDTO dto) {
        Resource resource = resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + id));

        resource.setName(dto.getName());
        resource.setType(dto.getType());
        resource.setCapacity(dto.getCapacity());
        resource.setLocation(dto.getLocation());
        resource.setBuilding(dto.getBuilding());
        resource.setFloor(dto.getFloor());
        resource.setStatus(dto.getStatus());
        resource.setDescription(dto.getDescription());
        resource.setAvailabilityWindows(dto.getAvailabilityWindows());
        resource.setImageUrl(dto.getImageUrl());
        resource.setMaintenanceIntervalDays(dto.getMaintenanceIntervalDays());

        return mapToDTO(resourceRepository.save(resource));
    }

    @Override
    public ResourceResponseDTO updateResourceStatus(Long id, ResourceStatus status) {
        Resource resource = resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + id));
        resource.setStatus(status);
        return mapToDTO(resourceRepository.save(resource));
    }

    // ── DELETE ────────────────────────────────────────────────────────────────

    @Override
    public void deleteResource(Long id) {
        if (!resourceRepository.existsById(id)) {
            throw new ResourceNotFoundException("Resource not found with id: " + id);
        }
        resourceRepository.deleteById(id);
    }

    // ── MAINTENANCE ───────────────────────────────────────────────────────────

    @Override
    public List<ResourceResponseDTO> getResourcesDueForMaintenance() {
        return resourceRepository.findResourcesDueForMaintenance()
                .stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Override
    public ResourceResponseDTO markMaintenanceDone(Long id) {
        Resource resource = resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + id));
        resource.setLastMaintenanceDate(LocalDateTime.now());
        resource.setUsageCount(0);
        resource.setStatus(ResourceStatus.ACTIVE);
        return mapToDTO(resourceRepository.save(resource));
    }

    // ── IMAGE UPLOAD (Cloudinary) ─────────────────────────────────────────────

    @Override
    public ResourceResponseDTO uploadResourceImage(Long id, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Image file is required.");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase().startsWith("image/")) {
            throw new IllegalArgumentException("Only image uploads are allowed.");
        }

        if (file.getSize() > MAX_UPLOAD_BYTES) {
            throw new IllegalArgumentException("Image must be 10MB or smaller.");
        }

        // Validate extension
        String originalName = file.getOriginalFilename();
        if (originalName != null && originalName.contains(".")) {
            String extension = originalName
                    .substring(originalName.lastIndexOf('.') + 1)
                    .toLowerCase(Locale.ROOT);
            if (!ALLOWED_IMAGE_EXTENSIONS.contains(extension)) {
                throw new IllegalArgumentException(
                        "Unsupported image extension. Use jpg, jpeg, png, or webp.");
            }
        }

        Resource resource = resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + id));

        // Upload to Cloudinary — returns a full https:// URL
        String imageUrl = cloudinaryService.uploadImage(file, "smart-campus/resources");
        resource.setImageUrl(imageUrl);

        return mapToDTO(resourceRepository.save(resource));
    }

    // ── AVAILABILITY CALENDAR ─────────────────────────────────────────────────

    @Override
    public Map<String, Object> getResourceAvailability(Long id, String weekStart) {
        Resource resource = resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + id));

        LocalDate startDate;
        if (weekStart == null || weekStart.isBlank()) {
            startDate = LocalDate.now().with(DayOfWeek.MONDAY);
        } else {
            try {
                startDate = LocalDate.parse(weekStart, DateTimeFormatter.ISO_DATE);
            } catch (DateTimeParseException ex) {
                throw new IllegalArgumentException("weekStart must be a valid date in yyyy-MM-dd format.");
            }
        }

        String[] dayNames = {"MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"};
        List<Map<String, Object>> days = new ArrayList<>();

        for (int i = 0; i < 7; i++) {
            LocalDate date    = startDate.plusDays(i);
            String    dayName = dayNames[i];

            Map<String, Object> dayMap = new LinkedHashMap<>();
            dayMap.put("date",    date.toString());
            dayMap.put("dayName", dayName);

            boolean isAvailable = isAvailableOnDay(resource.getAvailabilityWindows(), dayName);
            dayMap.put("available", isAvailable);

            if (isAvailable) {
                String[] times = parseAvailabilityTimes(resource.getAvailabilityWindows());
                dayMap.put("openTime",  times[0]);
                dayMap.put("closeTime", times[1]);
                dayMap.put("slots",     generateSlots(times[0], times[1]));
            } else {
                dayMap.put("openTime",  null);
                dayMap.put("closeTime", null);
                dayMap.put("slots",     List.of());
            }

            days.add(dayMap);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("resourceId",   resource.getId());
        result.put("resourceName", resource.getName());
        result.put("weekStart",    startDate.toString());
        result.put("days",         days);
        return result;
    }

    // ── PRIVATE HELPERS ───────────────────────────────────────────────────────

    private boolean isAvailableOnDay(String windows, String day) {
        if (windows == null || windows.isBlank()) return false;
        String[] parts    = windows.trim().split(" ");
        if (parts.length < 1) return false;
        String   dayRange = parts[0];
        List<String> allDays = Arrays.asList("MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN");
        if (dayRange.contains("-")) {
            String[] range    = dayRange.split("-");
            int      startIdx = allDays.indexOf(range[0]);
            int      endIdx   = allDays.indexOf(range[1]);
            int      dayIdx   = allDays.indexOf(day);
            return dayIdx >= startIdx && dayIdx <= endIdx;
        }
        return dayRange.equals(day);
    }

    private String[] parseAvailabilityTimes(String windows) {
        if (windows == null) return new String[]{"08:00", "18:00"};
        String[] parts = windows.trim().split(" ");
        if (parts.length < 2) return new String[]{"08:00", "18:00"};
        return parts[1].split("-");
    }

    private List<Map<String, String>> generateSlots(String open, String close) {
        List<Map<String, String>> slots   = new ArrayList<>();
        LocalTime                 current = LocalTime.parse(open);
        LocalTime                 end     = LocalTime.parse(close);
        while (current.plusHours(1).compareTo(end) <= 0) {
            Map<String, String> slot = new LinkedHashMap<>();
            slot.put("start",  current.toString());
            slot.put("end",    current.plusHours(1).toString());
            slot.put("status", "AVAILABLE");
            slots.add(slot);
            current = current.plusHours(1);
        }
        return slots;
    }

    // ── MAPPER ────────────────────────────────────────────────────────────────

    private ResourceResponseDTO mapToDTO(Resource resource) {
        return ResourceResponseDTO.builder()
                .id(resource.getId())
                .name(resource.getName())
                .type(resource.getType())
                .capacity(resource.getCapacity())
                .location(resource.getLocation())
                .building(resource.getBuilding())
                .floor(resource.getFloor())
                .status(resource.getStatus())
                .description(resource.getDescription())
                .availabilityWindows(resource.getAvailabilityWindows())
                .imageUrl(resource.getImageUrl())
                .qrCode(resource.getQrCode())
                .maintenanceIntervalDays(resource.getMaintenanceIntervalDays())
                .lastMaintenanceDate(resource.getLastMaintenanceDate())
                .usageCount(resource.getUsageCount())
                .createdAt(resource.getCreatedAt())
                .updatedAt(resource.getUpdatedAt())
                .build();
    }
}