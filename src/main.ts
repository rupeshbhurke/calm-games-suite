import './styles/main.css';
import { applyTheme, themeForHour } from './core/theme';
import { breathPhase } from './core/breath';

const app = document.querySelector<HTMLElement>('#app');

if (app) {
  applyTheme(themeForHour(new Date().getHours()));

  app.innerHTML = `
    <section>
      <h1>Calm Games Suite</h1>
      <p>Take a slow breath. The games are on their way.</p>
      <div class="breath" aria-hidden="true"></div>
      <p class="breath-label" aria-live="polite"></p>
      <p class="version">v${__APP_VERSION__}</p>
    </section>
  `;

  const label = app.querySelector<HTMLElement>('.breath-label');
  const start = performance.now();
  const tick = () => {
    if (label) label.textContent = breathPhase((performance.now() - start) / 1000);
  };
  tick();
  setInterval(tick, 250);
}
