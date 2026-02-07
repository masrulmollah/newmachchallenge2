
import { Question, QuestionType, InteractionMode } from './types';

const getRandomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const shuffleArray = <T,>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

export const generateQuestion = (): Question => {
  const types = Object.values(QuestionType);
  const type = types[getRandomInt(0, types.length - 1)];
  const mode = Math.random() > 0.5 ? InteractionMode.MULTIPLE_CHOICE : InteractionMode.FILL_IN_BLANK;
  
  let prompt = '';
  let answer: string | number = 0;
  let options: (string | number)[] = [];

  switch (type) {
    case QuestionType.ADDITION: {
      const a = getRandomInt(1, 99);
      const b = getRandomInt(1, 99 - a);
      answer = a + b;
      prompt = `${a} + ${b} = ?`;
      break;
    }
    case QuestionType.SUBTRACTION: {
      const a = getRandomInt(1, 99);
      const b = getRandomInt(1, a);
      answer = a - b;
      prompt = `${a} - ${b} = ?`;
      break;
    }
    case QuestionType.MULTIPLICATION: {
      const a = getRandomInt(2, 12);
      const b = getRandomInt(2, 8);
      answer = a * b;
      prompt = `${a} × ${b} = ?`;
      break;
    }
    case QuestionType.DIVISION: {
      const b = getRandomInt(2, 10);
      const res = getRandomInt(2, 10);
      const a = b * res;
      answer = res;
      prompt = `${a} ÷ ${b} = ?`;
      break;
    }
    case QuestionType.ODD_MAN_OUT: {
      const logicType = getRandomInt(0, 1);
      if (logicType === 0) {
        const base = getRandomInt(1, 40) * 2;
        const others = [base, base + 2, base + 4];
        answer = getRandomInt(1, 45) * 2 + 1;
        options = shuffleArray([...others, answer]);
        prompt = "Which one is different?";
      } else {
        const factor = getRandomInt(3, 9);
        const base = getRandomInt(1, 10) * factor;
        const others = [base, base + factor, base + factor * 2];
        answer = base + getRandomInt(1, factor - 1);
        options = shuffleArray([...others, answer]);
        prompt = `Which is NOT a multiple of ${factor}?`;
      }
      break;
    }
  }

  if (type !== QuestionType.ODD_MAN_OUT && mode === InteractionMode.MULTIPLE_CHOICE) {
    const wrong1 = (answer as number) + getRandomInt(1, 5);
    const wrong2 = Math.max(0, (answer as number) - getRandomInt(1, 5));
    const wrong3 = (answer as number) + getRandomInt(6, 10);
    options = shuffleArray([answer, wrong1, wrong2, wrong3]);
  }

  return {
    id: Math.random().toString(36).substr(2, 9),
    type,
    prompt,
    answer,
    options,
    mode: type === QuestionType.ODD_MAN_OUT ? InteractionMode.MULTIPLE_CHOICE : mode
  };
};
