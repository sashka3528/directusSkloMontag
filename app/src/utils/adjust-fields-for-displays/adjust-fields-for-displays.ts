import { getDisplay } from '@/displays';
import { useFieldsStore } from '@/stores/';
import { Field } from '@directus/shared/types';

export default function adjustFieldsForDisplays(fields: readonly string[], parentCollection: string): string[] {
	const fieldsStore = useFieldsStore();

	const adjustedFields: string[] = fields
		.map((fieldKey) => {
			const field: Field | null = fieldsStore.getField(parentCollection, fieldKey);

			if (!field) return fieldKey;
			if (field.meta?.display === null) return fieldKey;

			const display = getDisplay(field.meta?.display);

			if (!display) return fieldKey;
			if (!display?.fields) return fieldKey;

			let fieldKeys: string[] | null = null;

			if (Array.isArray(display.fields)) {
				fieldKeys = display.fields;
			}

			if (typeof display.fields === 'function') {
				fieldKeys = display.fields(field.meta?.display_options, {
					collection: field.collection,
					field: field.field,
					type: field.type,
				});
			}

			if (Array.isArray(fieldKeys)) {
				return fieldKeys.map((relatedFieldKey) => {
					/**
					 * Prefix relation fields except functions
					 */
					const key: string = relatedFieldKey.includes('(')
						? relatedFieldKey.replaceAll('()', `(${fieldKey})`)
						: `${fieldKey}.${relatedFieldKey}`;

					/**
					 * This is for the special case where you want to show a thumbnail in a relation to
					 * directus_files. The thumbnail itself isn't a real field, but shows the thumbnail based
					 * on the other available fields (like ID, title, and type).
					 */
					if (key.includes('$thumbnail') && field.collection === 'directus_files') {
						return key
							.split('.')
							.filter((part) => part !== '$thumbnail')
							.join('.');
					}

					return key;
				});
			}

			return fieldKey;
		})
		.flat();

	return adjustedFields;
}
