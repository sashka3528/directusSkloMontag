/**
 * The driver for PostgreSQL which can be registered by using @directus/data.
 *
 * @packageDocumentation
 */
import type { AbstractQuery, DataDriver } from '@directus/data';
import {
	convertQuery,
	getExpander,
	makeSubQueriesAndMergeWithRoot,
	type AbstractSqlQuery,
	type ParameterizedSqlStatement,
} from '@directus/data-sql';
import { ReadableStream } from 'node:stream/web';
import type { PoolClient } from 'pg';
import pg from 'pg';
import { convertToActualStatement } from './query/index.js';
import QueryStream from 'pg-query-stream';
import { Readable } from 'node:stream';
import { convertParameters } from './query/parameters.js';

export interface DataDriverPostgresConfig {
	connectionString: string;
}

export default class DataDriverPostgres implements DataDriver {
	#config: DataDriverPostgresConfig;
	#pool: pg.Pool;

	constructor(config: DataDriverPostgresConfig) {
		this.#config = config;

		this.#pool = new pg.Pool({
			connectionString: this.#config.connectionString,
		});
	}

	async destroy() {
		await this.#pool.end();
	}

	/**
	 * Opens a stream for the given SQL statement.
	 *
	 * @param pool the PostgreSQL client pool
	 * @param sql A parameterized SQL statement
	 * @returns A readable web stream for the query results
	 * @throw An error when the query cannot be performed
	 */
	async getDataFromSource(
		pool: pg.Pool,
		sql: ParameterizedSqlStatement
	): Promise<ReadableStream<Record<string, any>>> | never {
		try {
			const poolClient: PoolClient = await pool.connect();
			const queryStream = new QueryStream(sql.statement, sql.parameters);
			const stream = poolClient.query(queryStream);
			stream.on('end', () => poolClient.release());
			stream.on('error', () => poolClient.release());
			return Readable.toWeb(stream);
		} catch (error: any) {
			throw new Error('Failed to query the database: ', error);
		}
	}

	/**
	 * Converts the abstract query into PostgreSQL and executes it.
	 *
	 * @param abstractSql The abstract query
	 * @returns The database results converted to a nested object
	 * @throws An error when the conversion or the database request fails
	 */
	private async queryDatabase(abstractSql: AbstractSqlQuery): Promise<ReadableStream<Record<string, any>>> {
		let statement;
		let parameters;

		try {
			statement = convertToActualStatement(abstractSql.clauses);
			parameters = convertParameters(abstractSql.parameters);
		} catch (error: any) {
			throw new Error('Failed to convert the query the database: ', error);
		}

		const stream = await this.getDataFromSource(this.#pool, { statement, parameters });

		try {
			const ormExpander = getExpander(abstractSql.aliasMapping);
			return stream.pipeThrough(ormExpander);
		} catch (error: any) {
			throw new Error('Failed to expand the database result: ', error);
		}
	}

	async query(query: AbstractQuery): Promise<ReadableStream<Record<string, any>>> {
		const abstractSql = convertQuery(query);
		const queryDB = this.queryDatabase.bind(this);
		const rootStream = await queryDB(abstractSql);

		if (abstractSql.nestedManys.length === 0) {
			return rootStream;
		}

		return await makeSubQueriesAndMergeWithRoot(rootStream, abstractSql.nestedManys, queryDB);
	}
}
