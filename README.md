# LocalCrypto

An offline-capable web application that encrypts files locally using the Web Crypto API and salted PBKDF2 key derivation

---
## Features

### AES-256-GCM Authenticated Encryption

Provides both confidentiality and integrity protection for encrypted files.

### PBKDF2-HMAC-SHA-256 Key Derivation

Derives encryption keys from passwords using a random salt and an adjustable iteration count.

### Fully Client-Side Processing

All encryption and decryption operations run locally in the browser. Works without a network connection after the application has been loaded and cached.

### Self-Decrypting HTML Export

Generates a standalone HTML file containing:

- The encrypted file data
- The required cryptographic metadata
- A local decryption interface

---
## Technical Overview

### Encryption Pipeline

1. Generate a random 32-byte salt.
2. Derive a 256-bit encryption key using PBKDF2-HMAC-SHA-256.
3. Generate a random 12-byte initialization vector.
4. Encrypt the file using AES-256-GCM.
5. Package the ciphertext and metadata into an `.sfz` file or self-decrypting HTML document.

### `.sfz` File Format

LocalCrypto stores encrypted files in a compact custom container format:

```text
Header:
  Magic:      SFZ1
  Version:    2
  KDF:        PBKDF2
  Iterations: N
  Salt:       32 bytes
  IV:         12 bytes

Body:
  AES-256-GCM ciphertext
