import { sleep } from '@/utils/sleep';

const TIMEOUT = 500;
const MAX_RETRIES = 60;

/**
 * @param key A string to identify the mutex
 * @param expiresMs An expiry to invalidate the localstorage fallback mutex
 */
export function useMutex(key: string, expiresMs: number) {
	const internalKey = `directus-mutex-${key}`;
	const useWebLock = !!navigator.locks;

	/**
	 * Acquire a mutex to run the callback function
	 *
	 * @param callback A function to run when the mutex is acquired
	 */
	async function acquireMutex(callback: (lock?: Lock | null) => Promise<any>): Promise<any> {
		if (useWebLock) {
			return navigator.locks.request(internalKey, callback);
		}

		// Fall back to localstorage when navigator.locks is not available
		return localStorageLock(callback);
	}

	async function localStorageLock(callback: (lock?: Lock | null) => Promise<any>) {
		let retries = 0;
		let hasAcquiredMutex = false;

		try {
			do {
				// Attempt to prevent concurrent mutex acquiring across browser windows/tabs
				await sleep(Math.random() * TIMEOUT);

				const mutex = localStorage.getItem(internalKey);

				if (!mutex || Number(mutex) < Date.now()) {
					localStorage.setItem(internalKey, String(Date.now() + expiresMs));
					hasAcquiredMutex = true;

					await callback(null);

					break;
				}

				retries += 1;
			} while (retries < MAX_RETRIES);

			if (!hasAcquiredMutex) {
				throw new Error('Failed to acquire mutex');
			}
		} finally {
			if (hasAcquiredMutex) {
				// Release lock
				localStorage.removeItem(internalKey);
			}
		}
	}

	return {
		acquireMutex,
	};
}
