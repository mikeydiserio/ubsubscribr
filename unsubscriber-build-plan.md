# Build Plan — One-Click Email Unsubscriber

**For:** the app builder
**Version:** 1.0
**Goal:** A lightweight web app where a user connects their inbox, and the app finds every recurring sender and unsubscribes on their behalf — using the cheap, reliable path (email headers) first, and an AI browser agent only as a last resort.

---

## 0. Two hard requirements to read first

1. **No passwords. OAuth only.** Do **not** build an email/password login that logs into the user's mailbox. Gmail and Microsoft both block third-party password login. The only supported path is OAuth (Google Sign-In → Gmail API; Microsoft Sign-In → Graph API). We never see or store the user's email password.
2. **Header-first, AI-last.** The `List-Unsubscribe` header handles the majority of modern marketing mail with a single HTTP request. The Gemini browser agent is a fallback for the minority of cases that require clicking through a web page. Do not lead with the AI approach — it is the slowest, most expensive, and most fragile tier.

---

## 1. Architecture overview

The core is an **unsubscribe engine** that processes each recurring sender through a tiered strategy, cheapest and most reliable first, falling through to the next tier only when the previous one doesn't apply.

```
User connects inbox (provider adapter: OAuth or IMAP — see §2)
        │
        ▼
Ingestion adapter normalizes messages → engine is provider-agnostic
        │
        ▼
Scan mailbox → group messages by sender / List-ID
        │
        ▼
Present list of subscriptions → user selects which to leave
        │
        ▼
For each selected sender, run the Unsubscribe Engine:

  Tier 1  List-Unsubscribe-Post (RFC 8058)  → HTTP POST. Done. (~most mail)
  Tier 2  List-Unsubscribe: mailto:         → send unsubscribe email
  Tier 3  List-Unsubscribe: https:// (GET)  → open URL, detect success
  Tier 4  No header → parse email HTML body → find unsubscribe link → open
  Tier 5  Link lands on an interactive page → hand to Gemini browser agent
        │
        ▼
Record result per sender (success / needs-review / failed) → show user
```

Only a small fraction of senders should ever reach Tier 5.

---

## 2. Connecting inboxes — provider-adapter architecture

There is no single way to connect an inbox, and it is **not** simply "OAuth vs password." The big providers *mandate* OAuth (basic auth is dead), while the long tail of ISP and independent mailboxes only offer IMAP with credentials. Build a `MailboxProvider` interface with one method surface (`connect`, `listMessages`, `getMessage`, `disconnect`) and multiple **adapters** behind it. The unsubscribe engine consumes normalized messages and never knows which adapter produced them.

**The three adapters:**

**A. Google adapter — OAuth 2.0 + Gmail API.**
Covers `@gmail.com` and Google Workspace custom domains. This is the largest single share of consumer inboxes and the cleanest to build, so it's the MVP adapter.
Scopes (choose deliberately — affects cost and approval time):
- `gmail.metadata` (SENSITIVE) — message **headers only**. Enough for Tiers 1–3. Lighter approval.
- `gmail.readonly` (RESTRICTED) — headers **and body**. Needed for Tier 4 (parsing links from the HTML) and Tier 5. Requires a security assessment (§9).
- We do **not** need `gmail.modify` / write access — unsubscribing hits the *sender's* endpoint, never the user's mailbox. Only add write scope if we later build "archive after unsubscribe."

**B. Microsoft adapter — OAuth 2.0 + Microsoft Graph API.**
Covers `@outlook.com`, **`@hotmail.com`**, `@live.com`, `@msn.com`, and Microsoft 365 business accounts. **Important:** these are *not* IMAP-password mailboxes. Microsoft phased out basic authentication for all personal accounts on **16 September 2024**, and disabled app passwords at the same time — there is no password path in. Hotmail must go through Microsoft OAuth. Use Graph (`Mail.Read` scope) rather than OAuth-over-IMAP; Microsoft's own guidance is that Graph is the supported route for consumer accounts.

