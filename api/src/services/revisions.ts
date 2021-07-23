import { InvalidPayloadException } from '@directus/shared/exceptions';
import { ForbiddenException } from '../exceptions';
import { AbstractServiceOptions, PrimaryKey } from '../types';
import { ItemsService } from './items';

export class RevisionsService extends ItemsService {
	constructor(options: AbstractServiceOptions) {
		super('directus_revisions', options);
	}

	async revert(pk: PrimaryKey): Promise<void> {
		const revision = await super.readOne(pk);

		if (!revision) throw new ForbiddenException();

		if (!revision.data) throw new InvalidPayloadException(`Revision doesn't contain data to revert to`);

		const service = new ItemsService(revision.collection, {
			accountability: this.accountability,
			knex: this.knex,
			schema: this.schema,
		});

		await service.updateOne(revision.item, revision.data);
	}
}
