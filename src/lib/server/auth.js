import {
	createHmac,
	randomBytes,
	scryptSync,
	timingSafeEqual
} from 'node:crypto';
import { env } from '$env/dynamic/private';

const COOKIE_NAME = 'gym_session';
const SESSION_SECONDS = 60 * 60 * 24 * 90;

function secret() {
	if (!env.GYM_SESSION_SECRET) throw new Error('GYM_SESSION_SECRET is not configured');
	return env.GYM_SESSION_SECRET;
}

function signature(payload) {
	return createHmac('sha256', secret()).update(payload).digest('base64url');
}

function equalText(left, right) {
	const a = Buffer.from(left);
	const b = Buffer.from(right);
	return a.length === b.length && timingSafeEqual(a, b);
}

export function createPasswordHash(password) {
	const salt = randomBytes(16).toString('hex');
	const hash = scryptSync(password, salt, 64).toString('hex');
	return { salt, hash };
}

export function verifyPassword(password, salt, expectedHash) {
	if (!salt || !expectedHash) return false;
	const actualHash = scryptSync(password, salt, 64).toString('hex');
	return equalText(actualHash, expectedHash);
}

export function setSessionCookie(cookies) {
	const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
	const payload = Buffer.from(JSON.stringify({ exp: expiresAt })).toString('base64url');
	const token = `${payload}.${signature(payload)}`;
	cookies.set(COOKIE_NAME, token, {
		path: '/',
		httpOnly: true,
		secure: env.NODE_ENV === 'production',
		sameSite: 'strict',
		maxAge: SESSION_SECONDS
	});
}

export function clearSessionCookie(cookies) {
	cookies.delete(COOKIE_NAME, { path: '/' });
}

export function isAuthenticated(cookies) {
	try {
		const token = cookies.get(COOKIE_NAME);
		if (!token) return false;
		const [payload, suppliedSignature] = token.split('.');
		if (!payload || !suppliedSignature || !equalText(signature(payload), suppliedSignature)) {
			return false;
		}
		const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
		return Number(parsed.exp) > Math.floor(Date.now() / 1000);
	} catch {
		return false;
	}
}
