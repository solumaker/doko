import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Los <input type="number"> cambian su valor al hacer scroll con la rueda del
// raton mientras tienen el foco (p. ej. al desplazar la pagina hacia el
// siguiente campo del formulario), restando o sumando una unidad en silencio.
// Se desenfoca el campo en cuanto empieza el scroll para que ese primer
// "tick" de la rueda no lo modifique y el scroll de la pagina siga su curso.
document.addEventListener(
  'wheel',
  () => {
    const active = document.activeElement;
    if (active instanceof HTMLInputElement && active.type === 'number') {
      active.blur();
    }
  },
  { passive: true }
);

// Mismo problema con las flechas arriba/abajo del teclado: en un <input
// type="number"> suman o restan una unidad en lugar de mover el cursor,
// asi que un toque accidental (p. ej. al navegar entre campos por costumbre)
// cambia el valor en silencio. Las flechas izquierda/derecha no se tocan,
// siguen moviendo el cursor con normalidad.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
  const active = document.activeElement;
  if (active instanceof HTMLInputElement && active.type === 'number') {
    e.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
