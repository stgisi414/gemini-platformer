
import React from 'react';

interface GameUIProps {
  score: number;
}

const GameUI: React.FC<GameUIProps> = ({ score }) => {
  return (
    <div className="absolute top-4 left-4 text-white text-2xl z-10 p-2 bg-black bg-opacity-40 rounded">
      Score: {score}
    </div>
  );
};

export default GameUI;
