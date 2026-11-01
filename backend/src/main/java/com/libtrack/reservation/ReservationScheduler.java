package com.libtrack.reservation;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ReservationScheduler {

    private static final Logger log = LoggerFactory.getLogger(ReservationScheduler.class);

    private final ReservationService reservationService;

    public ReservationScheduler(ReservationService reservationService) {
        this.reservationService = reservationService;
    }

    @Scheduled(fixedDelay = 60000)
    public void runHoldExpirationJob() {
        try {
            reservationService.expireOverdueHolds();
        } catch (Exception ex) {
            log.error("Failed to run periodic reservation hold expiration job: {}", ex.getMessage(), ex);
        }
    }
}
