const DEFAULT_TIMEOUT_MS = 5000;

function withTimeout(promise, timeoutMs, label) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(`${label} timeout`)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => window.clearTimeout(timeoutId));
}

function logAdapterLifecycle(adapterName, methodName, phase, details = {}) {
  console.log(`[${adapterName}] ${methodName} ${phase}`, details);
}

function buildAdapterDetails(adapter, methodName, context = {}, extra = {}) {
  const adapterName = adapter?.adapterName || adapter?.constructor?.name || "UnknownAdapter";
  const server = context.server || extra.server || null;
  const urlReceived = context.rawValue || extra.urlReceived || server?.url || null;
  const urlFinal = context.url || extra.urlFinal || urlReceived || null;

  return {
    adapterType: adapterName,
    method: methodName,
    server,
    sourceType: context.sourceType || extra.sourceType || null,
    urlReceived,
    urlFinal,
    ...extra,
  };
}

function extractEmbeddedSource(rawValue) {
  const text = String(rawValue || "").trim();
  if (!text) return "";

  try {
    const parser = new DOMParser();
    const documentNode = parser.parseFromString(text, "text/html");
    const embeddedNode = documentNode.querySelector("iframe[src], video[src], source[src]");
    if (embeddedNode) {
      const embeddedSource = embeddedNode.getAttribute("src")?.trim();
      if (embeddedSource) return embeddedSource;
    }
  } catch {
    // Ignore parser failures and fall through to text handling.
  }

  const sourceMatch = text.match(/<(?:iframe|video|source)\b[^>]*\b(?:src|data-src|data-url)\s*=\s*["']([^"']+)["']/i);
  if (sourceMatch?.[1]) {
    return sourceMatch[1].trim();
  }

  return text;
}

function normalizeServerSource(rawValue) {
  const raw = String(rawValue || "").trim();
  const url = extractEmbeddedSource(raw);
  return { raw, url };
}

function isVideoUrl(url) {
  return /\.(mp4|webm|ogg|m4v)(?:$|\?)/i.test(String(url || "").trim());
}

function isM3u8Url(url) {
  return /\.m3u8(?:$|\?)/i.test(String(url || "").trim());
}

function isYouTubeUrl(url) {
  return /(?:youtube\.com|youtu\.be)/i.test(String(url || "").trim());
}

function isEmbedUrl(url) {
  return /\/embed\//i.test(String(url || "").trim());
}

function isArchiveUrl(url) {
  return /archive\.org/i.test(String(url || ""));
}

