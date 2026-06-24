```markdown
## Bug Report + Correct Flow Spec: Revalidation Approval Workflow

### Issues Identified (From Presentation, 23 June 2026)

**Bug 1 — Wrong Approval Order**
The Commissioner was approving before the Permanent Secretary.
This is incorrect. The Permanent Secretary must approve first before
it escalates to the Commissioner.

**Bug 2 — HOD Performing Field Inspector's Role**
The HOD of Revalidation was completing both their own review step
AND the Field Inspector's inspection step. These are two distinct
roles with distinct responsibilities and must be enforced separately
at the permission/role level.

---

### Correct Revalidation Workflow (Source of Truth)

```
[APPLICANT]
    │
    │  Submits revalidation application
    ▼
[HOD OF REVALIDATION]
    │
    │  Reviews application
    │  Creates an inspection record
    │  Assigns inspection to a Field Inspector
    ▼
[FIELD INSPECTOR]
    │
    │  Travels to motor park / performs physical inspection
    │  Submits inspection findings back to HOD of Revalidation
    ▼
[HOD OF REVALIDATION]
    │
    │  Cross-checks submitted findings from Field Inspector
    │  Reviews for completeness and accuracy
    │  Forwards to Permanent Secretary for review
    ▼
[PERMANENT SECRETARY]
    │
    │  Reviews findings + HOD recommendation
    │  Approves (or rejects / requests changes)
    │  Forwards to Commissioner
    ▼
[COMMISSIONER]  ← FINAL APPROVER
    │
    │  Reviews full dossier
    │  Gives final approval (or rejects)
    ▼
[APPLICANT]
    │
    └── Can now view approved revalidation status on their dashboard
```

---

### Role Responsibilities (Strict Separation)

| Role | Allowed Actions |
|---|---|
| **HOD of Revalidation** | Create inspection, assign to Field Inspector, review returned findings, forward to Perm. Sec. |
| **Field Inspector** | View assigned inspection, submit findings — cannot approve or forward independently |
| **Permanent Secretary** | Review HOD-forwarded dossier, approve/reject, forward to Commissioner |
| **Commissioner** | Final approval/rejection only — cannot act until Permanent Secretary has approved |
| **Applicant** | View application status — revalidation status only visible after Commissioner approval |

---

### What Needs to be Fixed in Code

**1. Enforce sequential stage gating**
The Commissioner's approval action must be locked/disabled until
the Permanent Secretary's approval is recorded on that application.
No skipping stages — each stage must be completed in order before
the next role can act.

**2. Separate HOD and Field Inspector actions**
The HOD should NOT have access to the Field Inspector submission form.
Field Inspector should NOT have access to the HOD forwarding action.
Role-based guards must be enforced at both UI and API level.

**3. Correct the approval chain order in the database/workflow engine**
Current (broken):
  HOD → Commissioner → Permanent Secretary

Correct:
  HOD → Field Inspector → HOD (review) → Permanent Secretary → Commissioner

**4. Applicant status visibility**
Revalidation approval status must only become visible to the applicant
after the Commissioner's approval action is completed — not before.

---

### What Must NOT Change

> The flow of an approved revalidation being added to a motor park's
> record is working correctly and should remain untouched.

---

### Acceptance Criteria

- [ ] Field Inspector can only submit findings — cannot perform HOD actions
- [ ] HOD cannot submit findings on behalf of a Field Inspector
- [ ] Permanent Secretary approval action is blocked until HOD has forwarded
- [ ] Commissioner approval action is blocked until Permanent Secretary has approved
- [ ] Applicant revalidation status is hidden until Commissioner gives final approval
- [ ] Approval timestamps correctly reflect each actor's individual sign-off
- [ ] Approved revalidation → motor park linkage flow remains unchanged
```