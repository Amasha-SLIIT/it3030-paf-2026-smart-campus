package com.smartcampus.controller;

import com.smartcampus.dto.*;
import com.smartcampus.model.User;
import com.smartcampus.service.TicketService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;


@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;

    private User currentUser() {
        return (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    // ── CREATE ──────────────────────────────────────────────────────────────

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('USER','ACADEMIC_STAFF','ADMIN')")
    public ResponseEntity<TicketResponse> createTicket(
            @Valid @RequestPart("ticket") CreateTicketRequest req,
            @RequestPart(value = "images", required = false) List<MultipartFile> images
    ) throws IOException {
        TicketResponse response = ticketService.createTicket(req, images, currentUser());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ── LIST ─────────────────────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAnyRole('USER','ACADEMIC_STAFF','ADMIN')")
    public ResponseEntity<List<TicketResponse>> getTickets(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search
    ) {
        User user = currentUser();
        List<TicketResponse> tickets;

        if (user.getRole().name().equals("ADMIN")) {
            tickets = ticketService.getAllTickets(status, search);
        } else if (user.getRole().name().equals("ACADEMIC_STAFF")) {
            tickets = ticketService.getAssignedTickets(user, search);
        } else {
            tickets = ticketService.getMyTickets(user);
        }

        return ResponseEntity.ok(tickets);
    }

    // ── GET SINGLE ──────────────────────────────────────────────────────────

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER','ACADEMIC_STAFF','ADMIN')")
    public ResponseEntity<TicketResponse> getTicket(@PathVariable Long id) {
        return ResponseEntity.ok(ticketService.getTicketById(id, currentUser()));
    }

    // ── UPDATE (owner, OPEN status only) ───────────────────────────────────

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('USER','ACADEMIC_STAFF')")
    public ResponseEntity<TicketResponse> updateTicket(
            @PathVariable Long id,
            @Valid @RequestPart("ticket") UpdateTicketRequest req,
            @RequestPart(value = "images", required = false) List<MultipartFile> images
    ) throws IOException {
        return ResponseEntity.ok(ticketService.updateTicket(id, req, images, currentUser()));
    }

    // ── DELETE (owner / admin, OPEN only) ───────────────────────────────────

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER','ACADEMIC_STAFF','ADMIN')")
    public ResponseEntity<Void> deleteTicket(@PathVariable Long id) {
        ticketService.deleteTicket(id, currentUser());
        return ResponseEntity.noContent().build();
    }

    // ── ASSIGN (ADMIN only) ─────────────────────────────────────────────────

    @PatchMapping("/{id}/assign")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TicketResponse> assignTicket(
            @PathVariable Long id,
            @Valid @RequestBody AssignTicketRequest req
    ) {
        return ResponseEntity.ok(ticketService.assignTicket(id, req));
    }

    // ── UPDATE STATUS ───────────────────────────────────────────────────────

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ACADEMIC_STAFF','ADMIN')")
    public ResponseEntity<TicketResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateTicketStatusRequest req
    ) {
        return ResponseEntity.ok(ticketService.updateStatus(id, req, currentUser()));
    }

    // ── STAFF RESPOND TO ASSIGNMENT ─────────────────────────────────────────

    @PatchMapping("/{id}/respond-assignment")
    @PreAuthorize("hasRole('ACADEMIC_STAFF')")
    public ResponseEntity<TicketResponse> respondToAssignment(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body
    ) {
        boolean accept = Boolean.TRUE.equals(body.get("accept"));
        String reason = (String) body.getOrDefault("reason", "");
        return ResponseEntity.ok(
                ticketService.staffRespondToAssignment(id, accept, reason, currentUser()));
    }

    // ── COMMENTS ────────────────────────────────────────────────────────────

    @PostMapping("/{id}/comments")
    @PreAuthorize("hasAnyRole('USER','ACADEMIC_STAFF','ADMIN')")
    public ResponseEntity<CommentResponse> addComment(
            @PathVariable Long id,
            @Valid @RequestBody CommentRequest req
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ticketService.addComment(id, req, currentUser()));
    }

    @GetMapping("/{id}/comments")
    @PreAuthorize("hasAnyRole('USER','ACADEMIC_STAFF','ADMIN')")
    public ResponseEntity<List<CommentResponse>> getComments(@PathVariable Long id) {
        return ResponseEntity.ok(ticketService.getComments(id, currentUser()));
    }

    @PutMapping("/{id}/comments/{commentId}")
    @PreAuthorize("hasAnyRole('USER','ACADEMIC_STAFF','ADMIN')")
    public ResponseEntity<CommentResponse> editComment(
            @PathVariable Long id,
            @PathVariable Long commentId,
            @Valid @RequestBody CommentRequest req
    ) {
        return ResponseEntity.ok(ticketService.editComment(id, commentId, req, currentUser()));
    }

    @DeleteMapping("/{id}/comments/{commentId}")
    @PreAuthorize("hasAnyRole('USER','ACADEMIC_STAFF','ADMIN')")
    public ResponseEntity<Void> deleteComment(
            @PathVariable Long id,
            @PathVariable Long commentId
    ) {
        ticketService.deleteComment(id, commentId, currentUser());
        return ResponseEntity.noContent().build();
    }
}