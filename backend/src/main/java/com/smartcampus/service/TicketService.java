package com.smartcampus.service;

import com.smartcampus.dto.*;
import com.smartcampus.model.*;
import com.smartcampus.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;
    private final TicketCommentRepository commentRepository;
    private final UserRepository userRepository;
    private final ResourceRepository resourceRepository;
    private final NotificationService notificationService;
    private final FileStorageService fileStorageService;

    // ─────────────────────────────────────────────
    //  CREATE TICKET (USER / ACADEMIC_STAFF)
    // ─────────────────────────────────────────────

    @Transactional
    public TicketResponse createTicket(CreateTicketRequest req,
                                       List<MultipartFile> images,
                                       User currentUser) throws IOException {
        if (images != null && images.size() > 3) {
            throw new IllegalArgumentException("Maximum 3 images allowed per ticket");
        }

        // Store images and collect URLs
        List<String> imageUrlList = new ArrayList<>();
        if (images != null) {
            for (MultipartFile img : images) {
                if (!img.isEmpty()) {
                    imageUrlList.add(fileStorageService.store(img));
                }
            }
        }

        Resource resource = null;
        if (req.getResourceId() != null) {
            resource = resourceRepository.findById(req.getResourceId())
                    .orElse(null);
        }

        Ticket ticket = Ticket.builder()
                .subject(req.getSubject())
                .resource(resource)
                .reportedBy(currentUser)
                .category(req.getCategory())
                .description(req.getDescription())
                .requestedPriority(req.getPriority())
                .currentPriority(req.getPriority())
                .status(TicketStatus.OPEN)
                .imageUrls(String.join(",", imageUrlList))
                .contactDetails(req.getContactDetails())
                .build();

        ticket = ticketRepository.save(ticket);

        // Notify all ADMINs about new ticket
        List<User> admins = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.ADMIN)
                .collect(Collectors.toList());

        for (User admin : admins) {
            notificationService.createNotification(
                    admin,
                    "🔧 New Maintenance Ticket",
                    "Ticket #" + ticket.getId() + " – \"" + ticket.getSubject()
                            + "\" submitted by " + currentUser.getName(),
                    NotificationType.TICKET_STATUS_CHANGED,
                    ticket.getId(),
                    "TICKET"
            );
        }

        return toResponse(ticket);
    }

    // ─────────────────────────────────────────────
    //  GET TICKETS
    // ─────────────────────────────────────────────

    public List<TicketResponse> getMyTickets(User user) {
        return ticketRepository.findByReportedByIdOrderByCreatedAtDesc(user.getId())
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<TicketResponse> getAllTickets(String statusFilter, String searchQuery) {
        List<Ticket> tickets;
        if (searchQuery != null && !searchQuery.isBlank()) {
            tickets = ticketRepository.searchTickets(searchQuery);
        } else if (statusFilter != null && !statusFilter.isBlank()) {
            tickets = ticketRepository.findByStatusOrderByCreatedAtDesc(
                    TicketStatus.valueOf(statusFilter.toUpperCase()));
        } else {
            tickets = ticketRepository.findAllByOrderByCreatedAtDesc();
        }
        return tickets.stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<TicketResponse> getAssignedTickets(User staff, String searchQuery) {
        List<Ticket> tickets;
        if (searchQuery != null && !searchQuery.isBlank()) {
            tickets = ticketRepository.searchAssignedTickets(staff.getId(), searchQuery);
        } else {
            tickets = ticketRepository.findByAssignedToIdOrderByCreatedAtDesc(staff.getId());
        }
        return tickets.stream().map(this::toResponse).collect(Collectors.toList());
    }

    public TicketResponse getTicketById(Long id, User requester) {
        Ticket ticket = findTicketSecure(id, requester);
        return toResponse(ticket);
    }

    // ─────────────────────────────────────────────
    //  UPDATE TICKET (before processing – owner only)
    // ─────────────────────────────────────────────

    @Transactional
    public TicketResponse updateTicket(Long id,
                                       UpdateTicketRequest req,
                                       List<MultipartFile> images,
                                       User currentUser) throws IOException {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));

        if (!ticket.getReportedBy().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Not authorized to edit this ticket");
        }
        if (ticket.getStatus() != TicketStatus.OPEN) {
            throw new RuntimeException("Cannot edit a ticket that is already being processed");
        }

        if (req.getSubject() != null) ticket.setSubject(req.getSubject());
        if (req.getCategory() != null) ticket.setCategory(req.getCategory());
        if (req.getDescription() != null) ticket.setDescription(req.getDescription());
        if (req.getPriority() != null) {
            ticket.setRequestedPriority(req.getPriority());
            ticket.setCurrentPriority(req.getPriority());
        }
        if (req.getContactDetails() != null) ticket.setContactDetails(req.getContactDetails());

        // Replace images if new ones provided
        if (images != null && !images.isEmpty()) {
            if (images.size() > 3) throw new IllegalArgumentException("Maximum 3 images allowed");
            List<String> urls = new ArrayList<>();
            for (MultipartFile img : images) {
                if (!img.isEmpty()) urls.add(fileStorageService.store(img));
            }
            ticket.setImageUrls(String.join(",", urls));
        }

        return toResponse(ticketRepository.save(ticket));
    }

    // ─────────────────────────────────────────────
    //  DELETE TICKET (owner only, OPEN status)
    // ─────────────────────────────────────────────

    @Transactional
    public void deleteTicket(Long id, User currentUser) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));

        if (!ticket.getReportedBy().getId().equals(currentUser.getId())
                && currentUser.getRole() != Role.ADMIN) {
            throw new RuntimeException("Not authorized");
        }
        if (ticket.getStatus() != TicketStatus.OPEN) {
            throw new RuntimeException("Cannot delete a ticket in progress");
        }

        commentRepository.deleteAll(commentRepository.findByTicketIdOrderByCreatedAtAsc(id));
        ticketRepository.delete(ticket);
    }

    // ─────────────────────────────────────────────
    //  ASSIGN TICKET (ADMIN only)
    // ─────────────────────────────────────────────

    @Transactional
    public TicketResponse assignTicket(Long ticketId, AssignTicketRequest req) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));

        User staff = userRepository.findById(req.getStaffUserId())
                .orElseThrow(() -> new RuntimeException("Staff user not found"));

        if (staff.getRole() != Role.ACADEMIC_STAFF && staff.getRole() != Role.ADMIN) {
            throw new RuntimeException("User is not eligible to be assigned tickets");
        }

        ticket.setAssignedTo(staff);
        ticket.setStatus(TicketStatus.IN_PROGRESS);
        ticket = ticketRepository.save(ticket);

        // Notify assigned staff member
        notificationService.createNotification(
                staff,
                "📋 Ticket Assigned to You",
                "Ticket #" + ticket.getId() + " – \"" + ticket.getSubject()
                        + "\" has been assigned to you. Please review and proceed.",
                NotificationType.TICKET_ASSIGNED,
                ticket.getId(),
                "TICKET"
        );

        return toResponse(ticket);
    }

    // ─────────────────────────────────────────────
    //  UPDATE TICKET STATUS
    // ─────────────────────────────────────────────

    @Transactional
    public TicketResponse updateStatus(Long ticketId,
                                       UpdateTicketStatusRequest req,
                                       User actor) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));

        TicketStatus newStatus = req.getStatus();
        Role actorRole = actor.getRole();

        // ── REJECT (admin only) ──
        if (newStatus == TicketStatus.REJECTED) {
            if (actorRole != Role.ADMIN) throw new RuntimeException("Only admin can reject tickets");
            if (req.getRejectionReason() == null || req.getRejectionReason().isBlank()) {
                throw new RuntimeException("Rejection reason is required");
            }
            ticket.setStatus(TicketStatus.REJECTED);
            ticket.setRejectionReason(req.getRejectionReason());

            // Notify ticket raiser
            notificationService.createNotification(
                    ticket.getReportedBy(),
                    "❌ Ticket Rejected",
                    "Your ticket #" + ticket.getId() + " – \"" + ticket.getSubject()
                            + "\" was rejected. Reason: " + req.getRejectionReason(),
                    NotificationType.TICKET_STATUS_CHANGED,
                    ticket.getId(),
                    "TICKET"
            );
        }

        // ── RESOLVE (assigned staff only) ──
        else if (newStatus == TicketStatus.RESOLVED) {
            if (!isAssignedOrAdmin(ticket, actor)) {
                throw new RuntimeException("Only the assigned staff or admin can resolve tickets");
            }
            if (req.getResolutionNotes() == null || req.getResolutionNotes().isBlank()) {
                throw new RuntimeException("Resolution notes are required when resolving a ticket");
            }
            ticket.setStatus(TicketStatus.RESOLVED);
            ticket.setResolutionNotes(req.getResolutionNotes());

            // Update priority if staff changed it
            if (req.getCurrentPriority() != null) {
                ticket.setCurrentPriority(req.getCurrentPriority());
            }

            // Notify admin
            List<User> admins = userRepository.findAll().stream()
                    .filter(u -> u.getRole() == Role.ADMIN).collect(Collectors.toList());
            for (User admin : admins) {
                notificationService.createNotification(
                        admin,
                        "✅ Ticket Resolved",
                        "Ticket #" + ticket.getId() + " – \"" + ticket.getSubject()
                                + "\" has been resolved by " + actor.getName(),
                        NotificationType.TICKET_STATUS_CHANGED,
                        ticket.getId(),
                        "TICKET"
                );
            }
        }

        // ── CLOSE (admin only) ──
        else if (newStatus == TicketStatus.CLOSED) {
            if (actorRole != Role.ADMIN) throw new RuntimeException("Only admin can close tickets");
            if (ticket.getStatus() != TicketStatus.RESOLVED) {
                throw new RuntimeException("Only resolved tickets can be closed");
            }
            ticket.setStatus(TicketStatus.CLOSED);

            // Notify ticket raiser with resolution note
            notificationService.createNotification(
                    ticket.getReportedBy(),
                    "🔒 Ticket Closed",
                    "Your ticket #" + ticket.getId() + " has been resolved and closed. "
                            + (ticket.getResolutionNotes() != null
                               ? "Resolution: " + ticket.getResolutionNotes() : ""),
                    NotificationType.TICKET_STATUS_CHANGED,
                    ticket.getId(),
                    "TICKET"
            );
        }

        // ── IN_PROGRESS priority update (assigned staff) ──
        else if (newStatus == TicketStatus.IN_PROGRESS) {
            if (!isAssignedOrAdmin(ticket, actor)) {
                throw new RuntimeException("Not authorized");
            }
            if (req.getCurrentPriority() != null) {
                ticket.setCurrentPriority(req.getCurrentPriority());
            }
        }

        return toResponse(ticketRepository.save(ticket));
    }

    // ─────────────────────────────────────────────
    //  STAFF ACCEPTS / REJECTS ASSIGNED TICKET
    // ─────────────────────────────────────────────

    @Transactional
    public TicketResponse staffRespondToAssignment(Long ticketId,
                                                   boolean accept,
                                                   String reason,
                                                   User staff) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));

        if (!ticket.getAssignedTo().getId().equals(staff.getId())) {
            throw new RuntimeException("You are not assigned to this ticket");
        }

        List<User> admins = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.ADMIN).collect(Collectors.toList());

        if (accept) {
            // Staff notifies admin they accepted
            for (User admin : admins) {
                notificationService.createNotification(
                        admin,
                        "👍 Assignment Accepted",
                        staff.getName() + " accepted Ticket #" + ticket.getId()
                                + " – \"" + ticket.getSubject() + "\"",
                        NotificationType.TICKET_ASSIGNED,
                        ticket.getId(),
                        "TICKET"
                );
            }
        } else {
            // Staff rejects → unassign and revert to OPEN
            ticket.setAssignedTo(null);
            ticket.setStatus(TicketStatus.OPEN);
            ticket = ticketRepository.save(ticket);

            for (User admin : admins) {
                notificationService.createNotification(
                        admin,
                        "👎 Assignment Rejected by Staff",
                        staff.getName() + " rejected assignment for Ticket #" + ticket.getId()
                                + " – \"" + ticket.getSubject() + "\". Reason: " + reason,
                        NotificationType.TICKET_ASSIGNED,
                        ticket.getId(),
                        "TICKET"
                );
            }
        }

        return toResponse(ticket);
    }

    // ─────────────────────────────────────────────
    //  COMMENTS
    // ─────────────────────────────────────────────

    @Transactional
    public CommentResponse addComment(Long ticketId, CommentRequest req, User author) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));

        // Only ticket raiser and assigned staff can comment; no comments on rejected tickets
        if (ticket.getStatus() == TicketStatus.REJECTED) {
            throw new RuntimeException("Cannot comment on a rejected ticket");
        }

        boolean isRaiser = ticket.getReportedBy().getId().equals(author.getId());
        boolean isAssigned = ticket.getAssignedTo() != null
                && ticket.getAssignedTo().getId().equals(author.getId());
        boolean isAdmin = author.getRole() == Role.ADMIN;

        if (!isRaiser && !isAssigned && !isAdmin) {
            throw new RuntimeException("Not authorized to comment on this ticket");
        }

        TicketComment comment = TicketComment.builder()
                .ticket(ticket)
                .author(author)
                .message(req.getMessage())
                .build();

        comment = commentRepository.save(comment);

        // Notify the other party
        User recipient = isRaiser ? ticket.getAssignedTo() : ticket.getReportedBy();
        if (recipient != null) {
            notificationService.createNotification(
                    recipient,
                    "💬 New Comment on Ticket #" + ticket.getId(),
                    author.getName() + ": " + truncate(req.getMessage(), 80),
                    NotificationType.TICKET_COMMENT_ADDED,
                    ticket.getId(),
                    "TICKET"
            );
        }

        return toCommentResponse(comment);
    }

    public List<CommentResponse> getComments(Long ticketId, User requester) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));
        validateAccess(ticket, requester);
        return commentRepository.findByTicketIdOrderByCreatedAtAsc(ticketId)
                .stream().map(this::toCommentResponse).collect(Collectors.toList());
    }

    @Transactional
    public CommentResponse editComment(Long ticketId, Long commentId,
                                       CommentRequest req, User actor) {
        TicketComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        if (!comment.getTicket().getId().equals(ticketId)) {
            throw new RuntimeException("Comment does not belong to this ticket");
        }
        if (!comment.getAuthor().getId().equals(actor.getId())) {
            throw new RuntimeException("You can only edit your own comments");
        }

        comment.setMessage(req.getMessage());
        return toCommentResponse(commentRepository.save(comment));
    }

    @Transactional
    public void deleteComment(Long ticketId, Long commentId, User actor) {
        TicketComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        if (!comment.getTicket().getId().equals(ticketId)) {
            throw new RuntimeException("Comment does not belong to this ticket");
        }
        boolean isOwner = comment.getAuthor().getId().equals(actor.getId());
        boolean isAdmin = actor.getRole() == Role.ADMIN;

        if (!isOwner && !isAdmin) {
            throw new RuntimeException("Not authorized to delete this comment");
        }
        commentRepository.delete(comment);
    }

    // ─────────────────────────────────────────────
    //  HELPERS
    // ─────────────────────────────────────────────

    private Ticket findTicketSecure(Long id, User requester) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));
        validateAccess(ticket, requester);
        return ticket;
    }

    private void validateAccess(Ticket ticket, User user) {
        if (user.getRole() == Role.ADMIN) return;
        boolean isRaiser = ticket.getReportedBy().getId().equals(user.getId());
        boolean isAssigned = ticket.getAssignedTo() != null
                && ticket.getAssignedTo().getId().equals(user.getId());
        if (!isRaiser && !isAssigned) {
            throw new RuntimeException("Access denied");
        }
    }

    private boolean isAssignedOrAdmin(Ticket ticket, User user) {
        if (user.getRole() == Role.ADMIN) return true;
        return ticket.getAssignedTo() != null
                && ticket.getAssignedTo().getId().equals(user.getId());
    }

    private String truncate(String s, int max) {
        return s.length() > max ? s.substring(0, max) + "…" : s;
    }

    // ─────────────────────────────────────────────
    //  MAPPING
    // ─────────────────────────────────────────────

    public TicketResponse toResponse(Ticket t) {
        List<String> urls = (t.getImageUrls() == null || t.getImageUrls().isBlank())
                ? Collections.emptyList()
                : Arrays.asList(t.getImageUrls().split(","));

        return TicketResponse.builder()
                .id(t.getId())
                .subject(t.getSubject())
                .resourceId(t.getResource() != null ? t.getResource().getId() : null)
                .resourceName(t.getResource() != null ? t.getResource().getName() : null)
                .resourceType(t.getResource() != null && t.getResource().getType() != null 
              ? t.getResource().getType().name() : null)
                .location(t.getResource() != null ? t.getResource().getLocation() : null)
                .reportedBy(toUserSummary(t.getReportedBy()))
                .assignedTo(t.getAssignedTo() != null ? toUserSummary(t.getAssignedTo()) : null)
                .category(t.getCategory())
                .description(t.getDescription())
                .requestedPriority(t.getRequestedPriority())
                .currentPriority(t.getCurrentPriority())
                .status(t.getStatus())
                .imageUrls(urls)
                .resolutionNotes(t.getResolutionNotes())
                .rejectionReason(t.getRejectionReason())
                .contactDetails(t.getContactDetails())
                .createdAt(t.getCreatedAt())
                .updatedAt(t.getUpdatedAt())
                .build();
    }

    private CommentResponse toCommentResponse(TicketComment c) {
        return CommentResponse.builder()
                .id(c.getId())
                .ticketId(c.getTicket().getId())
                .author(toUserSummary(c.getAuthor()))
                .message(c.getMessage())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }

    private TicketResponse.UserSummary toUserSummary(User u) {
        return TicketResponse.UserSummary.builder()
                .id(u.getId())
                .name(u.getName())
                .email(u.getEmail())
                .role(u.getRole().name())
                .picture(u.getProfilePicture())
                .build();
    }
}