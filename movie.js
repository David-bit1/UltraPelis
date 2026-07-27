import { createSupabaseBrowserClient } from "./supabase.js";

const supabase = createSupabaseBrowserClient();

const elements = {
  error: document.querySelector("#movie-error"),
  genre: document.querySelector("#movie-genre"),
  genreLabel: document.querySelector("#movie-genre-label"),
  iframe: document.querySelector("#movie-iframe"),
  video: document.querySelector("#movie-video"),
  playbackMode: document.querySelector("#playback-mode"),
  sourceLink: document.querySelector("#source-link"),
  poster: document.querySelector("#movie-poster"),
  backdropContainer: document.querySelector("#movie-backdrop-container"),
  backdropImage: document.querySelector("#movie-backdrop"),
  relatedGrid: document.querySelector("#related-grid"),
  root: document.querySelector("#movie-root"),
  synopsis: document.querySelector("#movie-synopsis"),
  title: document.querySelector("#movie-title"),
  year: document.querySelector("#movie-year"),
  duration: document.querySelector("#movie-duration"),
  durationItem: document.querySelector("#movie-duration-item"),
  rating: document.querySelector("#movie-rating"),
  ratingItem: document.querySelector("#movie-rating-item"),
  releaseDate: document.querySelector("#movie-release-date"),
  releaseItem: document.querySelector("#movie-release-item"),
  serversContainer: document.querySelector("#servers-container"),
};

const state = {
  servers: [],
  currentServer: null,
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function posterUrl(movie) {
  return movie.imagen || "assets/img/poster-placeholder.svg";
}

function getMovieId() {
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get("id"));
  return Number.isFinite(id) && id > 0 ? id : null;
}

function getLanguageLabel(code) {
  const labels = {
    'es': 'Español Latino',
    'es-CO': 'Español Castellano',
    'en': 'Inglés',
    'ja': 'Japonés',
    'other': 'Otro'
  };
  return labels[code] || code;
}

function isVideoUrl(url) {
  return /\.(mp4|webm|ogg|m4v)(?:$|\?)/i.test(String(url || "").trim());
}

