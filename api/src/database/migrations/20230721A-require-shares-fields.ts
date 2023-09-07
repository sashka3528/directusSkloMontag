import { createInspector } from '@directus/schema';
import type { Knex } from 'knex';
import logger from '../../logger.js';

export async function up(knex: Knex): Promise<void> {
	await dropConstraint(knex);

	await knex.schema.alterTable('directus_shares', (table) => {
		table.dropNullable('collection');
		table.dropNullable('item');
	});

	await recreateConstraint(knex);
}

export async function down(knex: Knex): Promise<void> {
	await dropConstraint(knex);

	await knex.schema.alterTable('directus_shares', (table) => {
		table.setNullable('collection');
		table.setNullable('item');
	});

	await recreateConstraint(knex);
}

/**
 * Temporary drop foreign key constraint for MySQL instances, see https://github.com/directus/directus/issues/19399
 */
async function dropConstraint(knex: Knex) {
	if (knex.client.constructor.name === 'Client_MySQL') {
		const inspector = createInspector(knex);

		const foreignKeys = await inspector.foreignKeys('directus_shares');
		const collectionForeignKeys = foreignKeys.filter((fk) => fk.column === 'collection');
		const constraintName = collectionForeignKeys[0]?.constraint_name;

		if (constraintName && collectionForeignKeys.length === 1) {
			await knex.schema.alterTable('directus_shares', (table) => {
				table.dropForeign('collection', constraintName);
			});
		} else {
			logger.warn(
				`Unexpected number of foreign key constraints on 'directus_shares.collection':`,
				collectionForeignKeys
			);
		}
	}
}

/**
 * Recreate foreign key constraint for MySQL instances, from 20211211A-add-shares.ts
 */
async function recreateConstraint(knex: Knex) {
	if (knex.client.constructor.name === 'Client_MySQL') {
		return knex.schema.alterTable('directus_shares', async (table) => {
			if (knex.client.constructor.name === 'Client_MySQL') {
				table.foreign('collection').references('directus_collections.collection').onDelete('CASCADE');
			}
		});
	}
}
