package com.smartcampus.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BookingDecisionDTO {

    @NotNull(message = "approved field is required (true or false)")
    private Boolean approved;

    private String reason;
}