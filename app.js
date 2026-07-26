(() => {
  'use strict';

  const display = document.getElementById('timeDisplay');
  const startButton = document.getElementById('startButton');
  const pauseButton = document.getElementById('pauseButton');
  const resetButton = document.getElementById('resetButton');

  let running = false;
  let startedAt = 0;
  let elapsedBeforeStart = 0;
  let animationFrameId = null;
  let wakeLock = null;

  function currentElapsedMs() {
    return running
      ? elapsedBeforeStart + (performance.now() - startedAt)
      : elapsedBeforeStart;
  }

  function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const seconds = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);

    if (totalMinutes < 60) {
      return `${String(totalMinutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function render() {
    display.textContent = formatTime(currentElapsedMs());
    if (running) {
      animationFrameId = requestAnimationFrame(render);
    }
  }

  async function requestWakeLock() {
    if (!('wakeLock' in navigator) || wakeLock) return;
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        wakeLock = null;
      });
    } catch (_) {
      wakeLock = null;
    }
  }

  async function releaseWakeLock() {
    if (!wakeLock) return;
    try {
      await wakeLock.release();
    } catch (_) {
      // Ignore release errors.
    } finally {
      wakeLock = null;
    }
  }

  function updateButtons() {
    startButton.disabled = running;
    pauseButton.disabled = !running;
    resetButton.disabled = running;
  }

  function start() {
    if (running) return;
    running = true;
    startedAt = performance.now();
    updateButtons();
    requestWakeLock();
    render();
  }

  function pause() {
    if (!running) return;
    elapsedBeforeStart = currentElapsedMs();
    running = false;
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    updateButtons();
    render();
    releaseWakeLock();
  }

  function reset() {
    if (running) return;
    elapsedBeforeStart = 0;
    startedAt = 0;
    render();
  }

  function toggleStartPause() {
    if (running) pause();
    else start();
  }

  startButton.addEventListener('click', start);
  pauseButton.addEventListener('click', pause);
  resetButton.addEventListener('click', reset);

  document.addEventListener('keydown', (event) => {
    if (event.repeat) return;

    if (event.code === 'Space') {
      event.preventDefault();
      toggleStartPause();
    }

    if (event.key.toLowerCase() === 'r') {
      event.preventDefault();
      reset();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (running) {
        requestWakeLock();
        render();
      }
    }
  });

  window.addEventListener('beforeunload', releaseWakeLock);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch(() => {});
    });
  }

  updateButtons();
  render();
})();
