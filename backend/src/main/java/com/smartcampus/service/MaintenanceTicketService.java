// package com.smartcampus.service;

// import com.smartcampus.dto.TicketDTO.*;
// import com.smartcampus.model.MaintenanceTicket;
// import com.smartcampus.model.MaintenanceTicket.*;
// import com.smartcampus.model.TicketComment;
// import com.smartcampus.repository.MaintenanceTicketRepository;
// import com.smartcampus.repository.TicketCommentRepository;
// import lombok.RequiredArgsConstructor;
// import org.springframework.data.domain.Page;
// import org.springframework.data.domain.Pageable;
// import org.springframework.http.HttpStatus;
// import org.springframework.stereotype.Service;
// import org.springframework.transaction.annotation.Transactional;
// import org.springframework.web.multipart.MultipartFile;
// import org.springframework.web.server.ResponseStatusException;

// import java.io.IOException;
// import java.util.ArrayList;
// import java.util.List;
// import java.util.stream.Collectors;

// @Service
// @RequiredArgsConstructor
// @Transactional
// public class MaintenanceTicketService {

//     private final MaintenanceTicketRepository ticketRepo;
//     private final TicketCommentRepository commentRepo;
//     private final ImageUploadService imageUploadService;
//     private final NotificationService notificationService;

//     // ── CREATE ───────────────────────────────────────────────────────────────

//     public TicketResponse createTicket(CreateTicketRequest req,
//                                        List<MultipartFile> images,
//                                        Long userId,
//                                        String userName) throws IOException {
        
//         // Ensure the "Max 3 images" requirement is met during creation
//         if (images != null && images.size() > 3) {
//             throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Maximum 3 images allowed");
//         }

//         List<String> imageUrls = imageUploadService.uploadImages(images);

//         MaintenanceTicket ticket = new MaintenanceTicket();
//         ticket.setSubject(req.getSubject());
//         ticket.setCategory(req.getCategory());
//         ticket.setDescription(req.getDescription());
//         ticket.setRequestedPriority(req.getRequestedPriority());
//         ticket.setCurrentPriority(req.getRequestedPriority());
//         ticket.setPreferredContact(req.getPreferredContact());
//         ticket.setResourceId(req.getResourceId());
//         ticket.setResourceType(req.getResourceType());
//         ticket.setLocation(req.getLocation());
//         ticket.setReportedBy(userId);
//         ticket.setReportedByName(userName);
//         ticket.setStatus(TicketStatus.OPEN);
//         ticket.setImageUrls(imageUrls);

//         MaintenanceTicket saved = ticketRepo.save(ticket);

//         // Notify all admins: new ticket submitted
//         notificationService.notifyAdmins(
//                 "New Maintenance Ticket #" + saved.getId(),
//                 "A new ticket has been raised by " + userName + ": " + req.getSubject(),
//                 "TICKET",
//                 saved.getId()
//         );

//         return toResponse(saved);
//     }

//     // ── READ ─────────────────────────────────────────────────────────────────

//     @Transactional(readOnly = true)
//     public Page<TicketResponse> getMyTickets(Long userId, Pageable pageable) {
//         return ticketRepo.findByReportedBy(userId, pageable).map(this::toResponse);
//     }

//     @Transactional(readOnly = true)
//     public Page<TicketResponse> getAssignedTickets(Long staffId, Pageable pageable) {
//         return ticketRepo.findByAssignedTo(staffId, pageable).map(this::toResponse);
//     }

//     @Transactional(readOnly = true)
//     public Page<TicketResponse> getAllTickets(TicketStatus status,
//                                               TicketCategory category,
//                                               String search,
//                                               Pageable pageable) {
//         return ticketRepo.findAllWithFilters(status, category, search, pageable).map(this::toResponse);
//     }

//     @Transactional(readOnly = true)
//     public Page<TicketResponse> getInProgressTickets(String search, Pageable pageable) {
//         return ticketRepo.findInProgressWithSearch(search, pageable).map(this::toResponse);
//     }

//     @Transactional(readOnly = true)
//     public TicketResponse getTicketById(Long id, Long userId, String role) {
//         MaintenanceTicket ticket = findTicketOrThrow(id);
//         assertCanView(ticket, userId, role);
//         return toResponse(ticket);
//     }

