// Minh Pham Style Shared Navigation & Audio Dock
(function() {
  const currentPath = window.location.pathname;

  // Determine active section
  let active = 'home';
  if (currentPath.includes('/feed/')) active = 'feed';
  else if (currentPath.includes('/notebook/')) active = 'notebook';
  else if (currentPath.includes('/dives/')) active = 'dives';
  else if (currentPath.includes('/contact/')) active = 'contact';

  // Base prefix for URLs
  const isSubdir = currentPath.includes('/feed/') || currentPath.includes('/notebook/') || currentPath.includes('/dives/') || currentPath.includes('/contact/');
  const root = isSubdir ? '../' : './';

  // 1. TOP RIGHT STICKY MINIMAL NAV (Minh Pham Style)
  const navHtml = `
    <nav class="mp-nav" id="mpNav" aria-label="Main Navigation">
      <a href="${root}index.html" class="mp-nav-link ${active === 'home' ? 'is-active' : ''}">
        <span class="mp-nav-inner">
          <span class="mp-nav-deep">ABOUT</span>
          <span class="mp-nav-active">ABOUT</span>
        </span>
      </a>
      <a href="${root}feed/index.html" class="mp-nav-link ${active === 'feed' ? 'is-active' : ''}">
        <span class="mp-nav-inner">
          <span class="mp-nav-deep">FEED</span>
          <span class="mp-nav-active">FEED</span>
        </span>
      </a>
      <a href="${root}notebook/index.html" class="mp-nav-link ${active === 'notebook' ? 'is-active' : ''}">
        <span class="mp-nav-inner">
          <span class="mp-nav-deep">NOTEBOOK</span>
          <span class="mp-nav-active">NOTEBOOK</span>
        </span>
      </a>
      <a href="${root}dives/index.html" class="mp-nav-link ${active === 'dives' ? 'is-active' : ''}">
        <span class="mp-nav-inner">
          <span class="mp-nav-deep">WORK</span>
          <span class="mp-nav-active">WORK</span>
        </span>
      </a>
      <a href="${root}contact/index.html" class="mp-nav-link ${active === 'contact' ? 'is-active' : ''}">
        <span class="mp-nav-inner">
          <span class="mp-nav-deep">CONTACT</span>
          <span class="mp-nav-active">CONTACT</span>
        </span>
      </a>
    </nav>

    <!-- BOTTOM RIGHT ROTATED SOUND TOGGLE (Minh Pham Style) -->
    <button class="mp-sound-toggle" id="mpSoundToggle" type="button" aria-label="Toggle ambient sound">
      <span class="mp-sound-label">SOUND <span id="mpSoundState">ON</span></span>
    </button>
  `;

  const styleHtml = `
    <style>
      /* Top Right Minimalist Navigation (Minh Pham) */
      .mp-nav {
        position: fixed;
        top: clamp(24px, 4vw, 42px);
        right: clamp(24px, 4vw, 48px);
        z-index: 99999;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 6px;
        pointer-events: auto;
        font-family: 'JetBrains Mono', monospace, -apple-system, sans-serif;
        mix-blend-mode: difference;
      }
      .mp-nav-link {
        color: #FFFFFF;
        text-decoration: none;
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0.16em;
        line-height: 1.4;
        text-transform: uppercase;
        position: relative;
        overflow: hidden;
        display: block;
        opacity: 0.45;
        transition: opacity 220ms ease;
      }
      .mp-nav-link:hover,
      .mp-nav-link.is-active {
        opacity: 1;
      }
      .mp-nav-link.is-active::after {
        content: '';
        position: absolute;
        bottom: 0;
        right: 0;
        width: 100%;
        height: 1px;
        background: currentColor;
      }

      /* Bottom Right Rotated Sound Toggle (Minh Pham) */
      .mp-sound-toggle {
        position: fixed;
        bottom: clamp(36px, 6vh, 64px);
        right: clamp(24px, 4vw, 48px);
        z-index: 99999;
        display: flex;
        align-items: center;
        background: transparent;
        border: none;
        padding: 0;
        cursor: pointer;
        outline: none;
        color: #FFFFFF;
        mix-blend-mode: difference;
        transform: rotate(-90deg);
        transform-origin: right center;
        opacity: 0.55;
        transition: opacity 200ms ease;
        font-family: 'JetBrains Mono', monospace, sans-serif;
        font-size: 10px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }
      .mp-sound-toggle:hover {
        opacity: 1;
      }
      .mp-sound-toggle[data-sound="off"] #mpSoundState {
        opacity: 0.4;
        text-decoration: line-through;
      }
    </style>
  `;

  // Inject styles and nav
  document.head.insertAdjacentHTML('beforeend', styleHtml);
  document.body.insertAdjacentHTML('afterbegin', navHtml);

  // Sound Toggle interaction
  const soundBtn = document.getElementById('mpSoundToggle');
  const soundState = document.getElementById('mpSoundState');
  let isSoundOn = localStorage.getItem('mp-sound') !== 'off';

  function updateSoundUI() {
    if (isSoundOn) {
      soundBtn.dataset.sound = 'on';
      soundState.textContent = 'ON';
    } else {
      soundBtn.dataset.sound = 'off';
      soundState.textContent = 'OFF';
    }
  }

  soundBtn.addEventListener('click', () => {
    isSoundOn = !isSoundOn;
    localStorage.setItem('mp-sound', isSoundOn ? 'on' : 'off');
    updateSoundUI();
  });

  updateSoundUI();
})();
