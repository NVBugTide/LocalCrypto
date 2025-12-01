const $ = (id) => document.getElementById(id);

const fileInput    = $("file");
const dropzone     = $("drop");
const passInput    = $("pass");
const encBtn       = $("enc");
const decBtn       = $("dec");
const sfxBtn       = $("sfx");
const statusEl     = $("status");
const progressFill = $("fill");
const progressText = $("ptext");
const strengthFill = $("bar");
const strengthText = $("strengthText");
const strengthDetail = $("strengthDetail");
const kdfTimeEl    = $("kdfTime");

let currentFile = null;

const FILE_MAGIC    = ["S", "F", "Z", "1"];
const FILE_VERSION  = 2;
const KDF_ID_PBKDF2 = 0;

const KDF_PRESETS = {
  normal:   { name: "Normal",   iterations: 200_000 },
  strong:   { name: "Strong",   iterations: 800_000 },
  paranoid: { name: "Paranoid", iterations: 2_000_000 },
};

function getSelectedPresetKey() {
  const radios = document.querySelectorAll('input[name="kdf"]');
  for (const r of radios) if (r.checked) return r.value;
  return "strong";
}

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function setProgress(percent, text) {
  if (progressFill) progressFill.style.width = percent + "%";
  if (progressText) progressText.textContent = text || "";
}

function resetProgress() {
  setTimeout(() => {
    if (progressFill) progressFill.style.width = "0%";
    if (progressText) progressText.textContent = "";
  }, 1800);
}

function updateButtons() {
  const hasFile = !!currentFile;
  const hasPassword = !!passInput.value;
  const ready = hasFile && hasPassword;
  if (encBtn) encBtn.disabled = !ready;
  if (decBtn) decBtn.disabled = !ready;
  if (sfxBtn) sfxBtn.disabled = !ready;
}

function formatSeconds(sec) {
  if (sec < 0.01) return "< 0.01 s";
  if (sec < 1) return sec.toFixed(2) + " s";
  if (sec < 10) return sec.toFixed(2) + " s";
  return sec.toFixed(1) + " s";
}

function updateKdfTime(seconds, iterations) {
  if (!kdfTimeEl) return;
  kdfTimeEl.textContent =
    "Last PBKDF2 run: " +
    formatSeconds(seconds) +
    " · " +
    iterations.toLocaleString() +
    " iterations";
}

if (fileInput) {
  fileInput.addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (!f) return;
    loadFile(f);
  });
}

if (dropzone) {
  dropzone.addEventListener("click", () => fileInput && fileInput.click());

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (!f) return;
    loadFile(f);
  });
}

function loadFile(f) {
  currentFile = f;
  setStatus(
    `Loaded: ${f.name} (${(f.size / 1048576).toFixed(2)} MB)`
  );
  updateButtons();
}

function formatCrackTime(seconds) {
  if (!isFinite(seconds) || seconds <= 0) return "< 1 second";
  const minute = 60;
  const hour   = 60 * minute;
  const day    = 24 * hour;
  const year   = 365 * day;

  if (seconds < minute) return seconds.toFixed(1) + " seconds";
  if (seconds < hour)   return (seconds / minute).toFixed(1) + " minutes";
  if (seconds < day)    return (seconds / hour).toFixed(1) + " hours";
  if (seconds < year)   return (seconds / day).toFixed(1) + " days";

  const years = seconds / year;
  if (years < 100)   return years.toFixed(1) + " years";
  if (years < 10000) return (years / 100).toFixed(1) + " centuries";

  return "> 10,000 years";
}