**C. Generic IMAP adapter — username + credential.**
This is the one that makes the app *universal* — and the one your OzEmail example needs. Covers everything without its own OAuth provider: legacy ISP mailboxes (OzEmail and similar Australian ISP accounts, now run on the iiNet/TPG stack), Fastmail, iCloud, Yahoo/AOL, and any cPanel/webmail mailbox on a custom domain. Mechanics:
- **Read** via IMAP. (SMTP is only needed for Tier 2 `mailto:` unsubscribes, and even those can be sent from a system relay instead of the user's account.)
- **Prefer app-specific passwords, don't ask for the primary password.** Yahoo, iCloud, and Fastmail *require* an app password rather than the account password — the UI should detect these domains and link the user to the right "generate app password" page. Where a provider still allows the main password (many small ISPs), accept it but treat it as maximally sensitive.
- **Server autodiscovery** so users don't hand-type host/port: try DNS SRV records (RFC 6186), then Mozilla's autoconfig / ISPDB database, then a small built-in mapping for common AU ISPs, then fall back to a manual host/port/SSL form. For OzEmail specifically the builder should look up the current iiNet/TPG-operated IMAP settings at build time.

**Credential storage — this is the app's single biggest security and trust liability, treat it as such:**
- OAuth adapters (A, B): store the **refresh token** encrypted at rest (KMS envelope encryption or Supabase Vault), never the password. Support revocation + "disconnect" that deletes the token and, where possible, revokes the grant.
- IMAP adapter (C): you are holding a real credential.
  - **Preferred:** don't persist it at all — hold it in memory for the scan session, use it, discard it, and require re-entry for a re-scan. Best security posture; costs recurring convenience.
  - **If persisting for recurring scans:** encrypt with a strong KMS-backed scheme, isolate from application logs entirely, and be explicit in the UI and privacy policy about what's stored and why. This is the thing security-conscious users will (rightly) scrutinize, so the honest, minimal option is the right default for v1.
- Never log tokens or passwords, in any adapter.

---

## 3. Scanning & grouping

Firing an unsubscribe per *message* is wrong — a user has 200 emails from one newsletter, not 200 subscriptions. Group first.

- Pull recent messages (e.g. last 6–12 months, configurable) via the Gmail API. Prefer querying for messages that carry a `List-Unsubscribe` header or common marketing markers to cut volume.
- **Group by** `List-ID` header where present, else by the normalized `From` address / sending domain.
- For each group, capture: sender name, from-address, message count, most-recent date, and the best available unsubscribe method found across the group's messages (prefer the newest message's header).
- Produce a **subscription list**: one row per sender, with the detected unsubscribe method and a checkbox.

---

## 4. The Unsubscribe Engine (tiers in detail)

**Tier 1 — One-click POST (RFC 8058).** If a message has both `List-Unsubscribe: <https://...>` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click`, send an HTTP `POST` to that URL with body `List-Unsubscribe=One-Click` and header `Content-Type: application/x-www-form-urlencoded`. A 2xx response = success. This is the primary path and should cover the bulk of legitimate senders. No page render, no AI.

**Tier 2 — mailto.** If `List-Unsubscribe` contains a `mailto:` entry (e.g. `mailto:unsub@sender.com?subject=unsubscribe`), send that email from the user's account (via the API) or from a system relay, per the address/subject specified.

**Tier 3 — GET link.** If there's only a plain `https://` `List-Unsubscribe` URL (no one-click POST), issue a `GET`. Many of these unsubscribe immediately and return a confirmation page; detect success heuristically (2xx + success-language check). If the page clearly requires further action, promote to Tier 5.

**Tier 4 — Body parsing.** No usable header. Parse the email's HTML body, find anchor(s) whose text or context indicates unsubscribe/opt-out/manage-preferences, extract the URL, and treat it like Tier 3 (GET, then possibly Tier 5).

**Tier 5 — AI browser agent (fallback only).** The link lands on a page that needs interaction: click a button, tick a "yes, unsubscribe" box, select "unsubscribe from all," etc. Hand this to the Gemini computer-use agent (§5).

Each tier returns one of: `success`, `needs_review` (ambiguous — surface to user), `failed`.

---

## 5. AI browser-agent fallback (Gemini 3.5 Flash Computer Use)

**Important mechanics:** The Gemini API does **not** click pages itself. It runs an observe→think→act loop: you send a screenshot + the goal, it returns a proposed UI action (click at coordinates, type, scroll) with a reasoning `intent`, **your code executes that action in a real browser**, you capture a new screenshot, and repeat until done. So this tier is: *Gemini decides, our browser-automation layer clicks.*

