// ─────────────────────────────────────────────────────────────────────────────
// lib/pin.js — Hash de PIN para operarios
//
// SHA-256 con sal por usuario. La sal NO es secreta — su propósito es evitar
// rainbow tables comunes (PIN 4 dígitos → 10k combinaciones). Cada operario
// tiene su propia sal generada al crear el usuario (no reusable).
//
// Formato del hash almacenado: "sha256:<saltHex>:<hashHex>"
// - saltHex: 16 bytes en hex (32 chars)
// - hashHex: 32 bytes en hex (64 chars)
//
// Validación: dado un PIN candidato + el string almacenado, recompute el hash
// con la misma sal y compare en tiempo constante.
//
// IMPORTANTE: esto NO es defensa contra atacante con acceso a la DB. Es
// defensa contra leak casual del campo pin_hash. La defensa real sigue
// siendo RLS + Supabase Auth + audit logs.
// ─────────────────────────────────────────────────────────────────────────────

const HASH_PREFIX = "sha256:";

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

async function sha256(saltBytes, pinBytes) {
  const combined = new Uint8Array(saltBytes.length + pinBytes.length);
  combined.set(saltBytes, 0);
  combined.set(pinBytes, saltBytes.length);
  const hash = await crypto.subtle.digest("SHA-256", combined);
  return toHex(hash);
}

function generateSalt(bytes = 16) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return arr;
}

function pinToBytes(pin) {
  return new TextEncoder().encode(String(pin));
}

// Tiempo constante para comparación de strings hex.
function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// API pública

// Genera un hash nuevo para un PIN. Devuelve string "sha256:<salt>:<hash>".
export async function hashPin(pin) {
  if (!pin || typeof pin !== "string" || pin.length === 0) {
    throw new Error("hashPin: PIN vacío o inválido");
  }
  const salt = generateSalt();
  const hash = await sha256(salt, pinToBytes(pin));
  return `${HASH_PREFIX}${toHex(salt)}:${hash}`;
}

// Verifica un PIN contra un hash almacenado. Devuelve true/false.
// Tolerante a formato corrupto: si el string no tiene la forma esperada, false.
export async function verifyPin(pin, storedHash) {
  if (!pin || !storedHash || typeof storedHash !== "string") return false;
  if (!storedHash.startsWith(HASH_PREFIX)) return false;
  const parts = storedHash.slice(HASH_PREFIX.length).split(":");
  if (parts.length !== 2) return false;
  const [saltHex, expectedHashHex] = parts;
  if (!/^[0-9a-f]+$/i.test(saltHex) || !/^[0-9a-f]+$/i.test(expectedHashHex)) return false;
  const saltBytes = fromHex(saltHex);
  const candidateHash = await sha256(saltBytes, pinToBytes(pin));
  return constantTimeEqual(candidateHash, expectedHashHex.toLowerCase());
}
