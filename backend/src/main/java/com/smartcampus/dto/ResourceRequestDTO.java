package com.smartcampus.dto;

import com.smartcampus.model.ResourceStatus;
import com.smartcampus.model.ResourceType;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data 

public class ResourceRequestDTO {

    @NotBlank(message = "Resource name is required")  
    @Size(min = 2, max = 100)                       
    private String name;

    @NotNull(message = "Resource type is required")    
    private ResourceType type;

    @Min(value = 1, message = "Capacity must be at least 1")
    private Integer capacity; 

    @NotBlank(message = "Location is required")
    @Size(max = 150, message = "Location must be at most 150 characters")
    private String location;

    @Size(max = 100, message = "Building must be at most 100 characters")
    private String building;
    @Size(max = 20, message = "Floor must be at most 20 characters")
    private String floor;

    @NotNull(message = "Status is required")
    private ResourceStatus status;

    @Size(max = 1000, message = "Description must be at most 1000 characters")
    private String description;
    @Pattern(
        regexp = "^(MON|TUE|WED|THU|FRI|SAT|SUN)(-(MON|TUE|WED|THU|FRI|SAT|SUN))?\\s([01]\\d|2[0-3]):[0-5]\\d-([01]\\d|2[0-3]):[0-5]\\d$",
        message = "Availability window must match format 'MON-FRI 08:00-18:00'"
    )
    private String availabilityWindows;
    private String imageUrl;
    @Min(value = 1, message = "Maintenance interval must be at least 1 day")
    @Max(value = 365, message = "Maintenance interval must be at most 3650 days")
    private Integer maintenanceIntervalDays;
    

    @AssertTrue(message = "Capacity is required for non-equipment resources and must be null or >= 1 for equipment")
    public boolean isCapacityValidForType() {
        if (type == null) {
            return true;
        }
        if (type == ResourceType.EQUIPMENT) {
            return capacity == null || capacity >= 1;
        }
        return capacity != null && capacity >= 1;
    }

}