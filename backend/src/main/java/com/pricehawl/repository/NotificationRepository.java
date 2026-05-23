package com.pricehawl.repository;

import com.pricehawl.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    List<Notification> findByUserIdOrderByCreatedAtDesc(UUID userId);

    long countByUserIdAndIsReadFalse(UUID userId);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.userId = :userId")
    void markAllReadByUserId(@Param("userId") UUID userId);

    @Modifying
@Query("DELETE FROM Notification n WHERE n.alertId = :alertId")
void deleteByAlertId(@Param("alertId") UUID alertId);
}