import React from 'react';

interface StartScreenProps {
  onStart: () => void;
  error: string | null;
  isLoading: boolean;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart, error, isLoading }) => {
  return (
    <div className="z-20 flex flex-col items-center justify-center text-center p-8 bg-black bg-opacity-60 rounded-xl shadow-2xl">
      <h1 className="text-6xl text-yellow-300 mb-4 drop-shadow-[0_4px_2px_rgba(0,0,0,0.5)]">Gemini Platformer</h1>
      <p className="text-xl text-slate-200 mb-8">A new adventure in every run, powered by AI.</p>
      <button
        onClick={onStart}
        disabled={isLoading}
        className="px-8 py-4 bg-green-500 text-white text-2xl rounded-lg hover:bg-green-600 active:bg-green-700 transform hover:scale-110 transition-all duration-200 shadow-lg disabled:bg-gray-500 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Loading...' : 'Start Game'}
      </button>
      {error && <p className="mt-6 text-red-400 bg-red-900 bg-opacity-50 p-3 rounded">{error}</p>}
    </div>
  );
};

export default StartScreen;