if (passInput) {
  passInput.addEventListener("input", () => {
    const pwd = passInput.value;
    updateButtons();

    if (!pwd) {
      strengthFill.style.width = "0%";
      strengthText.textContent = "Password strength: –";
      strengthDetail.textContent = "";
      return;
    }

    const hasLower  = /[a-z]/.test(pwd);
    const hasUpper  = /[A-Z]/.test(pwd);
    const hasDigit  = /[0-9]/.test(pwd);
    const hasSymbol = /[^A-Za-z0-9]/.test(pwd);
    const variety   = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
    const len       = pwd.length;

    let zScore = 0;
    let detail = "";
    let policyScore = 0;

    if (typeof zxcvbn === "function") {
      const result = zxcvbn(pwd);
      zScore = result.score;

      const guesses = Math.pow(10, result.guesses_log10);
      const singleRate  = 1e10;
      const clusterRate = 1e14;

      const singleSec  = guesses / singleRate;
      const clusterSec = guesses / clusterRate;

      const singleText  = formatCrackTime(singleSec);
      const clusterText = formatCrackTime(clusterSec);

      detail =
        "Single GPU: " + singleText +
        " · Multi-GPU: " + clusterText;
    }

    if (len < 8) {
      policyScore = 0;
    } else if (len < 10) {
      policyScore = (variety >= 3) ? 2 : 1;
    } else if (len < 14) {
      if (variety <= 1) policyScore = 1;
      else if (variety === 2) policyScore = 2;
      else policyScore = 3;
    } else if (len < 18) {
      if (variety <= 1) policyScore = 1;
      else if (variety === 2) policyScore = 3;
      else policyScore = 4;
    } else {
      if (variety <= 1) policyScore = 1;
      else if (variety === 2) policyScore = 3;
      else policyScore = 4;
    }

    const allLower =  hasLower && !hasUpper && !hasDigit && !hasSymbol;
    const allDigit = !hasLower && !hasUpper &&  hasDigit && !hasSymbol;
    if (allLower || allDigit) policyScore = Math.min(policyScore, 1);

    let score = Math.min(zScore, policyScore);
    score = Math.max(0, Math.min(4, score));

    const percentMap = [12, 28, 52, 76, 100];
    const labels     = ["very weak", "weak", "fair", "strong", "very strong"];

    strengthFill.style.width = percentMap[score] + "%";
    strengthText.textContent = "Password strength: " + labels[score];
    strengthDetail.textContent = detail;
  });
}

document.querySelectorAll('input[name="kdf"]').forEach((r) =>
  r.addEventListener("change", () => updateButtons())
);

async function deriveKeyPBKDF2(password, salt, iterations) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
}

function buildAad(version, kdfId) {
  const aad = new Uint8Array(6);
  aad[0] = FILE_MAGIC[0].charCodeAt(0);
  aad[1] = FILE_MAGIC[1].charCodeAt(0);
  aad[2] = FILE_MAGIC[2].charCodeAt(0);
  aad[3] = FILE_MAGIC[3].charCodeAt(0);
  aad[4] = version & 0xff;
  aad[5] = kdfId & 0xff;
  return aad;
}

function toUint8(buf) {
  return new Uint8Array(buf);
}

function toBase64(u8) {
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s);
}

function fromBase64(str) {
  const bin = atob(str);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

// ===== SFZ1 v2 header helpers =====
function buildHeader(version, kdfId, iterations, saltLen, ivLen) {
  const header = new Uint8Array(12);
  header[0] = "S".charCodeAt(0);
  header[1] = "F".charCodeAt(0);
  header[2] = "Z".charCodeAt(0);
  header[3] = "1".charCodeAt(0);
  header[4] = version & 0xff;
  header[5] = kdfId & 0xff;
  const view = new DataView(header.buffer);
  view.setUint32(6, iterations, true);
  header[10] = saltLen;
  header[11] = ivLen;
  return header;
}

function parseHeader(u8) {
  if (u8.length < 12) throw new Error("File too short.");
  if (
    String.fromCharCode(u8[0]) !== "S" ||
    String.fromCharCode(u8[1]) !== "F" ||
    String.fromCharCode(u8[2]) !== "Z" ||
    String.fromCharCode(u8[3]) !== "1"
  ) {
    throw new Error("Not an SFZ1 file.");
  }
  const version = u8[4];
  const kdfId = u8[5];
  if (version !== FILE_VERSION || kdfId !== KDF_ID_PBKDF2) {
    throw new Error("Unsupported SFZ1 version/KDF.");
  }
  const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const iterations = view.getUint32(6, true);
  const saltLen = u8[10];
  const ivLen = u8[11];

  let offset = 12;
  if (u8.length < offset + saltLen + ivLen + 1)
    throw new Error("Corrupted SFZ1 header.");

  const salt = u8.slice(offset, offset + saltLen);
  offset += saltLen;
  const iv = u8.slice(offset, offset + ivLen);
  offset += ivLen;
  const cipher = u8.slice(offset);

  return { version, kdfId, iterations, salt, iv, cipher };
}

function save(data, filename, type) {
  const blob =
    data instanceof Uint8Array
      ? new Blob([data], { type: type || "application/octet-stream" })
      : new Blob([data], { type: type || "text/html" });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function encryptCurrentFile() {
  if (!currentFile) throw new Error("No file selected.");
  const password = passInput.value;
  if (!password) throw new Error("Password required.");

  const presetKey = getSelectedPresetKey();
  const preset = KDF_PRESETS[presetKey];

  const data = toUint8(await currentFile.arrayBuffer());
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const iterations = preset.iterations;
  const version = FILE_VERSION;
  const kdfId = KDF_ID_PBKDF2;

  setProgress(25, "Deriving key…");
  const t0 = performance.now();
  const key = await deriveKeyPBKDF2(password, salt, iterations);
  const t1 = performance.now();
  updateKdfTime((t1 - t0) / 1000, iterations);

  setProgress(60, "Encrypting…");
  const aad = buildAad(version, kdfId);
  const ctBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aad },
    key,
    data
  );
  const cipher = toUint8(ctBuf);

  return { cipher, salt, iv, iterations, version, kdfId };
}

