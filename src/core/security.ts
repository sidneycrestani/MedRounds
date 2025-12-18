// src/core/security.ts
import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

/**
 * Encripta uma string usando AES-256-GCM com uma chave mestre e contexto do usuário.
 */
export function encryptKey(
	text: string,
	userId: string,
	masterKey: string,
): string {
	const iv = crypto.randomBytes(IV_LENGTH);
	const salt = crypto.scryptSync(masterKey, userId, SALT_LENGTH);

	const cipher = crypto.createCipheriv(ALGORITHM, salt.subarray(0, 32), iv);

	const encrypted = Buffer.concat([
		cipher.update(text, "utf8"),
		cipher.final(),
	]);
	const tag = cipher.getAuthTag();

	// Retorna IV + Tag + Texto Encriptado em Base64
	return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/**
 * Nota: Implementamos o decrypt apenas para uso interno das Edge Functions no futuro,
 * mas nunca o expomos na API de Settings.
 */
