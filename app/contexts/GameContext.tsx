import React, { createContext, useContext, useState } from 'react';

interface GameContextType {
  isHiragana: boolean;
  setIsHiragana: (value: boolean) => void;
  isSingleMode: boolean;
  setIsSingleMode: (value: boolean) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [isHiragana, setIsHiragana] = useState(true);
  const [isSingleMode, setIsSingleMode] = useState(false);

  return (
    <GameContext.Provider value={{ isHiragana, setIsHiragana, isSingleMode, setIsSingleMode }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
} 