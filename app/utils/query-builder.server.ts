import {
	safeNewDate,
	stringToTsVector,
	toEndOfDay,
	toStartOfDay,
} from './misc';

export function queryBuilder<K extends QueryType>(
	defaultParams: URLSearchParams,
	queries: Array<K>,
): BuiltQuery<K> {
	const searchParams = new URLSearchParams(defaultParams);

	const builtQuery = { OR: [] } as unknown as BuiltQuery<K>;

	for (const query of queries) {
		const queryType = allQueries[query];

		// Normally, all our searchs are with the searchParam of "search"
		if (queryType === 'search') {
			searchParams.set(
				query,
				searchParams.get(query) || searchParams.get('search') || '',
			);
		}

		const value = searchParams.get(query);

		switch (queryType) {
			case 'search':
				if (!value) break;
				// It's very hard to type this, so we'll just use any
				builtQuery.OR?.push({
					[query]: { search: stringToTsVector(value) },
				} as any);
				break;
			case 'range':
				const start = searchParams.get('start');
				const end = searchParams.get('end');

				const gte = start ? toStartOfDay(start) : safeNewDate(0);
				const lte = end ? toEndOfDay(end) : safeNewDate(0);

				builtQuery[query] = { gte, lte } as BuiltQuery<K>[K];
				break;
			case 'equals':
				if (!value) break;
				const values = searchParams.getAll(query);

				if (values.length > 1) {
					builtQuery[query] = { in: values.map(Number) } as BuiltQuery<K>[K];
				} else {
					builtQuery[query] = Number(value) as BuiltQuery<K>[K];
				}
				break;
			default:
				throw new Error('Invalid query type');
		}
	}

	if (!builtQuery.OR?.length) {
		delete builtQuery.OR;
	}

	return builtQuery;
}

type QueryTypes = 'search' | 'range' | 'equals' | 'has';
type QueryType =
	| 'id'
	| 'name'
	| 'email'
	| 'reference'
	| 'idNumber'
	| 'clientId'
	| 'supplierId'
	| 'categoryId'
	| 'brandId'
	| 'internalId'
	| 'createdAt'
	| 'expirationDate'
	| 'subOrganizationId';

const allQueries = {
	id: 'equals',
	internalId: 'equals',
	clientId: 'equals',
	supplierId: 'equals',
	brandId: 'equals',
	categoryId: 'equals',
	subOrganizationId: 'equals',

	name: 'search',
	email: 'search',
	idNumber: 'search',
	reference: 'search',

	createdAt: 'range',
	expirationDate: 'range',
} satisfies Record<QueryType, QueryTypes>;
type AllQueriesType = typeof allQueries;

type BuiltQuery<K extends QueryType> = {
	[key in K]: AllQueriesType[key] extends 'range'
		? { lte: Date; gte: Date }
		: AllQueriesType[key] extends 'equals'
			? number | { in: Array<number> }
			: never;
} & OrGenerator<K>;

type OrGenerator<T extends QueryType> = {
	OR?: Array<
		{
			[K in T]: AllQueriesType[K] extends 'search'
				? { [P in K]: { search: string } }
				: never;
		}[T]
	>;
};
