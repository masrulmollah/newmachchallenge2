
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateQuestion } from './services/mathLogic';
import { VoiceAssistant } from './services/voiceService';
import { Question, QuestionType, InteractionMode, GameState, HighScore } from './types';

const STORAGE_KEY = 'math_whiz_high_scores';

// Initial dummy scores to make the board look full and exciting
const DEFAULT_SCORES: HighScore[] = [
  { name: 'Math Master', score: 100 },
  { name: 'Number Ninja', score: 50 },
  { name: 'Calculation King', score: 20 },
];

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    currentQuestion: null,
    feedback: null,
    streak: 0,
    username: '',
    highScores: [],
  });
  
  const [isStarted, setIsStarted] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const voiceAssistantRef = useRef<VoiceAssistant | null>(null);

  // Load High Scores from Local Storage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setGameState(prev => ({ ...prev, highScores: JSON.parse(saved) }));
      } catch (e) {
        setGameState(prev => ({ ...prev, highScores: DEFAULT_SCORES }));
      }
    } else {
      setGameState(prev => ({ ...prev, highScores: DEFAULT_SCORES }));
    }
  }, []);

  const nextQuestion = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      currentQuestion: generateQuestion(),
      feedback: null
    }));
    setInputValue('');
    setTranscribedText('');
  }, []);

  const updateHighScores = useCallback((currentName: string, currentScore: number) => {
    setGameState(prev => {
      let newScores = [...prev.highScores];
      const existingIdx = newScores.findIndex(s => s.name.toLowerCase() === currentName.toLowerCase());
      
      if (existingIdx !== -1) {
        if (currentScore > newScores[existingIdx].score) {
          newScores[existingIdx].score = currentScore;
        }
      } else {
        newScores.push({ name: currentName, score: currentScore });
      }

      // Sort and slice to top 3
      const top3 = newScores
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(top3));
      return { ...prev, highScores: top3 };
    });
  }, []);

  const handleStart = () => {
    if (tempUsername.trim()) {
      setGameState(prev => ({ ...prev, username: tempUsername }));
      setIsStarted(true);
      nextQuestion();
    }
  };

  const handleAnswer = useCallback((answer: string | number) => {
    if (!gameState.currentQuestion || gameState.feedback) return;

    const userAnswer = String(answer).trim().toLowerCase();
    const correctAnswer = String(gameState.currentQuestion.answer).trim().toLowerCase();
    
    const isCorrect = userAnswer === correctAnswer || 
                      userAnswer.split(' ').includes(correctAnswer) ||
                      (correctAnswer.length > 0 && userAnswer.includes(correctAnswer));
    
    const newScore = isCorrect ? gameState.score + 10 : Math.max(0, gameState.score - 5);

    setGameState(prev => ({
      ...prev,
      score: newScore,
      feedback: isCorrect ? 'correct' : 'wrong',
      streak: isCorrect ? prev.streak + 1 : 0
    }));

    updateHighScores(gameState.username, newScore);

    setTimeout(() => {
      nextQuestion();
    }, 2000);
  }, [gameState.currentQuestion, gameState.feedback, gameState.score, gameState.username, nextQuestion, updateHighScores]);

  const toggleVoice = async () => {
    if (isVoiceActive) {
      voiceAssistantRef.current?.stop();
      setIsVoiceActive(false);
      setTranscribedText('');
    } else {
      const assistant = new VoiceAssistant(
        (partialText) => {
          setTranscribedText(partialText);
          const matches = partialText.match(/\d+/);
          if (matches) setInputValue(matches[0]);
        },
        (finalText) => {
          const matches = finalText.match(/\d+/);
          if (matches) {
            setInputValue(matches[0]);
            handleAnswer(matches[0]);
          }
        }
      );
      await assistant.start();
      voiceAssistantRef.current = assistant;
      setIsVoiceActive(true);
    }
  };

  const { currentQuestion, score, feedback, highScores, username } = gameState;

  // Hall of Fame Component (Shared between mobile and desktop layout)
  const HallOfFame = ({ vertical = true }: { vertical?: boolean }) => (
    <div className={`backdrop-blur-xl bg-white/40 p-5 rounded-[2.5rem] border border-white/40 shadow-2xl ${vertical ? 'w-full' : 'flex items-center space-x-3 overflow-x-auto no-scrollbar'}`}>
      <h2 className={`font-fredoka text-indigo-800 tracking-wider uppercase text-center mb-3 ${vertical ? 'text-xl' : 'text-xs shrink-0 mr-2'}`}>
        {vertical ? '🏆 Hall of Fame' : 'TOP 3:'}
      </h2>
      <div className={vertical ? 'space-y-3' : 'flex space-x-3 shrink-0'}>
        {highScores.map((hs, idx) => {
          const isCurrentUser = hs.name.toLowerCase() === username.toLowerCase();
          return (
            <div 
              key={idx} 
              className={`flex items-center justify-between p-3 rounded-2xl transition-all duration-500 ${
                isCurrentUser ? 'bg-indigo-500 text-white shadow-indigo-200' : 'bg-white/60 text-indigo-900 border border-white/20'
              } ${vertical ? 'w-full' : 'w-48 shrink-0'} ${idx === 0 && 'ring-2 ring-yellow-400'}`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                <span className="font-black text-sm truncate max-w-[100px]">{hs.name}</span>
              </div>
              <span className={`font-fredoka ${isCurrentUser ? 'text-white' : 'text-indigo-600'}`}>{hs.score}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex flex-col items-center justify-center p-4">
      
      {/* Background Images */}
      <div className="fixed inset-0 z-0 flex w-full h-full">
        <div className="relative flex-1 h-full overflow-hidden">
          <img src="input_file_1.png" className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105" alt="Background 1" />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/40 via-blue-500/20 to-transparent"></div>
        </div>
        <div className="relative flex-1 h-full overflow-hidden">
          <img src="input_file_0.png" className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105" alt="Background 2" />
          <div className="absolute inset-0 bg-gradient-to-l from-red-900/40 via-red-500/20 to-transparent"></div>
        </div>
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]"></div>
      </div>

      {/* Start Screen */}
      {!isStarted && (
        <div className="relative z-40 w-full max-w-4xl flex flex-col md:flex-row gap-8 items-center justify-center animate-fade-in px-4">
          <div className="w-full max-w-md backdrop-blur-2xl bg-white/80 p-8 md:p-12 rounded-[3.5rem] shadow-2xl border border-white/40 text-center order-2 md:order-1">
            <h1 className="text-4xl md:text-5xl font-fredoka text-blue-700 mb-4">Math Whiz!</h1>
            <p className="text-gray-600 mb-8 font-semibold">Enter your name to challenge the leaders</p>
            <input 
              type="text" 
              placeholder="Your Name..."
              value={tempUsername}
              onChange={(e) => setTempUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleStart()}
              className="w-full text-center text-3xl font-fredoka bg-blue-50/50 border-b-4 border-blue-200 rounded-2xl p-5 focus:outline-none focus:border-blue-500 text-blue-800 placeholder-blue-200 mb-8 transition-all"
            />
            <button onClick={handleStart} className="w-full py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-[2rem] font-black text-2xl shadow-xl hover:shadow-2xl active:scale-95 border-b-8 border-indigo-900 transition-all uppercase tracking-widest">
              LET'S GO!
            </button>
          </div>
          <div className="w-full max-w-sm order-1 md:order-2">
            <HallOfFame vertical={true} />
          </div>
        </div>
      )}

      {/* Game Content */}
      {isStarted && (
        <>
          <header className="fixed top-0 left-0 right-0 z-30 p-4 md:p-6 backdrop-blur-md bg-white/30 border-b border-white/20">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center w-full gap-4">
              <div className="flex items-center justify-between w-full md:w-auto md:space-x-4">
                <div className="bg-white/80 px-4 md:px-6 py-2 rounded-full shadow-lg border border-white flex items-center space-x-3">
                  <span className="text-sm font-black text-indigo-400 uppercase tracking-tighter shrink-0">{username}</span>
                  <div className="w-[1px] h-4 bg-gray-200 mx-2"></div>
                  <i className="fas fa-star text-yellow-500 text-xl"></i>
                  <span className="text-2xl font-fredoka text-blue-700">{score}</span>
                </div>
                <button onClick={toggleVoice} className={`md:hidden p-3 rounded-full font-bold shadow-2xl transition-all border-b-4 active:border-b-0 active:translate-y-1 ${isVoiceActive ? 'bg-red-600 border-red-800 text-white animate-pulse' : 'bg-indigo-600 border-indigo-900 text-white'}`}>
                  <i className={`fas ${isVoiceActive ? 'fa-stop-circle' : 'fa-microphone-alt'} text-xl`}></i>
                </button>
              </div>

              {/* Responsive Hall of Fame Ticker for Mobile/Small tablets */}
              <div className="w-full md:hidden">
                <HallOfFame vertical={false} />
              </div>

              <div className="hidden md:flex items-center space-x-4">
                <button onClick={toggleVoice} className={`px-6 py-2.5 rounded-full font-bold shadow-2xl transition-all flex items-center space-x-2 border-b-4 active:border-b-0 active:translate-y-1 ${isVoiceActive ? 'bg-red-600 border-red-800 text-white animate-pulse' : 'bg-indigo-600 border-indigo-900 text-white'}`}>
                  <i className={`fas ${isVoiceActive ? 'fa-stop-circle' : 'fa-microphone-alt'}`}></i>
                  <span className="uppercase tracking-widest text-sm font-black">{isVoiceActive ? 'Listening...' : 'Voice Command'}</span>
                </button>
              </div>
            </div>
          </header>

          {/* Hall of Fame Side Panel (Visible on Desktop/Large screens) */}
          <div className="fixed left-8 top-1/2 -translate-y-1/2 z-30 hidden lg:block w-72">
            <HallOfFame vertical={true} />
          </div>

          <main className="relative z-10 w-full max-w-2xl mt-32 md:mt-24 px-4">
            {currentQuestion && (
              <div className={`relative backdrop-blur-xl bg-white/70 rounded-[3.5rem] p-8 md:p-14 shadow-2xl border border-white/40 transition-all duration-500 ${feedback === 'correct' ? 'scale-105 border-green-400 bg-green-50' : feedback === 'wrong' ? 'shake border-red-400 bg-red-50' : ''}`}>
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-8 py-2 rounded-full shadow-xl font-black text-xs tracking-widest uppercase">
                  {currentQuestion.type.replace('_', ' ')}
                </div>

                <div className="text-center mb-10">
                  <h1 className="text-6xl md:text-9xl font-fredoka text-gray-800 tracking-tighter drop-shadow-xl">
                    {currentQuestion.prompt}
                  </h1>
                </div>

                <div className="space-y-6">
                  {currentQuestion.mode === InteractionMode.MULTIPLE_CHOICE ? (
                    <div className="grid grid-cols-2 gap-4">
                      {currentQuestion.options?.map((opt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleAnswer(opt)}
                          disabled={!!feedback}
                          className={`py-6 md:py-8 rounded-[2rem] text-4xl font-black transition-all border-b-8 active:border-b-0 active:translate-y-1 shadow-lg ${
                            (isVoiceActive && inputValue === String(opt)) ? 'bg-indigo-300 border-indigo-500 scale-105 shadow-indigo-300' :
                            feedback === 'correct' && opt === currentQuestion.answer ? 'bg-green-500 text-white border-green-700' :
                            feedback === 'wrong' && opt === currentQuestion.answer ? 'bg-green-200 text-green-900 border-green-500' :
                            'bg-white/80 text-indigo-700 border-gray-200 hover:bg-white'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-6">
                      <div className="relative w-full max-w-xs">
                        <input
                          type="number"
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAnswer(inputValue)}
                          disabled={!!feedback}
                          autoFocus
                          placeholder="?"
                          className={`w-full text-center text-7xl font-fredoka bg-white/50 border-b-8 rounded-3xl p-6 focus:outline-none transition-all ${isVoiceActive && inputValue ? 'border-indigo-500 text-indigo-800 bg-indigo-50/50' : 'border-indigo-200 text-indigo-700'}`}
                        />
                        {isVoiceActive && (
                           <div className="absolute -right-12 top-1/2 -translate-y-1/2">
                              <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center animate-ping">
                                 <i className="fas fa-microphone text-white text-sm"></i>
                              </div>
                           </div>
                        )}
                      </div>
                      <button onClick={() => handleAnswer(inputValue)} disabled={!!feedback || !inputValue} className="w-full max-w-xs py-5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-[2rem] font-black text-2xl shadow-xl active:scale-95 border-b-8 border-indigo-900 uppercase">
                        SUBMIT
                      </button>
                    </div>
                  )}
                </div>

                {isVoiceActive && (
                  <div className="mt-10 flex flex-col items-center p-5 bg-indigo-50/40 rounded-3xl border border-dashed border-indigo-200">
                    <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
                      Listening for numbers
                    </p>
                    <p className="text-xl text-indigo-900 font-bold italic h-8 transition-all">
                      {transcribedText ? `"${transcribedText}"` : "..."}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="h-28 flex items-center justify-center mt-4 pointer-events-none">
              {feedback === 'correct' && (
                <div className="text-white text-5xl font-fredoka animate-bounce drop-shadow-lg flex items-center space-x-4 bg-green-500/90 px-10 py-4 rounded-full border-4 border-white">
                  <i className="fas fa-check-circle"></i>
                  <span>BRILLIANT!</span>
                </div>
              )}
              {feedback === 'wrong' && (
                <div className="text-white text-5xl font-fredoka flex items-center space-x-4 bg-red-500/90 px-10 py-4 rounded-full border-4 border-white shadow-red-200">
                  <i className="fas fa-times-circle"></i>
                  <span>SO CLOSE!</span>
                </div>
              )}
            </div>
          </main>
        </>
      )}

      <footer className="fixed bottom-4 left-0 right-0 z-30 text-center opacity-40">
        <p className="text-white text-[10px] font-black uppercase tracking-[0.4em]">Math Whiz Challenge • Elite Hall of Fame</p>
      </footer>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-12px); }
          75% { transform: translateX(12px); }
        }
        .shake { animation: shake 0.15s ease-in-out 0s 2; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        body { background-color: #0f172a; overflow-x: hidden; }
      `}</style>
    </div>
  );
};

export default App;
