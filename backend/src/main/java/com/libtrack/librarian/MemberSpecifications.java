package com.libtrack.librarian;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import com.libtrack.auth.AccountRole;
import com.libtrack.auth.UserAccount;

public final class MemberSpecifications {
    private MemberSpecifications() {}

    public static Specification<UserAccount> members(String q, AccountRole role, Boolean enabled) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

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

            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.strip().toLowerCase(Locale.ROOT) + "%";
                Predicate emailMatch = cb.like(cb.lower(root.get("email")), pattern);
                Predicate instMatch = cb.like(cb.lower(root.get("institutionalId")), pattern);
                predicates.add(cb.or(emailMatch, instMatch));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
