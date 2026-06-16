import { useEffect } from 'react';
import Coloris from '@melloware/coloris';
import '@melloware/coloris/dist/coloris.css';
import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import { SWATCH_PALETTE } from './engine/config';
import './App.css';

function App() {
  useEffect(() => {
    Coloris.init();
    Coloris({
      el: '[data-coloris]',
      themeMode: 'light',
      theme: 'default',
      format: 'hex',
      alpha: false,
      closeButton: false,
      swatches: SWATCH_PALETTE,
    });
  }, []);

  return (
    <>
      <Sidebar />
      <Canvas />
    </>
  );
}

export default App;
