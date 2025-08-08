import { useEffect, useRef } from 'react';

export const useGameLoop = (callback: (deltaTime: number) => void, isRunning: boolean) => {
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const animate = (time: number) => {
      if (lastTimeRef.current != null) {
        const deltaTime = time - lastTimeRef.current;
        callbackRef.current(deltaTime);
      }
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    if (isRunning) {
      lastTimeRef.current = null;
      requestRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isRunning]);
};
