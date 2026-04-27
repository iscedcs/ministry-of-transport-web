# Project Files Index & Quick Start

**Ministry of Transport Platform — All Documentation at a Glance**

---

## 📋 Core Documentation

Read these files in this order:

### 1. **[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)** — START HERE

- 16-week phased delivery roadmap
- Sprint breakdown (Weeks 1–8 Phase 1, Weeks 9–14 Phase 2)
- Deliverables per sprint
- Risk mitigation & resource allocation
- **For:** Project leads, stakeholders, timeline planning

### 2. **[ROLES_AND_DUTIES.md](ROLES_AND_DUTIES.md)** — WHO DOES WHAT

- 7 user roles (Commissioner, PS, HODs, Field Inspectors, Finance, VIOs, Applicants)
- Permissions & features per role
- Workflow responsibilities
- Notifications & alerts matrix
- **For:** Ministry staff, feature specifications, access control design

### 3. **[EPICS.md](EPICS.md)** — WHAT WE'RE BUILDING

- 17 epics organized by phase
- 180+ stories with story points
- Epic dependencies & critical path
- Sprint story assignments
- **For:** Development team, sprint planning, backlog management

### 4. **[PROGRESS.md](PROGRESS.md)** — WHERE WE ARE

- Real-time sprint tracking
- Blocker & risk register
- Velocity metrics
- Release checklists
- **For:** Project manager, daily standups, status updates

### 5. **[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)** — HOW IT LOOKS

