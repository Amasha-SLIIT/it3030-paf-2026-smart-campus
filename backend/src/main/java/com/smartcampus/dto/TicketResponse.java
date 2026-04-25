package com.smartcampus.dto;

import com.smartcampus.model.*;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class TicketResponse {
    private Long id;
    private String subject;
    private Long resourceId;
    private String resourceName;
    private String resourceType;
    private String location;
    private UserSummary reportedBy;
    private UserSummary assignedTo;
    private TicketCategory category;
    private String description;
    private TicketPriority requestedPriority;
    private TicketPriority currentPriority;
    private TicketStatus status;
    private List<String> imageUrls;
    private String resolutionNotes;
    private String rejectionReason;
    private String contactDetails;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @Builder
    public static class UserSummary {
        private Long id;
        private String name;
        private String email;
        private String role;
        private String picture;
    }
}