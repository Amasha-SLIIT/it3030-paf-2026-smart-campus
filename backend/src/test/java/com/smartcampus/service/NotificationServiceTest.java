package com.smartcampus.service;

import com.smartcampus.model.Notification;
import com.smartcampus.model.NotificationType;
import com.smartcampus.model.Role;
import com.smartcampus.model.User;
import com.smartcampus.repository.NotificationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;


import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @InjectMocks
    private NotificationService notificationService;

    @Test
    void createNotification_shouldSaveAndReturnNotification() {
        User user = User.builder()
                .id(1L).name("Test User")
                .email("test@test.com")
                .role(Role.USER)
                .build();

        Notification saved = Notification.builder()
                .id(1L).user(user)
                .title("Booking Approved")
                .message("Your booking has been approved")
                .type(NotificationType.BOOKING_APPROVED)
                .build();

        when(notificationRepository.save(any(Notification.class))).thenReturn(saved);

        Notification result = notificationService.createNotification(
                user, "Booking Approved", "Your booking has been approved",
                NotificationType.BOOKING_APPROVED, 1L, "BOOKING"
        );

        assertNotNull(result);
        assertEquals("Booking Approved", result.getTitle());
        assertEquals(NotificationType.BOOKING_APPROVED, result.getType());
        verify(notificationRepository, times(1)).save(any(Notification.class));
    }

    @Test
    void getUnreadCount_shouldReturnCorrectCount() {
        when(notificationRepository.countByUserIdAndIsReadFalse(1L)).thenReturn(3L);

        long count = notificationService.getUnreadCount(1L);

        assertEquals(3L, count);
    }
}