import React from 'react';
import { PlayerState } from '../types';
import { PLAYER_WIDTH, PLAYER_HEIGHT, ASSET_URLS } from '../constants';

interface PlayerProps {
  state: PlayerState;
}

const Player: React.FC<PlayerProps> = ({ state }) => {
  const { position, animationState } = state;

  const playerImageStyle: React.CSSProperties = {
    transform: `scaleX(${state.velocity.x < 0 ? -1 : 1})`,
    transition: 'transform 0.1s ease-out',
  };

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
      <img
        src={ASSET_URLS.player}
        alt="Player"
        className="w-full h-full"
        style={playerImageStyle}
      />
    </div>
  );
};

export default Player;