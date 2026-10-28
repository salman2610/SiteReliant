# SiteReliant — Website Operations Platform for Agencies

> **DETECT · DIAGNOSE · VERIFY**  
> Complete multi-tenant website reliability, synthetic transaction monitoring, automated diagnostics, and verified remediation platform for web agencies and DevOps teams.

---

## 🌟 Key Features

### 1. Autonomous Website Monitoring
- **Multi-Protocol Monitoring**: Real-time probes for HTTP, HTTPS, TCP, UDP, TLS/SSL certificates, and DNS records.
- **Configurable Thresholds**: Avoid false alarms with consecutive check failure thresholds and flapping suppression.
- **Global Mesh Simulation**: Edge probe validation from North America, Europe, and Asia.

### 2. Synthetic Browser & Workflow Testing (BrowserGuard)
- **Headless Chromium Execution**: Full multi-step user journey verification (contact forms, checkout funnels, login flows).
- **DOM & Content Assertions**: Asserts visual presence, response status, and expected success states rather than simple HTTP 200 checks.
- **Evidence Vault**: Captures screenshots, DOM state, console errors, and network timings upon failure.
- **Sensitive Data Redaction**: Automatic masking of passwords, credit cards, bearer tokens, and session secrets in logs and artifacts.

### 3. Root Cause Diagnostics & Verified Fix Remediation
- **Automated Root-Cause Hints**: Pinpoints DNS lookup failures, TLS handshake timeouts, upstream HTTP 5xx codes, and DOM selector mutations.
- **Remediation Action Logging**: Engineers record maintenance actions directly within incident records.
- **Remediation Verification Probes**: Automatic re-test probe execution to confirm the issue is truly resolved before closing the incident, generating indisputable MTTR proof.

### 4. White-Label Agency Portals & Client SLA Reports
- **Multi-Tenant Architecture**: Complete tenant isolation across agencies, clients, monitors, incidents, and reports.
- **Custom-Branded Client Portals**: Unique client access with custom agency logo, primary color, custom domain support, and read-only status access.
- **Monthly Verifiable Reports**: Cryptographically timestamped uptime summaries and verified fix audit logs ready for client review.

### 5. Zero-Trust Security Architecture
- **SSRF & Adversarial Egress Defense**: Probes and Chromium runners execute in strict sandboxes forbidding access to cloud instance metadata (`169.254.169.254`), RFC 1918 private subnets, loopback addresses, and prohibited ports.
- **DNS Rebinding Prevention**: Validates resolved IPs before socket connection.
- **AES-256-GCM Secret Vault**: SMTP passwords, webhook URLs, and API keys encrypted at rest.

---

## 🏗️ Architecture & Monorepo Structure

SiteReliant is structured as a high-performance **Turborepo** TypeScript monorepo:

```
SiteReliant/
├── apps/
│   ├── api/             # Fastify REST API backend (Port 4000)
│   ├── web/             # Next.js 14 App Router dashboard & landing page (Port 3001)
│   └── worker/          # BullMQ background task & probe scheduler
├── packages/
│   ├── database/        # Prisma ORM & PostgreSQL schema
│   ├── monitoring/      # Multi-protocol HTTP, TLS, DNS, & TCP check engines
│   ├── browser-monitoring/ # Synthetic Chromium runner & evidence redaction
│   └── shared/          # Common types, validation schemas, and utilities
└── tests/
    ├── e2e/             # Reliability and incident lifecycle tests
    ├── browser/         # BrowserGuard synthetic workflow tests
    ├── integration/     # Remediation and verification workflow tests
    ├── security/        # SSRF egress & multi-tenancy isolation tests
    └── white-label/     # Client portal & branding tests
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 20.x
- PostgreSQL >= 15
- Redis (for background queue processing)

### Installation
```bash
# Clone the repository
git clone https://github.com/salman2610/SiteReliant.git
cd SiteReliant

# Install monorepo dependencies
npm install

# Setup environment variables
cp .env.example .env

# Run database migrations and seed default data
npm run db:push
npm run db:seed
```

### Running Locally
```bash
# Start all services concurrently (Web, API, Worker)
npm run dev

# Or run individual workspaces:
npm run --workspace=@siteguard/web dev     # Next.js UI at http://localhost:3001
npm run --workspace=@siteguard/api dev     # Fastify API at http://localhost:4000
npm run --workspace=@siteguard/worker dev  # Background Worker
```

### Running the Test Suite
```bash
npm test
```
*Executes all 36 tests across 7 test suites (E2E, Synthetic Browser, Remediation, Security, Multi-tenancy).*

---

## 🎨 Design & Attribution

- **Landing Page**: Midnight SaaS dark mode with GSAP kinetic typography, interactive cursor spotlights, and scroll-triggered parallax effects.
- **Designed and Developed by**: [Salmanul Faris](https://salman2610.github.io)

---

## 📄 License
Licensed under the [MIT License](LICENSE).
