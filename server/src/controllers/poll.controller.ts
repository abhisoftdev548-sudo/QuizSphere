import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Notification } from '../models/Notification.js';
import { Poll } from '../models/Poll.js';
import { PollVote } from '../models/PollVote.js';
import { applyLedgerEntry } from '../services/wallet.service.js';
import { runInTransaction } from '../services/transaction.service.js';
import { ApiError } from '../utils/ApiError.js';
import { sendData } from '../utils/http.js';

export async function castVote(req: Request, res: Response): Promise<void> {
  const requestKey = req.get('idempotency-key')?.trim();
  if (!requestKey || requestKey.length > 120) throw new ApiError(400, 'An Idempotency-Key header is required to vote.', 'IDEMPOTENCY_KEY_REQUIRED');
  const poll = await Poll.findOne({ _id: req.params.id, status: 'published' }).lean() as any;
  if (!poll) throw new ApiError(404, 'This poll is not currently available.', 'CONTENT_NOT_FOUND');
  const time = new Date();
  if ((poll.startsAt && poll.startsAt > time) || (poll.closesAt && poll.closesAt <= time)) throw new ApiError(409, 'This poll is not accepting votes.', 'POLL_CLOSED');
  const selections: string[] = (req.body as { optionIds: string[] }).optionIds;
  if (!poll.allowMultiple && selections.length !== 1) throw new ApiError(422, 'Choose exactly one option.', 'INVALID_VOTE');
  if (new Set(selections).size !== selections.length) throw new ApiError(422, 'Each option may only be selected once.', 'INVALID_VOTE');
  if (selections.some((id) => !Types.ObjectId.isValid(id) || !poll.options.some((option: any) => String(option._id) === id))) throw new ApiError(422, 'One or more selected options are invalid.', 'INVALID_VOTE');

  const result = await runInTransaction(async (session) => {
    const currentPoll = await Poll.findOne({ _id: poll._id, status: 'published' }).session(session);
    if (!currentPoll || (currentPoll.closesAt && currentPoll.closesAt <= new Date()) || (currentPoll.startsAt && currentPoll.startsAt > new Date())) throw new ApiError(409, 'This poll is not accepting votes.', 'POLL_CLOSED');
    let vote = await PollVote.findOne({ pollId: currentPoll._id, userId: req.auth!.userId }).session(session);
    let created = false;
    if (vote) {
      if (vote.requestKey === requestKey) {
        // Idempotent retry of the exact successful vote.
      } else if (!currentPoll.allowVoteChange) {
        throw new ApiError(409, 'You have already voted in this poll.', 'ALREADY_VOTED');
      } else {
        vote.optionIds = selections.map((id) => new Types.ObjectId(id)) as any;
        vote.changedAt = new Date();
        vote.requestKey = requestKey;
        await vote.save({ session });
      }
    } else {
      vote = new PollVote({ pollId: currentPoll._id, userId: req.auth!.userId, optionIds: selections, requestKey });
      await vote.save({ session });
      created = true;
      if (currentPoll.votingFee > 0) {
        const entry = await applyLedgerEntry({ userId: req.auth!.userId, amount: -currentPoll.votingFee, type: 'poll_vote_fee', idempotencyKey: `poll-vote:${vote._id}`, description: `Vote fee for “${currentPoll.title}”`, relatedType: 'vote', relatedId: vote._id }, session);
        if (!entry) throw new ApiError(500, 'Unable to record the vote fee.', 'LEDGER_WRITE_FAILED');
        vote.feeTransactionId = entry._id;
        await vote.save({ session });
        await Notification.create([{ userId: req.auth!.userId, type: 'qcoin_spent', title: 'QCoins used to vote', message: `${currentPoll.votingFee} QCoins were used for “${currentPoll.title}”.`, link: `/explore/polls/${currentPoll._id}`, relatedType: 'ledger', relatedId: entry._id }], { session });
      }
      currentPoll.voteCount += 1;
      await currentPoll.save({ session });
    }
    const canShowResults = currentPoll.resultVisibility === 'public' || currentPoll.resultVisibility === 'after_vote';
    let counts: Array<{ optionId: string; count: number }> | null = null;
    if (canShowResults) {
      const rows = await PollVote.aggregate([
        { $match: { pollId: currentPoll._id } }, { $unwind: '$optionIds' }, { $group: { _id: '$optionIds', count: { $sum: 1 } } },
      ]).session(session);
      counts = rows.map((row) => ({ optionId: String(row._id), count: row.count }));
    }
    return { poll: currentPoll, vote, counts, created };
  });
  sendData(res, {
    voted: true, changed: !result.created && result.vote.changedAt != null,
    myVote: result.vote.optionIds.map((id: unknown) => String(id)),
    voteCount: result.counts ? result.poll.voteCount : null,
    results: result.counts,
  });
}

export async function getMyPollVotes(req: Request, res: Response): Promise<void> {
  const rows = await PollVote.find({ userId: req.auth!.userId }).sort({ createdAt: -1 }).populate('pollId', 'title status closesAt anonymous').lean() as any[];
  sendData(res, { items: rows.map((vote) => ({ id: String(vote._id), pollId: vote.pollId ? String(vote.pollId._id) : null, pollTitle: vote.pollId?.title ?? 'Unavailable poll', pollStatus: vote.pollId?.status ?? 'archived', optionIds: vote.optionIds.map((id: unknown) => String(id)), votedAt: vote.createdAt, anonymous: vote.pollId?.anonymous ?? true })) });
}