function detectServerType(rawValue) {
  const { raw, url } = normalizeServerSource(rawValue);
  if (!url) return "unknown";
  if (isYouTubeUrl(url)) return "youtube";
  if (isM3u8Url(url)) return "m3u8";
  if (isVideoUrl(url)) return "html5";
  if (isArchiveUrl(url)) return "archive";
  if (isEmbedUrl(url)) return "embed";
  if (/^<(?:iframe|video|embed)\b/i.test(raw)) return "iframe";
  if (/^https?:\/\//i.test(url)) return "iframe";
  return "iframe";
}

function getArchiveIdentifier(url) {
  try {
    const parsedUrl = new URL(url);
    const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
    const detailsIndex = pathParts.indexOf("details");
    const embedIndex = pathParts.indexOf("embed");
    const downloadIndex = pathParts.indexOf("download");

    if (detailsIndex >= 0 && pathParts[detailsIndex + 1]) {
      return decodeURIComponent(pathParts[detailsIndex + 1]);
    }

    if (embedIndex >= 0 && pathParts[embedIndex + 1]) {
      return decodeURIComponent(pathParts[embedIndex + 1]);
    }

    if (downloadIndex >= 0 && pathParts[downloadIndex + 1]) {
      return decodeURIComponent(pathParts[downloadIndex + 1]);
    }
  } catch {
    return null;
  }

  return null;
}

function buildArchiveCandidateUrls(identifier, preferredFiles = []) {
  const base = `https://archive.org/download/${encodeURIComponent(identifier)}`;
  const candidateNames = new Set([
    `${identifier}.mp4`,
    `${identifier}_512kb.mp4`,
    `${identifier}_720p.mp4`,
    `${identifier}_1080p.mp4`,
    `${identifier}_360p.mp4`,
    `${identifier}_h264.mp4`,
    `${identifier}.webm`,
    `${identifier}.m4v`,
  ]);

  for (const file of preferredFiles) {
    if (file) candidateNames.add(file);
  }

  return [...candidateNames].map((name) => `${base}/${encodeURIComponent(name)}`);
}

function getVideoMimeType(sourceUrl, sourceType = "html5") {
  if (sourceType === "m3u8" || isM3u8Url(sourceUrl)) return "application/vnd.apple.mpegurl";
  if (String(sourceUrl).toLowerCase().endsWith(".webm")) return "video/webm";
  return "video/mp4";
}

function buildYouTubeEmbedUrl(url) {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.replace(/^www\./i, "").toLowerCase();

    if (hostname === "youtu.be") {
      const videoId = parsedUrl.pathname.split("/").filter(Boolean)[0];
      return videoId ? `https://www.youtube.com/embed/${encodeURIComponent(videoId)}` : url;
    }

    if (hostname.endsWith("youtube.com")) {
      const pathParts = parsedUrl.pathname.split("/").filter(Boolean);

      if (pathParts[0] === "embed" && pathParts[1]) {
        return `https://www.youtube.com/embed/${encodeURIComponent(pathParts[1])}`;
      }

      if (pathParts[0] === "shorts" && pathParts[1]) {
        return `https://www.youtube.com/embed/${encodeURIComponent(pathParts[1])}`;
      }

      const videoId = parsedUrl.searchParams.get("v");
      if (videoId) {
        return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`;
      }
    }
  } catch {
    return url;
  }

  return url;
}

function extractYouTubeVideoId(url) {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.replace(/^www\./i, "").toLowerCase();

    if (hostname === "youtu.be") {
      return parsedUrl.pathname.split("/").filter(Boolean)[0] || null;
    }

    if (hostname.endsWith("youtube.com")) {
      const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
      if (pathParts[0] === "embed" || pathParts[0] === "shorts") {
        return pathParts[1] || null;
      }

      return parsedUrl.searchParams.get("v");
    }
  } catch {
    return null;
  }

  return null;
}

async function loadScriptOnce(sourceUrl, readyCheck, label) {
  if (readyCheck()) return true;

  const existingScript = document.querySelector(`script[data-player-src="${sourceUrl}"]`);
  if (existingScript) {
    await withTimeout(
      new Promise((resolve) => {
        const tick = window.setInterval(() => {
          if (readyCheck()) {
            window.clearInterval(tick);
            resolve(true);
          }
        }, 50);
      }),
      DEFAULT_TIMEOUT_MS,
      label,
    ).catch(() => false);

    return readyCheck();
  }

  return withTimeout(
    new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = sourceUrl;
      script.async = true;
      script.dataset.playerSrc = sourceUrl;
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error(`No se pudo cargar ${label}`));
      document.head.appendChild(script);
    }),
    DEFAULT_TIMEOUT_MS,
    label,
  ).then(() => readyCheck()).catch(() => false);
}

async function ensureYoutubeApi() {
  if (window.YT?.Player) return window.YT;
  await loadScriptOnce("https://www.youtube.com/iframe_api", () => !!window.YT?.Player, "la API de YouTube");
  return window.YT?.Player ? window.YT : null;
}

async function ensureHlsLibrary() {
  if (window.Hls) return window.Hls;
  await loadScriptOnce("https://cdn.jsdelivr.net/npm/hls.js@1.5.15/dist/hls.min.js", () => !!window.Hls, "Hls.js");
  return window.Hls || null;
}

async function resolveArchiveVideoUrl(url) {
  const identifier = getArchiveIdentifier(url);
  if (!identifier) return null;

  try {
    const response = await withTimeout(
      fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`),
      DEFAULT_TIMEOUT_MS,
      "metadata de Archive.org",
    );

    if (!response.ok) return null;

    const data = await response.json();
    const files = Array.isArray(data.files) ? data.files : [];
    const preferredFile = files.find((file) => {
      const name = String(file?.name || "").toLowerCase();
      const format = String(file?.format || "").toLowerCase();
      return name.endsWith(".mp4") || format.includes("mp4") || format.includes("h.264") || format.includes("webm");
    });

    if (!preferredFile?.name) return null;

    return `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(preferredFile.name)}`;
  } catch {
    return null;
  }
}

class BaseAdapter {
  constructor(manager) {
    this.manager = manager;
    this.adapterName = this.constructor.name || "BaseAdapter";
    this.lastContext = null;
    this.lastSource = null;
    logAdapterLifecycle(this.adapterName, "constructor", "start", { adapterType: this.adapterName });
    logAdapterLifecycle(this.adapterName, "constructor", "end", { adapterType: this.adapterName });
  }

  log(methodName, phase, details = {}) {
    logAdapterLifecycle(this.adapterName, methodName, phase, details);
  }

  async load(context = this.lastContext) {
    const details = buildAdapterDetails(this, "load", context || {}, {});
    this.log("load", "start", details);
    this.log("load", "end", details);
    return this;
  }

  async setSource(url, context = this.lastContext) {
    const nextContext = context || {};
    const details = buildAdapterDetails(this, "setSource", nextContext, { urlReceived: url, urlFinal: url });
    this.log("setSource", "start", details);
    this.lastSource = url || null;
    this.log("setSource", "end", details);
    return this;
  }

  async play(context = this.lastContext) {
    const details = buildAdapterDetails(this, "play", context || {}, {});
    this.log("play", "start", details);
    this.log("play", "end", details);
    return false;
  }

  async pause(context = this.lastContext) {
    const details = buildAdapterDetails(this, "pause", context || {}, {});
    this.log("pause", "start", details);
    this.log("pause", "end", details);
    return false;
  }

  async setVolume(volume, context = this.lastContext) {
    const details = buildAdapterDetails(this, "setVolume", context || {}, { volume });
    this.log("setVolume", "start", details);
    this.log("setVolume", "end", details);
    return false;
  }

