package com.smartcampus.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "resources")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder

public class Resource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ResourceType type;

    private Integer capacity;

    @Column(nullable = false)
    private String location;


    private String building;
    private String floor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ResourceStatus status;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String imageUrl;

   
    @Column(columnDefinition = "TEXT")
    private String availabilityWindows; // e.g., "MON-FRI 08:00-20:00"

     // For equipment tracking 
    private String qrCode;

    private Integer maintenanceIntervalDays; // How often to service
    private LocalDateTime lastMaintenanceDate;
    private Integer usageCount;


    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist // Runs automatically before first insert
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    // Runs automatically before every update
    @PreUpdate 
    protected void onUpdate() {
            updatedAt = LocalDateTime.now();
    }
}