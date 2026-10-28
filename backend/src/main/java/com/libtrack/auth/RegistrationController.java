package com.libtrack.auth;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/auth")
public class RegistrationController {
    private final RegistrationService registrations;

    public RegistrationController(RegistrationService registrations) { this.registrations = registrations; }

    @PostMapping("/register")
    public ResponseEntity<RegistrationPendingResponse> register(@Valid @RequestBody RegistrationRequest request) {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(registrations.register(request));
    }
}