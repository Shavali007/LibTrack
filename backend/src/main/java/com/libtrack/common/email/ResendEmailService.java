package com.libtrack.common.email;

import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class ResendEmailService implements EmailService {
    private static final Logger log = LoggerFactory.getLogger(ResendEmailService.class);
    private static final String RESEND_API_URL = "https://api.resend.com/emails";

    private final String apiKey;
    private final String fromEmail;
    private final RestClient restClient;
    private final Environment environment;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ResendEmailService(
            @Value("${resend.api-key:${RESEND_API_KEY:}}") String apiKey,
            @Value("${resend.from-email:${RESEND_FROM_EMAIL:onboarding@resend.dev}}") String fromEmail,
            Environment environment) {
        this.apiKey = apiKey != null ? apiKey.trim() : "";
        this.fromEmail = fromEmail != null && !fromEmail.isBlank() ? fromEmail.trim() : "onboarding@resend.dev";
        this.environment = environment;
        this.restClient = RestClient.builder().build();
    }

    public boolean isConfigured() {
        return !apiKey.isBlank() && !apiKey.equalsIgnoreCase("re_your_actual_api_key");
    }

    public String getFromEmail() {
        return fromEmail;
    }

    private final java.util.List<SentEmailRecord> sentEmails = new java.util.concurrent.CopyOnWriteArrayList<>();
    private volatile boolean simulateFailure = false;
    private volatile String simulatedFailureMessage = "Simulated email provider delivery rejection";

    public record SentEmailRecord(String to, String subject, String htmlContent, String textContent) {}

    public java.util.List<SentEmailRecord> getSentEmails() {
        return java.util.Collections.unmodifiableList(sentEmails);
    }

    public void clearSentEmails() {
        sentEmails.clear();
        simulateFailure = false;
    }

    public void setSimulateFailure(boolean simulateFailure) {
        this.simulateFailure = simulateFailure;
    }

    public void setSimulatedFailureMessage(String simulatedFailureMessage) {
        this.simulatedFailureMessage = simulatedFailureMessage;
    }

    @Override
    public void sendEmail(String to, String subject, String htmlContent, String textContent) {
        log.info("[EMAIL-SERVICE] Email dispatch requested: recipient={}, subject='{}'", maskEmail(to), subject);

        if (simulateFailure) {
            log.warn("[EMAIL-SERVICE] Simulated provider failure active for recipient={}", maskEmail(to));
            throw new EmailDeliveryException(simulatedFailureMessage);
        }

        // Dedicated Test profile fallback: only active during automated unit/integration tests
        if (environment != null && environment.acceptsProfiles(Profiles.of("test")) && !isConfigured()) {
            log.info("[EMAIL-SERVICE] Mode: TEST_IN_MEMORY_FALLBACK. Capturing email for recipient={} in test registry.", maskEmail(to));
            sentEmails.add(new SentEmailRecord(to, subject, htmlContent, textContent));
            return;
        }

        // Live runtime: check if Resend is configured with a real API key
        if (!isConfigured()) {
            log.warn("[EMAIL-SERVICE-FAILED] Mode: REAL_RESEND_API. API call aborted: RESEND_API_KEY is not configured or contains placeholder ('{}'). No HTTP request was dispatched to Resend.",
                    maskApiKeyPlaceholder());
            throw new EmailDeliveryException(
                    "Email delivery is not configured. RESEND_API_KEY is missing or contains placeholder. Please configure a valid Resend API key in .env or the system environment.");
        }

        log.info("[EMAIL-SERVICE] Mode: REAL_RESEND_API. Initiating REST request to {} (from={}) for recipient={}",
                RESEND_API_URL, fromEmail, maskEmail(to));

        Map<String, Object> payload = Map.of(
                "from", fromEmail,
                "to", List.of(to),
                "subject", subject,
                "html", htmlContent,
                "text", textContent
        );

        try {
            Map<?, ?> response = restClient.post()
                    .uri(RESEND_API_URL)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(Map.class);

            Object id = response != null ? response.get("id") : "unknown";
            log.info("[RESEND-HTTP-SUCCESS] Resend accepted email: resendId={}, recipient={}", id, maskEmail(to));
            sentEmails.add(new SentEmailRecord(to, subject, htmlContent, textContent));
        } catch (RestClientResponseException ex) {
            String errorBody = ex.getResponseBodyAsString();
            String detailMessage = extractResendErrorMessage(errorBody);
            log.error("[RESEND-HTTP-REJECTED] Resend returned HTTP {}: {}", ex.getStatusCode().value(), detailMessage);
            throw new EmailDeliveryException("Resend email delivery failed (" + ex.getStatusCode().value() + "): " + detailMessage, ex);
        } catch (EmailDeliveryException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("[RESEND-HTTP-ERROR] Unexpected communication error with Resend for recipient {}: {}", maskEmail(to), ex.getMessage());
            throw new EmailDeliveryException("Unexpected error communicating with email provider: " + ex.getMessage(), ex);
        }
    }

    private String maskApiKeyPlaceholder() {
        if (apiKey.isBlank()) return "EMPTY";
        if (apiKey.equalsIgnoreCase("re_your_actual_api_key")) return "re_your_actual_api_key (placeholder)";
        return "CONFIGURED";
    }

    private String extractResendErrorMessage(String errorBody) {
        if (errorBody == null || errorBody.isBlank()) {
            return "Email provider returned an error with empty response.";
        }
        try {
            JsonNode node = objectMapper.readTree(errorBody);
            if (node.hasNonNull("message")) {
                return node.get("message").asText();
            }
        } catch (Exception ignored) {}
        return errorBody.length() > 200 ? errorBody.substring(0, 200) + "..." : errorBody;
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***";
        int at = email.indexOf('@');
        String local = email.substring(0, at);
        String domain = email.substring(at);
        if (local.length() <= 2) return local + domain;
        return local.substring(0, 2) + "***" + domain;
    }
}
