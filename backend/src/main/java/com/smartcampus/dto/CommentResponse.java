package com.smartcampus.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class CommentResponse {
    private Long id;
    private Long ticketId;
    private TicketResponse.UserSummary author;
    private String message;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}