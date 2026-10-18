import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Clock, Star, BookOpen, Plus, Eye } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Avatar from '../../components/ui/Avatar';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonCard } from '../../components/ui/Skeleton';
import Pagination from '../../components/ui/Pagination';
import api from '../../lib/api';

export default function Quizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [loading, setLoading] = useState(true);

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'General', label: 'General' },
    { value: 'Science', label: 'Science' },
    { value: 'Technology', label: 'Technology' },
    { value: 'History', label: 'History' },
    { value: 'Sports', label: 'Sports' },
    { value: 'Entertainment', label: 'Entertainment' },
  ];

  const difficulties = [
    { value: 'all', label: 'All Levels' },
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' }
  ];

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 12, search: search || undefined, category: category !== 'all' ? category : undefined, difficulty: difficulty !== 'all' ? difficulty : undefined };
      const res = await api.get('/quizzes', { params });
      setQuizzes(res.data.data.quizzes);
      setTotal(res.data.data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQuizzes(); }, [page, category, difficulty]);
  useEffect(() => {
    const t = setTimeout(() => { if (page === 1) fetchQuizzes(); else setPage(1); }, 500);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Explore Quizzes</h1>
          <p className="text-[14px] text-textSecondary mt-1">Solve published quizzes and earn QCoins. Create your own in My Quizzes.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/my-quizzes"><Button variant="secondary">My Quizzes</Button></Link>
          <Link to="/quizzes/create"><Button leftIcon={<Plus className="w-4 h-4" />}>Create Quiz</Button></Link>
        </div>
      </div>

      <Card padding={false} className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search quizzes..." className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-surface text-[14px] focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="flex gap-3">
            <Select options={categories} value={category} onChange={setCategory} placeholder="Category" containerClassName="w-[180px]" />
            <Select options={difficulties} value={difficulty} onChange={setDifficulty} placeholder="Difficulty" containerClassName="w-[150px]" />
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : quizzes.length === 0 ? (
        <EmptyState title="No quizzes found" description="Try adjusting your filters or create a new quiz." actionLabel="Create Quiz" onAction={() => window.location.href = '/quizzes/create'} />
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map((quiz) => (
              <Link key={quiz._id} to={`/quizzes/${quiz._id}`} className="group">
                <Card hover className="h-full flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant={quiz.difficulty === 'hard' ? 'error' : quiz.difficulty === 'medium' ? 'warning' : 'success'}>{quiz.difficulty}</Badge>
                    <span className="text-[12px] text-textSecondary flex items-center gap-1"><Clock className="w-3 h-3" />{quiz.timeLimit}m</span>
                  </div>
                  <h3 className="font-semibold text-[15px] line-clamp-2 group-hover:text-primary">{quiz.title}</h3>
                  <p className="text-[13px] text-textSecondary mt-2 line-clamp-2 flex-1">{quiz.description}</p>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {quiz.tags?.slice(0, 3).map(tag => <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-appBg text-textSecondary">{tag}</span>)}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                    <div className="flex items-center gap-2"><Avatar name={quiz.author?.username} src={quiz.author?.avatar} size="sm" /><span className="text-[12px] text-textSecondary">{quiz.author?.username}</span></div>
                    <div className="flex items-center gap-3 text-[12px] text-textSecondary">
                      <span className="flex items-center gap-1"><Star className="w-3 h-3" />{quiz.avgRating?.toFixed(1) || 0}</span>
                      <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{quiz.totalAttempts || 0}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
          <Pagination currentPage={page} totalPages={Math.ceil(total / 12)} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
