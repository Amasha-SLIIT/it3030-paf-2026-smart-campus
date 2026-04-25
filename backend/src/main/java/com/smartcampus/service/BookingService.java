package com.smartcampus.service;

import com.smartcampus.dto.*;
import com.smartcampus.model.*;
import com.smartcampus.repository.BookingRepository;
import com.smartcampus.repository.NotificationRepository;
import com.smartcampus.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Transactional
    public synchronized BookingResponseDTO createBooking(BookingRequestDTO dto, String userEmail, String userName) {

        if (!dto.getEndTime().isAfter(dto.getStartTime())) {
            throw new IllegalArgumentException("End time must be after start time");
        }
        if (!dto.getStartTime().isAfter(LocalDateTime.now())) {
            throw new IllegalArgumentException("Start time must be in the future");
        }

        List<Booking> conflicts = bookingRepository.findConflictingBookings(
            dto.getResourceId(), dto.getStartTime(), dto.getEndTime()
        );
        if (!conflicts.isEmpty()) {
            throw new IllegalStateException(
                "This resource is already booked for the selected time slot. Please choose a different time."
            );
        }

        Booking booking = new Booking();
        booking.setResourceId(dto.getResourceId());
        booking.setResourceName(dto.getResourceName());
        booking.setUserEmail(userEmail);
        booking.setUserName(userName);
        booking.setStartTime(dto.getStartTime());
        booking.setEndTime(dto.getEndTime());
        booking.setPurpose(dto.getPurpose());
        booking.setExpectedAttendees(dto.getExpectedAttendees());
        booking.setStatus(BookingStatus.PENDING);

        Booking saved = bookingRepository.save(booking);
        Long savedId = saved.getId();
        String resourceName = dto.getResourceName();
        LocalDateTime startTime = dto.getStartTime();

        sendAfterCommit(() -> sendNotification(
            userEmail,
            "Booking Request Received",
            "Your booking request for " + resourceName + " on " +
            startTime.toLocalDate() + " at " + startTime.toLocalTime() +
            " has been submitted and is pending approval.",
            savedId
        ));

        return toDTO(saved);
    }

    public List<BookingResponseDTO> getMyBookings(String userEmail) {
        return bookingRepository.findByUserEmail(userEmail)
            .stream().map(this::toDTO).collect(Collectors.toList());
    }

    public List<BookingResponseDTO> getAllBookings(BookingStatus status) {
        List<Booking> bookings = (status != null)
            ? bookingRepository.findByStatus(status)
            : bookingRepository.findAll();
        return bookings.stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional
    public BookingResponseDTO updateBooking(Long bookingId, BookingUpdateRequestDTO dto, String userEmail) {

        Booking booking = bookingRepository.findById(bookingId)
            .orElseThrow(() -> new RuntimeException("Booking not found with id: " + bookingId));

        if (!booking.getUserEmail().equals(userEmail)) {
            throw new IllegalStateException("You can only update your own bookings");
        }
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new IllegalStateException("Only PENDING bookings can be updated");
        }
        if (!dto.getEndTime().isAfter(dto.getStartTime())) {
            throw new IllegalArgumentException("End time must be after start time");
        }
        if (!dto.getStartTime().isAfter(LocalDateTime.now())) {
            throw new IllegalArgumentException("Start time must be in the future");
        }

        Long conflictCount = bookingRepository.countConflictExcluding(
            booking.getResourceId(),
            dto.getStartTime(),
            dto.getEndTime(),
            bookingId
        );
        if (conflictCount > 0) {
            throw new IllegalStateException(
                "This resource is already booked for the selected time slot. Please choose a different time."
            );
        }

        booking.setStartTime(dto.getStartTime());
        booking.setEndTime(dto.getEndTime());
        booking.setPurpose(dto.getPurpose());
        booking.setExpectedAttendees(dto.getExpectedAttendees());

        Booking saved = bookingRepository.save(booking);
        Long savedId = saved.getId();
        String resourceName = booking.getResourceName();
        LocalDateTime startTime = dto.getStartTime();

        // Runs AFTER transaction commits — notification failure cannot roll back the booking
        sendAfterCommit(() -> sendNotification(
            userEmail,
            "Booking Updated",
            "Your booking for " + resourceName + " has been updated to " +
            startTime.toLocalDate() + " at " + startTime.toLocalTime() + ".",
            savedId
        ));

        return toDTO(saved);
    }

    @Transactional
    public synchronized BookingResponseDTO decideBooking(Long bookingId, BookingDecisionDTO dto) {
        Booking booking = bookingRepository.findById(bookingId)
            .orElseThrow(() -> new RuntimeException("Booking not found with id: " + bookingId));

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new IllegalStateException("Only PENDING bookings can be approved or rejected");
        }

        String userEmail = booking.getUserEmail();
        String resourceName = booking.getResourceName();
        LocalDateTime startTime = booking.getStartTime();

        if (dto.getApproved()) {
            List<Booking> conflicts = bookingRepository.findConflictingBookings(
                booking.getResourceId(), booking.getStartTime(), booking.getEndTime()
            );
            if (!conflicts.isEmpty()) {
                throw new IllegalStateException("Cannot approve: a conflicting booking already exists for this slot");
            }
            booking.setStatus(BookingStatus.APPROVED);

            sendAfterCommit(() -> sendNotification(
                userEmail,
                "Booking Approved ✅",
                "Your booking for " + resourceName + " on " +
                startTime.toLocalDate() + " at " + startTime.toLocalTime() +
                " has been approved!",
                bookingId
            ));

        } else {
            if (dto.getReason() == null || dto.getReason().isBlank()) {
                throw new IllegalArgumentException("A reason is required when rejecting a booking");
            }
            booking.setStatus(BookingStatus.REJECTED);
            String reason = dto.getReason();

            sendAfterCommit(() -> sendNotification(
                userEmail,
                "Booking Rejected ❌",
                "Your booking for " + resourceName + " on " +
                startTime.toLocalDate() + " was rejected. Reason: " + reason,
                bookingId
            ));
        }

        booking.setAdminReason(dto.getReason());
        return toDTO(bookingRepository.save(booking));
    }

    @Transactional
    public BookingResponseDTO cancelBooking(Long bookingId, String userEmail) {
        Booking booking = bookingRepository.findById(bookingId)
            .orElseThrow(() -> new RuntimeException("Booking not found with id: " + bookingId));

        if (booking.getStatus() != BookingStatus.APPROVED) {
            throw new IllegalStateException("Only APPROVED bookings can be cancelled");
        }

        booking.setStatus(BookingStatus.CANCELLED);

        String bookingUserEmail = booking.getUserEmail();
        String resourceName = booking.getResourceName();
        LocalDateTime startTime = booking.getStartTime();

        if (!bookingUserEmail.equals(userEmail)) {
            sendAfterCommit(() -> sendNotification(
                bookingUserEmail,
                "Booking Cancelled",
                "Your approved booking for " + resourceName + " on " +
                startTime.toLocalDate() + " has been cancelled by an admin.",
                bookingId
            ));
        }

        return toDTO(bookingRepository.save(booking));
    }

    // ─────────────────────────────────────────────────────────────────
    // Registers a task to run AFTER the current transaction commits.
    // This means notification failures CANNOT roll back the booking.
    // ─────────────────────────────────────────────────────────────────
    private void sendAfterCommit(Runnable task) {
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    task.run();
                }
            });
        } else {
            task.run();
        }
    }

    private void sendNotification(String userEmail, String title, String message, Long bookingId) {
        try {
            userRepository.findByEmail(userEmail).ifPresent(user -> {
                Notification notification = Notification.builder()
                    .user(user)
                    .title(title)
                    .message(message)
                    .type(NotificationType.BOOKING_UPDATE)
                    .referenceId(bookingId)
                    .referenceType("BOOKING")
                    .build();
                notificationRepository.save(notification);
            });
        } catch (Exception e) {
            System.out.println("Notification skipped: " + e.getMessage());
        }
    }

    private BookingResponseDTO toDTO(Booking b) {
        BookingResponseDTO dto = new BookingResponseDTO();
        dto.setId(b.getId());
        dto.setResourceId(b.getResourceId());
        dto.setResourceName(b.getResourceName());
        dto.setUserEmail(b.getUserEmail());
        dto.setUserName(b.getUserName());
        dto.setStartTime(b.getStartTime());
        dto.setEndTime(b.getEndTime());
        dto.setPurpose(b.getPurpose());
        dto.setExpectedAttendees(b.getExpectedAttendees());
        dto.setStatus(b.getStatus());
        dto.setAdminReason(b.getAdminReason());
        dto.setCreatedAt(b.getCreatedAt());
        return dto;
    }
}