- OKLCH color palette (brand gold #f0bb0d + dark brown #452829)
- Typography scale (Inter, Clash Display, Geist Mono)
- Component library (20+ components documented)
- Responsive design & accessibility rules
- **For:** Frontend engineers, designers, component development

### 6. **[PAYSTACK_INTEGRATION.md](PAYSTACK_INTEGRATION.md)** — PAYMENTS

- Complete payment flow implementation
- Environment setup & API credentials
- Code examples (TypeScript/React)
- Webhook signature verification
- Testing & troubleshooting
- **For:** Backend engineers, payment integration, testing

### 7. **[PRODUCT REQUIREMENTS DOCUMENT (1).md](PRODUCT%20REQUIREMENTS%20DOCUMENT%20%281%29.md)** — OFFICIAL SPEC

- Original PRD from Ministry/ISCE
- Functional requirements (FR-001 through FR-104)
- Data entities & workflows
- Open questions & decisions needed
- **For:** Requirements traceability, sign-off, scope definition

---

## 🎨 Design Tokens Quick Reference

### Brand Colors (Copy into Tailwind config)

```css
:root {
  --brand-gold: oklch(76% 0.24 80); /* #f0bb0d */
  --brand-dark: oklch(20% 0.06 15); /* #452829 */
  --success: oklch(65% 0.18 155);
  --warning: oklch(75% 0.19 65);
  --error: oklch(60% 0.22 25);
  --text-primary: oklch(95% 0.01 95);
  --bg-primary: oklch(20% 0.06 15);
  --bg-secondary: oklch(28% 0.05 15);
}
```

### Typography Stack

- **Sans:** Inter
- **Display:** Clash Display
- **Mono:** Geist Mono

---

## 🚀 Quick Start Guide

### Week 1: Foundation Setup

```bash
# 1. Clone & install
git clone <repo>
cd ministry-of-transport
pnpm install

# 2. Setup environment
cp .env.example .env.local
# Fill in:
#   PAYSTACK_SECRET_KEY=sk_test_...
#   DATABASE_URL=postgresql://...
#   NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...

# 3. Initialize database
pnpm prisma migrate dev

# 4. Start development
pnpm dev
# Visit http://localhost:3000
```

### Key Files to Review First

1. `.copilot-instructions.md` — Agent guidelines for this project
2. `docs/DESIGN_SYSTEM.md` — UI component patterns
3. `docs/PAYSTACK_INTEGRATION.md` — Payment setup
4. `lib/paystack.ts` — API client (see example below)

---

## 📊 Project Statistics

| Metric                 | Value                                                                     |
| ---------------------- | ------------------------------------------------------------------------- |
| **Total Epics**        | 17                                                                        |
| **Total Stories**      | 180+                                                                      |
| **Total Story Points** | ~780                                                                      |
| **Phase 1 Duration**   | 8 weeks                                                                   |
| **Phase 2 Duration**   | 6 weeks                                                                   |
| **Phase 3 Duration**   | 2 weeks (planning)                                                        |
| **User Roles**         | 7 (Commissioner, PS, 5 HODs, Field Inspectors, VIOs, Finance, Applicants) |
| **UI Components**      | 20+ (Phase 1), 8+ (Phase 2)                                               |
| **Modules**            | 8 in Phase 1, 4 in Phase 2                                                |

---

## 🔗 Critical Dependencies (Blockers)

| Blocker                     | Owner             | Impact                         | Status         |
| --------------------------- | ----------------- | ------------------------------ | -------------- |
| PayDirect Integration Specs | Ministry Finance  | Can't build payment module     | ⏳ PENDING     |
| Nigeria Police AVIR Routing | Ministry / Police | Can't deliver accident reports | ⏳ PENDING     |
| Paystack Test Credentials   | ISCE / Paystack   | Can't test payments            | ✅ IN PROGRESS |
| Official AVIR Form 0051     | Ministry          | AVIR form must match exactly   | ⏳ PENDING     |

**Action Item:** Obtain all pending items by Week 1.

---

## 📱 Project Structure

```
ministry-of-transport/
├── .copilot-instructions.md       ← Agent guidelines (THIS PROJECT)
├── docs/
│   ├── IMPLEMENTATION_PLAN.md     ← 16-week roadmap
│   ├── ROLES_AND_DUTIES.md        ← User roles & permissions
│   ├── EPICS.md                   ← Feature breakdown (180+ stories)
│   ├── PROGRESS.md                ← Sprint tracking & blockers
│   ├── DESIGN_SYSTEM.md           ← UI components & tokens
│   ├── PAYSTACK_INTEGRATION.md    ← Payment setup & examples
│   └── PRODUCT REQUIREMENTS...md  ← Original PRD (v2.0)
├── app/
│   ├── dashboard/                 ← Role-based dashboards
│   ├── applications/              ← Application workflows
│   ├── parks/                     ← Motor Park module
│   ├── mass-transit/              ← Mass Transit module
│   ├── vehicle-inspection/        ← VIS + AVIR modules
│   ├── driving-schools/           ← Driving School module
│   ├── payments/                  ← Revenue & Payments
│   ├── api/                       ← Backend APIs
│   └── auth/                      ← Authentication
├── components/
│   ├── ui/                        ← Base UI components (token-driven)
│   ├── forms/                     ← Reusable form components
│   └── modules/                   ← Domain-specific components
├── lib/
│   ├── paystack.ts                ← Paystack API client
│   ├── db.ts                      ← Database utilities
│   └── utils.ts                   ← Helper functions
├── styles/
│   └── globals.css                ← Global tokens & CSS
├── prisma/
│   └── schema.prisma              ← Database schema
└── .env.local                     ← Environment variables (gitignored)
```

---

## 🔧 Technology Stack

| Layer              | Technology                          |
| ------------------ | ----------------------------------- |
| **Framework**      | Next.js 15 (App Router)             |
| **Language**       | TypeScript                          |
| **UI Library**     | React 19                            |
| **Styling**        | Tailwind CSS v4 + custom tokens     |
| **Forms**          | React Hook Form + Zod               |
| **Database**       | PostgreSQL (Neon)                   |
| **ORM**            | Prisma                              |
| **Payment**        | Paystack REST API                   |
| **Authentication** | Custom role-based auth              |
| **Deployment**     | Vercel (frontend) + Neon (database) |

---

## 📞 Decision Authority Matrix

| Decision                               | Owner                                  | Process                    |
| -------------------------------------- | -------------------------------------- | -------------------------- |
| **Approve/Reject Applications**        | Ministry (Commissioner/PS)             | Through platform UI        |
| **Policy & Regulatory Interpretation** | Ministry (Permanent Secretary)         | Weekly steering meetings   |
| **Technical Architecture**             | ISCE Lead                              | Design reviews             |
| **Design & UX**                        | This team (following DESIGN_SYSTEM.md) | Component reviews          |
| **Payment Integration**                | Backend Lead                           | Paystack API integration   |
| **Data Security**                      | Ministry IT + ISCE Security            | Security audit, compliance |

---

## ✅ Phase 1 Pilot Readiness (Week 8)

Before launch, verify:

- [ ] All Phase 1 stories marked DONE
- [ ] Code review complete (0 critical findings)
- [ ] Unit tests passing (≥80% coverage)
- [ ] Security audit passed (no critical vulnerabilities)
- [ ] Load test passed (99.5% uptime @ 10x load)
- [ ] User acceptance testing complete
- [ ] Ministry staff trained (all 7 roles)
- [ ] Go/No-Go decision documented

See `PROGRESS.md` for complete release checklist.

---

## 📚 Additional Resources

### Internal Documentation

- `.copilot-instructions.md` — GitHub Copilot agent guidelines
- `AGENTS.md` — Agent customization rules
- `CLAUDE.md` — Claude-specific instructions

### External Documentation

- **Paystack Docs:** https://paystack.com/docs/api/
- **Next.js Docs:** https://nextjs.org/docs
- **Prisma Docs:** https://www.prisma.io/docs/
- **Tailwind Docs:** https://tailwindcss.com/docs

### Skills (if using Copilot)

- **modern-frontend-design** — UI/UX best practices
- **paystack-setup** — Payment integration patterns
- **paystack-transactions** — Transaction management
- **paystack-webhooks** — Webhook signature verification

---

## 🎯 Next Steps

### For Product Lead

1. Read IMPLEMENTATION_PLAN.md → understand 16-week timeline
2. Read PROGRESS.md → review blocker list
3. Schedule Ministry meetings → obtain PayDirect specs, Nigeria Police contact

### For Frontend Engineer

1. Read DESIGN_SYSTEM.md → understand token architecture
2. Set up component library (20+ components)
3. Implement responsive layouts for dashboard

### For Backend Engineer

1. Read PAYSTACK_INTEGRATION.md → understand payment flows
2. Implement Prisma schema (Phase 1 entities)
3. Set up Paystack API client & webhook verification

### For Everyone

1. Read `.copilot-instructions.md` → project guidelines
2. Review ROLES_AND_DUTIES.md → understand your role
3. Check EPICS.md → find your assigned stories

---

## 📞 Support & Questions

| Question                            | Answer Location                     |
| ----------------------------------- | ----------------------------------- |
| "What does X user role do?"         | `ROLES_AND_DUTIES.md`               |
| "What colors should I use?"         | `DESIGN_SYSTEM.md` (tokens)         |
| "How do I integrate Paystack?"      | `PAYSTACK_INTEGRATION.md`           |
| "What's the timeline?"              | `IMPLEMENTATION_PLAN.md` (sprints)  |
| "What story should I work on next?" | `PROGRESS.md` (current sprint)      |
| "Where do I check project status?"  | `PROGRESS.md` (blockers & velocity) |

---

**Document Version:** 1.0  
**Created:** April 2026  
**Status:** Ready for Week 1 kickoff  
**Last Updated:** April 23, 2026

---

## 🚦 Legend

| Icon | Meaning           |
| ---- | ----------------- |
| 📋   | Documentation     |
| 🎨   | Design/UI         |
| 🚀   | Deployment/DevOps |
| 🔗   | Dependencies      |
| ✅   | Complete          |
| ⏳   | In Progress       |
| 🔴   | Blocker/Critical  |

---

**Ready to build? Start with `.copilot-instructions.md` and `IMPLEMENTATION_PLAN.md`. Happy coding!**