  async setMuted(muted, context = this.lastContext) {
    const details = buildAdapterDetails(this, "setMuted", context || {}, { muted: Boolean(muted) });
    this.log("setMuted", "start", details);
    this.log("setMuted", "end", details);
    return false;
  }

  async seek(time, context = this.lastContext) {
    const details = buildAdapterDetails(this, "seek", context || {}, { time });
    this.log("seek", "start", details);
    this.log("seek", "end", details);
    return false;
  }

  getCurrentTime(context = this.lastContext) {
    const details = buildAdapterDetails(this, "getCurrentTime", context || {}, {});
    this.log("getCurrentTime", "start", details);
    this.log("getCurrentTime", "end", { ...details, value: 0 });
    return 0;
  }

  getDuration(context = this.lastContext) {
    const details = buildAdapterDetails(this, "getDuration", context || {}, {});
    this.log("getDuration", "start", details);
    this.log("getDuration", "end", { ...details, value: 0 });
    return 0;
  }

  destroy() {
    const details = buildAdapterDetails(this, "destroy", this.lastContext || {}, {});
    this.log("destroy", "start", details);
    this.log("destroy", "end", details);
    return this;
  }

  get methods() {
    return ["create", "destroy"];
  }
}

class Html5Adapter extends BaseAdapter {
  constructor(manager) {
    super(manager);
    this.videoEventBindings = [];
  }

  get methods() {
    return ["constructor", "create", "load", "setSource", "play", "pause", "destroy", "setVolume", "setMuted", "seek", "getCurrentTime", "getDuration"];
  }

  bindVideoEvents(context) {
    const { elements } = this.manager;
    this.unbindVideoEvents();

    const bindings = [
      ["loadedmetadata", () => this.log("loadedmetadata", "event", buildAdapterDetails(this, "loadedmetadata", context, { duration: elements.video.duration }))],
      ["canplay", () => this.log("canplay", "event", buildAdapterDetails(this, "canplay", context, {}))],
      ["durationchange", () => this.log("durationchange", "event", buildAdapterDetails(this, "durationchange", context, { duration: elements.video.duration }))],
      ["timeupdate", () => this.log("timeupdate", "event", buildAdapterDetails(this, "timeupdate", context, { currentTime: elements.video.currentTime }))],
      ["play", () => this.log("play", "event", buildAdapterDetails(this, "play", context, {}))],
      ["playing", () => this.log("playing", "event", buildAdapterDetails(this, "playing", context, {}))],
      ["pause", () => this.log("pause", "event", buildAdapterDetails(this, "pause", context, {}))],
      ["waiting", () => this.log("waiting", "event", buildAdapterDetails(this, "waiting", context, {}))],
      ["ended", () => this.log("ended", "event", buildAdapterDetails(this, "ended", context, {}))],
      ["volumechange", () => this.log("volumechange", "event", buildAdapterDetails(this, "volumechange", context, { volume: elements.video.volume, muted: elements.video.muted }))],
      ["error", () => this.log("error", "event", buildAdapterDetails(this, "error", context, { error: elements.video.error }))],
    ];

    for (const [eventName, handler] of bindings) {
      elements.video.addEventListener(eventName, handler);
      this.videoEventBindings.push([eventName, handler]);
    }
  }

  unbindVideoEvents() {
    const { elements } = this.manager;
    for (const [eventName, handler] of this.videoEventBindings) {
      elements.video.removeEventListener(eventName, handler);
    }
    this.videoEventBindings = [];
  }

  async create(context) {
    const { elements } = this.manager;
    this.log("create", "start", buildAdapterDetails(this, "create", context, {
      elementType: elements.video?.tagName || "VIDEO",
    }));
    this.lastContext = context;
    this.destroy();
    this.manager.hidePlayers();
    elements.iframe.removeAttribute("src");
    if (elements.youtube) {
      elements.youtube.innerHTML = "";
      elements.youtube.hidden = true;
    }

    elements.video.hidden = false;
    elements.video.controls = true;
    elements.video.poster = elements.poster?.src || "";
    elements.video.title = `Reproductor - ${context.server.nombre}`;
    elements.video.innerHTML = "";
    elements.video.removeAttribute("src");
    this.bindVideoEvents(context);

    if (context.sourceType === "m3u8") {
      const nativeHlsSupport =
        elements.video.canPlayType("application/vnd.apple.mpegurl") ||
        elements.video.canPlayType("application/x-mpegURL");

      if (nativeHlsSupport) {
        elements.video.src = context.url;
        elements.video.load();
        this.manager.setPlaybackMode("Stream HLS: usando el reproductor HTML5 nativo.");
        this.log("create", "end", buildAdapterDetails(this, "create", context, { elementType: elements.video?.tagName || "VIDEO", result: "html5-native-hls" }));
        return this;
      }

      const HlsConstructor = await ensureHlsLibrary();
      if (HlsConstructor && HlsConstructor.isSupported()) {
        this.manager.state.hlsInstance?.destroy?.();
        this.manager.state.hlsInstance = new HlsConstructor();
        this.manager.state.hlsInstance.loadSource(context.url);
        this.manager.state.hlsInstance.attachMedia(elements.video);
        this.manager.setPlaybackMode("Stream HLS: usando Hls.js.");
        this.log("create", "end", buildAdapterDetails(this, "create", context, { elementType: elements.video?.tagName || "VIDEO", result: "hls-js" }));
        return this;
      }

      this.manager.setPlaybackMode("Este navegador no reproduce streams m3u8 de forma nativa.");
      this.log("create", "end", buildAdapterDetails(this, "create", context, { elementType: elements.video?.tagName || "VIDEO", result: "hls-unsupported" }));
      return this;
    }

    const sourceUrls = context.sourceUrls?.length ? context.sourceUrls : [context.url];
    sourceUrls.forEach((sourceUrl) => {
      const sourceElement = document.createElement("source");
      sourceElement.src = sourceUrl;
      sourceElement.type = getVideoMimeType(sourceUrl, context.sourceType);
      elements.video.appendChild(sourceElement);
    });
    elements.video.load();
    this.manager.setPlaybackMode("Video nativo: puedes usar los controles de UltraPelis.");
    this.log("create", "end", buildAdapterDetails(this, "create", context, {
      elementType: elements.video?.tagName || "VIDEO",
      sourceUrls,
      result: "video"
    }));
    return this;
  }

