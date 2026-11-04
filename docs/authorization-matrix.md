# LibTrack Authorization Matrix

**Own** means only the current member's records. **All** means librarian administration. Group recommendations are deferred. All permissions also require service-level eligibility and ownership checks.

| Capability | Public | Student | Faculty | Librarian |
|---|---:|---:|---:|---:|
| Browse active catalogue, categories, and aggregate availability | Yes | Yes | Yes | Yes |
| Submit Student/Faculty registration | Yes; creates disabled `PENDING_APPROVAL` account | — | — | — |
| Review/approve/reject member registration | — | — | — | All; actor/time recorded |
| Provision Student/Faculty accounts after identity check | — | — | — | Yes; server records attestation and actor |
| Create Librarian account | — | — | — | Controlled administrative/CLI bootstrap only; no HTTP endpoint |
| Authenticate/view own profile | — | Own | Own | Own |
| Submit request; see own requests/loans/history | — | Own | Own | — |
| Create/view/cancel own reservations | — | Own | Own | — |
| Renew own active STANDARD loan once online | — | Own | Own | — |
| View own fines | — | Own | Own | — |
| Assess/recalculate fines and record payments | — | — | — | All |
| Manage book metadata and copies | — | — | — | All |
| View physical-copy inventory | — | — | — | All |
| Manage digital editions | — | — | — | All |
| Read digital editions | — | Authenticated | Authenticated | All |
| Manage member records/status | — | — | — | All |
| Review requests, issue approved copies, record returns, and maintain holiday dates | — | — | — | All |
| Record lost/damaged case notes | — | — | — | All, audited |
| Submit/view own feedback; view feedback list | — | Own | Own | All feedback |
| Read book reviews; submit an eligible review | Public read | Eligible authenticated member | Eligible authenticated member | Eligible authenticated member |
| View recommendations | — | Own | Own | Own/All according to route |
| Recommend to one student | — | — | Assigned | — |
| Manage own wishlist | — | Own | Own | — |
| View/manage own in-app notifications | — | Own | Own | Own |
| Operational reports | — | — | — | All |

Enforce deny-by-default Spring Security request and method authorization. Recheck ownership in services; route guards are not security. Faculty receives only expressly approved member operations and never inherits librarian permissions. Registration cannot accept a caller-selected privileged role. Normal registration creates a disabled `PENDING_APPROVAL` account; only Librarian approval enables it. Audit administrative actions without credentials or sensitive secrets. Use privacy-preserving 404 where resource existence is sensitive. Reading insights are not currently implemented.

## Implemented catalogue enforcement

Public users may search the active catalogue, view categories, and see aggregate copy availability. Responses do not disclose member records, copy identifiers, or locations; inactive records remain hidden from anonymous users. Book metadata create/update/deactivation and physical inventory access require Librarian authority, enforced by Spring method security as well as client route guards. Manual inventory updates cannot transition a copy to `ON_LOAN`, which belongs to circulation. Catalogue mutations continue to use the existing session CSRF token flow.

## Implemented request and circulation enforcement

Students and Faculty can request and view only their own requests, reservations, active loans, history, fines, and notifications; renewal checks ownership on the backend. Librarians can review member and borrowing queues, issue approved requests, view active loans, record physical return conditions and fine payments, and maintain holiday/policy settings. Approval and physical issue are separate. Only active books with `STANDARD` circulation can be requested or issued; Student/Faculty clients never receive copy inventory. Spring method authorization and service ownership checks are authoritative; Angular guards only control navigation. Mutations continue to use the existing session CSRF token flow.
