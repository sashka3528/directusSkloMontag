/**
 * Used to compare a number or date time field with a number value.
 * @example
 * ```
 * {
 * 	type: 'condition-number',
 * 	target: {
 * 		type: 'primitive',
 * 		field: 'attribute_xy'
 * 	},
 * 	operation: 'lt',
 * 	compareTo: 5
 * ```
 */
export interface ConditionNumberNode<Target> {
	type: 'condition-number';
	target: Target;
	operation: 'eq' | 'lt' | 'lte' | 'gt' | 'gte';
	compareTo: number;
}
