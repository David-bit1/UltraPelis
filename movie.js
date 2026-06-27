import { createSupabaseBrowserClient } from "./supabase.js";

const supabase = createSupabaseBrowserClient();

const elements = {
  error: document.querySelector("#movie-error"),
  genre: document.querySelector("#movie-genre"),
  genreLabel: document.querySelector("#movie-genre-label"),
  iframe: document.querySelector("#movie-iframe"),
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
  serverSelect: document.querySelector("#server-select"),
};

const state = {
  servers: [],
  movieId: null,
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

function renderServerOptions() {
  const activeServers = state.servers.filter(s => s.estado === 'activo');
  
  if (activeServers.length === 0) {
    elements.serverSelect.innerHTML = '<option value="">Sin servidores activos</option>';
    return;
  }

  elements.serverSelect.innerHTML = activeServers.map((server, index) => {
    const subtitleInfo = server.subtitulos 
      ? ` | Sub: ${getLanguageLabel(server.idioma_subtitulos)}` 
      : '';
    return `
      <option value="${server.url}" ${index === 0 ? 'selected' : ''}>
        ${server.nombre} - ${getLanguageLabel(server.idioma_audio)} - ${server.calidad}${subtitleInfo}
      </option>
    `;
  }).join("");

  // Set initial iframe
  if (activeServers.length > 0) {
    elements.iframe.src = activeServers[0].url;
    elements.iframe.title = `Reproductor - ${activeServers[0].nombre}`;
  }
}

function bindServerChange() {
  elements.serverSelect.addEventListener("change", () => {
    const url = elements.serverSelect.value;
    if (url) {
      elements.iframe.src = url;
      const selectedText = elements.serverSelect.options[elements.serverSelect.selectedIndex].text;
      elements.iframe.title = `Reproductor - ${selectedText}`;
    }
  });
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

  state.movieId = movieId;

  // Load movie data
  const { data: movie, error } = await supabase
    .from("peliculas")
    .select("*")
    .eq("id", movieId)
    .maybeSingle();

  if (error) throw error;

  if (!movie) {
    renderError("No existe una película con ese identificador.");
    return;
  }


  // Load servers from separate table or inline fields
  let servers = [];
  
  // Try loading from servidores table first
  const { data: servidoresData, error: serversError } = await supabase
    .from("servidores")
    .select("*")
    .eq("pelicula_id", movieId)
    .order("orden", { ascending: true });
  
  if (!serversError && servidoresData?.length > 0) {
    servers = servidoresData;
  } else {
    // Fallback: use inline iframe fields
    const inlineServers = [];
    if (movie.iframe) {
      inlineServers.push({ id: 1, nombre: "Servidor 1", url: movie.iframe, idioma_audio: "es", calidad: "720p", estado: "activo" });
    }
    if (movie.servidor_2) {
      inlineServers.push({ id: 2, nombre: "Servidor 2", url: movie.servidor_2, idioma_audio: "es", calidad: "720p", estado: "activo" });
    }
    if (movie.servidor_3) {
      inlineServers.push({ id: 3, nombre: "Servidor 3", url: movie.servidor_3, idioma_audio: "es", calidad: "720p", estado: "activo" });
    }
    if (movie.servidor_4) {
      inlineServers.push({ id: 4, nombre: "Servidor 4", url: movie.servidor_4, idioma_audio: "es", calidad: "720p", estado: "activo" });
    }
    servers = inlineServers;
  }
  
  state.servers = servers;

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
  renderServerOptions();
  bindServerChange();

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