import ky from 'ky';
import { assertApiVersion } from '../../utils/assert-api-version.js';
import { constructUrl } from './lib/construct-url.js';
import { RegistryListResponse } from './schemas/registry-list-response.js';
import type { ListOptions } from './types/list-options.js';
import type { ListQuery } from './types/list-query.js';

export const list = async (query: ListQuery, options?: ListOptions) => {
	await assertApiVersion(options);
	const url = constructUrl(query, options);
	const response = await ky.get(url).json();
	return await RegistryListResponse.parseAsync(response);
};
