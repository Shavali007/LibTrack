package com.libtrack.auth;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("production-check")
@TestPropertySource(properties={
 "spring.datasource.url=jdbc:h2:mem:libtrack-production-check;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
 "spring.datasource.username=sa","spring.datasource.password=",
 "spring.datasource.driver-class-name=org.h2.Driver",
 "spring.jpa.hibernate.ddl-auto=create-drop","spring.flyway.enabled=false"
})
class ProductionVerificationRestrictionsTest {
 @Autowired MockMvc mvc; @Autowired UserAccountRepository accounts;
 private final ObjectMapper json=new ObjectMapper();
 @Test void withoutDevelopmentProfileCaptureIsForbiddenAndRegistrationFailsClosed(){
  assertDoesNotThrow(()->mvc.perform(get("/api/v1/dev/mail-capture")).andExpect(status().isUnauthorized()));  assertDoesNotThrow(()->mvc.perform(get("/api/v1/dev/mail-capture/diagnostics")).andExpect(status().isUnauthorized()));
  String email="verify.production@vitap.ac.in";
  assertDoesNotThrow(()->mvc.perform(post("/api/v1/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
    .content(json.writeValueAsString(Map.of("email",email,"role","FACULTY","password","SecurePass1!","confirmPassword","SecurePass1!"))))
    .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.code").value("VERIFICATION_DELIVERY_UNAVAILABLE")));
  assertFalse(accounts.existsByEmail(email));
 }
}

