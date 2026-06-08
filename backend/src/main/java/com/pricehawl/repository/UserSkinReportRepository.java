package com.pricehawl.repository;

import com.pricehawl.entity.UserSkinReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface UserSkinReportRepository extends JpaRepository<UserSkinReport, UUID> {
    List<UserSkinReport> findByUserIdOrderByCreatedAtDesc(UUID userId);
}