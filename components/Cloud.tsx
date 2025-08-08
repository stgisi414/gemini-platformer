import React from 'react';

interface CloudProps {
  x: number;
  y: number;
  scale: number;
  opacity: number;
  parallaxFactor: number;
  cameraX: number;
}

const Cloud: React.FC<CloudProps> = ({ x, y, scale, opacity, parallaxFactor, cameraX }) => {
  const style: React.CSSProperties = {
    position: 'absolute',
    top: `${y}px`,
    left: `${x}px`,
    transform: `translateX(-${cameraX * parallaxFactor}px) scale(${scale})`,
    zIndex: -10,
    willChange: 'transform',
  };

  const cloudPartStyle: React.CSSProperties = {
    position: 'absolute',
    background: 'white',
    borderRadius: '50%',
    opacity: opacity,
  };

  return (
    <div style={style}>
      <div style={{ ...cloudPartStyle, top: '15px', width: '100px', height: '100px' }}></div>
      <div style={{ ...cloudPartStyle, left: '80px', top: '0px', width: '120px', height: '120px' }}></div>
      <div style={{ ...cloudPartStyle, left: '170px', top: '10px', width: '100px', height: '100px' }}></div>
    </div>
  );
};

export default Cloud;