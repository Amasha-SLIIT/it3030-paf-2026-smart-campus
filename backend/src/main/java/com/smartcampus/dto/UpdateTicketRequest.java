package com.smartcampus.dto;

import com.smartcampus.model.TicketCategory;
import com.smartcampus.model.TicketPriority;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateTicketRequest {

    @Size(max = 120)
    private String subject;

    private TicketCategory category;

    @Size(min = 10, max = 2000)
    private String description;

    private TicketPriority priority;

    private String contactDetails;
}