package com.pricehawl.repository;

import com.pricehawl.entity.Platform;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * THAY THẾ file PlatformRepository.java cũ.
 * Thêm findByNameIgnoreCase() để OnDemandImportService tìm platform
 * theo tên không phân biệt hoa thường ("Hasaki" vs "hasaki").
 */
@Repository
public interface PlatformRepository extends JpaRepository<Platform, Integer> {

    Optional<Platform> findByNameIgnoreCase(String name);
}