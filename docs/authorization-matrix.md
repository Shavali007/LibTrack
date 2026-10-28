# LibTrack Authorization Matrix

**Own** means only the current member's records. **All** means librarian administration. Group recommendations are deferred. All permissions also require service-level eligibility and ownership checks.

| Capability | Public | Student | Faculty | Librarian |
|---|---:|---:|---:|---:|
| Browse active catalogue, categories, and aggregate availability | Yes | Yes | Yes | Yes |
| Provision Student/Faculty accounts after identity check | — | — | — | Yes; server records attestation and actor |
| Create Librarian account | — | — | — | Controlled administrative/CLI bootstrap only; no HTTP endpoint |
| Authenticate/view own profile | — | Own | Own | Own |
| Submit request; see own requests/loans/history | — | Own | Own | — |
| Renew own active STANDARD loan once online | — | Own | Own | — |
| Manage book metadata and copies | — | — | — | All |
| View physical-copy inventory | — | — | — | All |
| Manage member records/status | — | — | — | All |
| Review requests, issue approved copies, record returns, and maintain holiday dates | — | — | — | All |
| Record lost/damaged case notes (no amount calculation) | — | — | — | All, audited |
| Submit/view feedback | — | Own | Own | Moderate/manage as approved |
| View recommendations/manage interests | — | Own | Own | — |
| Recommend to one student | — | — | Assigned | — |
| Recommend to group/course | — | — | Deferred | — |
| View reading insights | — | Own | Own | — |
| Operational reports | — | — | — | All |

Enforce deny-by-default Spring Security request and method authorization. Recheck ownership in services; route guards are not security. Faculty receives only expressly approved member operations and never inherits librarian permissions. Registration cannot accept a caller-selected privileged role. Audit administrative actions without credentials or sensitive secrets. Use privacy-preserving 404 where resource existence is sensitive.

## Implemented catalogue enforcement

Public users may search the active catalogue, view categories, and see aggregate copy availability. Responses do not disclose member records, copy identifiers, or locations; inactive records remain hidden from anonymous users. Book metadata create/update/deactivation and physical inventory access require Librarian authority, enforced by Spring method security as well as client route guards. Manual inventory updates cannot transition a copy to `ON_LOAN`, which belongs to circulation. Catalogue mutations continue to use the existing session CSRF token flow.

## Implemented request and circulation enforcement

Students and Faculty can request and view only their own requests, active loans, and history; renewal checks ownership on the backend. Librarians can review the queue, issue approved requests, view active loans, record physical return conditions, and maintain configured holiday dates. Approval and physical issue are separate. Only active books with `STANDARD` circulation can be requested or issued; Student/Faculty clients never receive copy inventory. Spring method authorization and service ownership checks are authoritative; Angular guards only control navigation. Mutations continue to use the existing session CSRF token flow.