//     // ── UPDATE (owner only, before ADMIN processes) ──────────────────────────

//     public TicketResponse updateTicket(Long id,
//                                        UpdateTicketRequest req,
//                                        List<MultipartFile> newImages,
//                                        List<String> keepUrls,
//                                        Long userId) throws IOException {
//         MaintenanceTicket ticket = findTicketOrThrow(id);

//         if (!ticket.getReportedBy().equals(userId)) {
//             throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only update your own tickets");
//         }
//         if (ticket.getStatus() != TicketStatus.OPEN) {
//             throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
//                     "Ticket can only be updated while in OPEN status");
//         }

//         List<String> currentUrls = new ArrayList<>(ticket.getImageUrls());
//         List<String> toDelete = currentUrls.stream()
//                 .filter(u -> keepUrls == null || !keepUrls.contains(u))
//                 .collect(Collectors.toList());
//         imageUploadService.deleteImages(toDelete);

//         List<String> retained = keepUrls != null ? keepUrls : new ArrayList<>();
//         List<String> uploaded = imageUploadService.uploadImages(newImages);

//         if (retained.size() + uploaded.size() > 3) {
//             throw new IllegalArgumentException("Maximum 3 images allowed in total");
//         }

//         List<String> finalUrls = new ArrayList<>(retained);
//         finalUrls.addAll(uploaded);

//         if (req.getSubject() != null)          ticket.setSubject(req.getSubject());
//         if (req.getCategory() != null)         ticket.setCategory(req.getCategory());
//         if (req.getDescription() != null)      ticket.setDescription(req.getDescription());
//         if (req.getRequestedPriority() != null) {
//             ticket.setRequestedPriority(req.getRequestedPriority());
//             ticket.setCurrentPriority(req.getRequestedPriority());
//         }
//         if (req.getPreferredContact() != null) ticket.setPreferredContact(req.getPreferredContact());
//         if (req.getResourceId() != null)       ticket.setResourceId(req.getResourceId());
//         if (req.getResourceType() != null)     ticket.setResourceType(req.getResourceType());
//         if (req.getLocation() != null)         ticket.setLocation(req.getLocation());
//         ticket.setImageUrls(finalUrls);

//         return toResponse(ticketRepo.save(ticket));
//     }

//     // ── DELETE (owner only, OPEN status only) ────────────────────────────────

//     public void deleteTicket(Long id, Long userId) {
//         MaintenanceTicket ticket = findTicketOrThrow(id);
//         if (!ticket.getReportedBy().equals(userId)) {
//             throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only delete your own tickets");
//         }
//         if (ticket.getStatus() != TicketStatus.OPEN) {
//             throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
//                     "Cannot delete a ticket that is already being processed");
//         }
//         imageUploadService.deleteImages(ticket.getImageUrls());
//         commentRepo.deleteAllByTicketId(id);
//         ticketRepo.delete(ticket);
//     }

//     // ── ADMIN ACTIONS ────────────────────────────────────────────────────────

//     public TicketResponse adminAction(Long ticketId, AdminActionRequest req,
//                                       Long adminId, String adminName) {
//         MaintenanceTicket ticket = findTicketOrThrow(ticketId);

//         switch (req.getAction().toUpperCase()) {
//             case "PROCEED" -> {
//                 if (ticket.getStatus() != TicketStatus.OPEN) {
//                     throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ticket is not OPEN");
//                 }
//                 if (req.getAssignedTo() == null) {
//                     throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
//                             "Staff member must be assigned when proceeding");
//                 }
//                 ticket.setAssignedTo(req.getAssignedTo());
//                 ticket.setStatus(TicketStatus.IN_PROGRESS);

//                 // Notify assigned staff
//                 notificationService.notifyUser(
//                         req.getAssignedTo(),
//                         "Ticket Assigned to You #" + ticketId,
//                         "You have been assigned to ticket: " + ticket.getSubject(),
//                         "TICKET", ticketId
//                 );
//             }
//             case "REJECT" -> {
//                 ticket.setStatus(TicketStatus.REJECTED);
//                 ticket.setRejectionReason(req.getRejectionReason());

