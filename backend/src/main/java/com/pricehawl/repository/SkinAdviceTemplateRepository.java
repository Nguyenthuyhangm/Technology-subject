package com.pricehawl.repository;

import com.pricehawl.entity.SkinAdviceTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface SkinAdviceTemplateRepository extends JpaRepository<SkinAdviceTemplate, UUID> {
    Optional<SkinAdviceTemplate> findBySignatureHash(String signatureHash);
}