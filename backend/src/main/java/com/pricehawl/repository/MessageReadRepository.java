package com.pricehawl.repository;

import com.pricehawl.entity.MessageRead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MessageReadRepository extends JpaRepository<MessageRead, Long> {

    Optional<MessageRead> findByMessageIdAndReaderId(Long messageId, UUID readerId);

    List<MessageRead> findByMessageId(Long messageId);

    @Query("SELECT mr.readerId FROM MessageRead mr WHERE mr.messageId = :messageId")
    List<UUID> findReaderIdsByMessageId(@Param("messageId") Long messageId);

    boolean existsByMessageIdAndReaderId(Long messageId, UUID readerId);
}
