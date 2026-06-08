package com.pricehawl.repository;

import com.pricehawl.entity.Conversation;
import com.pricehawl.entity.ConversationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    Optional<Conversation> findByUserId(UUID userId);

    List<Conversation> findAllByOrderByUpdatedAtDesc();

    List<Conversation> findByStatusInOrderByUpdatedAtDesc(List<ConversationStatus> statuses);

    @Query("SELECT COUNT(c) FROM Conversation c WHERE c.status IN ('WAITING_ADMIN', 'OPEN')")
    long countActive();
}
