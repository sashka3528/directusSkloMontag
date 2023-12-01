import type {
	GeoJSONGeometryCollection,
	GeoJSONLineString,
	GeoJSONMultiLineString,
	GeoJSONMultiPoint,
	GeoJSONPoint,
} from 'wellknown';

/**
 * Checks if a non box geo object intersects with another.
 * @example
 * ```
 * {
 * 	type: 'condition-geo',
 * 	target: {
 * 		type: 'primitive',
 * 		field: 'attribute_xy'
 * 	},
 * 	operation: 'intersects',
 * 	compareTo: {
 * 		"type": "Feature",
 * 		"geometry": {
 *   		"type": "Point",
 *   		"coordinates": [125.6, 10.1]
 * 		},
 *		"properties": {
 *   	"name": "Dinagat Islands"
 * 	}
 * }
 * ```
 */
export interface ConditionGeoIntersectsNode<Target> {
	type: 'condition-geo-intersects';
	target: Target /** the type of the field needs to be a 'geometry' object */;
	operation: 'intersects';
	compareTo: GeoJSONPoint | GeoJSONMultiPoint | GeoJSONLineString | GeoJSONMultiLineString | GeoJSONGeometryCollection;
}
