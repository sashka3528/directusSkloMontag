export interface Policy {
	id: string;
	name: string;
	description: string;
	enforce_tfa: null | boolean;
	ip_access: string[];
	app_access: boolean;
	admin_access: boolean;
}
