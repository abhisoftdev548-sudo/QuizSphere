export type QuizType = 'general' | 'special_event';

export function requiresCreatePass(
  questionCount: number,
  freeQuestionLimit: number,
  quizType: QuizType,
  specialEventRequiresCreatePass: boolean,
): boolean {
  return questionCount > freeQuestionLimit || (quizType === 'special_event' && specialEventRequiresCreatePass);
}
