/**
 * GitHub token encryption/decryption helpers.
 *
 * Personal access tokens supplied by users are stored encrypted at rest in the
 * `profiles.github_token_encrypted` column.  AES-256-GCM is used so that
 * both confidentiality and integrity are guaranteed.
 *
 * Stored format (all parts are hex-encoded, separated by `:`):
 *   `<iv>:<authTag>:<ciphertext>`
 *
 * Required environment variable:
 *   GITHUB_TOKEN_ENCRYPTION_KEY — a 64-character hex string representing a
 *   random 32-byte (256-bit) key.  Generate one with:
 *     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

import {
    createCipheriv,
    createDecipheriv,
    createSecretKey,
    randomBytes,
    type KeyObject,
} from 'crypto';

const ALGORITHM = 'aes-256-gcm';
/** AES-256 requires a 32-byte key. */
const KEY_BYTES = 32;
/** GCM standard recommends a 96-bit (12-byte) IV. */
const IV_BYTES = 12;

function fromHex(value: string): Uint8Array {
    return Uint8Array.from(Buffer.from(value, 'hex'));
}

function toHex(value: Uint8Array): string {
    return Buffer.from(value).toString('hex');
}

function concatBytes(...chunks: Uint8Array[]): Uint8Array {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }

    return result;
}

function toUtf8(value: Uint8Array): string {
    return Buffer.from(value).toString('utf8');
}

function getKey(): KeyObject {
    const keyHex = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
    if (!keyHex) {
        throw new Error('GITHUB_TOKEN_ENCRYPTION_KEY environment variable is not set');
    }
    const keyBytes = fromHex(keyHex);
    if (keyBytes.length !== KEY_BYTES) {
        throw new Error(
            `GITHUB_TOKEN_ENCRYPTION_KEY must be a ${KEY_BYTES * 2}-character hex string (got ${keyHex.length} chars)`
        );
    }
    return createSecretKey(keyBytes);
}

/**
 * Encrypt a plain-text GitHub PAT for storage.
 * Returns a `iv:authTag:ciphertext` hex string.
 */
export function encryptToken(plaintext: string): string {
    const key = getKey();
    const iv = Uint8Array.from(randomBytes(IV_BYTES));
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const ciphertext = concatBytes(
        Uint8Array.from(cipher.update(plaintext, 'utf8')),
        Uint8Array.from(cipher.final())
    );
    const authTag = Uint8Array.from(cipher.getAuthTag());
    return `${toHex(iv)}:${toHex(authTag)}:${toHex(ciphertext)}`;
}

/**
 * Decrypt a `iv:authTag:ciphertext` hex string retrieved from the database.
 * Throws if the format is wrong or authentication fails (tampered data).
 */
export function decryptToken(encrypted: string): string {
    const parts = encrypted.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted token format — expected iv:authTag:ciphertext');
    }
    const [ivHex, authTagHex, ciphertextHex] = parts;
    const key = getKey();
    const iv = fromHex(ivHex);
    const authTag = fromHex(authTagHex);
    const ciphertext = fromHex(ciphertextHex);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return toUtf8(
        concatBytes(
            Uint8Array.from(decipher.update(ciphertext)),
            Uint8Array.from(decipher.final())
        )
    );
}
