import type { Redis } from 'ioredis';

export interface BusConfigAbstract {
	/**
	 * Where the messages are sent through
	 *
	 * `local` - Local memory. Only intended for single-process instances.
	 * `redis` - Redis instance
	 */
	type: 'local' | 'redis';
}

export interface BusConfigLocal extends BusConfigAbstract {
	type: 'local';
}

export interface BusConfigRedis extends BusConfigAbstract {
	type: 'redis';

	/**
	 * Used to prefix the keys in Redis
	 */
	namespace: string;

	/**
	 * Enable Gzip compression
	 *
	 * @default true
	 */
	compression?: boolean;

	/**
	 * Existing or new Redis connection to use with this memory class
	 */
	redis: Redis;
}

export type BusConfig = BusConfigLocal | BusConfigRedis;
