# PaperBoxd Privacy Policy

**Effective date:** [PLACEHOLDER — set on publish]
**Version:** 1.0 (draft — not yet published)

> **Note:** This draft is generated from a code-level audit of the PaperBoxd backend, web, iOS, and Android codebases. It is not a substitute for legal review. Have a lawyer review this before publishing, in particular the Grievance Officer designation and any clause affecting users outside India.

---

## 1. Who We Are

PaperBoxd ("we," "us," "our") is a social book-tracking platform operated by Hridyesh (sole individual operator), based in Bangalore, India, accessible at [paperboxd.in](https://paperboxd.in) and through our iOS and Android apps.

This Policy explains what personal data we collect when you use PaperBoxd, why we collect it, who we share it with, and the rights you have over it.

## 2. Grievance Officer

In accordance with India's Digital Personal Data Protection Act, 2023 (DPDP Act), PaperBoxd is operated by a single individual, who also serves as the contact for questions or complaints about your personal data:

- **Name:** Hridyesh
- **Email:** contact@paperboxd.in
- **Response commitment:** We aim to acknowledge grievances within 7 business days and resolve them within 30 days.

## 3. Information We Collect

| Data | Collected When | Notes |
|---|---|---|
| Email address | Registration | Required for login and account recovery |
| Password | Registration | Stored as a bcrypt hash (cost factor 12) — we never see or store your plain-text password |
| Username, profile info (bio, pronouns, birthday, links, avatar) | Registration / profile edit | All optional except username. A birthday you add here is shown on your profile; it is separate from the age check at web signup, which is not stored (see §9) |
| Google account info | If you sign in with Google | Limited to the fields Google provides for identity verification; we validate the token audience against an allowlist before trusting it |
| OTP codes | Passwordless / verification login | Codes are hashed at rest and rate-limited; they are never stored in plain text |
| Reading activity | When you log a book, write a diary entry, create a list, rate, or like a book | This is the core content of the app and is visible per your privacy/sharing settings |
| Book identifiers (ISBN) scanned via **Scan & Know** | When you use the barcode scanner | The barcode is decoded **on your device** (iOS: AVCaptureMetadataOutput; Android: ML Kit barcode scanning). **We do not capture, upload, or store a photo of the book or its cover** — only the decoded ISBN text is sent to our servers. |
| Session/device data | Every request | IP address (used for rate-limiting and abuse prevention), device type |
| Account deletion requests | If you delete your account | See §8 for retention and purge timeline |

We do **not** currently collect: push notification tokens (we have no push notification system), payment information (we do not yet process payments), or location data.

## 4. How We Use Your Information

- To create and secure your account (authentication, password/OTP verification)
- To operate core app features: bookshelf, diary, lists, likes, follows, activity feed, leaderboard
- To power **Scan & Know**: we send the book's metadata (title, author, genre, etc. — never an image) along with relevant context about your reading profile to Anthropic's Claude API to generate a personalized recommendation. **This context can include the usernames of people you follow**, where relevant to the recommendation. This is disclosed here specifically so it's not buried — if you'd rather this not happen, contact us (see §11 — self-serve controls for this are on our roadmap).
- To send account-related emails (OTP codes, password reset) via our email provider
- To detect and prevent abuse (rate limiting, fraud prevention)
- To improve the product — we track first-party product usage events (e.g. which features are used) in our own database. **We do not use third-party analytics or advertising trackers.**

## 5. Who We Share Your Data With

We share data only with the service providers needed to run PaperBoxd, and only the minimum needed for their function:

| Provider | What They Receive | Purpose |
|---|---|---|
| ISBNdb, Google Books, Open Library, Hardcover | Book search queries (not your personal identity) | Book metadata lookup |
| Anthropic (Claude API) | Book metadata + relevant reading-profile context (including followed usernames where relevant) — **never an image** | Powers Scan & Know recommendations |
| Cohere | Book/content text for embedding generation | Powers recommendation and search relevance |
| Cloudinary | Profile pictures / uploaded images | Image hosting and delivery |
| Resend | Your email address | Sending OTP codes and account emails |
| Railway | All application data (hosted in Singapore) | Database and backend hosting |
| Vercel | Web traffic | Frontend hosting/CDN |
| Google | OAuth token, if you use Google Sign-In | Identity verification |

We do not sell your personal data. We do not share your data with advertisers.

**Legacy note:** As part of a March 2026 backend migration, a subset of web user data was originally stored in MongoDB Atlas alongside our current PostgreSQL database. This legacy store is in the process of being decommissioned — see §8.

## 6. Cookies & Local Storage

- **Web:** We use a session cookie (httpOnly) for authentication. We do not use third-party advertising or analytics cookies.
- **iOS:** Your authentication token is stored in the iOS Keychain, not in app storage or UserDefaults.
- **Android:** Your authentication token is stored using EncryptedSharedPreferences (AES-256-GCM), not in plain SharedPreferences.

## 7. AI-Generated Content

Scan & Know results are generated by a third-party AI model (Anthropic's Claude) based on book metadata and your reading context. **This content is labeled as AI-generated within the app** and may occasionally be inaccurate or unexpected — treat it as a starting point for discovery, not authoritative advice.

## 8. Data Retention & Deletion

- If you delete your account, your data is soft-deleted immediately (hidden from the product) and **permanently purged from our production database within 30 days**, including cascading deletion of related records (diary entries, lists, activity, etc.).
- **Manual export/portability:** We do not yet offer self-serve data export. To request a copy of your data, email us at contact@paperboxd.in and we will provide it within 30 days.
- **Legacy MongoDB data:** Some web accounts also exist in a legacy MongoDB database that predates our current PostgreSQL backend. It is still in service while we retire it, and it holds a parallel copy of some account data. Account deletion does not yet reach that copy automatically — email us and we will remove it, and we are closing this gap.

## 9. Age Eligibility

PaperBoxd is for users aged 18 and over. When you sign up on the web we ask for your date of birth and will not create an account for anyone under 18. We do not store that date — it is used for the age check and discarded. Our iOS and Android apps do not yet ask, so an account created there is not age-checked; we are closing that gap. We do not knowingly collect data from children. If we learn a child's account was created, we will delete it.

## 10. International Data Transfers

Our infrastructure is hosted primarily in Singapore (Railway). Some of our service providers (Anthropic, Cohere, Cloudinary, Resend) may process data on servers located outside India, including in the United States. By using PaperBoxd, you consent to this transfer, which is necessary to provide the service.

## 11. Your Rights

Subject to applicable law (including the DPDP Act if you are in India), you have the right to:
- Access the personal data we hold about you
- Correct inaccurate data
- Request deletion of your account and data
- Request a copy of your data (currently via manual request — see §8)
- Withdraw consent for optional processing, where applicable
- Lodge a complaint with our Grievance Officer (§2) or, where applicable, your local data protection authority

To exercise any of these rights, contact us at contact@paperboxd.in.

## 12. Security

We take reasonable technical measures to protect your data, including:
- Password hashing with bcrypt (cost factor 12) — we never store plain-text passwords
- OTP codes hashed at rest and rate-limited
- JWT-based authentication with platform-appropriate secure storage (Keychain / EncryptedSharedPreferences / httpOnly cookies)
- Google OAuth token audience validation against an explicit allowlist
- HTTPS for all data in transit

No system is perfectly secure, and we cannot guarantee absolute security.

## 13. Changes to This Policy

We may update this Policy from time to time. We'll update the "Effective date" above and, for material changes, notify you via email or an in-app notice.

## 14. Contact Us

Questions about this Policy or your data: contact@paperboxd.in
Grievance contact: see §2.

---

## Outstanding placeholders before this can be published

1. Confirm full legal name and postal address for §1 operator / §2 Grievance Officer (currently first name "Hridyesh", no address)
2. Set the effective date (§ header) — the only remaining literal placeholder
3. Cloudinary processing region still unconfirmed (§5); Railway = Singapore is confirmed
4. Legacy MongoDB — update §5 and §8 once deletion reaches it and once decommission completes
5. Age gate — §9 currently states, truthfully, that age is not verified; update once the DOB check ships
6. Not yet reflected in this draft: Apple sign-in, push tokens, Brave/Wikipedia processors, Instagram share + photo-library write on iOS, on-device search history, and web localStorage caching. See LEGAL_AUDIT.md §6.
