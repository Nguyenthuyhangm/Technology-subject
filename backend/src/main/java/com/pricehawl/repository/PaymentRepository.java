package com.pricehawl.repository;

import com.pricehawl.entity.PaymentOrder;
import com.pricehawl.entity.enums.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PaymentRepository
        extends JpaRepository<PaymentOrder, UUID> {

    List<PaymentOrder> findByStatus(PaymentStatus status);

    boolean existsByUserIdAndStatusIn(UUID userId, List<PaymentStatus> statuses);

    java.util.Optional<PaymentOrder> findTopByUserIdAndStatusInOrderByCreatedAtDesc(UUID userId, List<PaymentStatus> statuses);
}
