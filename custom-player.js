class CustomPlayer {
  constructor(options = {}) {
    this.container = options.container;
    this.sources = options.sources || [];
    this.poster = options.poster || '';
    this.autoplay = options.autoplay || false;
    this.muted = options.muted || false;
    this.loop = options.loop || false;
    this.preload = options.preload || 'metadata';
    
    this.video = null;
    this.controls = null;
    this.isPlaying = false;
    this.isFullscreen = false;
    this.isMuted = this.muted;
    this.currentVolume = 1;
    this.controlsTimeout = null;
    this.hls = null;
    this.dash = null;
    
    this.bindMethods();
  }
  
  bindMethods() {
    this.handleTimeUpdate = this.handleTimeUpdate.bind(this);
    this.handleProgress = this.handleProgress.bind(this);
    this.handleLoadedMetadata = this.handleLoadedMetadata.bind(this);
    this.handlePlay = this.handlePlay.bind(this);
    this.handlePause = this.handlePause.bind(this);
    this.handleEnded = this.handleEnded.bind(this);
    this.handleVolumeChange = this.handleVolumeChange.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleWaiting = this.handleWaiting.bind(this);
    this.handleCanPlay = this.handleCanPlay.bind(this);
    this.handleFullscreenChange = this.handleFullscreenChange.bind(this);
    this.showControls = this.showControls.bind(this);
    this.hideControls = this.hideControls.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }
  
  async init() {
    if (!this.container) {
      throw new Error('Container element is required');
    }
    
    this.createPlayerStructure();
    await this.loadSources();
    this.bindEvents();
    
    if (this.autoplay) {
      this.play().catch(() => {});
    }
    
    return this;
  }
  
  createPlayerStructure() {
    this.container.innerHTML = '';
    this.container.classList.add('custom-player');
    
    this.video = document.createElement('video');
    this.video.className = 'custom-player__video';
    this.video.playsInline = true;
    this.video.preload = this.preload;
    this.video.muted = this.muted;
    this.video.loop = this.loop;
    if (this.poster) this.video.poster = this.poster;
    
    this.controls = document.createElement('div');
    this.controls.className = 'custom-player__controls';
    this.controls.innerHTML = this.getControlsHTML();
    
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'custom-player__loading';
    loadingOverlay.innerHTML = '<div class="custom-player__spinner"></div>';
    
    const errorOverlay = document.createElement('div');
    errorOverlay.className = 'custom-player__error hidden';
    errorOverlay.innerHTML = `
      <div class="custom-player__error-content">
        <svg class="custom-player__error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        <p class="custom-player__error-message">Error al cargar el video</p>
        <button class="custom-player__error-retry">Reintentar</button>
      </div>
    `;
    
    const centerPlay = document.createElement('button');
    centerPlay.className = 'custom-player__center-play';
    centerPlay.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z"/>
      </svg>
    `;
    centerPlay.setAttribute('aria-label', 'Reproducir');
    
    this.container.appendChild(this.video);
    this.container.appendChild(this.controls);
    this.container.appendChild(loadingOverlay);
    this.container.appendChild(errorOverlay);
    this.container.appendChild(centerPlay);
    
    this.centerPlayBtn = centerPlay;
    this.loadingOverlay = loadingOverlay;
    this.errorOverlay = errorOverlay;
    
    this.updateMuteButton();
    this.updatePlayButton();
  }
  
  getControlsHTML() {
    return `
      <div class="custom-player__progress-wrapper">
        <div class="custom-player__progress" role="slider" aria-label="Progreso del video" tabindex="0">
          <div class="custom-player__progress-loaded"></div>
          <div class="custom-player__progress-played"></div>
          <div class="custom-player__progress-hover"></div>
          <div class="custom-player__progress-tooltip"></div>
        </div>
        <div class="custom-player__time">
          <span class="custom-player__current-time">0:00</span>
          <span class="custom-player__time-separator">/</span>
          <span class="custom-player__duration">0:00</span>
        </div>
      </div>
      <div class="custom-player__controls-right">
        <div class="custom-player__speed-selector">
          <button class="custom-player__speed-btn" aria-label="Velocidad">1x</button>
          <div class="custom-player__speed-menu hidden">
            <button data-speed="0.5">0.5x</button>
            <button data-speed="0.75">0.75x</button>
            <button data-speed="1" class="active">1x</button>
            <button data-speed="1.25">1.25x</button>
            <button data-speed="1.5">1.5x</button>
            <button data-speed="2">2x</button>
          </div>
        </div>
        <div class="custom-player__quality-selector hidden">
          <button class="custom-player__quality-btn" aria-label="Calidad">Auto</button>
          <div class="custom-player__quality-menu hidden"></div>
        </div>
        <div class="custom-player__subtitle-selector hidden">
          <button class="custom-player__subtitle-btn" aria-label="Subtítulos">CC</button>
          <div class="custom-player__subtitle-menu hidden"></div>
        </div>
        <div class="custom-player__volume">
          <button class="custom-player__mute-btn" aria-label="Silenciar">
            <svg class="custom-player__icon-volume" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            </svg>
            <svg class="custom-player__icon-muted hidden" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
            </svg>
          </button>
          <input type="range" class="custom-player__volume-slider" min="0" max="1" step="0.1" value="1" aria-label="Volumen">
        </div>
        <button class="custom-player__fullscreen-btn" aria-label="Pantalla completa">
          <svg class="custom-player__icon-fullscreen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>
          </svg>
          <svg class="custom-player__icon-exit-fullscreen hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 3v3a2 2 0 002 2h3M21 8V5a2 2 0 00-2-2h-3M3 16h3a2 2 0 002-2v-3M16 21v-3a2 2 0 00-2-2h-3"/>
          </svg>
        </button>
      </div>
    `;
  }
  
  async loadSources() {
    if (!this.sources.length) {
      this.showError('No hay fuentes de video disponibles');
      return;
    }
    
    this.showLoading(true);
    
    const primarySource = this.sources[0];
    const type = this.detectSourceType(primarySource.url);
    
    try {
      if (type === 'hls') {
        await this.loadHLS(primarySource.url);
      } else if (type === 'dash') {
        await this.loadDASH(primarySource.url);
      } else {
        this.loadNative(primarySource);
      }
      
      this.setupQualitySelector();
    } catch (error) {
      console.error('CustomPlayer: Error loading sources', error);
      this.showError('No se pudo cargar el video');
    }
  }
  
  detectSourceType(url) {
    if (/\.m3u8/i.test(url)) return 'hls';
    if (/\.mpd/i.test(url)) return 'dash';
    return 'native';
  }
  
  loadNative(source) {
    this.video.innerHTML = '';
    const sourceEl = document.createElement('source');
    sourceEl.src = source.url;
    sourceEl.type = source.type || this.getMimeType(source.url);
    this.video.appendChild(sourceEl);
    this.video.load();
  }
  
  getMimeType(url) {
    if (/\.webm/i.test(url)) return 'video/webm';
    if (/\.mp4/i.test(url)) return 'video/mp4';
    if (/\.ogg/i.test(url)) return 'video/ogg';
    return 'video/mp4';
  }
  
  async loadHLS(url) {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    
    const nativeHLS = this.video.canPlayType('application/vnd.apple.mpegurl');
    
    if (nativeHLS) {
      this.video.src = url;
      this.video.load();
      return;
    }
    
    if (window.Hls && window.Hls.isSupported()) {
      this.hls = new window.Hls({
        enableWorker: true,
        lowLatencyMode: true
      });
      
      this.hls.loadSource(url);
      this.hls.attachMedia(this.video);
      
      this.hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        this.showLoading(false);
        this.setupQualitySelector();
      });
      
      this.hls.on(window.Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error('HLS Error:', data);
          this.showError('Error en la transmisión HLS');
        }
      });
      
      return;
    }
    
    throw new Error('HLS no soportado en este navegador');
  }
  
  async loadDASH(url) {
    if (window.dashjs) {
      this.dash = window.dashjs.MediaPlayer().create();
      this.dash.initialize(this.video, url, false);
      this.dash.setAutoPlay(this.autoplay);
      
      this.dash.on(window.dashjs.MediaPlayer.events.ERROR, (e) => {
        console.error('DASH Error:', e);
        this.showError('Error en la transmisión DASH');
      });
      
      return;
    }
    
    try {
      await this.loadScript('https://cdn.jsdelivr.net/npm/dashjs@4.7.4/dist/dash.all.min.js');
      return this.loadDASH(url);
    } catch {
      throw new Error('No se pudo cargar dash.js');
    }
  }
  
  loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  setupQualitySelector() {
    const qualityBtn = this.controls.querySelector('.custom-player__quality-btn');
    const qualityMenu = this.controls.querySelector('.custom-player__quality-menu');
    const qualitySelector = this.controls.querySelector('.custom-player__quality-selector');
    
    if (!qualityBtn || !qualityMenu) return;
    
    let levels = [];
    
    if (this.hls && this.hls.levels) {
      levels = this.hls.levels.map((level, i) => ({
        label: `${level.height}p`,
        value: i
      }));
    } else if (this.dash && this.dash.getBitrateInfoListFor) {
      const bitrates = this.dash.getBitrateInfoListFor('video');
      levels = bitrates.map((b, i) => ({
        label: `${b.quality || b.height}p`,
        value: i
      }));
    }
    
    if (levels.length > 1) {
      qualitySelector.classList.remove('hidden');
      qualityMenu.innerHTML = levels.map(l => 
        `<button data-quality="${l.value}">${l.label}</button>`
      ).join('');
      qualityMenu.insertAdjacentHTML('afterbegin', '<button data-quality="auto" class="active">Auto</button>');
    }
  }
  
  bindEvents() {
    this.video.addEventListener('timeupdate', this.handleTimeUpdate);
    this.video.addEventListener('loadedmetadata', this.handleLoadedMetadata);
    this.video.addEventListener('play', this.handlePlay);
    this.video.addEventListener('pause', this.handlePause);
    this.video.addEventListener('ended', this.handleEnded);
    this.video.addEventListener('volumechange', this.handleVolumeChange);
    this.video.addEventListener('error', this.handleError);
    this.video.addEventListener('waiting', this.handleWaiting);
    this.video.addEventListener('canplay', this.handleCanPlay);
    
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    
    this.container.addEventListener('mousemove', this.showControls);
    this.container.addEventListener('touchstart', this.showControls, { passive: true });
    this.container.addEventListener('mouseleave', this.hideControls);
    
    this.centerPlayBtn.addEventListener('click', () => this.togglePlay());
    this.video.addEventListener('click', () => this.togglePlay());
    
    const playPauseBtn = this.controls.querySelector('.custom-player__play-btn');
    playPauseBtn?.addEventListener('click', () => this.togglePlay());
    
    const muteBtn = this.controls.querySelector('.custom-player__mute-btn');
    muteBtn?.addEventListener('click', () => this.toggleMute());
    
    const volumeSlider = this.controls.querySelector('.custom-player__volume-slider');
    volumeSlider?.addEventListener('input', (e) => this.setVolume(e.target.value));
    
    const fullscreenBtn = this.controls.querySelector('.custom-player__fullscreen-btn');
    fullscreenBtn?.addEventListener('click', () => this.toggleFullscreen());
    
    const progressBar = this.controls.querySelector('.custom-player__progress');
    progressBar?.addEventListener('click', (e) => this.seekFromProgress(e));
    progressBar?.addEventListener('mousemove', (e) => this.showProgressTooltip(e));
    progressBar?.addEventListener('mouseleave', () => this.hideProgressTooltip());
    
    const speedBtn = this.controls.querySelector('.custom-player__speed-btn');
    const speedMenu = this.controls.querySelector('.custom-player__speed-menu');
    speedBtn?.addEventListener('click', () => speedMenu.classList.toggle('hidden'));
    speedMenu?.addEventListener('click', (e) => {
      if (e.target.dataset.speed) {
        this.setSpeed(parseFloat(e.target.dataset.speed));
        speedMenu.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.speed === e.target.dataset.speed));
        speedBtn.textContent = `${e.target.dataset.speed}x`;
        speedMenu.classList.add('hidden');
      }
    });
    
    const qualityBtn = this.controls.querySelector('.custom-player__quality-btn');
    const qualityMenu = this.controls.querySelector('.custom-player__quality-menu');
    qualityBtn?.addEventListener('click', () => qualityMenu.classList.toggle('hidden'));
    qualityMenu?.addEventListener('click', (e) => {
      if (e.target.dataset.quality !== undefined) {
        this.setQuality(e.target.dataset.quality);
        qualityMenu.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.quality === e.target.dataset.quality));
        qualityBtn.textContent = e.target.dataset.quality === 'auto' ? 'Auto' : e.target.textContent;
        qualityMenu.classList.add('hidden');
      }
    });
    
    const errorRetry = this.errorOverlay.querySelector('.custom-player__error-retry');
    errorRetry?.addEventListener('click', () => this.retry());
    
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        speedMenu?.classList.add('hidden');
        qualityMenu?.classList.add('hidden');
      }
    });
  }
  
  handleTimeUpdate() {
    if (!this.video.duration) return;
    const percent = (this.video.currentTime / this.video.duration) * 100;
    const played = this.controls.querySelector('.custom-player__progress-played');
    if (played) played.style.width = `${percent}%`;
    
    const currentTimeEl = this.controls.querySelector('.custom-player__current-time');
    if (currentTimeEl) currentTimeEl.textContent = this.formatTime(this.video.currentTime);
  }
  
  handleLoadedMetadata() {
    const durationEl = this.controls.querySelector('.custom-player__duration');
    if (durationEl) durationEl.textContent = this.formatTime(this.video.duration);
    this.showLoading(false);
  }
  
  handlePlay() {
    this.isPlaying = true;
    this.updatePlayButton();
    this.hideControls();
  }
  
  handlePause() {
    this.isPlaying = false;
    this.updatePlayButton();
    this.showControls();
  }
  
  handleEnded() {
    this.isPlaying = false;
    this.updatePlayButton();
    this.showControls();
  }
  
  handleVolumeChange() {
    this.isMuted = this.video.muted;
    this.currentVolume = this.video.volume;
    this.updateMuteButton();
    
    const slider = this.controls.querySelector('.custom-player__volume-slider');
    if (slider) slider.value = this.video.muted ? 0 : this.video.volume;
  }
  
  handleError() {
    this.showLoading(false);
    const error = this.video.error;
    let message = 'Error al reproducir el video';
    if (error) {
      switch (error.code) {
        case error.MEDIA_ERR_ABORTED:
          message = 'La reproducción fue abortada';
          break;
        case error.MEDIA_ERR_NETWORK:
          message = 'Error de red';
          break;
        case error.MEDIA_ERR_DECODE:
          message = 'Error de decodificación';
          break;
        case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
          message = 'Formato no soportado';
          break;
      }
    }
    this.showError(message);
  }
  
  handleWaiting() {
    this.showLoading(true);
  }
  
  handleCanPlay() {
    this.showLoading(false);
  }
  
  handleFullscreenChange() {
    this.isFullscreen = !!document.fullscreenElement;
    const fsIcon = this.controls.querySelector('.custom-player__icon-fullscreen');
    const exitIcon = this.controls.querySelector('.custom-player__icon-exit-fullscreen');
    if (fsIcon && exitIcon) {
      fsIcon.classList.toggle('hidden', this.isFullscreen);
      exitIcon.classList.toggle('hidden', !this.isFullscreen);
    }
  }
  
  showControls() {
    this.controls.classList.add('visible');
    this.centerPlayBtn.classList.add('visible');
    clearTimeout(this.controlsTimeout);
    if (this.isPlaying) {
      this.controlsTimeout = setTimeout(() => this.hideControls(), 3000);
    }
  }
  
  hideControls() {
    this.controls.classList.remove('visible');
    this.centerPlayBtn.classList.remove('visible');
  }
  
  showProgressTooltip(e) {
    const progress = this.controls.querySelector('.custom-player__progress');
    const tooltip = this.controls.querySelector('.custom-player__progress-tooltip');
    const hoverBar = this.controls.querySelector('.custom-player__progress-hover');
    if (!progress || !tooltip || !this.video.duration) return;
    
    const rect = progress.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const time = pos * this.video.duration;
    
    hoverBar.style.width = `${pos * 100}%`;
    tooltip.textContent = this.formatTime(time);
    tooltip.style.left = `${pos * 100}%`;
    tooltip.classList.add('visible');
  }
  
  hideProgressTooltip() {
    const tooltip = this.controls.querySelector('.custom-player__progress-tooltip');
    const hoverBar = this.controls.querySelector('.custom-player__progress-hover');
    if (tooltip) tooltip.classList.remove('visible');
    if (hoverBar) hoverBar.style.width = '0';
  }
  
  seekFromProgress(e) {
    const progress = this.controls.querySelector('.custom-player__progress');
    if (!progress || !this.video.duration) return;
    
    const rect = progress.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    this.video.currentTime = pos * this.video.duration;
  }
  
  handleKeyDown(e) {
    if (!this.container.contains(document.activeElement) && !this.container.matches(':hover')) return;
    
    switch (e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        this.togglePlay();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.video.currentTime = Math.max(0, this.video.currentTime - 10);
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.video.currentTime = Math.min(this.video.duration, this.video.currentTime + 10);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.setVolume(Math.min(1, this.video.volume + 0.1));
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.setVolume(Math.max(0, this.video.volume - 0.1));
        break;
      case 'm':
        this.toggleMute();
        break;
      case 'f':
        this.toggleFullscreen();
        break;
      case 'Escape':
        if (this.isFullscreen) this.exitFullscreen();
        break;
    }
  }
  
  togglePlay() {
    if (this.video.paused) {
      this.play();
    } else {
      this.pause();
    }
  }
  
  play() {
    return this.video.play();
  }
  
  pause() {
    this.video.pause();
  }
  
  toggleMute() {
    this.video.muted = !this.video.muted;
  }
  
  setVolume(value) {
    this.video.volume = Math.max(0, Math.min(1, value));
    this.video.muted = this.video.volume === 0;
  }
  
  setSpeed(speed) {
    this.video.playbackRate = speed;
  }
  
  setQuality(quality) {
    if (quality === 'auto') {
      if (this.hls) this.hls.currentLevel = -1;
      if (this.dash) this.dash.setAutoSwitchQuality(true);
    } else {
      const level = parseInt(quality, 10);
      if (this.hls) this.hls.currentLevel = level;
      if (this.dash) this.dash.setAutoSwitchQuality(false), this.dash.setQualityFor('video', level);
    }
  }
  
  toggleFullscreen() {
    if (!this.isFullscreen) {
      this.container.requestFullscreen().catch(() => {});
    } else {
      this.exitFullscreen();
    }
  }
  
  exitFullscreen() {
    document.exitFullscreen().catch(() => {});
  }
  
  showLoading(show) {
    if (show) {
      this.loadingOverlay.classList.add('visible');
    } else {
      this.loadingOverlay.classList.remove('visible');
    }
  }
  
  showError(message) {
    this.showLoading(false);
    const msgEl = this.errorOverlay.querySelector('.custom-player__error-message');
    if (msgEl) msgEl.textContent = message;
    this.errorOverlay.classList.remove('hidden');
  }
  
  retry() {
    this.errorOverlay.classList.add('hidden');
    this.loadSources();
  }
  
  updatePlayButton() {
    const playBtn = this.controls.querySelector('.custom-player__play-btn');
    const centerBtn = this.centerPlayBtn;
    if (playBtn) {
      playBtn.innerHTML = this.isPlaying 
        ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    }
    if (centerBtn) {
      centerBtn.innerHTML = this.isPlaying
        ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    }
  }
  
  updateMuteButton() {
    const volumeIcon = this.controls.querySelector('.custom-player__icon-volume');
    const muteIcon = this.controls.querySelector('.custom-player__icon-muted');
    if (volumeIcon && muteIcon) {
      volumeIcon.classList.toggle('hidden', this.isMuted);
      muteIcon.classList.toggle('hidden', !this.isMuted);
    }
  }
  
  formatTime(seconds) {
    if (!isFinite(seconds)) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  destroy() {
    this.video?.pause();
    this.video?.removeAttribute('src');
    this.video?.load();
    this.hls?.destroy();
    this.dash?.destroy();
    this.hls = null;
    this.dash = null;
    clearTimeout(this.controlsTimeout);
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('keydown', this.handleKeyDown);
    this.container.innerHTML = '';
  }
}

CustomPlayer.create = async function(options) {
  const player = new CustomPlayer(options);
  await player.init();
  return player;
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CustomPlayer;
}