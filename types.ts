
export enum QuestionType {
  ADDITION = 'ADDITION',
  SUBTRACTION = 'SUBTRACTION',
  MULTIPLICATION = 'MULTIPLICATION',
  DIVISION = 'DIVISION',
  ODD_MAN_OUT = 'ODD_MAN_OUT'
}

export enum InteractionMode {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  FILL_IN_BLANK = 'FILL_IN_BLANK'
}

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  answer: string | number;
  options?: (string | number)[];
  mode: InteractionMode;
}

export interface HighScore {
  name: string;
  score: number;
}

export interface GameState {
  score: number;
  currentQuestion: Question | null;
  feedback: 'correct' | 'wrong' | null;
  streak: number;
  username: string;
  highScores: HighScore[];
}
