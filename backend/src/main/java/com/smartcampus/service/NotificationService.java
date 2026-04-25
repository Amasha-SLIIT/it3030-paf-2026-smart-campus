package com.smartcampus.service;

import com.smartcampus.model.Notification;
import com.smartcampus.model.NotificationType;
import com.smartcampus.model.Role;
import com.smartcampus.model.User;
import com.smartcampus.repository.NotificationRepository;
import com.smartcampus.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;   // ← added
    private final EmailService emailService;

    public Notification createNotification(User user, String title, String message,
                                           NotificationType type, Long referenceId,
                                           String referenceType) {
        Notification notification = Notification.builder()
                .user(user)
                .title(title)
                .message(message)
                .type(type)
                .referenceId(referenceId)
                .referenceType(referenceType)
                .build();

        Notification saved = notificationRepository.save(notification);

        // Send email asynchronously
        if (user.getEmail() != null) {
            emailService.sendNotificationEmail(
                    user.getEmail(),
                    user.getName(),
                    title,
                    message,
                    type != null ? type.name() : "GENERAL"
            );
        }

        return saved;
    }

    public List<Notification> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Notification> getUnreadNotifications(Long userId) {
        return notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
    }

    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public Notification markAsRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        if (!notification.getUser().getId().equals(userId))
            throw new RuntimeException("Unauthorized");
        notification.setRead(true);
        return notificationRepository.save(notification);
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsReadByUserId(userId);
    }

    @Transactional
    public void deleteNotification(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        if (!notification.getUser().getId().equals(userId))
            throw new RuntimeException("Unauthorized");
        notificationRepository.delete(notification);
    }

    // ── Convenience helpers for TicketService ────────────────────────────────

    public void notifyAllAdmins(String title, String message, Long ticketId) {
        List<User> admins = userRepository.findByRole(Role.ADMIN);
        for (User admin : admins) {
            createNotification(admin, title, message,
                    NotificationType.TICKET_STATUS_CHANGED, ticketId, "TICKET");
        }
    }

    public void notifyUserTicketAssigned(User user, String title, String message, Long ticketId) {
        createNotification(user, title, message,
                NotificationType.TICKET_ASSIGNED, ticketId, "TICKET");
    }

    public void notifyUserNewComment(User user, String title, String message, Long ticketId) {
        createNotification(user, title, message,
                NotificationType.TICKET_COMMENT_ADDED, ticketId, "TICKET");
    }

    public void notifyUserStatusChange(User user, String title, String message, Long ticketId) {
        createNotification(user, title, message,
                NotificationType.TICKET_STATUS_CHANGED, ticketId, "TICKET");
    }
}