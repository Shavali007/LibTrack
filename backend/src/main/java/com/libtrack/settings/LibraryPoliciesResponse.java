package com.libtrack.settings;

import java.util.List;

public record LibraryPoliciesResponse(
        BorrowingPolicyDto borrowing,
        RenewalPolicyDto renewal,
        FinePolicyDto fines,
        MembershipPolicyDto membership,
        List<String> usageGuidelines
) {
    public record BorrowingPolicyDto(
            int studentMaxBooks,
            int facultyMaxBooks,
            int studentLoanDays,
            int facultyLoanDays,
            int studentMaxRenewals,
            int facultyMaxRenewals,
            int studentRenewalExtensionDays,
            int facultyRenewalExtensionDays,
            int studentMaxReservations,
            int facultyMaxReservations,
            String reservationHoldPeriod
    ) {
        public BorrowingPolicyDto(
                int studentMaxBooks, int facultyMaxBooks, int studentLoanDays, int facultyLoanDays,
                int studentMaxRenewals, int facultyMaxRenewals, int studentRenewalExtensionDays, int facultyRenewalExtensionDays) {
            this(studentMaxBooks, facultyMaxBooks, studentLoanDays, facultyLoanDays,
                 studentMaxRenewals, facultyMaxRenewals, studentRenewalExtensionDays, facultyRenewalExtensionDays,
                 5, 5, "1 calendar month");
        }
    }

    public record RenewalPolicyDto(
            String maxRenewals,
            String extensionPeriod,
            String eligibility,
            String approval,
            String overdueLoans
    ) {}

    public record FinePolicyDto(
            String overdueFinePerDay,
            String maxFinePerBook,
            String gracePeriod,
            String payment,
            String lostDamagedBooks
    ) {}

    public record MembershipPolicyDto(
            String eligibleMembers,
            String registration,
            String accountApproval,
            String pendingAccounts,
            String rejectedAccounts,
            String disabledAccounts,
            String duplicateAccounts
    ) {}
}
