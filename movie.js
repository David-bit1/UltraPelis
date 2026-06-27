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
  serverTabs: document.querySelector("#server-tabs"),
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

function renderServerTabs(movie) {
  const servers = [
    movie.servidor_1,
    movie.servidor_2,
    movie.servidor_3,
    movie.servidor_4,
  ].filter(Boolean);

  if (servers.length <= 1) {
    elements.serverTabs.innerHTML = "";
    return;
  }

  elements.serverTabs.innerHTML = servers.map((server, index) => `
    <button class="secondary-button server-tab" type="button" data-server="${index + 1}" ${index === 0 ? 'data-active="true"' : ''}>
      Servidor ${index + 1}
    </button>
  `).join("");

  const tabs = elements.serverTabs.querySelectorAll(".server-tab");
  tabs.forEach((tab, idx) => {
    tab.addEventListener("click", () => {
      elements.iframe.src = servers[idx];
      tabs.forEach(t => t.removeAttribute("data-active"));
      tab.setAttribute("data-active", "true");
    });
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
  }

  window.addEventListener("scroll", () => {
    const header = document.querySelector(".site-header");
    if (header) {
      header.classList.toggle("scrolled", window.scrollY > 10);
    }
  });
}

async function loadMovie() {
  const movieId = getMovieId();
  if (!movieId) {
    renderError("Falta el parámetro id en la URL.");
    return;
  }

  const { data, error } = await supabase
    .from("peliculas")
    .select("*")
    .eq("id", movieId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    renderError("No existe una película con ese identificador.");
    return;
  }

  const movie = data;
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
  } else {
    elements.durationItem.hidden = true;
  }

  // Rating
  if (movie.clasificacion) {
    elements.rating.textContent = movie.clasificacion;
    elements.ratingItem.hidden = false;
  } else {
    elements.ratingItem.hidden = true;
  }

  // Release date
  if (movie.fecha_estreno) {
    elements.releaseDate.textContent = new Date(movie.fecha_estreno).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    elements.releaseItem.hidden = false;
  } else {
    elements.releaseItem.hidden = true;
  }

  // Multiple servers
  const servers = [
    movie.servidor_1,
    movie.servidor_2,
    movie.servidor_3,
    movie.servidor_4,
  ].filter(Boolean);

  const firstServer = servers[0] || movie.iframe || "";
  elements.iframe.src = firstServer;
  elements.iframe.title = `Reproductor de ${movie.titulo}`;
  
  renderServerTabs(movie);

  const { data: relatedMovies, error: relatedError } = await supabase
    .from("peliculas")
    .select("*")
    .eq("genero", movie.genero)
    .neq("id", movie.id)
    .order("created_at", { ascending: false })
    .limit(6);

  if (relatedError) {
    throw relatedError;
  }

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