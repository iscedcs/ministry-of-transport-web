# Anambra State Ministry of Transport Management Platform (MOT System)

## Self-Hosting Infrastructure & Technical Architecture Specification

**Prepared for:** Anambra State Government Ministry Of Transport & Anambra State ICT Agency  
**Prepared by:** ISCE Digital Concept Ltd.  
**Version:** 2.0  
**Date:** 30 July 2026  

---

### Scope of this Document

This document specifies the technical architecture, infrastructure requirements, managed services, compute sizing, database design, and environment configuration required to deploy, host, and maintain the **Anambra State Ministry of Transport Management Platform (MOT System)** in a government-managed cloud environment.

It covers both the **Frontend (Next.js Web/PWA Applications)** and the **Backend (NestJS API Engine, Microservices, REST Endpoints, Business Logic, and Queue Workers)**, data storage, security baselines, and third-party integrations. It does not include raw production credentials or commercial IP transfer terms that are handled under separate commercial agreements.

---

## 1. System Overview

The **Anambra State Ministry of Transport Management Platform (MOT System)** is an integrated e-governance platform designed to digitize, regulate, automate, and monitor transport operations, permitting, field compliance, maritime transport, TRACAS state transport company operations, revenue collection, and public safety across Anambra State.

The platform unifies multiple transport sector sub-systems into a decoupled, high-performance web, mobile, and API infrastructure:

1. **Motor Parks & Operational Permitting Module**: Digital permit applications, multi-tier reviews, field site inspection scheduling, fee computation, permit issuance, and annual revalidation queues with executive approval gates (HOD → Permanent Secretary → Honourable Commissioner).  
2. **Mass Transit & Fleet Operator Licensing**: Company registration, fleet vehicle onboard tracking, route permits, and operational compliance for public and private mass transit operators.  
3. **Boats & Waterways Maritime Transport**: Commercial vessel onboarding, marine rider/operator licensing, physical QR sticker inventory binding, floating passenger safety ride-sharing alerts, and waterway fleet tracking.  
4. **TRACAS Transport Company Module**: Comprehensive vehicle onboarding, driver bio-data enumeration (passport photos, NIN, ASIN, next of kin, guarantors), custom vehicle sub-type classification, ownership tracking (*Government Owned*, *Individual / Private Owner*, *Collaborative / Franchise Partner*), and dynamic system generation of the official printable **"TO WHOM IT MAY CONCERN" Letter of Authority**.  
5. **Public QR Verification & Commuter Safety Portal**: Unauthenticated public verification system (`/verify`) enabling instant scanning of physical QR code stickers on vehicles, boats, motor parks, inspectors, and TRACAS credentials.  
6. **Field Inspections & Compliance**: Customized digital inspection checklists, field inspector identity verification, and Park Monitor management.  
7. **Revenue, Assessment & Payment Reconciliation**: Automated fee schedule computation, payment gateway integration, split settlement, and revenue status monitoring.  
8. **AVIR Reports**: Accident & Vehicle Inspection Reports module.  
9. **Executive Dashboards & Immutable Audit Trail**: Role-based analytics, reporting, user account governance across 12 distinct roles, and full audit trail logging.

---

## 2. Architecture Summary

The MOT system is architected as a **decoupled enterprise system** comprising a **Next.js 16 Web/PWA Frontend** and a **NestJS 10+ Backend API Engine**, ensuring modular scalability, high concurrency, strict type safety, zero tight-coupling, and seamless integration across field agents, public portal users, and administrative workflows.

```
+-----------------------------------------------------------------------+
|                            CLIENT LAYER                               |
|   Desktops / Field Tablets / Mobile PWA / Public QR Verification      |
+-----------------------------------------------------------------------+
                                   |
                                   | HTTPS / TLS 1.3
                                   v
+-----------------------------------------------------------------------+
|                    REVERSE PROXY / LOAD BALANCER                      |
|                         (Nginx / AWS ALB)                             |
+-----------------------------------------------------------------------+
           |                                             |
   Static / SSR Routes                                REST API / Webhooks
   (mot.anambra.gov.ng/*)                          (mot.anambra.gov.ng/api/v1/*)
           |                                             |
           v                                             v
+-----------------------+               +-------------------------------+
|  NEXT.JS FRONTEND     |               |   NESTJS BACKEND API ENGINE   |
|  (Node.js Runtime)    |               |   (Node.js / TypeScript API)  |
|  - React 19 UI        |  REST / JSON  |   - Auth & RBAC (JWT/Guards)  |
|  - Client Components  | ------------> |   - DTO Validation / Swagger  |
|  - Server-Side Rendering              |   - Core Business Logic      |
+-----------------------+               +-------------------------------+
                                                        |
                                                        | ORM / Queue
                                                        v
                        +---------------------------------------------------------------+
                        |                     DATA & SERVICES LAYER                     |
                        |                                                               |
                        |  +------------------+  +-------------------+  +------------+  |
                        |  | PostgreSQL DB    |  | Redis Cache & Queue|  | AWS S3 /   |  |
                        |  | (Prisma/PgBouncer|  | (BullMQ / Reminders|  | Cloudinary |  |
                        |  +------------------+  +-------------------+  +------------+  |
                        |                                                               |
                        |  +------------------+  +-------------------+                  |
                        |  | Payment Gateway  |  | SMS & Email API   |                  |
                        |  | Paystack/Intersw.|  | Termii / Resend   |                  |
                        |  +------------------+  +-------------------+                  |
                        +---------------------------------------------------------------+
```

