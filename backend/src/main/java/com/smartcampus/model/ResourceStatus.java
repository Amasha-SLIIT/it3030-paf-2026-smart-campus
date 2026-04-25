package com.smartcampus.model;

public enum ResourceStatus {

    ACTIVE, // Operational — can be booked
    OUT_OF_SERVICE, // Permanently broken/closed — not bookable
    UNDER_MAINTENANCE // Temporarily down — will return to ACTIVE

}