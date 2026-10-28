package com.libtrack.auth;
import jakarta.validation.Valid; import jakarta.validation.constraints.NotBlank; import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity; import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/auth")
public class EmailVerificationController{
 private final RegistrationVerificationService verification;
 public EmailVerificationController(RegistrationVerificationService verification){this.verification=verification;}
 @PostMapping("/verify-email")
 public ResponseEntity<EmailVerificationResponse> verify(@Valid @RequestBody VerificationRequest request){
  return verification.verify(request.token())?ResponseEntity.ok(EmailVerificationResponse.verified()):ResponseEntity.badRequest().body(EmailVerificationResponse.invalid());
 }
 public record VerificationRequest(@NotBlank @Size(max=100) String token){}
}
