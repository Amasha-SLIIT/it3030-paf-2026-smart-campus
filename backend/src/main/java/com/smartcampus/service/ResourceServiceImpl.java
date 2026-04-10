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
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.Map;

@Service
@RequiredArgsConstructor

public class ResourceServiceImpl implements ResourceService {

    private final ResourceRepository resourceRepository;
    private static final long MAX_UPLOAD_BYTES = 10L * 1024 * 1024; // 10MB
    private static final Set<String> ALLOWED_IMAGE_EXTENSIONS = new HashSet<>(
            Arrays.asList("jpg", "jpeg", "png", "webp")
    );

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
            .qrCode(UUID.randomUUID().toString()) // Generate unique QR code
            .maintenanceIntervalDays(dto.getMaintenanceIntervalDays())
            .lastMaintenanceDate(LocalDateTime.now()) // Set initial maintenance date
            .usageCount(0) // Initialize usage count
            .build();

        Resource saved = resourceRepository.save(resource);
        return mapToDTO(saved);
    }

    @Override
    public ResourceResponseDTO getResourceById(Long id) {
        Resource resource = resourceRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + id));
        return mapToDTO(resource);
    }

    @Override
    public List<ResourceResponseDTO> getAllResources() {
        return resourceRepository.findAll().stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Override
    public List<ResourceResponseDTO> searchResources(String name, ResourceType type, ResourceStatus status, String location, Integer minCapacity) {
        return resourceRepository.searchResources(name, type, status, location, minCapacity).stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Override
    public ResourceResponseDTO updateResource(Long id, ResourceRequestDTO dto) {
        Resource resource = resourceRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + id));
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
            Resource resource = resourceRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + id));
            resource.setStatus(status);
            return mapToDTO(resourceRepository.save(resource));
        }

        @Override
        public void deleteResource(Long id) {
            if (!resourceRepository.existsById(id)) {
                throw new ResourceNotFoundException("Resource not found with id: " + id);   
            }
            resourceRepository.deleteById(id);
        }

        @Override
        public ResourceResponseDTO getResourceByQrCode(String qrCode) {
            Resource resource = resourceRepository.findByQrCode(qrCode);
            if (resource == null) {
                throw new ResourceNotFoundException("Resource not found with QR code: " + qrCode);
            }
            return mapToDTO(resource);
        }

        @Override
        public List<ResourceResponseDTO> getResourcesDueForMaintenance() {
            return resourceRepository.findResourcesDueForMaintenance().stream().map(this::mapToDTO).collect(Collectors.toList());
        }

        @Override
        public ResourceResponseDTO markMaintenanceDone(Long id) {
            Resource resource = resourceRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + id));
            resource.setLastMaintenanceDate(LocalDateTime.now());
            resource.setUsageCount(0); // Reset usage count after maintenance
            resource.setStatus(ResourceStatus.ACTIVE);
            return mapToDTO(resourceRepository.save(resource));
        }

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

            Resource resource = resourceRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + id));

            String originalName = file.getOriginalFilename();
            if (originalName == null || originalName.isBlank()) {
                originalName = "image";
            }
            originalName = originalName.replaceAll("[\\\\/]+", "_");
            int dotIndex = originalName.lastIndexOf('.');
            if (dotIndex < 0 || dotIndex == originalName.length() - 1) {
                throw new IllegalArgumentException("Image extension is required (jpg, jpeg, png, webp).");
            }
            String extension = originalName.substring(dotIndex + 1).toLowerCase(Locale.ROOT);
            if (!ALLOWED_IMAGE_EXTENSIONS.contains(extension)) {
                throw new IllegalArgumentException("Unsupported image extension. Use jpg, jpeg, png, or webp.");
            }
            String filename = UUID.randomUUID() + "_" + originalName;
            Path uploadPath = Paths.get("uploads");
            Files.createDirectories(uploadPath);//creates an uploads directory next to the process working directory if it isn’t there yet 
            file.transferTo(uploadPath.resolve(filename));//saves the file under that folder with a generated name.

            String imageUrl = "/uploads/" + filename;
            resource.setImageUrl(imageUrl);
            return mapToDTO(resourceRepository.save(resource));
        }

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
    
    // ✅ ADD THIS ENTIRE METHOD
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

            // Parse availabilityWindows e.g. "MON-FRI 08:00-18:00"
            // Build a 7-day slot map
            List<Map<String, Object>> days = new ArrayList<>();
            String[] dayNames = {"MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"};

            for (int i = 0; i < 7; i++) {
                LocalDate date = startDate.plusDays(i);
                String dayName = dayNames[i];
                Map<String, Object> dayMap = new LinkedHashMap<>();
                dayMap.put("date", date.toString());
                dayMap.put("dayName", dayName);

                boolean isAvailable = isAvailableOnDay(resource.getAvailabilityWindows(), dayName);
                dayMap.put("available", isAvailable);

                if (isAvailable) {
                    String[] times = parseAvailabilityTimes(resource.getAvailabilityWindows());
                    dayMap.put("openTime", times[0]);
                    dayMap.put("closeTime", times[1]);
                    dayMap.put("slots", generateSlots(times[0], times[1]));
                } else {
                    dayMap.put("openTime", null);
                    dayMap.put("closeTime", null);
                    dayMap.put("slots", List.of());
                }
                days.add(dayMap);
            }

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("resourceId", resource.getId());
            result.put("resourceName", resource.getName());
            result.put("weekStart", startDate.toString());
            result.put("days", days);
            return result;
        }

        // Helper: check if day name is within the range e.g. MON-FRI
        private boolean isAvailableOnDay(String windows, String day) {
            if (windows == null || windows.isBlank()) return false;
            // e.g. "MON-FRI 08:00-18:00"
            String[] parts = windows.trim().split(" ");
            if (parts.length < 1) return false;
            String dayRange = parts[0]; // "MON-FRI"
            String[] days = {"MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"};
            List<String> allDays = Arrays.asList(days);
            if (dayRange.contains("-")) {
                String[] range = dayRange.split("-");
                int startIdx = allDays.indexOf(range[0]);
                int endIdx = allDays.indexOf(range[1]);
                int dayIdx = allDays.indexOf(day);
                return dayIdx >= startIdx && dayIdx <= endIdx;
            }
            return dayRange.equals(day);
        }

        // Helper: extract open and close times
        private String[] parseAvailabilityTimes(String windows) {
            if (windows == null) return new String[]{"08:00", "18:00"};
            String[] parts = windows.trim().split(" ");
            if (parts.length < 2) return new String[]{"08:00", "18:00"};
            return parts[1].split("-"); // ["08:00", "18:00"]
        }

        // Helper: generate 1-hour slots between open and close
        private List<Map<String, String>> generateSlots(String open, String close) {
            List<Map<String, String>> slots = new ArrayList<>();
            LocalTime current = LocalTime.parse(open);
            LocalTime end = LocalTime.parse(close);
            while (current.plusHours(1).compareTo(end) <= 0) {
                Map<String, String> slot = new LinkedHashMap<>();
                slot.put("start", current.toString());
                slot.put("end", current.plusHours(1).toString());
                slot.put("status", "AVAILABLE"); // Module B will update this with real bookings
                slots.add(slot);
                current = current.plusHours(1);
            }
            return slots;
        }
}