function buildSelfDecryptHtml(
  cipher,
  salt,
  iv,
  iterations,
  version,
  kdfId,
  filename
) {
  const ctB64 = toBase64(cipher);
  const saltB64 = toBase64(salt);
  const ivB64 = toBase64(iv);
  const scriptClose = "</scr" + "ipt>";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Decrypt – ${filename}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{
  font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  background:#020617;
  color:#e5e7eb;
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:18px;
}
.card{
  background:#020617;
  border-radius:12px;
  padding:24px 22px 20px;
  max-width:420px;
  width:100%;
  border:1px solid #1f2937;
  box-shadow:0 20px 45px rgba(15,23,42,.9);
}
h1{
  font-size:1.3rem;
  margin-bottom:6px;
  color:#f9fafb;
}
h1 span{
  display:block;
  margin-top:4px;
  font-size:.8rem;
  color:#9ca3af;
  word-break:break-all;
}
p{
  font-size:.9rem;
  color:#cbd5f5;
  margin-bottom:10px;
}
.meta{
  font-size:.75rem;
  color:#9ca3af;
  margin-top:4px;
}
label{
  display:block;
  font-size:.8rem;
  text-transform:uppercase;
  letter-spacing:.14em;
  margin:10px 0 6px;
  color:#a5b4fc;
}
input[type=password]{
  width:100%;
  border-radius:6px;
  border:1px solid #4b5563;
  background:#020617;
  color:#f9fafb;
  padding:9px 10px;
  margin-bottom:12px;
}
input[type=password]::placeholder{
  color:#6b7280;
}
button{
  width:100%;
  border:none;
  border-radius:999px;
  padding:10px;
  font-size:.9rem;
  font-weight:600;
  letter-spacing:.12em;
  text-transform:uppercase;
  cursor:pointer;
  background:#4f46e5;
  color:#f9fafb;
}
button:disabled{
  opacity:.45;
  cursor:not-allowed;
}
button:not(:disabled):hover{
  background:#4338ca;
}
#msg{
  margin-top:9px;
  font-size:.85rem;
  color:#e5e7eb;
  min-height:1.1em;
}
footer{
  margin-top:12px;
  font-size:.75rem;
  color:#6b7280;
  text-align:left;
}
</style>
</head>
<body>
  <div class="card">
    <h1>Decrypt file<span>${filename}</span></h1>
    <p>This page decrypts the embedded file in your browser using AES-256-GCM and PBKDF2-HMAC-SHA-256.</p>
    <p class="meta">Format: SFZ1 v${version} · PBKDF2 iterations: ${iterations.toLocaleString()}</p>

    <label for="p">Password</label>
    <input id="p" type="password" autocomplete="current-password" placeholder="Enter the encryption password">

    <button id="btn">Decrypt &amp; download</button>
    <p id="msg"></p>

    <footer>LocalVault</footer>
  </div>
