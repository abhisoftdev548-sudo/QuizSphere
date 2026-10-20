import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarClock, Clock3, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiErrorMessage, getData } from '../services/api';
import { Button, Card } from './ui';

type SpecialEvent = { id: string; title: string; startsAt: string; closesAt: string };

function useFeaturedEvent(poll = false) {
  return useQuery({
    queryKey: ['featured-special-event'],
    queryFn: () => getData<{ item: SpecialEvent | null }>('/explore/special-event').then((result) => result.item),
    staleTime: 30_000,
    refetchInterval: poll ? 60_000 : false,
  });
}

function formatCountdown(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainder = seconds % 60;
  return days > 0
    ? `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(remainder).padStart(2, '0')}s`
    : `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(remainder).padStart(2, '0')}s`;
}

export function SpecialEventBanner() {
  const query = useFeaturedEvent(true);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const event = query.data;
  const startsAt = event ? new Date(event.startsAt).getTime() : 0;
  const closesAt = event ? new Date(event.closesAt).getTime() : 0;
  const live = Boolean(event && currentTime >= startsAt);
  const target = live ? closesAt : startsAt;
  const { isError, isFetching, refetch } = query;

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!event || currentTime < target || isFetching || isError) return;
    void refetch();
  }, [currentTime, event?.id, isError, isFetching, refetch, target]);

  if (query.isError) {
    return <div className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-800 sm:px-6" role="alert">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <span>Special Event details could not be loaded: {apiErrorMessage(query.error)}</span>
        <Button size="sm" variant="outline" onClick={() => void query.refetch()}>Retry</Button>
      </div>
    </div>;
  }
  if (!event) return null;

  return <div className="sticky top-16 z-20 border-b border-indigo-200 bg-gradient-to-r from-indigo-950 via-indigo-900 to-brand-900 px-4 py-2.5 text-white shadow-sm sm:px-6">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <Sparkles size={17} className="shrink-0 text-amber-300" />
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-indigo-200">{live ? 'Live Special Event' : 'Upcoming Special Event'}</p>
          <p className="truncate text-sm font-semibold">{event.title}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold tabular-nums text-white/90" aria-label={`${live ? 'Ends' : 'Starts'} in ${formatCountdown(target - currentTime)}`}>
          <Clock3 size={14} className="text-amber-300" /><span className="hidden sm:inline">{live ? 'Ends in' : 'Starts in'}</span>{formatCountdown(target - currentTime)}
        </p>
        <Link to={`/app/explore/quizzes/${event.id}`} className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold transition hover:bg-white/20">
          {live ? 'Join event' : 'View event'}<ArrowRight size={13} />
        </Link>
      </div>
    </div>
  </div>;
}

export function SpecialEventDashboardCard() {
  const query = useFeaturedEvent();
  const [currentTime, setCurrentTime] = useState(Date.now());
  const event = query.data;

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (query.isLoading) return <Card className="mb-5 p-4" aria-label="Loading Special Event"><div className="h-16 animate-pulse rounded-xl bg-indigo-50/60" /></Card>;
  if (query.isError) return <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 border-rose-200 bg-rose-50 p-4" role="alert">
    <p className="text-sm text-rose-800">Special Event details could not be loaded: {apiErrorMessage(query.error)}</p>
    <Button size="sm" variant="outline" onClick={() => void query.refetch()}>Retry</Button>
  </Card>;
  if (!event) return <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 border-indigo-100 bg-indigo-50/50 p-4">
    <div className="flex items-center gap-3"><CalendarClock size={20} className="text-indigo-600" /><div><h2 className="text-sm font-bold text-ink">No upcoming Special Events</h2><p className="mt-1 text-xs text-slate-500">Published Special Event quizzes will appear here.</p></div></div>
    <Link to="/app/explore" className="text-xs font-semibold text-indigo-700 hover:text-indigo-900">Explore quizzes<ArrowRight size={13} className="ml-1 inline" /></Link>
  </Card>;

  const live = currentTime >= new Date(event.startsAt).getTime();
  const target = live ? new Date(event.closesAt).getTime() : new Date(event.startsAt).getTime();
  return <Link to={`/app/explore/quizzes/${event.id}`} className="group mb-5 block">
    <Card className="overflow-hidden border-indigo-200 transition hover:border-indigo-300 hover:shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-indigo-950 via-indigo-900 to-brand-900 px-5 py-4 text-white sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-amber-300"><Sparkles size={19} /></span>
          <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-indigo-200">{live ? 'Live Special Event' : 'Upcoming Special Event'}</p><h2 className="mt-1 truncate text-base font-bold">{event.title}</h2></div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right"><p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-200">{live ? 'Ends in' : 'Starts in'}</p><p className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold tabular-nums"><Clock3 size={14} className="text-amber-300" />{formatCountdown(target - currentTime)}</p></div>
          <ArrowRight size={18} className="text-white/70 transition group-hover:translate-x-1 group-hover:text-white" />
        </div>
      </div>
    </Card>
  </Link>;
}

export function SpecialEventExploreCard({ base }: { base: string }) {
  const query = useFeaturedEvent();
  const [currentTime, setCurrentTime] = useState(Date.now());
  const event = query.data;

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (query.isLoading || !event) {
    if (query.isError) return <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 border-rose-200 bg-rose-50 p-4" role="alert">
      <p className="text-sm text-rose-800">Special Event details could not be loaded: {apiErrorMessage(query.error)}</p>
      <Button size="sm" variant="outline" onClick={() => void query.refetch()}>Retry</Button>
    </Card>;
    return null;
  }

  const live = currentTime >= new Date(event.startsAt).getTime();
  const target = live ? new Date(event.closesAt).getTime() : new Date(event.startsAt).getTime();
  return <section aria-labelledby="featured-special-event" className="mb-6">
    <div className="mb-3 flex items-center gap-2"><Sparkles size={16} className="text-indigo-600" /><h2 id="featured-special-event" className="text-sm font-bold text-ink">Special Event</h2><span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700">{live ? 'Live now' : 'Upcoming'}</span></div>
    <Link to={`${base}/quizzes/${event.id}`} className="group block">
      <Card className="overflow-hidden border-indigo-200 transition hover:border-indigo-300 hover:shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-indigo-950 via-indigo-900 to-brand-900 px-5 py-4 text-white sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-amber-300"><Sparkles size={19} /></span>
            <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-indigo-200">{live ? 'Live Special Event' : 'Upcoming Special Event'}</p><h3 className="mt-1 truncate text-base font-bold">{event.title}</h3></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right"><p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-200">{live ? 'Ends in' : 'Starts in'}</p><p className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold tabular-nums"><Clock3 size={14} className="text-amber-300" />{formatCountdown(target - currentTime)}</p></div>
            <ArrowRight size={18} className="text-white/70 transition group-hover:translate-x-1 group-hover:text-white" />
          </div>
        </div>
      </Card>
    </Link>
  </section>;
}
