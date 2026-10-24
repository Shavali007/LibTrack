# LibTrack Authorization Matrix

**Own** means only the current member's records. **All** means librarian administration. Group recommendations are deferred. All permissions also require service-level eligibility and ownership checks.

| Capability | Student | Faculty | Librarian |
|---|---:|---:|---:|
| Provision student/faculty accounts after identity check | — | — | Yes; server records attestation and actor |
| Create Librarian account | — | — | Controlled administrative/CLI bootstrap only; no HTTP endpoint |
| Authenticate/view own profile | Own | Own | Own |
| Search catalogue and availability | Yes | Yes | Yes |
| Submit request; see own requests/loans/history | Own | Own | — |
| Renew own active STANDARD loan once online | Own | Own | — |
| Manage book metadata and copies | — | — | All |
| Manage member records/status | — | — | All |
| Review requests, issue approved copies, record returns, and maintain holiday dates | — | — | All |
| Record lost/damaged case notes (no amount calculation) | — | — | All, audited |
| Manage holidays | — | — | All |
| Submit/view feedback | Own | Own | Moderate/manage as approved |
| View recommendations/manage interests | Own | Own | — |
| Recommend to one student | — | Assigned | — |
| Recommend to group/course | — | Deferred | — |
| View reading insights | Own | Own | — |
| Operational reports | — | — | All |

Enforce deny-by-default Spring Security request and method authorization. Recheck ownership in services; route guards are not security. Faculty receives only expressly approved student-permitted operations and never inherits librarian permissions. Registration cannot accept a caller-selected privileged role. Audit administrative actions without credentials or sensitive secrets. Use privacy-preserving 404 where resource existence is sensitive.

## Implemented catalogue enforcement

Catalogue browsing and category lookup require Student, Faculty, or Librarian authentication. Book metadata create/update/deactivation and copy inventory access require Librarian authority, enforced by Spring method security as well as client route guards. Students and Faculty see aggregate availability only; copy identifiers and locations are withheld. Manual inventory updates cannot transition a copy to `ON_LOAN`, which belongs to circulation. Catalogue routes require CSRF tokens for state-changing requests under the existing session security configuration.


## Implemented request and circulation enforcement

Students and Faculty can request and view only their own requests, active loans, and history; renewal checks ownership on the backend. Librarians can review the queue, issue approved requests, view active loans, record physical return conditions, and maintain configured holiday dates. Approval and physical issue are separate. Only active books with `STANDARD` circulation can be requested or issued; student/faculty clients never receive copy inventory. Spring method authorization and service ownership checks are authoritative; Angular guards only control navigation. Mutations continue to use the existing session CSRF token flow.