### Key Request & Data Flow:

* **Client & Field Access**: Users access the platform via desktop browsers, mobile PWA interfaces, or public verification links over encrypted HTTPS.
* **Frontend Web Layer**: Next.js 16 handles server-side rendering (SSR), static site optimization, layout composition, and client UI interactions.
* **Backend API Engine**: NestJS 10+ processes all RESTful API requests, handles authentication (JWT/Passport), validates input DTOs, executes business workflows, enforces RBAC guards, and logs audit events.
* **NestJS Modular Architecture**:
  * `AuthModule`: User login, JWT token issuance, session control, password hashing, and NIN/identity state validation.
  * `MotorParksModule`: Applications, multi-tier executive approval pipelines, and revalidations.
  * `MassTransitModule`: Fleet management, operator licensing, and route compliance.
  * `WaterwaysModule`: Marine vessel registration, rider licensing, and QR sticker binding.
  * `TracasModule`: TRACAS fleet enumeration, guarantor checks, and Letter of Authority generation.
  * `FieldInspectionModule`: Inspector scheduling, digital checklist submissions, and park monitoring.
  * `AvirModule`: Accident reporting, damage scoring, and vehicle safety logs.
  * `PaymentsModule`: Paystack / Interswitch split settlement, payment initialization, and webhook listeners.
  * `AuditLogModule`: NestJS Interceptors intercepting mutating endpoints to record immutable audit events.
  * `NotificationModule`: NestJS BullMQ workers asynchronously delivering SMS (Termii) and email (Resend) alerts.
* **Datastore & ORM**: PostgreSQL database accessed securely through Prisma ORM 7 (or TypeORM) with PgBouncer connection pooling.
* **Caching & Queue**: Redis handles rate limiting (`@nestjs/throttler`), BullMQ task queues, temporary QR token lookups, and session management.
* **Object Storage**: S3-compatible cloud storage (or Cloudinary) handles uploaded driver photos, vehicle particulars, inspection photos, and generated PDF letters.

---

## 3. Compute & Sizing Requirements

The system components are containerized (Docker / Kubernetes) or deployed on virtual private servers (Ubuntu 22.04 LTS Node.js runtime) behind Nginx load balancers.

| Component | Runtime / Technology | Minimum Spec (Pilot / Mid Traffic) | Production Spec (High Traffic) | Notes |
| :---- | :---- | :---- | :---- | :---- |
| **MOT Web & PWA Frontend** | Node.js 20 LTS (Next.js 16 / React 19) | 2 vCPU / 4 GB RAM (1 Instance, Port 3000) | 4+ vCPU / 8 GB RAM (2+ Instances behind Nginx) | Handles client UI rendering, static assets, and SSR pages. Stateless. |
| **MOT Backend API Engine** | Node.js 20 LTS (NestJS 10+ REST Server) | 2 vCPU / 4 GB RAM (1 Instance, Port 4000) | 4+ vCPU / 8–16 GB RAM (2+ Instances behind Load Balancer) | Executes business logic, DTO validation, REST API controllers, and DB queries. Stateless. |
| **MOT Queue Worker Process** | Node.js 20 LTS (NestJS BullMQ Consumer) | 1 vCPU / 2 GB RAM (1 Instance) | 2 vCPU / 4 GB RAM (2 Instances for redundancy) | Dedicated process running `@nestjs/bull` consumers for SMS, email notifications, and daily rollups. |
| **PostgreSQL Database** | PostgreSQL 15+ / PgBouncer | 2 vCPU / 4 GB RAM (20 GB SSD) | 4–8 vCPU / 16–32 GB RAM (100+ GB NVMe SSD) | Managed DB cluster with automated failover and daily PITR backups. |
| **Redis Cache & Queue** | Redis 6.2+ Persistent | 1 vCPU / 2 GB RAM | 2 vCPU / 4 GB RAM | In-memory cache for BullMQ, rate limiting, and session state. |

