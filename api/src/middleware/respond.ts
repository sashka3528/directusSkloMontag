import { RequestHandler } from 'express';
import asyncHandler from '../utils/async-handler';
import env from '../env';
import { getCacheKey } from '../utils/get-cache-key';
import cache, { getCache } from '../cache';
import { Transform, transforms } from 'json2csv';
import { PassThrough } from 'stream';
import ms from 'ms';
import { parse as toXML } from 'js2xmlparser';
import { getCacheControlHeader } from '../utils/get-cache-headers';

export const respond: RequestHandler = asyncHandler(async (req, res) => {
	const { cache } = getCache();

	if (
		req.method.toLowerCase() === 'get' &&
		env.CACHE_ENABLED === true &&
		cache &&
		!req.sanitizedQuery.export &&
		res.locals.cache !== false
	) {
		const key = getCacheKey(req);
		await cache.set(key, res.locals.payload, ms(env.CACHE_TTL as string));
		await cache.set(`${key}__expires_at`, Date.now() + ms(env.CACHE_TTL as string));
		res.setHeader('Cache-Control', getCacheControlHeader(req, ms(env.CACHE_TTL as string)));
		res.setHeader('Vary', 'Origin, Cache-Control');
	} else {
		// Don't cache anything by default
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Vary', 'Origin, Cache-Control');
	}

	if (req.sanitizedQuery.export) {
		let filename = '';

		if (req.collection) {
			filename += req.collection;
		} else {
			filename += 'Export';
		}

		filename += ' ' + getDateFormatted();

		if (req.sanitizedQuery.export === 'json') {
			res.attachment(`${filename}.json`);
			res.set('Content-Type', 'application/json');
			return res.status(200).send(JSON.stringify(res.locals.payload?.data || null, null, '\t'));
		}

		if (req.sanitizedQuery.export === 'xml') {
			res.attachment(`${filename}.xml`);
			res.set('Content-Type', 'text/xml');
			return res.status(200).send(toXML('data', res.locals.payload?.data));
		}

		if (req.sanitizedQuery.export === 'csv') {
			res.attachment(`${filename}.csv`);
			res.set('Content-Type', 'text/csv');
			const stream = new PassThrough();

			if (!res.locals.payload?.data || res.locals.payload.data.length === 0) {
				stream.end(Buffer.from(''));
				return stream.pipe(res);
			} else {
				stream.end(Buffer.from(JSON.stringify(res.locals.payload.data), 'utf-8'));
				const json2csv = new Transform({
					transforms: [transforms.flatten({ separator: '.' })],
				});
				return stream.pipe(json2csv).pipe(res);
			}
		}
		if (['xliff', 'xliff2'].includes(req.sanitizedQuery.export)) {
			res.attachment(`${filename}.xlf`);
			res.set('Content-Type', 'text/xml');
			const xliffService = new XliffService({
				language: req.sanitizedQuery.optional?.language,
				format: req.sanitizedQuery.export,
				accountability: req.accountability,
				schema: req.schema,
			});
			const output = await xliffService.toXliff(
				req.collection,
				req.sanitizedQuery.optional?.parentKeyField,
				req.sanitizedQuery.optional?.languageField,
				res.locals.payload?.data
			);
			return res.status(200).send(output);
		}
	}

	if (Buffer.isBuffer(res.locals.payload)) {
		return res.end(res.locals.payload);
	} else {
		return res.json(res.locals.payload);
	}
});

function getDateFormatted() {
	const date = new Date();

	let month = String(date.getMonth() + 1);
	if (month.length === 1) month = '0' + month;

	let day = String(date.getDate());
	if (day.length === 1) day = '0' + day;

	return `${date.getFullYear()}-${month}-${day} at ${date.getHours()}.${date.getMinutes()}.${date.getSeconds()}`;
}
