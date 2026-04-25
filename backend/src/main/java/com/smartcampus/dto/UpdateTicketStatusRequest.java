package com.smartcampus.dto;

import com.smartcampus.model.TicketPriority;
import com.smartcampus.model.TicketStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateTicketStatusRequest {

    @NotNull(message = "Status is required")
    private TicketStatus status;

   
    private String rejectionReason;


    private String resolutionNotes;

   
    private TicketPriority currentPriority;
}