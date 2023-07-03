export type HttpMethod = 'GET' | 'SEARCH' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
	path: string;
	method?: HttpMethod;
	params?: Record<string, string>;
	headers?: Record<string, string>;
	body?: string;
	onRequest?: RequestTransformer;
	onResponse?: ResponseTransformer;

}

export interface RequestTransformer {
	(options: RequestInit): RequestInit | Promise<RequestInit>;
}

export interface ResponseTransformer {
	<Output = any>(data: any): Output | Promise<Output>;
}
