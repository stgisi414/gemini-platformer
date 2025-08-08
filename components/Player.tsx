
import React, { useState, useEffect } from 'react';
import { PlayerState } from '../types';
import { PLAYER_WIDTH, PLAYER_HEIGHT } from '../constants';

interface PlayerProps {
  state: PlayerState;
}

const Player: React.FC<PlayerProps> = ({ state }) => {
  const { position, animationState } = state;
  const [legRotation, setLegRotation] = useState(0);

  useEffect(() => {
    if (animationState === 'run') {
      const interval = setInterval(() => {
        setLegRotation(prev => (prev === 20 ? -20 : 20));
      }, 150);
      return () => clearInterval(interval);
    } else {
        setLegRotation(0);
    }
  }, [animationState]);

  const bodyTransform = () => {
      if(animationState === 'jump') return 'scaleY(1.1) translateY(-5%)';
      if(animationState === 'run') return 'translateY(1%)'; // slight bob
      return 'translateY(0)';
  }

  return (
    <div
      className="absolute"
      style={{
        left: position.x,
        top: position.y,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        willChange: 'transform'
      }}
    >
      <svg
        viewBox="0 0 80 95"
        className="w-full h-full"
        style={{ transform: `scaleX(${state.velocity.x < 0 ? -1 : 1})`}}
      >
        <g style={{ transition: 'transform 0.1s ease-out', transform: bodyTransform() }}>
            {/* Legs */}
            <rect x="25" y="70" width="10" height="25" fill="#1E40AF" style={{ transformOrigin: 'center 70px', transform: `rotate(${animationState === 'run' ? legRotation : 5}deg)`, transition: 'transform 0.15s linear' }}/>
            <rect x="45" y="70" width="10" height="25" fill="#1E40AF" style={{ transformOrigin: 'center 70px', transform: `rotate(${animationState === 'run' ? -legRotation : -5}deg)`, transition: 'transform 0.15s linear' }}/>
            {/* Body */}
            <rect x="20" y="30" width="40" height="45" rx="10" fill="#3B82F6" />
            {/* Head */}
            <circle cx="40" cy="20" r="20" fill="#93C5FD" />
            {/* Eyes */}
            <circle cx="32" cy="20" r="3" fill="white" />
            <circle cx="48" cy="20" r="3" fill="white" />
            <circle cx="33" cy="20" r="1.5" fill="black" />
            <circle cx="49" cy="20" r="1.5" fill="black" />
        </g>
      </svg>
    </div>
  );
};

export default Player;
