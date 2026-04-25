package com.smartcampus.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CommentRequest {
    @NotBlank(message = "Message is required")
    @Size(max = 1000, message = "Comment must be under 1000 characters")
    private String message;
}