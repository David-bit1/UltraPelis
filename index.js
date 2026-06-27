import { createSupabaseBrowserClient } from "./supabase.js";

const supabase = createSupabaseBrowserClient();

const elements = {
  catalogStatus: document.querySelector("#catalog-status"),
  featuredCarousel: document.querySelector("#featured-carousel"),
  featuredNext: document.querySelector("#featured-next"),
  featuredPrev: document.querySelector("#featured-prev"),
  genreGrid: document.querySelector("#genre-grid"),
  heroMeta: document.querySelector("#hero-meta"),
  heroPoster: document.querySelector("#hero-poster"),
  heroTitle: document.querySelector("#hero-title"),
  newReleasesGrid: document.querySelector("#new-releases-grid"),
  openSearch: document.querySelector("#open-search"),
  searchInput: document.querySelector("#search-input"),
};

const state = {
  featured: [],
  newReleases: [],
  latestGenres: [],
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

function movieUrl(movie) {
  return `movie.html?id=${encodeURIComponent(movie.id)}`;
}

function createMovieCard(movie, { featured = false } = {}) {
  const duracion = movie.duracion ? `<br><span class="movie-runtime">${movie.duracion} min</span>` : "";
  return `
    <article class="movie-card${featured ? " featured-card" : ""}">
      <a href="${movieUrl(movie)}" aria-label="Ver ${escapeHtml(movie.titulo)}">
        <div class="poster">
          <img class="poster-image" src="${posterUrl(movie)}" alt="Portada de ${escapeHtml(movie.titulo)}" loading="lazy" />
          <span class="play-badge">${featured ? "Destacada" : "Ver"}</span>
        </div>
        <div class="movie-card-body">
          <p class="movie-genre">${escapeHtml(movie.genero)}</p>
          <h3>${escapeHtml(movie.titulo)}</h3>
          <p class="movie-meta">${escapeHtml(movie["año"])}${duracion}</p>
        </div>
      </a>
    </article>
  `;
}

async function loadGenres() {
  const { data, error } = await supabase.from("peliculas").select("genero");
  if (error) throw error;

  const uniqueGenres = [...new Set((data ?? []).map((item) => item.genero).filter(Boolean))];
  state.latestGenres = uniqueGenres;
}

async function loadHighlights() {
  const { data, error } = await supabase
    .from("peliculas")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) throw error;

  const featuredMovies = data ?? [];
  const heroMovie = featuredMovies[0] || null;

  if (heroMovie) {
    elements.heroPoster.src = posterUrl(heroMovie);
    elements.heroPoster.alt = `Portada de ${heroMovie.titulo}`;
    elements.heroTitle.textContent = heroMovie.titulo;
    elements.heroMeta.textContent = `${heroMovie.genero} | ${heroMovie["año"]}`;
  }

  elements.featuredCarousel.innerHTML = featuredMovies.map((movie) => createMovieCard(movie, { featured: true })).join("");

  const newReleases = featuredMovies.slice(0, 6);
  elements.newReleasesGrid.innerHTML = newReleases.map((movie) => createMovieCard(movie)).join("");
}

function renderGenres() {
  if (!elements.genreGrid) return;
  elements.genreGrid.innerHTML = state.latestGenres
    .map((genre) => `
      <a class="genre-card" href="peliculas.html?genre=${encodeURIComponent(genre)}">${escapeHtml(genre)}</a>
    `)
    .join("");
}

function bindEvents() {
  // Menu toggle
  const menuToggle = document.querySelector("#menu-toggle");
  const siteNav = document.querySelector(".site-nav");
  if (menuToggle && siteNav) {
    menuToggle.addEventListener("click", () => {
      menuToggle.classList.toggle("is-active");
      siteNav.classList.toggle("is-open");
    });
  }

  // Header scroll effect
  window.addEventListener("scroll", () => {
    const header = document.querySelector(".site-header");
    if (header) {
      header.classList.toggle("scrolled", window.scrollY > 10);
    }
  });

  // Search redirect
  if (elements.searchInput) {
    elements.searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const query = elements.searchInput.value.trim();
        if (query) {
          window.location.href = `peliculas.html?search=${encodeURIComponent(query)}`;
        }
      }
    });
  }

  // Featured carousel navigation
  const scrollFeatured = (direction) => {
    const distance = elements.featuredCarousel?.clientWidth * 0.85;
    if (distance) {
      elements.featuredCarousel.scrollBy({ left: direction * distance, behavior: "smooth" });
    }
  };

  elements.featuredPrev?.addEventListener("click", () => scrollFeatured(-1));
  elements.featuredNext?.addEventListener("click", () => scrollFeatured(1));

  // Open search scroll
  elements.openSearch?.addEventListener("click", () => {
    document.querySelector(".catalog-tools")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

async function init() {
  try {
    bindEvents();
    elements.catalogStatus.textContent = "Cargando...";
    await loadGenres();
    await loadHighlights();
    renderGenres();
  } catch (error) {
    console.error(error);
    elements.catalogStatus.textContent = "No se pudo cargar desde Supabase.";
  }
}

init();