import { marked } from 'marked';
import * as sanitizeHTML from 'sanitize-html';

/**
 * Render and sanitize a markdown string
 */
export function md(str: string): string {
	return sanitizeHTML(marked(str));
}