function isArchiveUrl(url) {
  return /archive\.org/i.test(String(url || ""));
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

async function resolveArchiveVideoUrl(url) {
  const identifier = getArchiveIdentifier(url);
  if (!identifier) return null;

  const response = await fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`);
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
}

function getServersFromMovie(movie) {
  const servers = [];
  for (let i = 1; i <= 4; i++) {
    const nombre = movie[`servidor${i}_nombre`];
    const iframe = movie[`servidor${i}_iframe`];
    if (nombre && iframe) {
      servers.push({
        num: i,
        nombre,
        url: iframe,
        idioma: movie[`servidor${i}_idioma`] || "es",
        subtitulos: movie[`servidor${i}_subtitulos`] || false,
        idioma_sub: movie[`servidor${i}_idioma_sub`] || null,
        calidad: movie[`servidor${i}_calidad`] || "720p",
      });
    }
  }

  if (servers.length === 0 && movie.iframe) {
    servers.push({
      num: 0,
      nombre: "Reproductor principal",
      url: movie.iframe,
      idioma: "es",
      subtitulos: false,
      idioma_sub: null,
      calidad: "720p",
    });
  }

  return servers;
}

function renderServerButtons() {
  if (state.servers.length === 0) {
    elements.serversContainer.innerHTML = '<p class="no-servers">No hay servidores disponibles.</p>';
    return;
  }

  elements.serversContainer.innerHTML = state.servers.map((server, index) => {
    const subtitleBadge = server.subtitulos 
      ? `<span class="subtitle-badge">Sub: ${getLanguageLabel(server.idioma_sub)}</span>` 
      : "";
    const activeClass = index === 0 ? "active" : "";

    return `
      <button 
        class="server-btn ${activeClass}" 
        data-server="${server.num}"
        data-url="${escapeHtml(server.url)}"
        type="button"
      >
        <span class="server-name">${escapeHtml(server.nombre)}</span>
        <span class="server-meta">${getLanguageLabel(server.idioma)} · ${server.calidad} ${subtitleBadge}
        </span>
      </button>
    `;
  }).join("");

  // Cargar primer servidor por defecto
  if (state.servers.length > 0) {
    void loadServer(state.servers[0]);
  }

  // Bind click handlers
  elements.serversContainer.querySelectorAll(".server-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const serverNum = Number(btn.dataset.server);
      const server = state.servers.find(s => s.num === serverNum);
      if (server) void loadServer(server);
    });
  });
}

async function loadServer(server) {
  const url = String(server.url || "").trim();
  const archiveVideoUrl = isArchiveUrl(url) ? await resolveArchiveVideoUrl(url) : null;
  const useVideo = isVideoUrl(url) || Boolean(archiveVideoUrl);

  if (elements.sourceLink) {
    elements.sourceLink.href = url || "#";
    elements.sourceLink.hidden = !url;
  }

  if (elements.playbackMode) {
    if (isVideoUrl(url)) {
      elements.playbackMode.textContent = "Video nativo: puedes usar los controles de UltraPelis.";
    } else if (archiveVideoUrl) {
      elements.playbackMode.textContent = "Archive.org convertido a video directo: ahora usas los controles de UltraPelis.";
    } else if (isArchiveUrl(url)) {
      elements.playbackMode.textContent = "Reproductor externo de Archive.org: los controles dependen del proveedor.";
    } else {
      elements.playbackMode.textContent = "Embed externo: los controles dependen del reproductor original.";
    }
  }

  if (useVideo) {
    elements.iframe.removeAttribute("src");
    elements.iframe.hidden = true;
    elements.video.hidden = false;
    elements.video.pause();
    elements.video.src = archiveVideoUrl || url;
    elements.video.title = `Reproductor - ${server.nombre}`;
    elements.video.load();
  } else {
    elements.video.pause();
    elements.video.removeAttribute("src");
    elements.video.hidden = true;
    elements.iframe.hidden = false;
    elements.iframe.src = url;
    elements.iframe.title = `Reproductor - ${server.nombre}`;
  }

  state.currentServer = server;

  // Update active state
  elements.serversContainer.querySelectorAll(".server-btn").forEach(btn => {
    btn.classList.toggle("active", Number(btn.dataset.server) === server.num);
  });
}

function renderError(message) {
  elements.root.hidden = true;
  elements.error.hidden = false;
  elements.error.querySelector("h1").textContent = "Película no encontrada";
  elements.error.querySelector("p").textContent = message;
  document.title = "Película no encontrada | UltraPelis";
}

function relatedCard(movie) {
  return `
    <article class="related-card">
      <a href="movie.html?id=${encodeURIComponent(movie.id)}" aria-label="Ver ${escapeHtml(movie.titulo)}">
        <img src="${posterUrl(movie)}" alt="Portada de ${escapeHtml(movie.titulo)}" loading="lazy" />
        <div class="related-card-body">
          <h3>${escapeHtml(movie.titulo)}</h3>
          <p>${escapeHtml(movie.genero)} · ${escapeHtml(movie["año"])}</p>
        </div>
      </a>
    </article>
  `;
}

function bindMenuToggle() {
  const menuToggle = document.querySelector("#menu-toggle");
  const siteNav = document.querySelector(".site-nav");
  if (menuToggle && siteNav) {
    menuToggle.addEventListener("click", () => {
      menuToggle.classList.toggle("is-active");
      siteNav.classList.toggle("is-open");
    });

    window.addEventListener("scroll", () => {
      const header = document.querySelector(".site-header");
      if (header) {
        header.classList.toggle("scrolled", window.scrollY > 10);
      }
    });
  }
}

async function loadMovie() {
  const movieId = getMovieId();
  if (!movieId) {
    renderError("Falta el parámetro id en la URL.");
    return;
  }

  // Load movie data with servidor fields
  const { data: movie, error } = await supabase
    .from("peliculas")
    .select(`
      id, titulo, "año", genero, sinopsis, imagen, iframe, backdrop, duracion, clasificacion, 
      fecha_estreno, tmdb_id,
      servidor1_nombre, servidor1_iframe, servidor1_idioma, servidor1_subtitulos, servidor1_idioma_sub, servidor1_calidad,
      servidor2_nombre, servidor2_iframe, servidor2_idioma, servidor2_subtitulos, servidor2_idioma_sub, servidor2_calidad,
      servidor3_nombre, servidor3_iframe, servidor3_idioma, servidor3_subtitulos, servidor3_idioma_sub, servidor3_calidad,
      servidor4_nombre, servidor4_iframe, servidor4_idioma, servidor4_subtitulos, servidor4_idioma_sub, servidor4_calidad
    `)
    .eq("id", movieId)
    .maybeSingle();

  if (error) throw error;

  if (!movie) {
    renderError("No existe una película con ese identificador.");
    return;
  }

  state.servers = getServersFromMovie(movie);

  // Render movie data
  document.title = `${movie.titulo} | UltraPelis`;
  elements.poster.src = posterUrl(movie);
  elements.poster.alt = `Portada de ${movie.titulo}`;
  elements.title.textContent = movie.titulo;
  elements.year.textContent = movie["año"];
  elements.genre.textContent = movie.genero;
  elements.genreLabel.textContent = movie.genero;
  elements.synopsis.textContent = movie.sinopsis;

  // Backdrop
  if (movie.backdrop) {
    elements.backdropImage.src = movie.backdrop;
    elements.backdropImage.alt = `Backdrop de ${movie.titulo}`;
    elements.backdropContainer.hidden = false;
  }

  // Duration
  if (movie.duracion) {
    elements.duration.textContent = `${movie.duracion} min`;
    elements.durationItem.hidden = false;
  }

  // Rating
  if (movie.clasificacion) {
    elements.rating.textContent = movie.clasificacion;
    elements.ratingItem.hidden = false;
  }

  // Release date
  if (movie.fecha_estreno) {
    elements.releaseDate.textContent = new Date(movie.fecha_estreno).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    elements.releaseItem.hidden = false;
  }

  // Render servers
  renderServerButtons();

  // Load related movies
  const { data: relatedMovies, error: relatedError } = await supabase
    .from("peliculas")
    .select("*")
    .eq("genero", movie.genero)
    .neq("id", movie.id)
    .order("created_at", { ascending: false })
    .limit(6);

  if (relatedError) throw relatedError;

  if (!relatedMovies.length) {
    elements.relatedGrid.innerHTML = '<p class="empty-state">No hay películas relacionadas todavía.</p>';
  } else {
    elements.relatedGrid.innerHTML = relatedMovies.map(relatedCard).join("");
  }
}

async function init() {
  try {
    bindMenuToggle();
    await loadMovie();
  } catch (error) {
    console.error(error);
    renderError("No pudimos cargar la película desde Supabase.");
  }
}

init();
