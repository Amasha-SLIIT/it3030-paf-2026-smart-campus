//What Server Returns

package com.smartcampus.dto;

import lombok.Data;
import lombok.Builder;
import java.time.LocalDateTime;

import com.smartcampus.model.ResourceStatus;
import com.smartcampus.model.ResourceType;

@Data
@Builder

public class ResourceResponseDTO {

    private Long id;
    private String name;
    private ResourceType type;
    private Integer capacity;
    private String location;
    private String building;
    private String floor;
    private ResourceStatus status;
    private String description;
    private String availabilityWindows;
    private String imageUrl;
    private String qrCode;
    private Integer maintenanceIntervalDays;
    private LocalDateTime lastMaintenanceDate;
    private Integer usageCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

}
