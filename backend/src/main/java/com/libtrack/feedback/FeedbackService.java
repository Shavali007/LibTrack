package com.libtrack.feedback;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.libtrack.auth.UserAccount;
import com.libtrack.auth.UserAccountRepository;

@Service
public class FeedbackService {
    private final FeedbackRepository feedbackRepository;
    private final UserAccountRepository accountRepository;
    private final Clock clock;

    public FeedbackService(FeedbackRepository feedbackRepository,
                           UserAccountRepository accountRepository,
                           Clock clock) {
        this.feedbackRepository = feedbackRepository;
        this.accountRepository = accountRepository;
        this.clock = clock;
    }

    @Transactional
    public FeedbackRecord submitFeedback(UUID accountId, FeedbackSubmitRequest request) {
        UserAccount account = accountRepository.findById(accountId)
                .orElseThrow(() -> new IllegalArgumentException("User account not found"));

        Instant now = Instant.now(clock);
        Feedback feedback = new Feedback(
                UUID.randomUUID(),
                account,
                request.category().trim(),
                request.subject().trim(),
                request.message().trim(),
                now
        );

        feedback = feedbackRepository.save(feedback);
        return toRecord(feedback);
    }

    @PreAuthorize("hasRole('LIBRARIAN')")
    @Transactional(readOnly = true)
    public List<FeedbackRecord> getAllFeedback() {
        return feedbackRepository.findAllWithAccountOrderByCreatedAtDesc()
                .stream()
                .map(this::toRecord)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FeedbackRecord> getMyFeedback(UUID accountId) {
        UserAccount account = accountRepository.findById(accountId)
                .orElseThrow(() -> new IllegalArgumentException("User account not found"));
        return feedbackRepository.findByAccountOrderByCreatedAtDesc(account)
                .stream()
                .map(this::toRecord)
                .toList();
    }

    private FeedbackRecord toRecord(Feedback f) {
        UserAccount acc = f.getAccount();
        return new FeedbackRecord(
                f.getId(),
                acc.getId(),
                acc.getEmail(),
                acc.getInstitutionalId(),
                acc.getRole().name(),
                f.getCategory(),
                f.getSubject(),
                f.getMessage(),
                f.getCreatedAt(),
                acc.getDisplayName()
        );
    }
}
