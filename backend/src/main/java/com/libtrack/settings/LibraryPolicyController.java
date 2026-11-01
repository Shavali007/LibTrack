package com.libtrack.settings;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/policies")
public class LibraryPolicyController {
    private final SystemSettingService settingService;

    public LibraryPolicyController(SystemSettingService settingService) {
        this.settingService = settingService;
    }

    @GetMapping
    public ResponseEntity<LibraryPoliciesResponse> getPolicies() {
        int studentMaxBooks = parseInt(settingService.getSetting("loan.max.active.student", "5"), 5);
        int facultyMaxBooks = parseInt(settingService.getSetting("loan.max.active.faculty", "5"), 5);
        int studentLoanDays = parseInt(settingService.getSetting("loan.period.student.days", "21"), 21);
        int facultyLoanDays = parseInt(settingService.getSetting("loan.period.faculty.days", "30"), 30);
        int maxRenewals = parseInt(settingService.getSetting("loan.renewal.limit", "1"), 1);
        int renewalExtDays = parseInt(settingService.getSetting("loan.renewal.extension.days", "21"), 21);

        String dailyFine = "₹" + settingService.getSetting("fine.daily.rate", "10");
        String maxFine = "₹" + settingService.getSetting("fine.max.limit", "500");
        String gracePeriod = settingService.getSetting("fine.grace.period.days", "0") + " days";

        var borrowing = new LibraryPoliciesResponse.BorrowingPolicyDto(
                studentMaxBooks,
                facultyMaxBooks,
                studentLoanDays,
                facultyLoanDays,
                maxRenewals,
                maxRenewals,
                renewalExtDays,
                renewalExtDays,
                5,
                5,
                "1 calendar month"
        );

        var renewal = new LibraryPoliciesResponse.RenewalPolicyDto(
                maxRenewals + " per semester",
                renewalExtDays + " days",
                "Active loans only",
                "Subject to librarian approval",
                "Not eligible for renewal"
        );

        var fines = new LibraryPoliciesResponse.FinePolicyDto(
                dailyFine,
                maxFine,
                gracePeriod,
                "Full payment only",
                "To be recorded and handled by the librarian"
        );

        var membership = new LibraryPoliciesResponse.MembershipPolicyDto(
                "Students and Faculty of VIT-AP",
                "Institutional email required (Students: @vitapstudent.ac.in, Faculty: @vitap.ac.in)",
                "Mandatory librarian approval",
                "Cannot sign in until approved",
                "Cannot sign in",
                "Cannot access library services",
                "Not permitted (email must be unique)"
        );

        var usage = List.of(
                "Use your own library account.",
                "Be responsible for the books you borrow.",
                "Handle books with care and keep them in good condition.",
                "Report lost or damaged books to the librarian immediately.",
                "Return books within the permitted period.",
                "Follow all borrowing, renewal and circulation rules of the library."
        );

        return ResponseEntity.ok(new LibraryPoliciesResponse(borrowing, renewal, fines, membership, usage));
    }

    @PutMapping
    public ResponseEntity<Void> rejectUpdate() {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).build();
    }

    @PostMapping
    public ResponseEntity<Void> rejectCreate() {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).build();
    }

    @DeleteMapping
    public ResponseEntity<Void> rejectDelete() {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).build();
    }

    private static int parseInt(String val, int def) {
        if (val == null) return def;
        try {
            return Integer.parseInt(val.trim());
        } catch (Exception e) {
            return def;
        }
    }
}