  async load(context = this.lastContext) {
    const details = buildAdapterDetails(this, "load", context || {}, {});
    this.log("load", "start", details);
    if (!context) {
      this.log("load", "end", { ...details, result: "no-context" });
      return this;
    }

    const result = await this.create(context);
    this.log("load", "end", { ...details, result: result ? "created" : "not-created" });
    return result;
  }

  async setSource(url, context = this.lastContext) {
    const nextContext = context ? { ...context, rawValue: url, url } : { server: { nombre: "Servidor" }, rawValue: url, url, sourceType: "html5" };
    const details = buildAdapterDetails(this, "setSource", nextContext, { urlReceived: url, urlFinal: url });
    this.log("setSource", "start", details);
    this.lastSource = url;
    const result = await this.create(nextContext);
    this.log("setSource", "end", { ...details, result: result ? "created" : "not-created" });
    return result;
  }

  async play(context = this.lastContext) {
    const details = buildAdapterDetails(this, "play", context || {}, {});
    this.log("play", "start", details);
    const result = await this.manager.elements.video.play();
    this.log("play", "end", { ...details, result: "video.play()" });
    return result;
  }

  async pause(context = this.lastContext) {
    const details = buildAdapterDetails(this, "pause", context || {}, {});
    this.log("pause", "start", details);
    this.manager.elements.video.pause();
    this.log("pause", "end", { ...details, result: "video.pause()" });
    return this;
  }

  async setVolume(volume, context = this.lastContext) {
    const details = buildAdapterDetails(this, "setVolume", context || {}, { volume });
    this.log("setVolume", "start", details);
    const nextVolume = Math.min(1, Math.max(0, Number(volume)));
    this.manager.elements.video.volume = Number.isFinite(nextVolume) ? nextVolume : 1;
    this.log("setVolume", "end", { ...details, result: this.manager.elements.video.volume });
    return this;
  }

  async setMuted(muted, context = this.lastContext) {
    const details = buildAdapterDetails(this, "setMuted", context || {}, { muted: Boolean(muted) });
    this.log("setMuted", "start", details);
    this.manager.elements.video.muted = Boolean(muted);
    this.log("setMuted", "end", { ...details, result: this.manager.elements.video.muted });
    return this;
  }

  async seek(time, context = this.lastContext) {
    const details = buildAdapterDetails(this, "seek", context || {}, { time });
    this.log("seek", "start", details);
    const nextTime = Math.max(0, Number(time) || 0);
    if (Number.isFinite(this.manager.elements.video.duration) && this.manager.elements.video.duration > 0) {
      this.manager.elements.video.currentTime = Math.min(nextTime, this.manager.elements.video.duration);
    } else {
      this.manager.elements.video.currentTime = nextTime;
    }
    this.log("seek", "end", { ...details, result: this.manager.elements.video.currentTime });
    return this;
  }

  getCurrentTime(context = this.lastContext) {
    const details = buildAdapterDetails(this, "getCurrentTime", context || {}, {});
    this.log("getCurrentTime", "start", details);
    const value = this.manager.elements.video.currentTime || 0;
    this.log("getCurrentTime", "end", { ...details, value });
    return value;
  }

  getDuration(context = this.lastContext) {
    const details = buildAdapterDetails(this, "getDuration", context || {}, {});
    this.log("getDuration", "start", details);
    const value = this.manager.elements.video.duration || 0;
    this.log("getDuration", "end", { ...details, value });
    return value;
  }

  destroy() {
    const details = buildAdapterDetails(this, "destroy", this.lastContext || {}, {});
    this.log("destroy", "start", details);
    this.unbindVideoEvents();
    const { elements, state } = this.manager;
    if (state.hlsInstance) {
      state.hlsInstance.destroy();
      state.hlsInstance = null;
    }
    if (elements.video) {
      elements.video.pause();
      elements.video.removeAttribute("src");
      elements.video.innerHTML = "";
      elements.video.load();
    }
    this.log("destroy", "end", details);
    return this;
  }
}