---

## 4. Database Architecture (PostgreSQL)

* **Database Engine**: PostgreSQL 15 or later.  
* **ORM Layer**: Prisma ORM v7 with `@prisma/adapter-neon` or standard PostgreSQL driver integrated into NestJS database services.  
* **Connection Pooling**: PgBouncer or managed connection pooler (e.g. Neon connection pooler) enabled to manage concurrent connections from NestJS API nodes and worker processes.  
* **Migrations Management**: Database schema migrations executed strictly via NestJS deploy scripts using `npx prisma migrate deploy` in production environments.  
* **Backup & Disaster Recovery**: Daily automated full database snapshots with 7-day Point-in-Time Recovery (PITR) enabled.  
* **Storage Allocation**:  
  * Initial provisioned storage: 50 GB SSD storage.  
  * Media, photo bio-data, and PDFs are stored in Object Storage as S3 URLs (not in PostgreSQL).

---

## 5. Cache & Job Queue (Redis & NestJS BullMQ)

* **Cache Engine**: Redis 6.2 or later.  
* **Job Queue Framework**: NestJS BullMQ (`@nestjs/bull` / `@nestjs/bullmq`) integrated into NestJS `NotificationModule` and `AnalyticsModule`.  
* **Queue Workflows**:
  * `notifications-queue`: Asynchronous dispatching of OTP SMS messages and executive approval email notifications.
  * `inspection-alerts-queue`: Automated triggering of inspector SLA alerts and overdue revalidation warnings.
  * `analytics-queue`: Hourly and daily financial revenue aggregation rollups.
* **Rate Limiting**: NestJS `@nestjs/throttler` module utilizing Redis storage provider to prevent brute force access on verification `/api/v1/verify/*` and auth `/api/v1/auth/login` endpoints.
* **Memory Allocation**: 1 GB–4 GB RAM. Append-Only File (AOF) persistence enabled to ensure no job queue data loss occurs during server maintenance.

---

## 6. Object & Media Storage

Used for storing public and operational media uploads:

* Driver passport photographs (Enumeration bio-data).  
* Vehicle particulars documents, ownership proofs & physical inspection site photos.  
* Generated official PDF documents (e.g. TRACAS *"TO WHOM IT MAY CONCERN"* Letter of Authority).  
* Pre-loaded physical QR sticker graphics & barcodes.

**Supported Protocols & Services**:

* **Primary**: AWS S3 / DigitalOcean Spaces / MinIO (S3-compatible object storage).  
* **Media Delivery**: Cloudinary (optional fallback for real-time image resizing, watermarking, and optimized CDN delivery).

---

## 7. Required Third-Party Service Integrations

The NestJS backend engine connects to external e-governance service providers:

| Integration Service | Purpose | NestJS Adapter Module | Necessity |
| :---- | :---- | :---- | :---- |
| **Paystack / Interswitch** | Online revenue collection, permit fee payments, split settlement webhooks | `PaymentsModule` | **Required** (Primary Payment Gateway) |
| **Resend** | Executive email alerts (e.g. Commissioner/PS approval dispatches, permit notifications) | `NotificationModule` | **Required** |
| **Termii / BulkSMS** | SMS OTP verification, inspection alerts, demand notices | `NotificationModule` | **Required** |
| **S3 / Cloudinary** | Passport photo, vehicle document & PDF storage | `StorageModule` | **Required** |
| **Sentry** | Real-time error monitoring, stack trace reporting, and performance APM | NestJS Sentry Interceptor | **Recommended** |

---

## 8. Environment Configuration Matrix

Below is the specification of environment variables expected by the MOT Next.js Frontend and NestJS Backend applications.

### 8.1 Next.js Frontend Environment Variables

| Variable | Description | Example / Value |
| :---- | :---- | :---- |
| `NODE_ENV` | Environment identifier | `production` / `staging` |
| `PORT` | Frontend HTTP port | `3000` |
| `NEXT_PUBLIC_APP_URL` | Base URL of frontend web app | `https://mot.anambra.gov.ng` |
| `NEXT_PUBLIC_API_BASE_URL` | Base URL of NestJS API Engine | `https://mot.anambra.gov.ng/api/v1` |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Paystack public key exposed to browser | `pk_live_xxxxxxxxxxxxxxxxxxxx` |

