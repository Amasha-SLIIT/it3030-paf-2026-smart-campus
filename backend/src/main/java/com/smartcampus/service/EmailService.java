package com.smartcampus.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Async
    public void sendNotificationEmail(String toEmail, String userName,
                                       String title, String message,
                                       String type) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Smart Campus: " + title);
            helper.setText(buildEmailHtml(userName, title, message, type), true);

            mailSender.send(mimeMessage);
            log.info("Email sent to {}", toEmail);

        } catch (MessagingException e) {
            log.error("Failed to send email to {}: {}", toEmail, e.getMessage());
        }
    }

    private String buildEmailHtml(String userName, String title,
                                   String message, String type) {
        String iconEmoji = getIconForType(type);
        String accentColor = getColorForType(type);

        return """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
                <tr><td align="center">
                  <table width="600" cellpadding="0" cellspacing="0"
                    style="background:white;border-radius:16px;overflow:hidden;
                           box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                           
                    <!-- Header -->
                    <tr>
                      <td style="background:linear-gradient(135deg,#1e3a5f,#2d6a9f);
                                 padding:32px;text-align:center;">
                        <h1 style="margin:0;color:white;font-size:22px;font-weight:700;">
                          🎓 Smart Campus
                        </h1>
                        <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">
                          Operations Hub
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Icon banner -->
                    <tr>
                      <td style="background:%s;padding:24px;text-align:center;">
                        <span style="font-size:40px;">%s</span>
                        <h2 style="margin:12px 0 0;color:#111827;font-size:20px;">%s</h2>
                      </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                      <td style="padding:32px;">
                        <p style="margin:0 0 16px;color:#374151;font-size:15px;">
                          Hi <strong>%s</strong>,
                        </p>
                        <div style="background:#f8fafc;border-left:4px solid %s;
                                    border-radius:8px;padding:16px 20px;margin:0 0 24px;">
                          <p style="margin:0;color:#1f2937;font-size:15px;line-height:1.6;">
                            %s
                          </p>
                        </div>
                        <p style="margin:0 0 24px;color:#6b7280;font-size:13px;">
                          Log in to Smart Campus to view more details and take action.
                        </p>
                        <div style="text-align:center;">
                          <a href="%s/notifications"
                             style="display:inline-block;background:#1e3a5f;color:white;
                                    text-decoration:none;padding:12px 28px;border-radius:8px;
                                    font-size:14px;font-weight:600;">
                            View Notifications
                          </a>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background:#f8fafc;padding:20px 32px;
                                 border-top:1px solid #e5e7eb;text-align:center;">
                        <p style="margin:0;color:#9ca3af;font-size:12px;">
                          This is an automated notification from Smart Campus Operations Hub.<br>
                          Please do not reply to this email.
                        </p>
                      </td>
                    </tr>
                    
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """.formatted(
                getLightColorForType(type),
                iconEmoji, title,
                userName, accentColor, message,
                frontendUrl
            );
    }

    private String getIconForType(String type) {
        if (type == null) return "🔔";
        return switch (type) {
            case "BOOKING_APPROVED"     -> "✅";
            case "BOOKING_REJECTED"     -> "❌";
            case "BOOKING_CANCELLED"    -> "⚠️";
            case "TICKET_STATUS_CHANGED"-> "🔄";
            case "TICKET_COMMENT_ADDED" -> "💬";
            case "TICKET_ASSIGNED"      -> "👤";
            default                     -> "🔔";
        };
    }

    private String getColorForType(String type) {
        if (type == null) return "#6b7280";
        return switch (type) {
            case "BOOKING_APPROVED"     -> "#16a34a";
            case "BOOKING_REJECTED"     -> "#dc2626";
            case "BOOKING_CANCELLED"    -> "#d97706";
            case "TICKET_STATUS_CHANGED"-> "#2563eb";
            case "TICKET_COMMENT_ADDED" -> "#7c3aed";
            case "TICKET_ASSIGNED"      -> "#0891b2";
            default                     -> "#6b7280";
        };
    }

    private String getLightColorForType(String type) {
        if (type == null) return "#f9fafb";
        return switch (type) {
            case "BOOKING_APPROVED"     -> "#f0fdf4";
            case "BOOKING_REJECTED"     -> "#fef2f2";
            case "BOOKING_CANCELLED"    -> "#fffbeb";
            case "TICKET_STATUS_CHANGED"-> "#eff6ff";
            case "TICKET_COMMENT_ADDED" -> "#f5f3ff";
            case "TICKET_ASSIGNED"      -> "#ecfeff";
            default                     -> "#f9fafb";
        };
    }
}