const Settings = (() => {
  const state = {
    volumeMusic: 0.5,
    volumeFX: 0.7,
    lightingEnabled: true
  };

  function init() {
    const saved = localStorage.getItem('two-to-one-settings');
    if (saved) {
      Object.assign(state, JSON.parse(saved));
    }
    applyAll();
    updateUI();
  }

  function applyAll() {
    if (typeof AudioManager !== 'undefined') {
      AudioManager.setVolume(state.volumeMusic);
      // SFX volume is handled per-play in AudioManager
    }
  }

  function updateUI() {
    const musicRange = document.getElementById('volume-music');
    const fxRange = document.getElementById('volume-fx');
    const lightingCheck = document.getElementById('gfx-lighting');

    if (musicRange) musicRange.value = state.volumeMusic;
    if (fxRange) fxRange.value = state.volumeFX;
    if (lightingCheck) lightingCheck.checked = state.lightingEnabled;
  }

  function save() {
    localStorage.setItem('two-to-one-settings', JSON.stringify(state));
  }

  function setMusicVolume(val) {
    state.volumeMusic = parseFloat(val);
    if (typeof AudioManager !== 'undefined') {
      AudioManager.setVolume(state.volumeMusic);
    }
    save();
  }

  function setFXVolume(val) {
    state.volumeFX = parseFloat(val);
    save();
  }

  function setLighting(enabled) {
    state.lightingEnabled = enabled;
    save();
  }

  function isLightingEnabled() {
    return state.lightingEnabled;
  }

  function getFXVolume() {
    return state.volumeFX;
  }

  return { init, setMusicVolume, setFXVolume, setLighting, isLightingEnabled, getFXVolume };
})();

window.addEventListener('DOMContentLoaded', Settings.init);