### 8.2 NestJS Backend API Engine Environment Variables

| Category | Variable | Description |
| :---- | :---- | :---- |
| **Core & Server** | `NODE_ENV` | Application environment (`production` / `staging`) |
| | `PORT` | NestJS API HTTP server port (`4000`) |
| | `CORS_ORIGINS` | Allowed client origin domains (`https://mot.anambra.gov.ng`) |
| | `SWAGGER_PATH` | Path for OpenAPI interactive documentation (`api/docs`) |
| **Database** | `DATABASE_URL` | PostgreSQL connection string with PgBouncer connection pooler |
| | `DIRECT_URL` | Direct PostgreSQL connection string for Prisma/TypeORM schema migrations |
| **Redis & Queue** | `REDIS_HOST` | Redis server hostname or IP address |
| | `REDIS_PORT` | Redis server port (`6379`) |
| | `REDIS_PASSWORD` | Redis authentication password (if enabled) |
| **Authentication** | `JWT_SECRET` | 64+ character secret key for signing JWT bearer tokens |
| | `JWT_EXPIRATION` | Token validity duration (`1d` or `8h`) |
| | `QR_SECURITY_SECRET` | Cryptographic secret for signing physical QR verification payload tokens |
| **Payments** | `PAYMENT_GATEWAY` | Active gateway selector (`PAYSTACK` / `INTERSWITCH`) |
| | `PAYSTACK_SECRET_KEY` | Paystack secret API key for verification and split settlements |
| | `PAYSTACK_WEBHOOK_SECRET` | Paystack HMAC signature key for validating inbound payment webhooks |
| | `INTERSWITCH_MERCHANT_CODE` | Interswitch assigned merchant code |
| | `INTERSWITCH_SECRET_KEY` | Interswitch secret key |
| **Notifications** | `RESEND_API_KEY` | Resend API key for executive email notifications |
| | `FROM_EMAIL_ADDRESS` | Official sender email address (`notifications@mot.anambra.gov.ng`) |
| | `SMS_PROVIDER` | Active SMS provider (`TERMII` / `BULKSMS`) |
| | `TERMII_API_KEY` | Termii API key |
| | `TERMII_SENDER_ID` | Approved SMS Sender ID (`ANSG-MOT`) |
| **Object Storage** | `STORAGE_PROVIDER` | Storage engine (`S3` / `CLOUDINARY`) |
| | `AWS_S3_BUCKET` | AWS S3 bucket name |
| | `AWS_S3_REGION` | AWS region (`eu-west-1` / `us-east-1`) |
| | `AWS_ACCESS_KEY_ID` | IAM access key ID |
| | `AWS_SECRET_ACCESS_KEY` | IAM secret access key |

---

## 9. Networking, Domains, API Gateway & Security Baseline

