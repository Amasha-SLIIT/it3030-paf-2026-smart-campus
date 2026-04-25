package com.smartcampus.dto;

import com.smartcampus.model.BookingStatus;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class BookingResponseDTO {
    private Long id;
    private Long resourceId;
    private String resourceName;
    private String userEmail;
    private String userName;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String purpose;
    private Integer expectedAttendees;
    private BookingStatus status;
    private String adminReason;
    private LocalDateTime createdAt;
}