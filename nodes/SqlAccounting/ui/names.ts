// Single source for generated parameter names. Used by ui/properties.ts and execute/readBody.ts.
export const fieldParam = (resource: string, field: string): string => `${resource}__${field}`;
export const additionalParam = (resource: string): string => `${resource}__additional`;
export const updateParam = (resource: string): string => `${resource}__update`;
export const extraJsonParam = (resource: string): string => `${resource}__extraJson`;
export const linesParam = (resource: string): string => `${resource}__lines`;
export const useRawParam = (resource: string): string => `${resource}__useRaw`;
export const rawBodyParam = (resource: string, mode: 'create' | 'update' = 'create'): string =>
	mode === 'update' ? `${resource}__rawBodyUpdate` : `${resource}__rawBody`;
export const filtersParam = (resource: string): string => `${resource}__filters`;
export const lookupMethodName = (resource: string, valueField: string): string => `lookup_${resource}_${valueField}`;

export const PATH_PARAM_NAME = {
	CODE: 'pathParamCode',
	DOCKEY: 'pathParamDockey',
	AUTOKEY: 'pathParamAutokey',
} as const;