* **Domains & DNS Setup**:  
  * Main Web Platform & Portal: [`mot.anambra.gov.ng`](http://mot.anambra.gov.ng)  
  * NestJS API Endpoints: `mot.anambra.gov.ng/api/v1/*`  
  * NestJS Swagger OpenAPI Documentation: `mot.anambra.gov.ng/api/docs`  
  * Public Verification Scanning Route: `mot.anambra.gov.ng/verify/*`  
* **Reverse Proxy / Nginx Routing Configuration**:  
  Nginx acts as the primary API Gateway and SSL termination proxy:
  ```nginx
  server {
      listen 443 ssl http2;
      server_name mot.anambra.gov.ng;

      # SSL Certificates
      ssl_certificate /etc/letsencrypt/live/mot.anambra.gov.ng/fullchain.pem;
      ssl_certificate_key /etc/letsencrypt/live/mot.anambra.gov.ng/privkey.pem;

      # Route API Requests to NestJS Backend API Engine (Port 4000)
      location /api/v1/ {
          proxy_pass http://127.0.0.1:4000/api/v1/;
          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection 'upgrade';
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
      }

      # Route OpenAPI Swagger Docs
      location /api/docs {
          proxy_pass http://127.0.0.1:4000/api/docs;
          proxy_set_header Host $host;
      }

      # Route Web/PWA Requests to Next.js Frontend (Port 3000)
      location / {
          proxy_pass http://127.0.0.1:3000;
          proxy_http_version 1.1;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
      }
  }
  ```
* **SSL / TLS**: Mandatory TLS 1.3 encryption across all public and internal endpoints.  
* **Cross-Origin Resource Sharing (CORS)**: Enforced via NestJS `main.ts` configuration strictly authorizing state government web origins (`https://mot.anambra.gov.ng`).  
* **Barcode Interception Integration**: Integration logic configured on state revenue collection endpoints (e.g. Transpay) to route scanned MOT/TRACAS barcodes directly to MOT verification endpoints.

---

## 10. Role-Based Access Control (RBAC) & Audit Architecture in NestJS

The NestJS backend enforces strict role-based access control across **12 distinct user roles** using custom NestJS Guards (`JwtAuthGuard`, `RolesGuard`) and Decorators (`@Roles(...)`).

| User Role | Operational Scope & Duties |
| :---- | :---- |
| `COMMISSIONER` | Executive authority; final permit approvals, revalidations, executive dashboard access. |
| `PERMANENT_SECRETARY` | Operational authority; inspection approvals, staff management, fee updates. |
| `HOD_PARKS` | Departmental head for motor park permits and revalidations. |
| `HOD_VIS` | Departmental head for vehicle inspection services & AVIR. |
| `HOD_TRANSPORT_OPS` | Departmental head for mass transit, fleet operators, and TRACAS transport. |
| `HOD_PARKS_REVALIDATION` | Departmental head for park revalidation workflow queues. |
| `FIELD_INSPECTOR` | On-site inspections, digital checklists, field verification. |
| `VEHICLE_INSPECTION_OFFICER` | Mechanical vehicle assessments & AVIR report generation. |
| `FINANCE_OFFICER` | Revenue tracking, payment reconciliation, fee schedule review. |
| `EXTERNAL_APPLICANT` | Public users applying for motor park permits, transit licenses, or revalidations. |
| `PARK_MONITOR` | Registered field monitors tracking park compliance. |
| `SYSTEM_ADMIN` | System configuration, user management, audit trail review. |

### NestJS Automated Audit Logging Interceptor:

Every state modification (permit submission, inspection approval, driver enumeration, rider reassignment, fee modification, user access change) is automatically intercepted by a global NestJS `AuditLogInterceptor`. 

The interceptor records an immutable log entry in the `AuditLog` database table detailing `userId`, `action`, `entityType`, `entityId`, `ipAddress`, `userAgent`, `previousState`, `newState`, and timestamp.

---

## 11. Build, Deployment, PM2 & Containerization

### 11.1 Package Management & Commands

**Package Manager**: `pnpm` (or `npm`)

#### A. NestJS Backend Engine (`/backend` or root backend package):
```bash
# 1. Install Dependencies
pnpm install

# 2. Run Database Migrations
npx prisma migrate deploy

# 3. Generate Prisma Client
npx prisma generate

# 4. Build NestJS Production Bundle
pnpm run build

# 5. Start NestJS Production Server
pnpm run start:prod
```

#### B. Next.js Frontend Web App (`/frontend` or root web package):
```bash
# 1. Install Dependencies
pnpm install

# 2. Build Production Web Bundle
pnpm run build

# 3. Start Next.js Production Server
pnpm run start
```

### 11.2 PM2 Ecosystem File (`ecosystem.config.js`)

For virtual private server (VPS) self-hosting, PM2 manages processes across CPU cores:

```javascript
module.exports = {
  apps: [
    {
      name: 'mot-backend-api',
      script: 'dist/main.js',
      cwd: './backend',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
    },
    {
      name: 'mot-queue-worker',
      script: 'dist/worker.js',
      cwd: './backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'mot-frontend-web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: './frontend',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
```

---

## 12. Operational & Support Requirements

Self-hosting the MOT platform requires administrative capabilities covering:

1. **NestJS & Next.js Runtime Operations**: Monitoring process health, PM2 cluster restarts, environment secrets management, and log rotation.  
2. **PostgreSQL Administration**: Database index optimization, PgBouncer pool connection monitoring, vacuum maintenance, and automated snapshot verifications.  
3. **Queue Monitoring**: Monitoring BullMQ queue health and failed jobs via Bull Board administrative panel (`/admin/queues`).  
4. **Domain & Security Maintenance**: TLS certificate auto-renewals (Certbot / Let's Encrypt) and WAF/firewall rule enforcement.  
5. **Third-Party Account Maintenance**: Active monitoring of Paystack/Interswitch merchant balances, Resend email credits, and Termii SMS gateway balances.

---

## 13. Contact & Support

For technical clarifications, architecture review, or cloud deployment assistance, please contact:

**ISCE Digital Concept Ltd.**  
Email: [`hello@isce.tech`](mailto:hello@isce.tech) | Web: [`https://isce.tech`](https://isce.tech)  