//                 // Notify ticket raiser
//                 notificationService.notifyUser(
//                         ticket.getReportedBy(),
//                         "Ticket #" + ticketId + " Rejected",
//                         "Your ticket has been rejected. Reason: " + req.getRejectionReason(),
//                         "TICKET", ticketId
//                 );
//             }
//             case "CLOSE" -> {
//                 if (ticket.getStatus() != TicketStatus.RESOLVED) {
//                     throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
//                             "Ticket must be RESOLVED before closing");
//                 }
//                 ticket.setStatus(TicketStatus.CLOSED);

//                 // Notify ticket raiser with resolution notes
//                 notificationService.notifyUser(
//                         ticket.getReportedBy(),
//                         "Ticket #" + ticketId + " Closed",
//                         "Your ticket has been resolved and closed. Notes: " + ticket.getResolutionNotes(),
//                         "TICKET", ticketId
//                 );
//             }
//             default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid action");
//         }
//         return toResponse(ticketRepo.save(ticket));
//     }

//     // ── STAFF ACTIONS ─────────────────────────────────────────────────────────

//     public TicketResponse staffAction(Long ticketId, StaffActionRequest req,
//                                       Long staffId, String staffName) {
//         MaintenanceTicket ticket = findTicketOrThrow(ticketId);

//         if (!staffId.equals(ticket.getAssignedTo())) {
//             throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not assigned to this ticket");
//         }

//         switch (req.getAction().toUpperCase()) {
//             case "ACCEPT" -> {
//                 // Staff accepts assignment — notify admin
//                 notificationService.notifyAdmins(
//                         "Staff Accepted Ticket #" + ticketId,
//                         staffName + " has accepted the assigned ticket: " + ticket.getSubject(),
//                         "TICKET", ticketId
//                 );
//             }
//             case "REJECT" -> {
//                 ticket.setAssignedTo(null);
//                 ticket.setAssignedToName(null);
//                 ticket.setStatus(TicketStatus.OPEN);

//                 notificationService.notifyAdmins(
//                         "Staff Rejected Assignment #" + ticketId,
//                         staffName + " has rejected assignment for: " + ticket.getSubject() + ". Please reassign.",
//                         "TICKET", ticketId
//                 );
//             }
//             case "RESOLVE" -> {
//                 if (req.getResolutionNotes() == null || req.getResolutionNotes().isBlank()) {
//                     throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
//                             "Resolution notes are required when resolving a ticket");
//                 }
//                 ticket.setStatus(TicketStatus.RESOLVED);
//                 ticket.setResolutionNotes(req.getResolutionNotes());

//                 notificationService.notifyAdmins(
//                         "Ticket #" + ticketId + " Resolved",
//                         staffName + " has resolved ticket: " + ticket.getSubject(),
//                         "TICKET", ticketId
//                 );
//             }
//             default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid action");
//         }

//         if (req.getCurrentPriority() != null) {
//             ticket.setCurrentPriority(req.getCurrentPriority());
//         }

//         return toResponse(ticketRepo.save(ticket));
//     }

//     // ── PRIORITY UPDATE ───────────────────────────────────────────────────────

//     public TicketResponse updatePriority(Long ticketId, UpdatePriorityRequest req,
//                                          Long userId, String userName, String role) {
//         MaintenanceTicket ticket = findTicketOrThrow(ticketId);

//         boolean isAdmin = "ADMIN".equals(role);
//         boolean isAssignedStaff = userId.equals(ticket.getAssignedTo());

//         if (!isAdmin && !isAssignedStaff) {
//             throw new ResponseStatusException(HttpStatus.FORBIDDEN,
//                     "Only admin or assigned staff can update priority");
//         }

//         ticket.setCurrentPriority(req.getCurrentPriority());
//         return toResponse(ticketRepo.save(ticket));
//     }

//     // ── COMMENTS ─────────────────────────────────────────────────────────────

//     public CommentResponse addComment(Long ticketId, CommentRequest req,
//                                       Long userId, String userName, String role) {
//         MaintenanceTicket ticket = findTicketOrThrow(ticketId);

//         if (ticket.getStatus() == TicketStatus.REJECTED || ticket.getStatus() == TicketStatus.CLOSED) {
//             throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot comment on this ticket status");
//         }

