package com.smartcampus.dto;

import com.smartcampus.model.TicketCategory;
import com.smartcampus.model.TicketPriority;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class CreateTicketRequest {

    @NotBlank(message = "Subject is required")
    @Size(max = 120, message = "Subject must be under 120 characters")
    private String subject;

    private Long resourceId;

    private String resourceType;   
    private String location;       

    @NotNull(message = "Category is required")
    private TicketCategory category;

    @NotBlank(message = "Description is required")
    @Size(min = 10, max = 2000, message = "Description must be 10–2000 characters")
    private String description;

    @NotNull(message = "Priority is required")
    private TicketPriority priority;

    @Pattern(regexp = "^[0-9+\\-() ]{7,20}$", message = "Contact must be a valid phone number")
    private String contactDetails;
}