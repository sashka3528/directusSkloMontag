import { REGEX_BETWEEN_PARENS } from '../constants';
import { Accountability, Filter } from '../types';
import { toArray } from './to-array';
import { adjustDate } from './adjust-date';
import { deepMap } from './deep-map';

export function parseFilter(filter: Filter, accountability: Accountability | null): any {
	return deepMap(filter, applyFilter);

	function applyFilter(val: any, key: string | number) {
		if (val === 'true') return true;
		if (val === 'false') return false;
		if (val === 'null' || val === 'NULL') return null;

		if (['_in', '_nin', '_between', '_nbetween'].includes(String(key))) {
			if (typeof val === 'string' && val.includes(',')) return deepMap(val.split(','), applyFilter);
			else return deepMap(toArray(val), applyFilter);
		}

		if (val && typeof val === 'string' && val.startsWith('$NOW')) {
			if (val.includes('(') && val.includes(')')) {
				const adjustment = val.match(REGEX_BETWEEN_PARENS)?.[1];
				if (!adjustment) return new Date();
				return adjustDate(new Date(), adjustment);
			}

			return new Date();
		}

		if (val === '$CURRENT_USER') return accountability?.user || null;
		if (val === '$CURRENT_ROLE') return accountability?.role || null;

		if (val && typeof val === 'string' && val.startsWith('$CURRENT_USER')) {
			const column = val.split('.');
			if (accountability?.userDynamicVars)
				if (column.length > 1 && accountability?.userDynamicVars) {
					return accountability?.userDynamicVars[String(column[1])] || null;
				}
			return null;
		}

		return val;
	}
}
