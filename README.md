# LocalCrypto 
### Browser-based file encryption — offline, client-side, no upload

LocalCrypto is an offline-capable web application that encrypts files locally using the Web Crypto API and salted PBKDF2 key derivation, with support for self-contained, self-decrypting HTML exports.
---

## Key Characteristics

- **AES-256-GCM authenticated encryption**  
  Ensures both confidentiality and integrity of the encrypted file.

- **PBKDF2-HMAC-SHA-256 key derivation**  
  Adjustable iteration count for different security levels and performance needs.

- **No network dependency**  
  Works fully offline after the page is loaded once.

- **Self-decrypting HTML output**  
  Can generate a single HTML file that contains both the ciphertext and a small decryption interface.  
  User only need a modern browser and the password.

---

## Technical Overview

### File encryption (`.sfz` format)

LocalVault writes encrypted output in a small custom container format:

```text
Header:
  Magic:  SFZ1
  Version: 2
  KDF:     PBKDF2
  Iterations: N (depends on mode)
  Salt:    32 bytes
  IV:      12 bytes

Body:
  AES-256-GCM ciphertext
```
