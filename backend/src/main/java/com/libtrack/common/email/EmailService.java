package com.libtrack.common.email;

public interface EmailService {
    void sendEmail(String to, String subject, String htmlContent, String textContent);
}