class YoutubeAdapter extends BaseAdapter {
  constructor(manager) {
    super(manager);
    this.playerStateChangeHandler = null;
    this.playerErrorHandler = null;
  }

  get methods() {
    return ["constructor", "create", "load", "setSource", "play", "pause", "destroy", "setVolume", "setMuted", "seek", "getCurrentTime", "getDuration"];
  }

  async create(context) {
    const { elements } = this.manager;
    this.log("create", "start", buildAdapterDetails(this, "create", context, {
      elementType: elements.youtube?.tagName || "DIV",
    }));
    this.lastContext = context;
    this.destroy();
    this.manager.hidePlayers();
    elements.iframe.removeAttribute("src");
    elements.video.hidden = true;

    const videoId = extractYouTubeVideoId(context.url);
    if (!videoId) {
      this.manager.setPlaybackMode("No se pudo identificar el video de YouTube.");
      this.log("create", "end", buildAdapterDetails(this, "create", context, { result: "missing-video-id" }));
      return this;
    }

    const youtubeApi = await ensureYoutubeApi();
    if (!youtubeApi?.Player) {
      this.manager.setPlaybackMode("No se pudo cargar la API oficial de YouTube.");
      this.log("create", "end", buildAdapterDetails(this, "create", context, { result: "api-unavailable" }));
      return this;
    }

    try {
      elements.youtube.hidden = false;
      elements.youtube.innerHTML = "";
      this.manager.state.youtubePlayer?.destroy?.();
      this.playerStateChangeHandler = (event) => {
        this.log("onStateChange", "event", buildAdapterDetails(this, "onStateChange", context, { state: event?.data }));
        switch (event?.data) {
          case youtubeApi.PlayerState.PLAYING:
            this.log("playing", "event", buildAdapterDetails(this, "playing", context, {}));
            break;
          case youtubeApi.PlayerState.PAUSED:
            this.log("pause", "event", buildAdapterDetails(this, "pause", context, {}));
            break;
          case youtubeApi.PlayerState.ENDED:
            this.log("ended", "event", buildAdapterDetails(this, "ended", context, {}));
            break;
          case youtubeApi.PlayerState.BUFFERING:
            this.log("waiting", "event", buildAdapterDetails(this, "waiting", context, {}));
            break;
          case youtubeApi.PlayerState.CUED:
            this.log("loadedmetadata", "event", buildAdapterDetails(this, "loadedmetadata", context, {}));
            this.log("durationchange", "event", buildAdapterDetails(this, "durationchange", context, {}));
            break;
          default:
            break;
        }
      };
      this.playerErrorHandler = (event) => {
        this.log("error", "event", buildAdapterDetails(this, "error", context, { error: event?.data }));
      };
      this.manager.state.youtubePlayer = new youtubeApi.Player(elements.youtube, {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            this.log("onReady", "event", buildAdapterDetails(this, "onReady", context, { videoId }));
            this.manager.setPlaybackMode("YouTube: usando la API oficial.");
          },
          onStateChange: (event) => {
            this.playerStateChangeHandler?.(event);
          },
          onError: (event) => {
            this.playerErrorHandler?.(event);
            this.manager.setPlaybackMode("No se pudo cargar el reproductor oficial de YouTube.");
          },
        },
      });