//         TicketComment comment = new TicketComment();
//         comment.setTicketId(ticketId);
//         comment.setAuthorId(userId);
//         comment.setAuthorName(userName);
//         comment.setAuthorRole(TicketComment.AuthorRole.valueOf(role));
//         comment.setContent(req.getContent());

//         TicketComment saved = commentRepo.save(comment);

//         // Notify the other party
//         if (userId.equals(ticket.getReportedBy()) && ticket.getAssignedTo() != null) {
//             notificationService.notifyUser(
//                     ticket.getAssignedTo(),
//                     "New Comment on Ticket #" + ticketId,
//                     userName + " commented on: " + ticket.getSubject(),
//                     "TICKET", ticketId
//             );
//         } else if (userId.equals(ticket.getAssignedTo())) {
//             notificationService.notifyUser(
//                     ticket.getReportedBy(),
//                     "New Comment on Ticket #" + ticketId,
//                     userName + " commented on your ticket: " + ticket.getSubject(),
//                     "TICKET", ticketId
//             );
//         }

//         return toCommentResponse(saved, userId);
//     }

//     public List<CommentResponse> getComments(Long ticketId, Long userId, String role) {
//         MaintenanceTicket ticket = findTicketOrThrow(ticketId);
//         assertCanView(ticket, userId, role);
//         return commentRepo.findByTicketIdOrderByCreatedAtAsc(ticketId)
//                 .stream()
//                 .map(c -> toCommentResponse(c, userId))
//                 .collect(Collectors.toList());
//     }

//     public CommentResponse editComment(Long ticketId, Long commentId,
//                                        CommentRequest req, Long userId) {
//         TicketComment comment = findCommentOrThrow(commentId);
//         if (!comment.getAuthorId().equals(userId)) {
//             throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Unauthorized");
//         }
//         comment.setContent(req.getContent());
//         comment.setEdited(true);
//         return toCommentResponse(commentRepo.save(comment), userId);
//     }

//     public void deleteComment(Long ticketId, Long commentId, Long userId, String role) {
//         TicketComment comment = findCommentOrThrow(commentId);
//         if (!comment.getAuthorId().equals(userId) && !"ADMIN".equals(role)) {
//             throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Unauthorized");
//         }
//         commentRepo.delete(comment);
//     }

//     // ── HELPERS ───────────────────────────────────────────────────────────────

//     private MaintenanceTicket findTicketOrThrow(Long id) {
//         return ticketRepo.findById(id)
//                 .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket " + id + " not found"));
//     }

//     private TicketComment findCommentOrThrow(Long id) {
//         return commentRepo.findById(id)
//                 .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment " + id + " not found"));
//     }

//     private void assertCanView(MaintenanceTicket ticket, Long userId, String role) {
//         if ("ADMIN".equals(role) || userId.equals(ticket.getReportedBy()) || userId.equals(ticket.getAssignedTo())) return;
//         throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access Denied");
//     }

//     private TicketResponse toResponse(MaintenanceTicket t) {
//         TicketResponse r = new TicketResponse();
//         r.setId(t.getId());
//         r.setSubject(t.getSubject());
//         r.setCategory(t.getCategory() != null ? t.getCategory().name() : null);
//         r.setDescription(t.getDescription());
//         r.setStatus(t.getStatus() != null ? t.getStatus().name() : null);
//         r.setReportedBy(t.getReportedBy());
//         r.setAssignedTo(t.getAssignedTo());
//         r.setImageUrls(t.getImageUrls());
//         r.setResolutionNotes(t.getResolutionNotes());
//         r.setCreatedAt(t.getCreatedAt());
//         r.setCommentCount(commentRepo.countByTicketId(t.getId()));
//         return r;
//     }

//     private CommentResponse toCommentResponse(TicketComment c, Long currentUserId) {
//         CommentResponse r = new CommentResponse();
//         r.setId(c.getId());
//         r.setAuthorName(c.getAuthorName());
//         r.setContent(c.getContent());
//         r.setCreatedAt(c.getCreatedAt());
//         r.setCanEdit(c.getAuthorId().equals(currentUserId));
//         return r;
//     }
// }