<script>
(function(){
  const format = { magic: "SFZ1", version: ${version}, kdfId: ${kdfId}, iterations: ${iterations} };
  const ct = "${ctB64}";
  const salt = "${saltB64}";
  const iv = "${ivB64}";
  const filename = ${JSON.stringify(filename)};

  const $ = id => document.getElementById(id);

  function fromBase64(str){
    const bin = atob(str);
    const u8 = new Uint8Array(bin.length);
    for (let i=0;i<bin.length;i++) u8[i] = bin.charCodeAt(i);
    return u8;
  }

  function buildAad(f){
    const a = new Uint8Array(6);
    a[0] = "S".charCodeAt(0);
    a[1] = "F".charCodeAt(0);
    a[2] = "Z".charCodeAt(0);
    a[3] = "1".charCodeAt(0);
    a[4] = f.version & 0xff;
    a[5] = f.kdfId & 0xff;
    return a;
  }

  async function deriveKey(password,salt,iterations){
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      { name:"PBKDF2", salt, iterations, hash:"SHA-256" },
      baseKey,
      { name:"AES-GCM", length:256 },
      false,
      ["decrypt"]
    );
  }

  async function decryptAndDownload(){
    const password = $("p").value;
    const msgEl = $("msg");
    const btn = $("btn");
    if(!password){
      msgEl.textContent = "Enter a password first.";
      return;
    }
    btn.disabled = true;
    msgEl.textContent = "Decrypting… this may take a moment.";

    try{
      const key = await deriveKey(password, fromBase64(salt), format.iterations);
      const aad = buildAad(format);
      const plaintext = await crypto.subtle.decrypt(
        { name:"AES-GCM", iv: fromBase64(iv), additionalData:aad },
        key,
        fromBase64(ct)
      );
      const blob = new Blob([plaintext]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      msgEl.textContent = "Decryption successful. Download should start.";
    }catch(e){
      console.error(e);
      msgEl.textContent = "Decryption failed. Wrong password or corrupted file.";
    }finally{
      btn.disabled = false;
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    $("btn").addEventListener("click", decryptAndDownload);
    $("p").focus();
  });
})();
${scriptClose}
</script>
</body>
</html>`;
}


if (encBtn) {
  encBtn.addEventListener("click", async () => {
    if (!currentFile || !passInput.value) {
      setStatus("Please load a file and enter a password first.");
      return;
    }

    try {
      setStatus("Encrypting file to .sfz…");
      setProgress(15, "Reading file…");

      const { cipher, salt, iv, iterations, version, kdfId } =
        await encryptCurrentFile();

      const header = buildHeader(
        version,
        kdfId,
        iterations,
        salt.length,
        iv.length
      );

      const out = new Uint8Array(
        header.length + salt.length + iv.length + cipher.length
      );
      let offset = 0;
      out.set(header, offset);
      offset += header.length;
      out.set(salt, offset);
      offset += salt.length;
      out.set(iv, offset);
      offset += iv.length;
      out.set(cipher, offset);

      setProgress(95, "Saving…");
      save(out, currentFile.name + ".sfz", "application/octet-stream");
      setProgress(100, "Done");
      setStatus("Encrypted .sfz file generated.");
    } catch (e) {
      console.error(e);
      setStatus("Encryption failed: " + e.message);
    } finally {
      resetProgress();
    }
  });
}

if (decBtn) {
  decBtn.addEventListener("click", async () => {
    if (!currentFile || !passInput.value) {
      setStatus("Load an .sfz file and enter a password first.");
      return;
    }
    try {
      setStatus("Decrypting .sfz…");
      setProgress(20, "Reading encrypted file…");

      const encData = toUint8(await currentFile.arrayBuffer());
      const parsed = parseHeader(encData);

      setProgress(50, "Deriving key…");
      const t0 = performance.now();
      const key = await deriveKeyPBKDF2(
        passInput.value,
        parsed.salt,
        parsed.iterations
      );
      const t1 = performance.now();
      updateKdfTime((t1 - t0) / 1000, parsed.iterations);

      setProgress(75, "Decrypting…");
      const aad = buildAad(parsed.version, parsed.kdfId);
      const ptBuf = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: parsed.iv, additionalData: aad },
        key,
        parsed.cipher
      );
      const plaintext = toUint8(ptBuf);

      let outName = currentFile.name.replace(/\.sfz$/i, "");
      if (!outName) outName = "decrypted.bin";

      save(plaintext, outName, "application/octet-stream");
      setProgress(100, "Done");
      setStatus("Decryption successful. File downloaded.");
    } catch (e) {
      console.error(e);
      setStatus("Decryption failed: " + e.message);
    } finally {
      resetProgress();
    }
  });
}

if (sfxBtn) {
  sfxBtn.addEventListener("click", async () => {
    if (!currentFile || !passInput.value) {
      setStatus("Please load a file and enter a password first.");
      return;
    }
    try {
      setStatus("Generating self-decrypting HTML…");
      setProgress(15, "Encrypting…");

      const { cipher, salt, iv, iterations, version, kdfId } =
        await encryptCurrentFile();

      setProgress(80, "Building HTML…");
      const html = buildSelfDecryptHtml(
        cipher,
        salt,
        iv,
        iterations,
        version,
        kdfId,
        currentFile.name
      );

      save(html, currentFile.name + ".decrypt.html", "text/html");
      setProgress(100, "Done");
      setStatus("Self-decrypting HTML file generated.");
    } catch (e) {
      console.error(e);
      setStatus("Failed to generate HTML: " + e.message);
    } finally {
      resetProgress();
    }
  });
}

setStatus("LocalVault ready");
setProgress(0, "");
updateButtons();
