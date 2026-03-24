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

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
/** AES-256 requires a 32-byte key. */
const KEY_BYTES = 32;
/** GCM standard recommends a 96-bit (12-byte) IV. */
const IV_BYTES = 12;

function getKey(): Buffer {
    const keyHex = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
    if (!keyHex) {
        throw new Error('GITHUB_TOKEN_ENCRYPTION_KEY environment variable is not set');
    }
    const key = Buffer.from(keyHex, 'hex');
    if (key.length !== KEY_BYTES) {
        throw new Error(
            `GITHUB_TOKEN_ENCRYPTION_KEY must be a ${KEY_BYTES * 2}-character hex string (got ${keyHex.length} chars)`
        );
    }
    return key;
}

/**
 * Encrypt a plain-text GitHub PAT for storage.
 * Returns a `iv:authTag:ciphertext` hex string.
 */
export function encryptToken(plaintext: string): string {
    const key = getKey();
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
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
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
