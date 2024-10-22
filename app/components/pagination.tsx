import { Link, useLocation, useSearchParams } from '@remix-run/react';
import { cn, toNumber } from '~/utils/misc';

type PaginationProps = { lastPage: number };

export function Pagination({ lastPage }: PaginationProps) {
	const { pathname } = useLocation();
	const [searchParams] = useSearchParams();
	const page = toNumber(searchParams.get('page')) || 1;

	function getNavigationButtonTo(
		cb: (params: URLSearchParams) => URLSearchParams,
	) {
		const newParams = new URLSearchParams(searchParams);
		return `${pathname}?${cb(newParams).toString()}`;
	}

	return (
		<div className="flex justify-between gap-4 flex-1 md:items-center flex-col md:flex-row">
			<div className="flex gap-4 items-end justify-between">
				<div className="h-9 flex items-center">
					<p className="text-sm font-medium">
						Página {page >= lastPage ? lastPage : page} de {lastPage}
					</p>
				</div>
			</div>

			<div className="flex gap-2">
				<NavigateLink
					className={page === 1 ? 'bg-gray-100 pointer-events-none' : ''}
					to={getNavigationButtonTo(params => {
						params.set('page', '1');
						return params;
					})}
				>
					<span className="sr-only">{paginationSrOnlyText.first}</span>
					<i className="ri-arrow-left-double-fill"></i>
				</NavigateLink>

				<NavigateLink
					className={page === 1 ? 'bg-gray-100 pointer-events-none' : ''}
					to={getNavigationButtonTo(params => {
						const currentPage = toNumber(params.get('page')) || 1;
						params.set('page', (currentPage - 1).toString());
						return params;
					})}
				>
					<span className="sr-only">{paginationSrOnlyText.prev}</span>
					<i className="ri-arrow-left-s-line"></i>
				</NavigateLink>

				<NavigateLink
					className={
						page >= lastPage ? 'bg-gray-100 pointer-events-none' : undefined
					}
					to={getNavigationButtonTo(params => {
						const currentPage = toNumber(params.get('page')) || 1;
						params.set('page', (currentPage + 1).toString());
						return params;
					})}
				>
					<span className="sr-only">{paginationSrOnlyText.next}</span>
					<i className="ri-arrow-right-s-line"></i>
				</NavigateLink>

				<NavigateLink
					className={
						page >= lastPage ? 'bg-gray-100 pointer-events-none' : undefined
					}
					to={getNavigationButtonTo(params => {
						params.set('page', lastPage.toString());
						return params;
					})}
				>
					<span className="sr-only">{paginationSrOnlyText.last}</span>
					<i className="ri-arrow-right-double-fill"></i>
				</NavigateLink>
			</div>
		</div>
	);
}

type NavigateLinkProps = {
	className?: string;
	children: React.ReactNode;
	to: string;
};
function NavigateLink({ className, children, to }: NavigateLinkProps) {
	return (
		<Link
			className={cn(
				'h-8 w-8 border border-slate-200 rounded hover:bg-slate-50 shadow-sm',
				'grid place-items-center',
				className,
			)}
			to={to}
			prefetch="intent"
		>
			{children}
		</Link>
	);
}

const paginationSrOnlyText = {
	first: 'Ir a la primera página',
	prev: 'Ir a la página anterior',
	next: 'Ir a la siguiente página',
	last: 'Ir a la última página',
};

type QueryPositionDataType = { skip: number; take: number };
export function getQueryPositionData(request: Request): QueryPositionDataType {
	const searchParams = new URL(request.url).searchParams;
	const limit = toNumber(searchParams.get('limit')) || 100;
	const page = toNumber(searchParams.get('page')) || 1;

	return { skip: (page - 1) * limit, take: limit };
}

export function getLastPage(data: QueryPositionDataType, total: number) {
	return Math.ceil(total / data.take);
}
