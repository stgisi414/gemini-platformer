import React from 'react';
import { TILE_SIZE } from '../constants';

interface LaserProps {
  x: number;
  y: number;
}

const Laser: React.FC<LaserProps> = ({ x, y }) => {
  const style: React.CSSProperties = {
    position: 'absolute',
    left: x,
    top: y,
    width: TILE_SIZE * 0.75,
    height: TILE_SIZE * 0.15,
    backgroundColor: '#ff0000',
    boxShadow: '0 0 15px 5px #ff0000, 0 0 5px 2px #ffdddd',
    borderRadius: '8px',
    willChange: 'transform',
  };

  return <div style={style} />;
};

export default Laser;