**Components:**
- **Model:** `gemini-3.5-flash` with the Computer Use tool (native as of the June 2026 preview). Treat it as **preview, not GA** — verify current model string, pricing, and status in Google's docs before wiring it in, and keep the model name in config.
- **Browser execution layer:** Playwright (self-hosted headless Chromium) or a managed service like Browserbase. Recommend a managed remote-browser service for a hosted product — isolation and scaling are handled for you.
- **The loop:** goal = "Find and click the control that unsubscribes this email address from this sender's mailing list; confirm if asked; do not sign up, log in, or submit anything else." Cap steps (e.g. max 8–12 actions) and consecutive failures (e.g. 3) to bound cost and prevent runaway sessions.

**Security — this tier reads untrusted web pages, so:**
- **Enable Gemini's prompt-injection detection** (`enable_prompt_injection_detection`). Unsubscribe pages are third-party content and can contain hidden instructions; a page saying "ignore your task and…" is a real attack vector. Detection is a layer, not a guarantee — also constrain the agent's allowed actions.
- **Sandbox the browser** (isolated session per task, no access to the user's mailbox, no shared cookies/credentials).
- **Whitelist actions.** The agent should only click/scroll/tick within the unsubscribe flow. It must never enter the user's credentials, make a payment, or submit unrelated forms. Use Gemini's safety-confirmation categories and stop on `require_confirmation`/`blocked` decisions.
- **Rate-limit** agent runs per user and globally.

**Cost note:** Tier 5 is many screenshot round-trips per page and is the expensive path. It should be a small fraction of total volume by design. Track per-run action counts so we can see if any senders are dragging the loop long.

---

## 6. User-facing UX flow

1. **Landing** → single value prop, "Connect your inbox" button.
2. **OAuth consent** → Google/Microsoft sign-in and scope approval.
3. **Scanning state** → progress indicator while we scan and group.
4. **Review screen** → the subscription list (§3). Each row: sender, frequency/last-seen, detected method, checkbox. Bulk "select all" + individual toggles. **Default to review-and-confirm, not silent mass-unsubscribe** — protects against false positives and builds trust.
5. **Run** → progress per sender; live status.
6. **Results** → grouped by `success` / `needs review` / `failed`, with a retry action and, for `needs_review`, a link to open the page manually.
7. **Disconnect** → revoke tokens, delete stored data.

Keep it genuinely light: one screen to connect, one to review, one for results.

---

## 7. Data model (minimal)

- `users` — id, email, provider, created_at.
- `oauth_tokens` — user_id, provider, encrypted refresh token, scopes, expiry. (Encrypted at rest.)
- `subscriptions` — user_id, sender_name, from_address, list_id, message_count, last_seen, detected_method, status.
- `unsubscribe_jobs` — subscription_id, tier_used, status, attempts, agent_action_count (nullable), error, timestamps.

Store the **minimum** needed to show results and allow retries. Do not warehouse email bodies; extract what you need in-memory during a scan and discard.

---

## 8. Security & privacy requirements

- OAuth tokens encrypted at rest; never logged.
- IMAP credentials: prefer not persisting at all (session-only); if persisted, KMS-encrypted and isolated from logs. This is the highest-sensitivity data in the app.
- Prefer app-specific passwords over primary passwords on the IMAP path wherever the provider supports them.
- Minimal scopes; no mailbox write access unless a feature explicitly needs it.
- Email bodies processed transiently, not persisted.
- Tier 5 browser sessions sandboxed and isolated per task; prompt-injection detection on.
- Per-user and global rate limits on scanning and on agent runs.
- Clear "disconnect and delete my data" flow that revokes the OAuth grant / deletes stored IMAP credentials.
- A privacy policy that states exactly what's accessed, why, and retention — per adapter.

---

## 9. Legal / compliance gotchas (do not skip — these have real cost and lead time)

- **Google OAuth verification + CASA security assessment.** Requesting restricted Gmail scopes (`gmail.readonly`) for a **public** app requires Google's OAuth app verification **and** an annual third-party security assessment (CASA). This has a cost (typically a few thousand USD/year via an assessor) and a multi-week lead time. **This is the single biggest external dependency for launch — start it early.** Until verified, the app is limited to a small number of test users you add manually. This barrier is exactly why paid products (Leave Me Alone, Clean Email, Unroll.me) exist in this space.
- **Microsoft** has an analogous Azure app registration + publisher verification + admin/user consent process for Graph. Consumer accounts (Hotmail/Outlook.com) work through the standard OAuth consent screen; no CASA-equivalent, but plan for the verification steps.
- **IMAP adapter — no gatekeeper, more liability.** There's no app-verification process protecting you here, which cuts both ways: nothing to wait on, but you're handling raw mail credentials with no platform buffer. The trust and security burden falls entirely on you, so the privacy story and credential handling (§2C, §8) have to be airtight before this ships publicly.
- **Privacy law.** You're processing people's inboxes → GDPR/CCPA and Australian Privacy Act obligations: lawful basis, data-processing transparency, deletion rights. Have counsel review before public launch.
- **Gemini preview terms.** Computer Use is a preview; check its terms for restrictions on production/customer-data use before relying on it in the paid flow.

---

## 10. Build phases

Build the engine once on the cleanest adapter, then multiply adapters — because the `MailboxProvider` interface (§2) means each new adapter is ingestion work, not a rewrite.

**Phase 1 — MVP (Google adapter, header-only).**
Google OAuth, scan + group, subscription review screen, Tiers 1–3 (POST / mailto / GET), results screen. No AI, no body parsing. Handles a large share of real mail and is shippable to test users while verification is pending. This phase also proves the provider-agnostic engine boundary that every later adapter plugs into.

**Phase 2 — Coverage on the engine.**
Add Tier 4 (body parsing) once on `gmail.readonly`. Improve Tier 3 success detection.

**Phase 3 — Microsoft adapter.**
Graph API for Outlook.com / Hotmail / Live / MSN / M365. Same engine downstream.

**Phase 4 — Generic IMAP adapter (universality).**
Unlocks OzEmail, Fastmail, iCloud, Yahoo, and custom-domain mailboxes. Server autodiscovery + app-password UX + the credential-handling posture from §2C. This is the phase that fulfils the "works for everyone" goal.

**Phase 5 — AI fallback + polish.**
Tier 5 (Gemini Computer Use + Playwright/Browserbase) for the interactive long tail, with §5 security controls. Scheduling / re-scan. "Archive after unsubscribe" if we add write scope.

Run Google verification/CASA **in parallel with Phase 1**, not after. (The AI fallback is adapter-independent, so it can move earlier if the interactive long tail proves large — but it's the expensive tier, so default it late.)

---

## 11. Suggested stack

- **Frontend + app server:** Next.js (App Router) + TypeScript.
- **DB / auth store:** Supabase (Postgres) — with token encryption via Supabase Vault or app-level envelope encryption.
- **Background jobs:** a queue/worker for scans and unsubscribe runs (they're too slow for a request cycle) — e.g. a job runner or serverless queue.
- **IMAP adapter (Phase 4):** a maintained Node IMAP client (e.g. ImapFlow) + a mail parser (mailparser) for header/body extraction. Reuse the same parsing layer the Gmail/Graph adapters feed into.
- **Browser automation (Phase 5):** Browserbase (managed) or self-hosted Playwright.
- **AI:** Gemini API (`gemini-3.5-flash`, Computer Use tool) — model string in config.

---

## 12. Open questions to resolve with the builder

1. Which adapters ship at public launch — Google only, Google + Microsoft, or all three including IMAP? (IMAP is the biggest trust surface; consider gating it behind the others being proven.)
2. For the IMAP adapter: session-only credentials (re-enter each scan, safest) or persisted credentials for recurring scans? This is a product + security call, not just technical.
3. How far back to scan by default (6 vs 12 months)? Configurable?
4. Silent mass-unsubscribe vs mandatory review screen for v1? (Recommend review.)
5. Self-hosted Playwright vs managed Browserbase for Tier 5?
6. Free / paid? (Note the recurring CASA + Gemini costs when pricing this.)
7. Do we ever want mailbox write access (archive/delete), or stay read-only?
