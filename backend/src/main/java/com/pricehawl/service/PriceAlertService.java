package com.pricehawl.service;

import com.pricehawl.entity.PriceAlert;
import com.pricehawl.repository.TrendingDealRepositories.PriceAlertRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PriceAlertService {

    private final PriceAlertRepository priceAlertRepository;

    @Transactional(readOnly = true)
    public List<PriceAlert> findActiveByUserId(UUID userId) {
        return priceAlertRepository.findByUser_IdAndIsActiveTrue(userId);
    }

    @Transactional(readOnly = true)
    public Optional<PriceAlert> findById(UUID id) {
        return priceAlertRepository.findById(id);
    }

    @Transactional
    public PriceAlert save(PriceAlert alert) {
        return priceAlertRepository.save(alert);
    }

    @Transactional
    public void deactivate(UUID alertId) {
        priceAlertRepository.findById(alertId).ifPresent(a -> {
            a.setIsActive(false);
            priceAlertRepository.save(a);
        });
    }
}
