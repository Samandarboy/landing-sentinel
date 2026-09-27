---
title: Security
description: How Sentinel protects the contracts you upload: encryption, sign-in and session controls, account separation, where contract text goes, retention, and what we do not claim.
updated: 2026-09-27
---
# SECURITY

**Sentinel LAI, Inc.**

**Last Updated: September 27, 2026**

This page brings together, word for word, the security commitments made in our [Privacy Policy](/legal/privacy-policy/). The Privacy Policy is the governing text; each passage below names the section it comes from.

---

## What we do

*From [Privacy Policy, Section 12.1](/legal/privacy-policy/#12-security).*

**12.1 What we do.** We maintain administrative, technical, and physical safeguards designed to protect personal information against unauthorized access, disclosure, alteration, and destruction. These include:

  (a) encryption of data in transit using TLS, both between you and the Platform and between the Platform and its subprocessors;

  (b) storage of the Platform's data on encrypted volumes;

  (c) passwords stored only as salted PBKDF2-HMAC-SHA256 hashes with 200,000 iterations, compared in constant time, and never written to disk or to a log in plaintext;

  (d) signed, HttpOnly session tokens with a cross-site request forgery guard, session invalidation on password change, administrator reset or account disable, rate limiting of sign-in attempts and account lockout after repeated failures;

  (e) a strict Content Security Policy and related browser security headers on the Platform, which loads no third-party script or asset;

  (f) separation of each account's documents, reports, exports and records into its own storage area, resolved through the signed-in account, with no administrator-readable view of another account's documents;

  (g) access to production systems on a least-privilege basis, with authentication requirements for personnel and logging of that access; and

  (h) an activity record of sensitive reads as well as writes, as described in Section 3.2.

## What we do not claim

*From [Privacy Policy, Section 12.2](/legal/privacy-policy/#12-security).*

**12.2 What we do not claim.** No method of transmission or storage is completely secure, and we do not guarantee absolute security. In particular: the Platform does not offer multi-factor authentication, single sign-on or SAML federation; uploaded files are not scanned for malicious code; the model-answer cache described in Section 11.3 is deliberately shared across accounts rather than partitioned; and a person with operating-system level access to our production infrastructure could read data on it, which is why such access is restricted, authenticated and logged.

## Incidents

*From [Privacy Policy, Section 12.3](/legal/privacy-policy/#12-security).*

**12.3 Incidents.** If we become aware of a security incident affecting your personal information or Customer Content, we will notify you without undue delay and as required by applicable law.

## Where contract text goes

*From [Privacy Policy, Section 6.1](/legal/privacy-policy/#6-artificial-intelligence-processing-and-subprocessors).*

**6.1 What happens to the contracts you upload.** The Platform performs its analysis by transmitting the text of Customer Content over an encrypted connection to a third-party provider of large language model inference services. Model inference is used at several stages — detection of findings, simulation of scenarios, the review of candidate findings before they are shown, drafting of redlines and memoranda, and the document assistant — so contract language reaches that provider whenever an analysis runs. This is the routine and expected operation of the Platform, not an exception to it.


## Training on your content

*From [Privacy Policy, Section 7.1](/legal/privacy-policy/#7-we-do-not-train-on-your-content-without-your-opt-in).*

**7.1** We do not use Customer Content or the analyses generated from it to train, fine-tune, or otherwise develop our models or those of any third party, unless the account concerned has given a separate, express opt-in.

## Retention and deletion

*From [Privacy Policy, Sections 11.1, 11.3, 11.5 and 11.6](/legal/privacy-policy/#11-retention-and-deletion).*

**11.1 Customer Content.** We retain Customer Content and the analyses generated from it for as long as the account remains active, or until it is deleted. Deleting a document removes its parse, its reports, its versions, its exports, its progress records, its browser-side history, and its entries in the quality record described in Section 7.3, from active systems promptly.

**11.3 Cached model answers — a residue that outlives deletion.** To avoid paying for and re-running identical model calls, the Platform caches model answers keyed by a cryptographic hash of the prompt that produced them, and those prompts contain contract language. **This cache is shared across accounts by design and is not partitioned per account.** A cached answer can only be reached by a request that already contains the same text, so it cannot expose your contract to anyone who does not already hold it; but the cached bytes remain on disk after a document or an account is deleted, until the cache retention window collects them. That window is thirty (30) days, and the cache is swept every twenty-four (24) hours. If your policy requires erasure on a shorter cycle, write to leo@sentinel-lai.com and we will disable caching for your deployment.

**11.5 Activity and security records.** The per-account activity record described in Section 3.2 is retained for three hundred and sixty-five (365) days. Server logs, which contain no document text, are retained for fourteen (14) days.

**11.6 Backups.** Encrypted backup copies may persist for up to thirty (30) days after deletion from active systems, after which they are overwritten in the ordinary backup rotation. Backups are not accessed for any purpose other than disaster recovery.

## Contact

*From [Privacy Policy, Section 17](/legal/privacy-policy/#17-contact-us).*

**Sentinel LAI, Inc.**
2618 College Avenue
Berkeley, CA 94705
United States
Email: leo@sentinel-lai.com
