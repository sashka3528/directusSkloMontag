import { isIn } from '@directus/utils';
import { ENV_TYPES } from '../constants/env-types.js';

export const getCastFlag = (value: unknown) => {
	if (typeof value !== 'string') return null;

	if (value.includes(':') === null) return null;

	const castPrefix = value.split(':')[0]!;

	if(isIn(castPrefix, ENV_TYPES) === false) return null;

	return castPrefix;
};
