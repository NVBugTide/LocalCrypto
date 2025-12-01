# LocalVault  
### Browser-based file encryption — offline, client-side, no upload

LocalVault is a lightweight, browser-based encryption tool for securely protecting files using modern, authenticated cryptography. All operations are performed locally inside the user’s web browser, with no server communication and no data transmission outside the device.

---

## 🔐 Key Characteristics

- **AES-256-GCM authenticated encryption**  
  Ensures both confidentiality and integrity of the encrypted file.

- **PBKDF2-HMAC-SHA-256 key derivation**  
  Adjustable iteration count for different security levels and performance needs.

- **No network dependency**  
  Works fully offline after the page is loaded once.

- **No file upload**  
  Everything is on local machine without server interruption

- **Self-decrypting HTML output**  
  Can generate a single HTML file that contains both the ciphertext and a small decryption interface.  
  User only need a modern browser and the password.

- **Editable source code**  
  Plain HTML, CSS, and JavaScript — no frameworks, no obfuscation, no backend.

---

## 🧠 Technical Overview

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
NVBubbleTide - PRISE 2024
