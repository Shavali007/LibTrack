package com.libtrack.feedback;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.libtrack.auth.AccountUserDetails;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1")
public class FeedbackController {
    private final FeedbackService feedbackService;

    public FeedbackController(FeedbackService feedbackService) {
        this.feedbackService = feedbackService;
    }

    private static UUID accountId(Authentication auth) {
        return ((AccountUserDetails) auth.getPrincipal()).getId();
    }

    @PostMapping("/feedback")
    public ResponseEntity<FeedbackRecord> submit(@Valid @RequestBody FeedbackSubmitRequest request,
                                                 Authentication auth) {
        FeedbackRecord record = feedbackService.submitFeedback(accountId(auth), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(record);
    }

    @GetMapping("/feedback/mine")
    public ResponseEntity<List<FeedbackRecord>> mine(Authentication auth) {
        return ResponseEntity.ok(feedbackService.getMyFeedback(accountId(auth)));
    }

    @GetMapping("/librarian/feedback")
    @PreAuthorize("hasRole('LIBRARIAN')")
    public ResponseEntity<List<FeedbackRecord>> listForLibrarian() {
        return ResponseEntity.ok(feedbackService.getAllFeedback());
    }
}
