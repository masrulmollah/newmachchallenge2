
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateQuestion } from './services/mathLogic';
import { VoiceAssistant } from './services/voiceService';
import { Question, QuestionType, InteractionMode, GameState, HighScore } from './types';

const STORAGE_KEY = 'math_whiz_high_scores';

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
        console.error("Failed to parse high scores", e);
      }
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
      const newScores = [...prev.highScores];
      // Check if this user already has a score and update it, or add new
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
    
    const isCorrect = userAnswer === correctAnswer || userAnswer.split(' ').includes(correctAnswer);
    
    const newScore = isCorrect ? gameState.score + 10 : Math.max(0, gameState.score - 5);

    setGameState(prev => ({
      ...prev,
      score: newScore,
      feedback: isCorrect ? 'correct' : 'wrong',
      streak: isCorrect ? prev.streak + 1 : 0
    }));

    // Every time score changes, check for high score update
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
        (partialText) => setTranscribedText(partialText),
        (finalText) => {
          const matches = finalText.match(/\d+/);
          if (matches) handleAnswer(matches[0]);
        }
      );
      await assistant.start();
      voiceAssistantRef.current = assistant;
      setIsVoiceActive(true);
    }
  };

  const { currentQuestion, score, feedback, streak, highScores, username } = gameState;

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex flex-col items-center justify-center p-4">
      
      {/* Dynamic Photo Background Layer */}
      <div className="fixed inset-0 z-0 flex w-full h-full">
        <div className="relative flex-1 h-full overflow-hidden">
          <img 
            src="input_file_1.png" 
            className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105"
            alt="Background 1" 
          />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/40 via-blue-500/20 to-transparent"></div>
        </div>
        <div className="relative flex-1 h-full overflow-hidden">
          <img 
            src="input_file_0.png" 
            className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105"
            alt="Background 2" 
          />
          <div className="absolute inset-0 bg-gradient-to-l from-red-900/40 via-red-500/20 to-transparent"></div>
        </div>
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]"></div>
      </div>

      {/* Login / Start Screen */}
      {!isStarted && (
        <div className="relative z-40 w-full max-w-md animate-fade-in">
          <div className="backdrop-blur-2xl bg-white/80 p-10 rounded-[3rem] shadow-2xl border border-white/40 text-center">
            <h1 className="text-4xl font-fredoka text-blue-700 mb-6">Welcome, Whiz Kid!</h1>
            <p className="text-gray-600 mb-8 font-semibold">Enter your name to join the Hall of Fame</p>
            <input 
              type="text" 
              placeholder="Your Name..."
              value={tempUsername}
              onChange={(e) => setTempUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleStart()}
              className="w-full text-center text-2xl font-fredoka bg-blue-50/50 border-b-4 border-blue-200 rounded-2xl p-4 focus:outline-none focus:border-blue-500 text-blue-800 placeholder-blue-200 mb-8 transition-all"
            />
            <button 
              onClick={handleStart}
              className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-[2rem] font-black text-2xl shadow-xl hover:shadow-2xl active:scale-95 border-b-8 border-indigo-900 transition-all"
            >
              START CHALLENGE
            </button>
          </div>
        </div>
      )}

      {/* Game Content */}
      {isStarted && (
        <>
          {/* Glassmorphic Header */}
          <header className="fixed top-0 left-0 right-0 z-30 p-4 md:p-6 backdrop-blur-md bg-white/30 border-b border-white/20">
            <div className="max-w-6xl mx-auto flex justify-between items-center w-full">
              <div className="flex items-center space-x-4">
                <div className="bg-white/80 px-4 md:px-5 py-2 rounded-full shadow-lg border border-white flex items-center space-x-2">
                  <span className="text-sm font-black text-indigo-400 uppercase tracking-tighter hidden sm:inline">{username}:</span>
                  <i className="fas fa-star text-yellow-500 text-xl"></i>
                  <span className="text-2xl font-fredoka text-blue-700">{score}</span>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <button 
                  onClick={toggleVoice}
                  className={`px-4 md:px-6 py-2 rounded-full font-bold shadow-2xl transition-all flex items-center space-x-2 border-b-4 active:border-b-0 active:translate-y-1 ${
                    isVoiceActive 
                      ? 'bg-red-600 border-red-800 text-white' 
                      : 'bg-indigo-600 border-indigo-900 text-white'
                  }`}
                >
                  <i className={`fas ${isVoiceActive ? 'fa-stop-circle' : 'fa-microphone-alt'}`}></i>
                  <span className="uppercase tracking-widest text-xs font-black hidden sm:inline">
                    {isVoiceActive ? 'Stop' : 'Voice'}
                  </span>
                </button>
              </div>
            </div>
          </header>

          {/* Left Side: Scoreboard */}
          <div className="fixed left-6 top-32 z-30 hidden xl:block w-64">
            <div className="backdrop-blur-xl bg-white/40 p-6 rounded-[2.5rem] border border-white/40 shadow-xl">
              <h2 className="text-center font-fredoka text-indigo-800 text-xl mb-4 tracking-wider uppercase">Top 3 Whiz Kids</h2>
              <div className="space-y-3">
                {highScores.length === 0 ? (
                  <p className="text-center text-indigo-400 text-sm font-bold animate-pulse">Waiting for champions...</p>
                ) : (
                  highScores.map((hs, idx) => (
                    <div key={idx} className={`flex items-center justify-between p-3 rounded-2xl bg-white/60 border ${idx === 0 ? 'border-yellow-300 ring-2 ring-yellow-100 shadow-yellow-100' : 'border-white/20'}`}>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                        </span>
                        <span className="font-black text-indigo-900 text-sm truncate max-w-[100px]">{hs.name}</span>
                      </div>
                      <span className="font-fredoka text-indigo-600">{hs.score}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Main Game Interface */}
          <main className="relative z-10 w-full max-w-2xl mt-16 px-4">
            {currentQuestion && (
              <div className={`relative backdrop-blur-xl bg-white/70 rounded-[3.5rem] p-8 md:p-14 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border border-white/40 transition-all duration-500 ${
                feedback === 'correct' ? 'scale-105 border-green-400/50 bg-green-50/70' : 
                feedback === 'wrong' ? 'shake border-red-400/50 bg-red-50/70' : ''
              }`}>
                
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-8 py-2 rounded-full shadow-xl font-black text-xs tracking-widest uppercase">
                  {currentQuestion.type.replace('_', ' ')}
                </div>

                <div className="text-center mb-12">
                  <h1 className="text-7xl md:text-9xl font-fredoka text-gray-800 tracking-tighter filter drop-shadow-xl">
                    {currentQuestion.prompt}
                  </h1>
                </div>

                <div className="space-y-8">
                  {currentQuestion.mode === InteractionMode.MULTIPLE_CHOICE ? (
                    <div className="grid grid-cols-2 gap-4 md:gap-6">
                      {currentQuestion.options?.map((opt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleAnswer(opt)}
                          disabled={!!feedback}
                          className={`py-6 md:py-8 rounded-[2rem] text-4xl font-black transition-all border-b-8 active:border-b-0 active:translate-y-1 shadow-lg ${
                            feedback === 'correct' && opt === currentQuestion.answer ? 'bg-green-500 text-white border-green-700' :
                            feedback === 'wrong' && opt === currentQuestion.answer ? 'bg-green-200 text-green-900 border-green-500' :
                            'bg-white/80 text-indigo-700 border-gray-200 hover:bg-white hover:-translate-y-1'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-6">
                      <input
                        type="number"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAnswer(inputValue)}
                        disabled={!!feedback}
                        autoFocus
                        placeholder="?"
                        className="w-full max-w-xs text-center text-7xl font-fredoka bg-white/50 border-b-8 border-indigo-200 rounded-3xl p-6 focus:outline-none focus:border-indigo-500 text-indigo-700 placeholder-indigo-100 transition-all"
                      />
                      <button
                        onClick={() => handleAnswer(inputValue)}
                        disabled={!!feedback || !inputValue}
                        className="w-full max-w-xs py-5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-[2rem] font-black text-2xl shadow-xl hover:shadow-2xl active:scale-95 border-b-8 border-indigo-900"
                      >
                        CHECK ANSWER
                      </button>
                    </div>
                  )}
                </div>

                {isVoiceActive && (
                  <div className="mt-10 flex flex-col items-center p-5 bg-white/40 rounded-3xl border border-white/50 animate-pulse">
                    <div className="flex items-center space-x-3 text-indigo-600 mb-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_10px_red]"></div>
                      <span className="text-xs font-black uppercase tracking-[0.2em]">Voice Active</span>
                    </div>
                    <p className="text-xl text-gray-800 font-bold italic h-8">
                      {transcribedText ? `"${transcribedText}"` : "Waiting for your answer..."}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Feedback Messages */}
            <div className="h-24 flex items-center justify-center mt-8 pointer-events-none">
              {feedback === 'correct' && (
                <div className="text-white text-5xl font-fredoka animate-bounce drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] flex items-center space-x-4 bg-green-500/80 px-8 py-3 rounded-full border-4 border-white">
                  <i className="fas fa-check-circle"></i>
                  <span>WOW! +10</span>
                </div>
              )}
              {feedback === 'wrong' && (
                <div className="text-white text-5xl font-fredoka drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] flex items-center space-x-4 bg-red-500/80 px-8 py-3 rounded-full border-4 border-white">
                  <i className="fas fa-times-circle"></i>
                  <span>OOPS! -5</span>
                </div>
              )}
            </div>
          </main>

          {/* Small Scoreboard for Mobile/Tablet (Visible when XL is hidden) */}
          <div className="fixed bottom-10 left-4 right-4 z-30 xl:hidden">
            <div className="backdrop-blur-xl bg-white/40 p-4 rounded-3xl border border-white/40 shadow-xl flex items-center justify-center space-x-4 overflow-x-auto no-scrollbar">
               <span className="text-indigo-800 font-black text-xs uppercase tracking-widest shrink-0">TOP 3:</span>
               {highScores.map((hs, idx) => (
                 <div key={idx} className="flex items-center space-x-2 bg-white/60 px-3 py-1 rounded-full border border-white shrink-0">
                    <span className="text-sm">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                    <span className="font-bold text-indigo-900 text-xs truncate max-w-[60px]">{hs.name}</span>
                    <span className="font-fredoka text-indigo-600 text-xs">{hs.score}</span>
                 </div>
               ))}
            </div>
          </div>
        </>
      )}

      <footer className="fixed bottom-4 left-0 right-0 z-30 text-center">
        <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em] drop-shadow-md">
          Personalized Math Whiz Experience • Champion {username || '...'}
        </p>
      </footer>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-12px); }
          75% { transform: translateX(12px); }
        }
        .shake {
          animation: shake 0.15s ease-in-out 0s 2;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .animate-fade-in {
          animation: fadeIn 0.8s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        body {
          background-color: #0f172a;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default App;
