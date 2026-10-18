export type ScoreQuestion = { _id?: unknown; type: string; points: number; correctAnswers: string[] };
export type SubmittedAnswer = { questionId: string; selections?: string[]; textAnswer?: string };

function normalize(value: string): string { return value.trim().toLocaleLowerCase().replace(/\s+/g, ' '); }

export function isAnswerCorrect(question: ScoreQuestion, answer?: SubmittedAnswer): boolean {
  if (!answer) return false;
  if (['single_choice', 'multiple_choice', 'true_false'].includes(question.type)) {
    const expected = [...question.correctAnswers].sort();
    const actual = [...(answer.selections ?? [])].sort();
    return expected.length === actual.length && expected.every((value, index) => value === actual[index]);
  }
  return question.correctAnswers.some((value) => normalize(value) === normalize(answer.textAnswer ?? ''));
}

export function scoreAnswers(questions: ScoreQuestion[], answers: SubmittedAnswer[]) {
  const byId = new Map(answers.map((answer) => [String(answer.questionId), answer]));
  const maxScore = questions.reduce((sum, question) => sum + question.points, 0);
  let earned = 0;
  let correctCount = 0;
  for (const question of questions) {
    if (isAnswerCorrect(question, byId.get(String(question._id)))) { earned += question.points; correctCount += 1; }
  }
  return { maxScore, earned, correctCount, percent: maxScore ? Math.round((earned / maxScore) * 100) : 0 };
}
