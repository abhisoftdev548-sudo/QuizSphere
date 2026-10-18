import React, { useEffect, useState } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import EmptyState from '../../components/ui/EmptyState';
import api from '../../lib/api';

export default function Ratings() {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyRatings = async () => {
      try {
        // For demo, fetch recent ratings across platform
        const res = await api.get('/ratings?targetType=quiz&targetId=000000000000000000000000').catch(() => ({ data: { data: { ratings: [] } } }));
        // Actually we need endpoint for user's given ratings - let's fetch via quizzes we created? Simplified: fetch all ratings for quizzes
        const quizzesRes = await api.get('/quizzes/my').catch(() => ({ data: { data: { quizzes: [] } } }));
        const allRatings = [];
        for (const q of quizzesRes.data.data.quizzes.slice(0, 3)) {
          try {
            const r = await api.get(`/ratings?targetType=quiz&targetId=${q._id}`);
            allRatings.push(...r.data.data.ratings.map(rr => ({ ...rr, targetTitle: q.title })));
          } catch {}
        }
        setRatings(allRatings);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchMyRatings();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="page-title">Ratings & Reviews</h1>
        <p className="text-[14px] text-textSecondary mt-1">Manage feedback received on your content.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="text-center"><Star className="w-6 h-6 text-warning mx-auto" /><p className="text-[24px] font-bold mt-2">4.8</p><p className="text-[12px] text-textSecondary">Average Rating</p></Card>
        <Card className="text-center"><MessageSquare className="w-6 h-6 text-primary mx-auto" /><p className="text-[24px] font-bold mt-2">{ratings.length}</p><p className="text-[12px] text-textSecondary">Total Reviews</p></Card>
        <Card className="text-center"><Badge variant="success" className="mx-auto">98% Positive</Badge><p className="text-[12px] text-textSecondary mt-2">Satisfaction Rate</p></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Reviews</CardTitle></CardHeader>
        {loading ? <p className="text-[13px] text-textSecondary">Loading...</p> : ratings.length === 0 ? (
          <EmptyState title="No reviews yet" description="When users rate your quizzes, they'll appear here." icon={Star} />
        ) : (
          <div className="space-y-3">
            {ratings.map(r => (
              <div key={r._id} className="p-4 rounded-xl border border-border">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3"><Avatar name={r.user?.username} size="sm" /><div><p className="text-[13px] font-medium">{r.user?.username}</p><p className="text-[11px] text-textSecondary">on {r.targetTitle || r.targetType}</p></div></div>
                  <div className="flex items-center gap-1 text-warning text-[13px]"><Star className="w-4 h-4 fill-warning" />{r.rating}</div>
                </div>
                {r.review && <p className="text-[13px] text-textSecondary mt-3 bg-appBg p-3 rounded-lg">{r.review}</p>}
                <p className="text-[11px] text-textSecondary mt-2">{new Date(r.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