      elements.youtube.title = `Reproductor - ${context.server.nombre}`;
      this.log("create", "end", buildAdapterDetails(this, "create", context, { result: "youtube-player" }));
      return this;
    } catch {
      this.manager.setPlaybackMode("No se pudo crear el reproductor oficial de YouTube.");
      this.log("create", "end", buildAdapterDetails(this, "create", context, { result: "error" }));
      return this;
    }
  }

  async load(context = this.lastContext) {
    const details = buildAdapterDetails(this, "load", context || {}, {});
    this.log("load", "start", details);
    if (!context) {
      this.log("load", "end", { ...details, result: "no-context" });
      return this;
    }

    const result = await this.create(context);
    this.log("load", "end", { ...details, result: result ? "created" : "not-created" });
    return result;
  }

  async setSource(url, context = this.lastContext) {
    const nextContext = context ? { ...context, rawValue: url, url } : { server: { nombre: "Servidor" }, rawValue: url, url, sourceType: "youtube" };
    const details = buildAdapterDetails(this, "setSource", nextContext, { urlReceived: url, urlFinal: url });
    this.log("setSource", "start", details);
    const result = await this.create(nextContext);
    this.log("setSource", "end", { ...details, result: result ? "created" : "not-created" });
    return result;
  }

  async play(context = this.lastContext) {
    const details = buildAdapterDetails(this, "play", context || {}, {});
    this.log("play", "start", details);
    this.manager.state.youtubePlayer?.playVideo?.();
    this.log("play", "end", { ...details, result: "playVideo" });
    return this;
  }

  async pause(context = this.lastContext) {
    const details = buildAdapterDetails(this, "pause", context || {}, {});
    this.log("pause", "start", details);
    this.manager.state.youtubePlayer?.pauseVideo?.();
    this.log("pause", "end", { ...details, result: "pauseVideo" });
    return this;
  }

  async setVolume(volume, context = this.lastContext) {
    const details = buildAdapterDetails(this, "setVolume", context || {}, { volume });
    this.log("setVolume", "start", details);
    const nextVolume = Math.min(1, Math.max(0, Number(volume)));
    const scaledVolume = Number.isFinite(nextVolume) ? Math.round(nextVolume * 100) : 100;
    this.manager.state.youtubePlayer?.setVolume?.(scaledVolume);
    this.log("setVolume", "end", { ...details, result: scaledVolume });
    return this;
  }

  async setMuted(muted, context = this.lastContext) {
    const details = buildAdapterDetails(this, "setMuted", context || {}, { muted: Boolean(muted) });
    this.log("setMuted", "start", details);
    if (muted) {
      this.manager.state.youtubePlayer?.mute?.();
    } else {
      this.manager.state.youtubePlayer?.unMute?.();
    }
    this.log("setMuted", "end", { ...details, result: Boolean(muted) });
    return this;
  }

  async seek(time, context = this.lastContext) {
    const details = buildAdapterDetails(this, "seek", context || {}, { time });
    this.log("seek", "start", details);
    this.manager.state.youtubePlayer?.seekTo?.(Number(time) || 0, true);
    this.log("seek", "end", { ...details, result: Number(time) || 0 });
    return this;
  }

  getCurrentTime(context = this.lastContext) {
    const details = buildAdapterDetails(this, "getCurrentTime", context || {}, {});
    this.log("getCurrentTime", "start", details);
    const value = this.manager.state.youtubePlayer?.getCurrentTime?.() || 0;
    this.log("getCurrentTime", "end", { ...details, value });
    return value;
  }

  getDuration(context = this.lastContext) {
    const details = buildAdapterDetails(this, "getDuration", context || {}, {});
    this.log("getDuration", "start", details);
    const value = this.manager.state.youtubePlayer?.getDuration?.() || 0;
    this.log("getDuration", "end", { ...details, value });
    return value;
  }

  destroy() {
    const details = buildAdapterDetails(this, "destroy", this.lastContext || {}, {});
    this.log("destroy", "start", details);
    const { elements, state } = this.manager;
    if (this.manager.state.youtubePlayer) {
      this.manager.state.youtubePlayer.destroy();
      this.manager.state.youtubePlayer = null;
    }
    this.playerStateChangeHandler = null;
    this.playerErrorHandler = null;
    if (elements.youtube) {
      elements.youtube.innerHTML = "";
      elements.youtube.hidden = true;
    }
    this.log("destroy", "end", details);
    return this;
  }
}

class IframeAdapter extends BaseAdapter {
  get methods() {
    return ["constructor", "create", "load", "setSource", "play", "pause", "destroy", "setVolume", "setMuted", "seek", "getCurrentTime", "getDuration"];
  }

  async create(context) {
    const { elements } = this.manager;
    this.log("create", "start", buildAdapterDetails(this, "create", context, {
      elementType: elements.iframe?.tagName || "IFRAME",
    }));
    this.lastContext = context;
    this.destroy();
    this.manager.hidePlayers();
    elements.iframe.hidden = false;
    elements.iframe.src = context.url;
    elements.iframe.title = `Reproductor - ${context.server.nombre}`;
    this.manager.setPlaybackMode("Iframe HTML completo: se muestra exactamente la fuente proporcionada.");
    this.log("create", "end", buildAdapterDetails(this, "create", context, {
      elementType: elements.iframe?.tagName || "IFRAME",
      result: "iframe"
    }));
    return this;
  }

  async load(context = this.lastContext) {
    const details = buildAdapterDetails(this, "load", context || {}, {});
    this.log("load", "start", details);
    if (!context) {
      this.log("load", "end", { ...details, result: "no-context" });
      return this;
    }

    const result = await this.create(context);
    this.log("load", "end", { ...details, result: result ? "created" : "not-created" });
    return result;
  }

  async setSource(url, context = this.lastContext) {
    const nextContext = context ? { ...context, rawValue: url, url } : { server: { nombre: "Servidor" }, rawValue: url, url, sourceType: "iframe" };
    const details = buildAdapterDetails(this, "setSource", nextContext, { urlReceived: url, urlFinal: url });
    this.log("setSource", "start", details);
    const result = await this.create(nextContext);
    this.log("setSource", "end", { ...details, result: result ? "created" : "not-created" });
    return result;
  }

  async play(context = this.lastContext) {
    const details = buildAdapterDetails(this, "play", context || {}, {});
    this.log("play", "start", details);
    this.log("play", "end", { ...details, result: "unsupported" });
    return false;
  }

  async pause(context = this.lastContext) {
    const details = buildAdapterDetails(this, "pause", context || {}, {});
    this.log("pause", "start", details);
    this.log("pause", "end", { ...details, result: "unsupported" });
    return false;
  }

