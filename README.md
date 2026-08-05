## Blind Index Search

Search encrypted data using a **blind index** strategy.

This project demonstrates how to:

1. Encrypt sensitive borrower fields before storage.
2. Generate searchable hashes (blind indexes) from plaintext values.
3. Search records without decrypting everything first.

---

## Why this exists

When handling NPI/PII (name, address, SSN, birth date, etc.), storing plaintext is risky and often non-compliant.  
If you encrypt values directly, partial text search (like `Dev` in `Devon`) becomes difficult.

A **blind index** solves this by storing deterministic hashes for searchable tokens/substrings.

---

## Architecture (ASCII)

```text
                  +----------------------+
                  |   User Search Input  |
                  |  (e.g. firstName=Dev)|
                  +----------+-----------+
                             |
                             v
                   +--------------------+
                   | Query Normalization|
                   | + Blind Hash Build |
                   | sha1(field-token)  |
                   +---------+----------+
                             |
                             v
+-------------------+    lookup hash     +----------------------+
| tApplications.json| <----------------> | tBlindIndexes.json    |
| (encrypted fields)|    by blind index  | (keyId, token, hash)  |
+---------+---------+                    +----------+-----------+
          |                                           |
          |                             matching keyIds|
          +--------------------+----------------------+
                               v
                     +--------------------+
                     | Candidate Records  |
                     |   by applicationId |
                     +---------+----------+
                               |
                               v
                     +--------------------+
                     | AES Decrypt Fields |
                     | (matched records)  |
                     +---------+----------+
                               |
                               v
                     +--------------------+
                     |   Search Results   |
                     +--------------------+
```

---

## Request lifecycle (step-by-step)

### A) Write path (create application)

1. App receives borrower payload (plaintext).
2. If encryption mode is enabled:
   - Encrypt NPI fields with AES before persistence.
3. Save encrypted record into `tApplications.json`.
4. For each searchable field (`firstName`, `lastName`, `city`):
   - Generate substrings (`mountSentences`).
   - Keep tokens with length >= 3.
   - Hash each token as `sha1("${field}-${token}")`.
   - Store `(keyId, hash)` in `tBlindIndexes.json` (demo also stores `sentence`).

Result: data-at-rest is encrypted, and search metadata is precomputed.

### B) Search path (find borrower)

1. User provides query (currently prompt asks for `firstName`).
2. In encryption mode:
   - Transform query to blind hash using same rule:
     `sha1("firstName-${input}")`.
3. Scan blind index for matching hash.
4. Collect matching `keyId`s (application IDs).
5. Fetch only matching records from `tApplications.json`.
6. Decrypt fields of matched records.
7. Return decrypted results to user.

Result: search works without full-table decryption of all rows.

### C) Why this pattern works

- Encryption protects raw sensitive values in primary storage.
- Blind index enables deterministic lookup/search.
- The app compares **hashes** during search, not plaintext.

---

## How it works in this project

The flow is implemented in `npiEncryption.js`.

## 1) Data encryption at write time

When the app runs with `--true`, selected fields are encrypted using AES (`aes-encryption` package) before being written into `tApplications.json`.

Encrypted fields include:

- `firstName`
- `lastName`
- `ssn`
- `city`
- `street`
- `state`
- `zipCode`
- `birthday`

`requestedAmount` remains plaintext in this demo.

---

## 2) Blind index creation

For searchable fields (`firstName`, `lastName`, `city`), the app builds many substrings and hashes them:

- `mountSentences(value)` generates all substrings of a value.
- Only substrings with length >= 3 are indexed.
- Each token is hashed with SHA-1 in this format:

`sha1("${propName}-${token}")`

Those hashes are stored in `tBlindIndexes.json` with:

- `keyId` (reference to application `id`)
- `sentence` (token used in this demo)
- `hash` (blind index used for lookup)

> Note: keeping `sentence` plaintext is useful for learning/debug, but not ideal for production.

---

## 3) Search process

At query time:

1. User types e.g. `firstName = Devon`.
2. If encryption mode is on, query value is transformed to:
   `sha1("firstName-Devon")`
3. The search checks `tBlindIndexes.json` for matching hashes.
4. Matching `keyId`s identify candidate records in `tApplications.json`.
5. Only matched records are decrypted and returned.

This allows searching encrypted records without scanning/decrypting all data fields.

<img width="1221" height="629" alt="image" src="https://github.com/user-attachments/assets/ed2ef223-876d-4152-bdcf-197585a994ac" />

**Plaint Text Search**
<img width="951" height="372" alt="image" src="https://github.com/user-attachments/assets/8cf6be5c-a1d9-4a08-8d47-b0dd6d90f858" />

**Encrypted Search**
<img width="1108" height="375" alt="image" src="https://github.com/user-attachments/assets/3577c29c-ddcb-49dc-bfa3-d6c4833a25e7" />


---

## Run

Install dependencies:

```bash
npm install
```

### Plain mode (no encryption)

```bash
npm run plain
```

### Encrypted + blind-index mode

```bash
npm run cryp
```

Current scripts in `package.json`:

- `plain`: `node npiEncryption --false --true`
- `cryp`: `node npiEncryption --true --true`

---

## Example

If borrower first name is `Devon`, indexes include hashes for tokens like:

- `Dev`
- `Devo`
- `Devon`
- (plus lowercase variants generated by code)

Searching for a token works by hashing it the same way and matching hash values, not plaintext.

---

## Important limitations in this demo

This repository is a **concept demo**, not production crypto.

1. **Static secret in source code**  
   AES key is hardcoded.

2. **SHA-1 for indexing**  
   SHA-1 is legacy and not recommended for new secure designs.

3. **No keyed hash for blind index**  
   Blind indexes should typically use HMAC or KDF-based approach with a secret pepper.

4. **Plaintext tokens stored in index file**  
   `sentence` should not be stored in plaintext in production.

5. **Large substring index growth**  
   Substring indexing can grow quickly and leak search patterns/frequency.

6. **No normalization strategy**  
   Case/whitespace/diacritics normalization is minimal.

---

## Production hardening ideas

- Use vetted crypto primitives/libraries (e.g., AES-GCM with random IV).
- Store keys in a KMS/HSM, never in source.
- Use keyed blind indexes (HMAC-SHA-256 or KDF-based).
- Remove plaintext token storage from index.
- Normalize input consistently before indexing/search.
- Define strict searchable fields and minimum token policy.
- Consider leakage trade-offs for prefix/substr search.
- Add key rotation and reindexing strategy.

---

## Files

- `npiEncryption.js`  
  Main encryption, indexing, loading, and search logic.

- `tApplications.json`  
  Borrower records (encrypted in crypto mode).

- `tBlindIndexes.json`  
  Blind index entries linking hashed tokens to borrower IDs.

---
