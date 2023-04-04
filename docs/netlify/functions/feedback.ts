import fetch from 'node-fetch';

const feedbackUrl = process.env.DIRECTUS_URL + '/items/docs_feedback';
const token = process.env.DIRECTUS_TOKEN;

const headers = {
	'Content-Type': 'application/json',
	Accept: 'application/json',
	Authorization: `Bearer ${token}`,
};

type Submission = {
	id?: string;
	title: string;
	url: string;
	rating: number;
	comments: string;
};

async function createSubmission(submission: Submission) {
	try {
		const response = await fetch(feedbackUrl, {
			method: 'POST',
			body: JSON.stringify(submission),
			headers,
		});
		if (!response.ok) throw Error(response.statusText);
		const { data } = await response.json();
		return data;
	} catch (error) {
		return error;
	}
}

async function updateSubmission(id: string, submission: Submission) {
	try {
		const response = await fetch(`${feedbackUrl}/${id}`, {
			method: 'PATCH',
			body: JSON.stringify(submission),
			headers,
		});
		if (!response.ok) throw Error(response.statusText);
		const { data } = await response.json();
		return data;
	} catch (error) {
		return error;
	}
}

exports.handler = async (event, context) => {
	if (event.httpMethod !== 'POST') {
		return { statusCode: 405, body: 'Method Not Allowed' };
	}

	try {
		const { id, ...data } = JSON.parse(event.body);

		let response;
		if (id) {
			response = await updateSubmission(id, data);
		} else {
			response = await createSubmission(data);
		}

		return {
			statusCode: 200,
			body: JSON.stringify(response),
		};
	} catch (error) {
		console.log(error);
		return {
			statusCode: 500,
			body: JSON.stringify({ error: 'Feedback submission failed!' }),
		};
	}
};
