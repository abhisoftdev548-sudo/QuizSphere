export type Role = 'user' | 'admin';
export type User = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: Role;
  status: 'active' | 'suspended' | 'closed';
  walletBalance: number;
  avatarUrl?: string | null;
  bio?: string;
  createdAt?: string;
};

export type Status = 'draft' | 'pending_review' | 'changes_requested' | 'approved' | 'published' | 'rejected' | 'suspended' | 'closed' | 'archived';
export type Category = { _id?: string; id?: string; name: string; slug?: string; contentType?: 'quiz' | 'poll' | 'both'; description?: string };
export type Creator = { id: string; username: string; displayName: string; avatarUrl?: string | null } | null;
export type ExploreItem = {
  id: string;
  type: 'quiz' | 'poll';
  title: string;
  description: string;
  category: string | null;
  creator: Creator;
  quizType?: 'general' | 'special_event';
  startsAt?: string | null;
  closed?: boolean;
  entryFee?: number;
  votingFee?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  questionCount?: number;
  timeLimitSeconds?: number | null;
  attemptCount?: number;
  voteCount?: number | null;
  optionsCount?: number;
  anonymous?: boolean;
  allowMultiple?: boolean;
  closesAt?: string | null;
  prizeRules?: Array<{ rank: number; sharePercent: number }>;
  publishedAt?: string | null;
};

export type CreatorContent = {
  id: string;
  type: 'quiz' | 'poll';
  title: string;
  description: string;
  category?: string | null;
  categoryId?: string | null;
  quizType?: 'general' | 'special_event';
  status: Status;
  questionCount?: number;
  options?: Array<{ id?: string; text: string }>;
  difficulty?: string;
  entryFee?: number;
  votingFee?: number;
  timeLimitSeconds?: number | null;
  passingScorePercent?: number;
  reviewFeedback?: string;
  suspensionReason?: string;
  version?: number;
  updatedAt: string;
  createdAt?: string;
  publishedAt?: string | null;
};

export type ApiPage<T> = { items: T[]; pagination: { page: number; limit: number; total: number; pages: number } };
