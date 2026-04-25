package com.smartcampus.repository;

import com.smartcampus.model.Ticket;
import com.smartcampus.model.TicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TicketRepository extends JpaRepository<Ticket, Long> {

    List<Ticket> findByReportedByIdOrderByCreatedAtDesc(Long userId);

    List<Ticket> findByAssignedToIdOrderByCreatedAtDesc(Long staffId);

    List<Ticket> findAllByOrderByCreatedAtDesc();

    List<Ticket> findByStatusOrderByCreatedAtDesc(TicketStatus status);

    @Query("SELECT t FROM Ticket t WHERE " +
           "LOWER(t.subject) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(t.category) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "CAST(t.id AS string) LIKE CONCAT('%', :query, '%')")
    List<Ticket> searchTickets(@Param("query") String query);

    @Query("SELECT t FROM Ticket t WHERE t.assignedTo.id = :staffId AND (" +
           "LOWER(t.subject) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(t.category) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "CAST(t.id AS string) LIKE CONCAT('%', :query, '%'))")
    List<Ticket> searchAssignedTickets(@Param("staffId") Long staffId,
                                       @Param("query") String query);
}