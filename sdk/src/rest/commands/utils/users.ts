import type { RestCommand } from '../../types.js';

/**
 * Invite a new user by email.
 *
 * @param email User email to invite.
 * @param role Role of the new user.
 * @param invite_url Provide a custom invite url which the link in the email will lead to. The invite token will be passed as a parameter.
 *
 * @returns Nothing
 */
export const inviteUser =
	<Schema>(email: string, role: string, invite_url?: string): RestCommand<void, Schema> =>
	() => ({
		path: `/users/invite`,
		method: 'POST',
		body: JSON.stringify({
			email,
			role,
			...(invite_url ? { invite_url } : {}),
		}),
	});

/**
 * Accept your invite. The invite user endpoint sends the email a link to the Admin App.
 *
 * @param token Accept invite token.
 * @param password Password for the user.
 *
 * @returns Nothing
 */
export const acceptUserInvite =
	<Schema>(token: string, password: string): RestCommand<void, Schema> =>
	() => ({
		path: `/users/invite/accept`,
		method: 'POST',
		body: JSON.stringify({
			token,
			password,
		}),
	});

/**
 * Register a new user.
 *
 * @param email The new user email.
 * @param password The new user password.
 * @param options Optional registration fields.
 *
 * @returns Nothing
 */
export const registerUser =
	<Schema>(
		email: string,
		password: string,
		options: { verification_url?: string; first_name?: string; last_name?: string } = {},
	): RestCommand<void, Schema> =>
	() => ({
		path: `/users/register`,
		method: 'POST',
		body: JSON.stringify({
			email,
			password,
			...options,
		}),
	});

/**
 * Verify a registered user email using a token sent to the address.
 *
 * @param token Accept registration token.
 *
 * @returns Nothing
 */
export const registerUserVerify =
	<Schema>(token: string): RestCommand<void, Schema> =>
	() => ({
		path: `/register/verify-email`,
		params: { token },
		method: 'GET',
	});

/**
 * Generates a secret and returns the URL to be used in an authenticator app.
 *
 * @param password The user's password.
 *
 * @returns A two-factor secret
 */
export const generateTwoFactorSecret =
	<Schema>(password: string): RestCommand<{ secret: string; otpauth_url: string }, Schema> =>
	() => ({
		path: `/users/me/tfa/generate`,
		method: 'POST',
		body: JSON.stringify({
			password,
		}),
	});

/**
 * Adds a TFA secret to the user account.
 *
 * @param secret The TFA secret from tfa/generate.
 * @param otp OTP generated with the secret, to recheck if the user has a correct TFA setup
 *
 * @returns Nothing
 */
export const enableTwoFactor =
	<Schema>(secret: string, otp: string): RestCommand<void, Schema> =>
	() => ({
		path: `/users/me/tfa/enable`,
		method: 'POST',
		body: JSON.stringify({
			secret,
			otp,
		}),
	});

/**
 * Disables two-factor authentication by removing the OTP secret from the user.
 *
 * @param otp One-time password generated by the authenticator app.
 *
 * @returns Nothing
 */
export const disableTwoFactor =
	<Schema>(otp: string): RestCommand<void, Schema> =>
	() => ({
		path: `/users/me/tfa/disable`,
		method: 'POST',
		body: JSON.stringify({ otp }),
	});
