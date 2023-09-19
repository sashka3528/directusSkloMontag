import argon2 from 'argon2';
import Busboy from 'busboy';
import { Router } from 'express';
import { Worker } from 'node:worker_threads';
import fs from 'node:fs';

import Joi from 'joi';
import { flushCaches } from '../cache.js';
import { ForbiddenError, InvalidPayloadError, InvalidQueryError, UnsupportedMediaTypeError } from '../errors/index.js';
import collectionExists from '../middleware/collection-exists.js';
import { respond } from '../middleware/respond.js';
import { ExportService } from '../services/import-export.js';
import { RevisionsService } from '../services/revisions.js';
import { UtilsService } from '../services/utils.js';
import asyncHandler from '../utils/async-handler.js';
import { generateHash } from '../utils/generate-hash.js';
import { sanitizeQuery } from '../utils/sanitize-query.js';

const router = Router();

router.get(
	'/random/string',
	asyncHandler(async (req, res) => {
		const { nanoid } = await import('nanoid');

		if (req.query && req.query['length'] && Number(req.query['length']) > 500) {
			throw new InvalidQueryError({ reason: `"length" can't be more than 500 characters` });
		}

		const string = nanoid(req.query?.['length'] ? Number(req.query['length']) : 32);

		return res.json({ data: string });
	})
);

router.post(
	'/hash/generate',
	asyncHandler(async (req, res) => {
		if (!req.body?.string) {
			throw new InvalidPayloadError({ reason: `"string" is required` });
		}

		const hash = await generateHash(req.body.string);

		return res.json({ data: hash });
	})
);

router.post(
	'/hash/verify',
	asyncHandler(async (req, res) => {
		if (!req.body?.string) {
			throw new InvalidPayloadError({ reason: `"string" is required` });
		}

		if (!req.body?.hash) {
			throw new InvalidPayloadError({ reason: `"hash" is required` });
		}

		const result = await argon2.verify(req.body.hash, req.body.string);

		return res.json({ data: result });
	})
);

const SortSchema = Joi.object({
	item: Joi.alternatives(Joi.string(), Joi.number()).required(),
	to: Joi.alternatives(Joi.string(), Joi.number()).required(),
});

router.post(
	'/sort/:collection',
	collectionExists,
	asyncHandler(async (req, res) => {
		const { error } = SortSchema.validate(req.body);
		if (error) throw new InvalidPayloadError({ reason: error.message });

		const service = new UtilsService({
			accountability: req.accountability,
			schema: req.schema,
		});

		await service.sort(req.collection, req.body);

		return res.status(200).end();
	})
);

router.post(
	'/revert/:revision',
	asyncHandler(async (req, _res, next) => {
		const service = new RevisionsService({
			accountability: req.accountability,
			schema: req.schema,
		});

		await service.revert(req.params['revision']!);
		next();
	}),
	respond
);

router.post(
	'/import/:collection',
	collectionExists,
	asyncHandler(async (req, res, next) => {
		if (req.is('multipart/form-data') === false) {
			throw new UnsupportedMediaTypeError({ mediaType: req.headers['content-type']!, where: 'Content-Type header' });
		}

		let headers;

		if (req.headers['content-type']) {
			headers = req.headers;
		} else {
			headers = {
				...req.headers,
				'content-type': 'application/octet-stream',
			};
		}

		const busboy = Busboy({ headers });

		busboy.on('file', async (_fieldname, fileStream, { mimeType }) => {
			const { tmp } = await import('@directus/utils/node');

			const tmpFile = await tmp.createFile().catch(() => null);

			if (!tmpFile) throw new Error('It was not possible to create a temporary file');

			fileStream.pipe(fs.createWriteStream(tmpFile.path));

			fileStream.on('end', async () => {
				const workerPath = new URL('../utils/import-worker', import.meta.url);

				const worker = new Worker(workerPath, {
					workerData: {
						collection: req.params['collection']!,
						mimeType,
						filePath: tmpFile.path,
						accountability: req.accountability,
						schema: req.schema,
					},
				});

				worker.on('message', async (message) => {
					if (message.type === 'finish') {
						await tmpFile.cleanup();
						res.status(200).end();
					}
				});

				worker.on('error', async (err) => {
					await tmpFile.cleanup();
					next(err);
				});
			});
		});

		busboy.on('error', (err: Error) => next(err));

		req.pipe(busboy);
	})
);

router.post(
	'/export/:collection',
	collectionExists,
	asyncHandler(async (req, _res, next) => {
		if (!req.body.query) {
			throw new InvalidPayloadError({ reason: `"query" is required` });
		}

		if (!req.body.format) {
			throw new InvalidPayloadError({ reason: `"format" is required` });
		}

		const service = new ExportService({
			accountability: req.accountability,
			schema: req.schema,
		});

		const sanitizedQuery = sanitizeQuery(req.body.query, req.accountability ?? null);

		// We're not awaiting this, as it's supposed to run async in the background
		service.exportToFile(req.params['collection']!, sanitizedQuery, req.body.format, {
			file: req.body.file,
		});

		return next();
	}),
	respond
);

router.post(
	'/cache/clear',
	asyncHandler(async (req, res) => {
		if (req.accountability?.admin !== true) {
			throw new ForbiddenError();
		}

		await flushCaches(true);

		res.status(200).end();
	})
);

export default router;
