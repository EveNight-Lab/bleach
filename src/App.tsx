import React, { useState } from 'react';
import { TitleScreen } from './components/TitleScreen';
import { CharacterInfoScreen } from './components/CharacterInfoScreen';
import { GameScreen } from './components/GameScreen';
import { RotateLandscapeOverlay } from './components/RotateLandscapeOverlay';
import { state } from './core/GameState';
import { ScreenState } from './types/game';
import { rollRandomCharacter } from './managers/CharacterRoll';

export const App: React.FC = () => {
  const [screen, setScreen] = useState<ScreenState>('title');

  const goToInfo = () => {
    setScreen('info');
  };

  const goToBattle = () => {
    state.screen = 'battle';
    setScreen('battle');
  };

  const goToTitle = () => {
    state.screen = 'title';
    setScreen('title');
  };

  return (
    <main className="w-dvw h-dvh overflow-hidden bg-slate-950 text-slate-100 font-sans select-none relative">
      <RotateLandscapeOverlay />

      {screen === 'title' && (
        <TitleScreen onStartRoll={goToInfo} />
      )}

      {screen === 'info' && (
        <CharacterInfoScreen
          onStartBattle={goToBattle}
          onReRoll={() => setScreen('info')}
        />
      )}

      {screen === 'battle' && (
        <GameScreen
          onReturnToTitle={goToTitle}
          onReRollCharacter={goToInfo}
        />
      )}
    </main>
  );
};

export default App;
