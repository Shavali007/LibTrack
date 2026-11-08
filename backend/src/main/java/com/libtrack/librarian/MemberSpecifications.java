package com.libtrack.librarian;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import com.libtrack.auth.AccountRole;
import com.libtrack.auth.ApprovalStatus;
import com.libtrack.auth.Department;
import com.libtrack.auth.UserAccount;

public final class MemberSpecifications {
    private MemberSpecifications() {}

    public static Specification<UserAccount> members(String q, AccountRole role, Boolean enabled) {
        return members(q, role, enabled, null);
    }

    public static Specification<UserAccount> members(String q, AccountRole role, Boolean enabled, String department) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("approvalStatus"), ApprovalStatus.APPROVED));

            if (role != null) {
                if (role != AccountRole.STUDENT && role != AccountRole.FACULTY) {
                    throw new IllegalArgumentException("Only Student and Faculty members can be filtered.");
                }
                predicates.add(cb.equal(root.get("role"), role));
            } else {
                predicates.add(root.get("role").in(AccountRole.STUDENT, AccountRole.FACULTY));
            }

            if (enabled != null) {
                predicates.add(cb.equal(root.get("enabled"), enabled));
            }

            if (department != null && !department.isBlank() && !"ALL".equalsIgnoreCase(department.trim())) {
                String canonical = Department.canonicalize(department);
                if (canonical != null) {
                    predicates.add(cb.equal(root.get("department"), canonical));
                } else {
                    predicates.add(cb.equal(cb.lower(root.get("department")), department.trim().toLowerCase(Locale.ROOT)));
                }
            }

            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.strip().toLowerCase(Locale.ROOT) + "%";
                Predicate emailMatch = cb.like(cb.lower(root.get("email")), pattern);
                Predicate instMatch = cb.like(cb.lower(root.get("institutionalId")), pattern);
                Predicate nameMatch = cb.like(cb.lower(root.get("displayName")), pattern);
                predicates.add(cb.or(emailMatch, instMatch, nameMatch));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
