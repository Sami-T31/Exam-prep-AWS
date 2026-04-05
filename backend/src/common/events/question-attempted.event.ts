/**
 * Fired whenever a user submits an answer to a question.
 *
 * This event allows modules to react to attempts without the
 * QuestionsService knowing about them. The leaderboard module
 * listens for this to update scores. Future modules (achievements,
 * notifications) can also listen without modifying the questions code.
 *
 * This is the "Observer pattern" — one publisher, many subscribers.
 */
export class QuestionAttemptedEvent {
  static readonly EVENT_NAME = 'question.attempted';

  constructor(
    public readonly userId: string,
    public readonly questionId: string,
    public readonly isCorrect: boolean,
    public readonly subjectId: number,
  ) {}
}
