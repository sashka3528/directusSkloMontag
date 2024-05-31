import type { Accountability, PermissionsAction } from '@directus/types';
import { uniq } from 'lodash-es';
import { fetchPermissions } from '../../lib/fetch-permissions.js';
import { fetchPolicies } from '../../lib/fetch-policies.js';
import type { Context } from '../../types.js';
import { withCache } from '../../utils/with-cache.js';

export interface FetchAllowedFieldsOptions {
	collection: string;
	action: PermissionsAction;
	accountability: Pick<Accountability, 'user' | 'roles' | 'ip'>;
}

export const fetchAllowedFields = withCache('allowed-fields', _fetchAllowedFields);

/**
 * Look up all fields that are allowed to be used for the given collection and action for the given
 * accountability object
 *
 * Done by looking up all available policies for the current accountability object, and reading all
 * permissions that exist for the collection+action+policy combination
 */
export async function _fetchAllowedFields(
	{ accountability, action, collection }: FetchAllowedFieldsOptions,
	{ knex, schema }: Context,
): Promise<string[]> {
	const policies = await fetchPolicies(accountability, { knex, schema });

	const permissions = await fetchPermissions({ action, collections: [collection], policies }, { knex, schema });

	const allowedFields = [];

	for (const { fields } of permissions) {
		if (!fields) continue;
		allowedFields.push(...fields);
	}

	return uniq(allowedFields);
}
