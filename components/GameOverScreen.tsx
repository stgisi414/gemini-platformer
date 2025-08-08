import React from 'react';

interface GameOverScreenProps {
  score: number;
  onRestart: () => void;
  isLoading: boolean;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ score, onRestart, isLoading }) => {
  return (
    <div className="z-20 flex flex-col items-center justify-center text-center p-8 bg-black bg-opacity-60 rounded-xl shadow-2xl">
      <h1 className="text-6xl text-red-500 mb-4 drop-shadow-[0_4px_2px_rgba(0,0,0,0.5)]">Game Over</h1>
      <p className="text-3xl text-slate-200 mb-8">Final Score: <span className="text-yellow-300">{score}</span></p>
      <button
        onClick={onRestart}
        disabled={isLoading}
        className="px-8 py-4 bg-blue-500 text-white text-2xl rounded-lg hover:bg-blue-600 active:bg-blue-700 transform hover:scale-110 transition-all duration-200 shadow-lg disabled:bg-gray-500 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Loading...' : 'Try Again'}
      </button>
    </div>
  );
};

export default GameOverScreen;