  async setVolume(volume, context = this.lastContext) {
    const details = buildAdapterDetails(this, "setVolume", context || {}, { volume });
    this.log("setVolume", "start", details);
    this.log("setVolume", "end", { ...details, result: "unsupported" });
    return false;
  }

  async setMuted(muted, context = this.lastContext) {
    const details = buildAdapterDetails(this, "setMuted", context || {}, { muted: Boolean(muted) });
    this.log("setMuted", "start", details);
    this.log("setMuted", "end", { ...details, result: "unsupported" });
    return false;
  }

  async seek(time, context = this.lastContext) {
    const details = buildAdapterDetails(this, "seek", context || {}, { time });
    this.log("seek", "start", details);
    this.log("seek", "end", { ...details, result: "unsupported" });
    return false;
  }

  getCurrentTime(context = this.lastContext) {
    const details = buildAdapterDetails(this, "getCurrentTime", context || {}, {});
    this.log("getCurrentTime", "start", details);
    this.log("getCurrentTime", "end", { ...details, value: 0 });
    return 0;
  }

  getDuration(context = this.lastContext) {
    const details = buildAdapterDetails(this, "getDuration", context || {}, {});
    this.log("getDuration", "start", details);
    this.log("getDuration", "end", { ...details, value: 0 });
    return 0;
  }

  destroy() {
    const details = buildAdapterDetails(this, "destroy", this.lastContext || {}, {});
    this.log("destroy", "start", details);
    const { elements } = this.manager;
    if (elements.iframe) {
      elements.iframe.removeAttribute("src");
    }
    this.log("destroy", "end", details);
    return this;
  }
}

class EmbedAdapter extends BaseAdapter {
  get methods() {
    return ["constructor", "create", "load", "setSource", "play", "pause", "destroy", "setVolume", "setMuted", "seek", "getCurrentTime", "getDuration"];
  }

  async create(context) {
    const { elements } = this.manager;
    this.log("create", "start", buildAdapterDetails(this, "create", context, {
      elementType: elements.iframe?.tagName || "IFRAME",
    }));
    this.lastContext = context;
    this.destroy();
    this.manager.hidePlayers();
    elements.iframe.hidden = false;
    elements.iframe.src = context.url;
    elements.iframe.title = `Reproductor - ${context.server.nombre}`;
    this.manager.setPlaybackMode("Embed externo: se muestran los controles del proveedor.");
    this.log("create", "end", buildAdapterDetails(this, "create", context, {
      elementType: elements.iframe?.tagName || "IFRAME",
      result: "embed"
    }));
    return this;
  }

  async load(context = this.lastContext) {
    const details = buildAdapterDetails(this, "load", context || {}, {});
    this.log("load", "start", details);
    if (!context) {
      this.log("load", "end", { ...details, result: "no-context" });
      return this;
    }

    const result = await this.create(context);
    this.log("load", "end", { ...details, result: result ? "created" : "not-created" });
    return result;
  }

  async setSource(url, context = this.lastContext) {
    const nextContext = context ? { ...context, rawValue: url, url } : { server: { nombre: "Servidor" }, rawValue: url, url, sourceType: "embed" };
    const details = buildAdapterDetails(this, "setSource", nextContext, { urlReceived: url, urlFinal: url });
    this.log("setSource", "start", details);
    const result = await this.create(nextContext);
    this.log("setSource", "end", { ...details, result: result ? "created" : "not-created" });
    return result;
  }

  async play(context = this.lastContext) {
    const details = buildAdapterDetails(this, "play", context || {}, {});
    this.log("play", "start", details);
    this.log("play", "end", { ...details, result: "unsupported" });
    return false;
  }

  async pause(context = this.lastContext) {
    const details = buildAdapterDetails(this, "pause", context || {}, {});
    this.log("pause", "start", details);
    this.log("pause", "end", { ...details, result: "unsupported" });
    return false;
  }

  async setVolume(volume, context = this.lastContext) {
    const details = buildAdapterDetails(this, "setVolume", context || {}, { volume });
    this.log("setVolume", "start", details);
    this.log("setVolume", "end", { ...details, result: "unsupported" });
    return false;
  }

  async setMuted(muted, context = this.lastContext) {
    const details = buildAdapterDetails(this, "setMuted", context || {}, { muted: Boolean(muted) });
    this.log("setMuted", "start", details);
    this.log("setMuted", "end", { ...details, result: "unsupported" });
    return false;
  }

  async seek(time, context = this.lastContext) {
    const details = buildAdapterDetails(this, "seek", context || {}, { time });
    this.log("seek", "start", details);
    this.log("seek", "end", { ...details, result: "unsupported" });
    return false;
  }

  getCurrentTime(context = this.lastContext) {
    const details = buildAdapterDetails(this, "getCurrentTime", context || {}, {});
    this.log("getCurrentTime", "start", details);
    this.log("getCurrentTime", "end", { ...details, value: 0 });
    return 0;
  }

  getDuration(context = this.lastContext) {
    const details = buildAdapterDetails(this, "getDuration", context || {}, {});
    this.log("getDuration", "start", details);
    this.log("getDuration", "end", { ...details, value: 0 });
    return 0;
  }

