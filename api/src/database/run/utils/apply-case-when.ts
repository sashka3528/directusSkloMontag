import type { Filter, SchemaOverview } from '@directus/types';
import type { Knex } from 'knex';
import { applyFilter } from '../../../utils/apply-query.js';
import type { AliasMap } from '../../../utils/get-column-path.js';

export interface ApplyCaseWhenOptions {
	column: Knex.Raw;
	columnCases: Filter[];
	table: string;
	cases: Filter[];
	aliasMap: AliasMap;
	alias: string;
}

export interface ApplyCaseWhenContext {
	knex: Knex;
	schema: SchemaOverview;
}

export function applyCaseWhen(
	{ columnCases, table, aliasMap, cases, column, alias }: ApplyCaseWhenOptions,
	{ knex, schema }: ApplyCaseWhenContext,
): Knex.Raw {
	const caseQuery = knex.queryBuilder();

	applyFilter(knex, schema, caseQuery, { _or: columnCases }, table, aliasMap, cases);

	const compiler = knex.client.queryCompiler(caseQuery);

	const sqlParts = [];

	for (const statement of compiler.grouped.where) {
		const val = compiler[statement.type](statement);

		if (val) {
			if (sqlParts.length > 0) {
				sqlParts.push(statement.bool);
			}

			sqlParts.push(val);
		}
	}

	const sql = sqlParts.join(' ');
	const bindings = caseQuery.toSQL().bindings;

	return knex.raw(`(CASE WHEN ${sql} THEN ?? ELSE null END) as ??`, [...bindings, column, alias]);
}
