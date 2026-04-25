package com.smartcampus.repository;

import com.smartcampus.model.Booking;
import com.smartcampus.model.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    List<Booking> findByUserEmail(String userEmail);

    List<Booking> findByStatus(BookingStatus status);

    // Used when CREATING — finds conflicting approved bookings
    @Query("""
        SELECT b FROM Booking b
        WHERE b.resourceId = :resourceId
          AND b.status = 'APPROVED'
          AND b.startTime < :endTime
          AND b.endTime > :startTime
    """)
    List<Booking> findConflictingBookings(
        @Param("resourceId") Long resourceId,
        @Param("startTime") LocalDateTime startTime,
        @Param("endTime") LocalDateTime endTime
    );

    // Used when UPDATING — counts conflicts excluding the booking being edited
    @Query("""
        SELECT COUNT(b) FROM Booking b
        WHERE b.resourceId = :resourceId
          AND b.id <> :excludeId
          AND b.status = 'APPROVED'
          AND b.startTime < :endTime
          AND b.endTime > :startTime
    """)
    Long countConflictExcluding(
        @Param("resourceId") Long resourceId,
        @Param("startTime") LocalDateTime startTime,
        @Param("endTime") LocalDateTime endTime,
        @Param("excludeId") Long excludeId
    );
}