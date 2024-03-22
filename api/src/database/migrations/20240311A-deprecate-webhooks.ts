import { randomUUID } from '@directus/random';
import { parseJSON, toArray } from '@directus/utils';
import type { Knex } from 'knex';
import type { Webhook } from '../../types/webhooks.js';

// To avoid typos
const TABLE_WEBHOOKS = 'directus_webhooks';
const TABLE_FLOWS = 'directus_flows';
const TABLE_OPERATIONS = 'directus_operations';
const NEW_COLUMN_WAS_ACTIVE = 'was_active_before_deprecation';
const NEW_COLUMN_FLOW = 'migrated_flow';

/**
 * 0. Identify and persist which webhooks were active before deprecation
 * 1. Migrate existing webhooks over to identically behaving Flows
 * 2. Disable existing webhooks
 * 3. Dont drop webhooks yet
 */
export async function up(knex: Knex): Promise<void> {
	// 0. Identify and persist which webhooks were active before deprecation
	await knex.schema.alterTable(TABLE_WEBHOOKS, (table) => {
		table.boolean(NEW_COLUMN_WAS_ACTIVE).notNullable().defaultTo(false);
		table.uuid(NEW_COLUMN_FLOW).nullable();
		table.foreign(NEW_COLUMN_FLOW).references(`${TABLE_FLOWS}.id`).onDelete('SET NULL');
	});

	await knex(TABLE_WEBHOOKS)
		.update({ [NEW_COLUMN_WAS_ACTIVE]: true })
		.where({ status: 'active' });

	const webhooks: Webhook[] = await knex.select('*').from(TABLE_WEBHOOKS);

	// 1. Migrate existing webhooks over to identically behaving Flows
	await knex.transaction(async (trx) => {
		for (const webhook of webhooks) {
			const flowId = randomUUID();
			const operationIdRunScript = randomUUID();
			const operationIdWebhook = randomUUID();

			const newFlow = {
				id: flowId,
				name: webhook.name,
				icon: 'webhook',
				// color: null,
				description:
					'Auto-generated by Directus Migration\n\nWebhook were deprecated and have been moved into Flows for you automatically.',
				status: webhook.status, // Only activate already active webhooks!
				trigger: 'event',
				// accountability: "all",
				options: {
					type: 'action',
					scope: toArray(webhook.actions).map((scope) => `items.${scope}`),
					collections: toArray(webhook.collections),
				},
				operation: null, // Fill this in later --> `operationIdRunScript`
				// date_created: Default Date,
				// user_created: null,
			};

			const operationRunScript = {
				id: operationIdRunScript,
				name: 'Transforming Payload for Webhook',
				key: 'payload-transform',
				type: 'exec',
				position_x: 19,
				position_y: 1,
				options: {
					code: '/**\n * Webhook data slightly differs from Flow trigger data.\n * This flow converts the new Flow format into the older Webhook shape\n * in order to not break existing logic of consumers.\n */ \nmodule.exports = async function(data) {\n    const crudOperation = data.$trigger.event.split(".").at(-1);\n    const keyOrKeys = crudOperation === "create" ? "key" : "keys";\n    return {\n        event: `items.${crudOperation}`,\n        accountability: { user: data.$accountability.user, role: data.$accountability.role },\n        payload: data.$trigger.payload,\n        [keyOrKeys]: data.$trigger?.[keyOrKeys],\n        collection: data.$trigger.collection,\n    };\n}',
				},
				resolve: operationIdWebhook,
				reject: null,
				flow: flowId,
				// date_created: "",
				// user_created: "",
			};

			const operationWebhook = {
				id: operationIdWebhook,
				name: 'Webhook',
				key: 'webhook',
				type: 'request',
				position_x: 37,
				position_y: 1,
				options: {
					url: webhook.url,
					body: webhook.data ? '{{$last}}' : undefined,
					method: webhook.method,
					headers: typeof webhook.headers === 'string' ? parseJSON(webhook.headers) : webhook.headers,
				},
				resolve: null,
				reject: null,
				flow: flowId,
				// date_created: "",
				// user_created: "",
			};

			await trx(TABLE_FLOWS).insert(newFlow);

			// Order is important due to IDs
			await trx(TABLE_OPERATIONS).insert(operationWebhook);
			await trx(TABLE_OPERATIONS).insert(operationRunScript);

			await trx(TABLE_FLOWS).update({ operation: operationIdRunScript }).where({ id: flowId });

			// Persist new Flow/s so that we can retroactively disable them on potential down-migrations
			await trx(TABLE_WEBHOOKS)
				.update({ [NEW_COLUMN_FLOW]: flowId })
				.where({ id: webhook.id });

			// 2. Disable existing webhooks
			await trx(TABLE_WEBHOOKS).update({ status: 'inactive' });
		}
	});
}

/**
 * Dont completely drop Webhooks yet.
 * Lets preserve the data and drop them in the next release to be extra safe with users data.
 */
export async function down(knex: Knex): Promise<void> {
	// Set existing migrated flows to inactive
	// Note: Here we assume that they have not been expanded upon i.e. only disable not delete just in case
	const migratedFlowIds = (await knex(TABLE_WEBHOOKS).select(NEW_COLUMN_FLOW).whereNotNull(NEW_COLUMN_FLOW)).map(
		(col) => col[NEW_COLUMN_FLOW],
	);

	await knex(TABLE_FLOWS).update({ status: 'inactive' }).whereIn('id', migratedFlowIds);

	// Restore previously activated webhooks
	await knex(TABLE_WEBHOOKS)
		.update({ status: 'active' })
		.where({ [NEW_COLUMN_WAS_ACTIVE]: true });

	// Cleanup of up-migration
	await knex.schema.alterTable(TABLE_WEBHOOKS, (table) => {
		table.dropColumns(NEW_COLUMN_WAS_ACTIVE, NEW_COLUMN_FLOW);
	});
}
