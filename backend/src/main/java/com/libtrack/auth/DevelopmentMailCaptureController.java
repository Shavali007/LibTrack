package com.libtrack.auth;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.List;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@Profile("development")
@RequestMapping("/api/v1/dev/mail-capture")
public class DevelopmentMailCaptureController {
    private final DevelopmentMailCapture capture;
    private final RegistrationVerificationService verification;
    public DevelopmentMailCaptureController(DevelopmentMailCapture capture, RegistrationVerificationService verification) {
        this.capture = capture;
        this.verification = verification;
    }

    @GetMapping
    public List<VerificationMessage> messages(HttpServletRequest request) {
        requireLoopback(request);
        return capture.messages();
    }

    @GetMapping("/diagnostics")
    public List<CapturedMessageDiagnostic> diagnostics(HttpServletRequest request) {
        requireLoopback(request);
        return capture.messages().stream().map(message -> {
            String raw = java.net.URI.create(message.verificationUrl()).getFragment();
            RegistrationVerificationService.VerificationDiagnostic state = verification.diagnose(raw);
            return new CapturedMessageDiagnostic(message.recipient(), state.status(), state.expiresAt());
        }).toList();
    }
    @PostMapping("/reissue")
    public ResponseEntity<Void> reissue(@Valid @RequestBody ReissueRequest request, HttpServletRequest servletRequest) {
        requireLoopback(servletRequest);
        verification.reissuePending(request.email());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public void clear(HttpServletRequest request) {
        requireLoopback(request);
        capture.clear();
    }

    private void requireLoopback(HttpServletRequest request) {
        try {
            if (!InetAddress.getByName(request.getRemoteAddr()).isLoopbackAddress()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND);
            }
        } catch (UnknownHostException invalidAddress) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
    }

    public record ReissueRequest(@NotBlank @Email @Size(max = 254) String email) {}
    public record CapturedMessageDiagnostic(String recipient, String tokenStatus, java.time.Instant expiresAt) {}
}