  destroy() {
    const details = buildAdapterDetails(this, "destroy", this.lastContext || {}, {});
    this.log("destroy", "start", details);
    const { elements } = this.manager;
    if (elements.iframe) {
      elements.iframe.removeAttribute("src");
    }
    this.log("destroy", "end", details);
    return this;
  }
}

export class PlayerManager {
  constructor(elements) {
    this.elements = elements;
    this.state = {
      currentAdapter: null,
      currentContext: null,
      youtubePlayer: null,
      youtubeLoaderPromise: null,
      hlsInstance: null,
      hlsLoaderPromise: null,
    };

    this.adapters = {
      html5: new Html5Adapter(this),
      youtube: new YoutubeAdapter(this),
      iframe: new IframeAdapter(this),
      embed: new EmbedAdapter(this),
    };

    this.boundVideoErrorHandler = this.handleVideoError.bind(this);
    this.elements.video?.addEventListener("error", this.boundVideoErrorHandler);
  }

  hidePlayers() {
    if (this.elements.youtube) this.elements.youtube.hidden = true;
    if (this.elements.iframe) this.elements.iframe.hidden = true;
    if (this.elements.video) this.elements.video.hidden = true;
  }

  setSourceLink(url) {
    if (!this.elements.sourceLink) return;
    this.elements.sourceLink.href = url || "#";
    this.elements.sourceLink.hidden = !url;
  }

  setPlaybackMode(message) {
    if (this.elements.playbackMode) {
      this.elements.playbackMode.textContent = message;
    }
  }

  resolveAdapter(context) {
    if (context.sourceType === "youtube") return this.adapters.youtube;
    if (context.sourceType === "html5" || context.sourceType === "m3u8") return this.adapters.html5;
    if (context.sourceType === "iframe" || context.sourceType === "embedded-html") return this.adapters.iframe;
    if (context.sourceType === "embed") return this.adapters.embed;
    if (context.sourceType === "archive" && context.archiveVideoUrl) return this.adapters.html5;
    return this.adapters.embed;
  }

  async buildContext(server) {
    const rawValue = String(server?.url || "").trim();
    const { url } = normalizeServerSource(rawValue);
    const sourceType = detectServerType(rawValue);
    const archiveIdentifier = sourceType === "archive" ? getArchiveIdentifier(url) : null;
    const archiveVideoUrl = sourceType === "archive" ? await resolveArchiveVideoUrl(url) : null;
    const archivePreferredFiles = archiveVideoUrl
      ? [new URL(archiveVideoUrl).pathname.split("/").pop()]
      : [];
    const archiveCandidateUrls = archiveIdentifier
      ? buildArchiveCandidateUrls(archiveIdentifier, archivePreferredFiles)
      : [];

    return {
      server,
      rawValue,
      url,
      sourceType,
      archiveIdentifier,
      archiveVideoUrl,
      archiveCandidateUrls,
      sourceUrls: sourceType === "html5" || sourceType === "m3u8"
        ? [url]
        : archiveCandidateUrls.length > 0
          ? archiveCandidateUrls
          : [archiveVideoUrl || url],
    };
  }

  async create(server) {
    const context = await this.buildContext(server);
    this.currentContext = context;
    this.setSourceLink(context.url);

    if (!context.url) {
      this.setPlaybackMode("No hay fuente de reproducción para este servidor.");
      this.hidePlayers();
      return false;
    }

    const adapter = this.resolveAdapter(context);
    this.state.currentAdapter = adapter;

    this.adapters.youtube.destroy();
    this.adapters.html5.destroy();
    this.adapters.iframe.destroy();
    this.adapters.embed.destroy();

    return adapter.create(context);
  }

  async handleVideoError() {
    const context = this.currentContext;
    if (!context || this.state.currentAdapter !== this.adapters.html5) return;

    const currentUrl = context.url;
    if (context.sourceType === "archive" && currentUrl) {
      this.setPlaybackMode("No se pudo abrir el video directo. Volviendo al reproductor externo de Archive.org.");
      this.hidePlayers();
      this.elements.iframe.hidden = false;
      this.elements.iframe.src = currentUrl;
      this.elements.iframe.title = `Reproductor - ${context.server.nombre}`;
      this.state.currentAdapter = this.adapters.embed;
      return;
    }

    this.setPlaybackMode("No se pudo reproducir el video directo en este navegador.");
  }

  destroy() {
    this.adapters.youtube.destroy();
    this.adapters.html5.destroy();
    this.adapters.iframe.destroy();
    this.adapters.embed.destroy();
    this.hidePlayers();
    this.currentContext = null;
    this.state.currentAdapter = null;
  }

  getAvailableMethods() {
    return {
      html5: this.adapters.html5.methods,
      youtube: this.adapters.youtube.methods,
      iframe: this.adapters.iframe.methods,
      embed: this.adapters.embed.methods,
    };
  }
}

export async function setVideoSource(playerManager, server) {
  return playerManager.create(server);
}

export {
  detectServerType,
  normalizeServerSource,
  Html5Adapter,
  YoutubeAdapter,
  IframeAdapter,
  EmbedAdapter,
};
