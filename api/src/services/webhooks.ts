import { AbstractServiceOptions } from '@directus/shared/services';
import { Item, PrimaryKey, Webhook, MutationOptions } from '@directus/shared/types';
import { ItemsService } from './items';
import { getMessenger, Messenger } from '../messenger';

export class WebhooksService extends ItemsService<Webhook> {
	messenger: Messenger;

	constructor(options: AbstractServiceOptions) {
		super('directus_webhooks', options);
		this.messenger = getMessenger();
	}

	async createOne(data: Partial<Item>, opts?: MutationOptions): Promise<PrimaryKey> {
		const result = await super.createOne(data, opts);
		this.messenger.publish('webhooks', { type: 'reload' });
		return result;
	}

	async createMany(data: Partial<Item>[], opts?: MutationOptions): Promise<PrimaryKey[]> {
		const result = await super.createMany(data, opts);
		this.messenger.publish('webhooks', { type: 'reload' });
		return result;
	}

	async updateOne(key: PrimaryKey, data: Partial<Item>, opts?: MutationOptions): Promise<PrimaryKey> {
		const result = await super.updateOne(key, data, opts);
		this.messenger.publish('webhooks', { type: 'reload' });
		return result;
	}

	async updateMany(keys: PrimaryKey[], data: Partial<Item>, opts?: MutationOptions): Promise<PrimaryKey[]> {
		const result = await super.updateMany(keys, data, opts);
		this.messenger.publish('webhooks', { type: 'reload' });
		return result;
	}

	async deleteOne(key: PrimaryKey, opts?: MutationOptions): Promise<PrimaryKey> {
		const result = await super.deleteOne(key, opts);
		this.messenger.publish('webhooks', { type: 'reload' });
		return result;
	}

	async deleteMany(keys: PrimaryKey[], opts?: MutationOptions): Promise<PrimaryKey[]> {
		const result = await super.deleteMany(keys, opts);
		this.messenger.publish('webhooks', { type: 'reload' });
		return result;
	}
}
