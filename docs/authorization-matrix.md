# LibTrack Authorization Matrix

**Own** means only the current member's records. **All** means librarian administration. Group recommendations are deferred. All permissions also require service-level eligibility and ownership checks.

| Capability | Student | Faculty | Librarian |
|---|---:|---:|---:|
| Provision student/faculty accounts after identity check | — | — | Yes; server records attestation and actor |
| Create Librarian account | — | — | Controlled administrative/CLI bootstrap only; no HTTP endpoint |
| Authenticate/view own profile | Own | Own | Own |
| Search catalogue and availability | Yes | Yes | Yes |
| Submit request; see own requests/loans/history/fines/notifications | Own | Own, subject to approved policy | — |
| Renew own eligible loan online | Own | Own | May assist via circulation workflow; policy confirmation needed |
| Manage book metadata and copies | — | — | All |
| Manage member records/status | — | — | All |
| Approve/reject requests; issue/return | — | — | All |
| Assess/waive fines; record lost/damaged case | — | — | All, audited |
| Manage holidays | — | — | All |
| Submit/view feedback | Own | Own | Moderate/manage as approved |
| View recommendations/manage interests | Own | Own | — |
| Recommend to one student | — | Assigned | — |
| Recommend to group/course | — | Deferred | — |
| View reading insights | Own | Own | — |
| Operational reports | — | — | All |

Enforce deny-by-default Spring Security request and method authorization. Recheck ownership in services; route guards are not security. Faculty receives only expressly approved student-permitted operations and never inherits librarian permissions. Registration cannot accept a caller-selected privileged role. Audit administrative actions without credentials or sensitive secrets. Use privacy-preserving 404 where resource existence is sensitive.
