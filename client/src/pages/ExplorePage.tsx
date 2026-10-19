import { useEffect, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUpRight, Clock3, Coins, Search, SlidersHorizontal, Sparkles, UsersRound } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button, Card, EmptyState, PageHeader, PageSkeleton, SelectInput, TextInput } from '../components/ui';
import { getData, apiErrorMessage } from '../services/api';
import type { ApiPage, Category, ExploreItem } from '../types/api';

export default function ExplorePage() {
  const location = useLocation();
  const appPath = location.pathname.startsWith('/app');
  const base = appPath ? '/app/explore' : '/explore';
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [categoryId, setCategoryId] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [sort, setSort] = useState('newest');
  useEffect(() => { const id = window.setTimeout(() => setSearch(searchInput.trim()), 250); return () => window.clearTimeout(id); }, [searchInput]);

  const categories = useQuery({ queryKey: ['categories'], queryFn: () => getData<{ items: Category[] }>('/explore/categories').then((value) => value.items) });
  const query = useInfiniteQuery({
    queryKey: ['explore', { search, type, categoryId, difficulty, sort }],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => getData<ApiPage<ExploreItem>>('/explore', { page: pageParam, limit: 12, search: search || undefined, type, categoryId: categoryId === 'all' ? undefined : categoryId, difficulty: difficulty === 'all' ? undefined : difficulty, sort }),
    getNextPageParam: (lastPage) => lastPage.pagination.page < lastPage.pagination.pages ? lastPage.pagination.page + 1 : undefined,
  });
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const filtersActive = Boolean(search || type !== 'all' || categoryId !== 'all' || difficulty !== 'all');

  return <div className="page-container">
    <PageHeader title="Explore" description="Discover community-made quizzes and polls that are open to participate in." eyebrow="The community" />
    <Card className="mb-5 p-4 sm:p-5">
      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_150px_190px_170px_170px]">
        <div className="relative"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><TextInput value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search quizzes and polls" className="pl-10" aria-label="Search quizzes and polls" /></div>
        <SelectInput value={type} onChange={(event) => setType(event.target.value)} aria-label="Content type"><option value="all">All content</option><option value="quiz">Quizzes</option><option value="poll">Polls</option></SelectInput>
        <SelectInput value={categoryId} onChange={(event) => setCategoryId(event.target.value)} aria-label="Category"><option value="all">All categories</option>{categories.data?.map((category) => <option key={category.id ?? category._id} value={category.id ?? category._id}>{category.name}</option>)}</SelectInput>
        <SelectInput value={difficulty} onChange={(event) => setDifficulty(event.target.value)} disabled={type === 'poll'} aria-label="Difficulty"><option value="all">Any difficulty</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></SelectInput>
        <SelectInput value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort results"><option value="newest">Recently published</option><option value="fee_low">Lowest entry fee</option><option value="closing_soon">Closing soon</option></SelectInput>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-400"><span className="inline-flex items-center gap-1.5"><SlidersHorizontal size={13} />Showing approved, currently available content</span><span>{query.data?.pages[0]?.pagination.total ?? 0} results</span></div>
    </Card>

    {query.isLoading ? <PageSkeleton /> : query.isError ? <Card><EmptyState title="Explore is temporarily unavailable" description={apiErrorMessage(query.error)} action={<Button variant="outline" onClick={() => void query.refetch()}>Try again</Button>} /></Card> : items.length === 0 ? <Card><EmptyState icon={Sparkles} title={filtersActive ? 'No matching content' : 'Nothing published just yet'} description={filtersActive ? 'Try adjusting your search or filters. Only approved and currently available content appears here.' : 'When the community publishes its first approved quiz or poll, it will appear here. You can start by creating one in Creator Studio.'} action={appPath ? <Link to="/app/creator-studio" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">Open Creator Studio<ArrowUpRight size={15} /></Link> : <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">Create an account<ArrowUpRight size={15} /></Link>} /></Card> : <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <ExploreCard key={`${item.type}-${item.id}`} item={item} base={base} />)}</div>
      {query.hasNextPage && <div className="mt-6 text-center"><Button variant="outline" onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}>{query.isFetchingNextPage ? 'Loading…' : <>Load more<ArrowDown size={15} /></>}</Button></div>}
    </>}
  </div>;
}

function ExploreCard({ item, base }: { item: ExploreItem; base: string }) {
  const isQuiz = item.type === 'quiz';
  const href = `${base}/${isQuiz ? 'quizzes' : 'polls'}/${item.id}`;
  return <Card className="group flex h-full flex-col overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft">
    <div className={`h-1 ${isQuiz ? 'bg-brand-500' : 'bg-indigo-400'}`} />
    <div className="flex flex-1 flex-col p-5">
      <div className="flex items-center justify-between gap-3"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${isQuiz ? 'bg-brand-50 text-brand-700' : 'bg-indigo-50 text-indigo-700'}`}>{isQuiz ? item.quizType === 'special_event' ? 'Special Event' : 'General Quiz' : 'Poll'}</span>{item.category && <span className="truncate text-xs font-medium text-slate-400">{item.category}</span>}</div>
      <h2 className="mt-4 line-clamp-2 text-[16px] font-bold leading-6 text-ink">{item.title}</h2>
      <p className="mt-2 line-clamp-2 min-h-[42px] text-sm leading-[21px] text-slate-500">{item.description || 'No description provided.'}</p>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
        {isQuiz && item.difficulty && <span className="capitalize">{item.difficulty}</span>}
        {isQuiz && <span>{item.questionCount} questions</span>}
        {!isQuiz && <span>{item.optionsCount} options</span>}
        {!isQuiz && item.anonymous && <span>Anonymous</span>}
        {!isQuiz && item.voteCount !== null && item.voteCount !== undefined && <span className="inline-flex items-center gap-1"><UsersRound size={13} />{item.voteCount} votes</span>}
        {isQuiz && item.timeLimitSeconds && <span className="inline-flex items-center gap-1"><Clock3 size={13} />{Math.ceil(item.timeLimitSeconds / 60)} min</span>}
      </div>
      <div className="mt-auto pt-5">
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <div className="min-w-0"><p className="truncate text-xs font-medium text-slate-500">By {item.creator?.displayName ?? 'QuizSphere creator'}</p><p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700"><Coins size={13} className="text-brand-600" />{isQuiz ? item.entryFee ?? 0 : item.votingFee ?? 0} QCoins {isQuiz ? 'entry' : 'to vote'}</p></div>
          <Link to={href} className="ml-3 inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-brand-700 transition group-hover:bg-brand-600 group-hover:text-white">{item.closed ? 'View results' : 'View details'}<ArrowUpRight size={14} /></Link>
        </div>
        {item.closed && <p className="mt-2 text-[11px] font-semibold text-emerald-700">Event closed · final results available</p>}
        {!item.closed && item.startsAt && <p className="mt-2 text-[11px] text-slate-400">Starts {new Date(item.startsAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>}
        {item.closesAt && <p className="mt-3 text-[11px] text-slate-400">Closes {new Date(item.closesAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>}
      </div>
    </div>
  </Card>;
}
