export type FieldType = 'string' | 'integer' | 'number' | 'decimal' | 'boolean' | 'date' | 'enum';

export interface FieldOption {
	name: string;
	value: string | number;
}

export interface FieldDef {
	name: string;
	label: string;
	type: FieldType;
	description: string;
	/** Must be supplied on create. */
	required?: boolean;
	/** Cannot be changed through PUT. */
	createOnly?: boolean;
	default?: string | number | boolean;
	/** Dropdown values for type 'enum'. */
	options?: FieldOption[];
	/** Dropdown fed by <lookup>.list; option value comes from lookupValue (default 'code'). */
	lookup?: string;
	lookupValue?: string;
	example?: string;
	filterable?: boolean;
}

export interface ResourceSchema {
	resource: string;
	fields: FieldDef[];
	createDefaults?: Record<string, string | number | boolean>;
	/** Documents only: columns of the sdsdocdetail lines. */
	lineFields?: FieldDef[];
}
