import { createSupabaseBrowserClient } from "./supabase.js";

const supabase = createSupabaseBrowserClient();
const PAGE_SIZE = 24;

const elements = {
  moviesGrid: document.querySelector("#movies-grid"),
  searchInput: document.querySelector("#search-input"),
  searchForm: document.querySelector("#search-form"),
  sortSelect: document.querySelector("#sort-select"),
  genreFilter: document.querySelector("#genre-filter"),
  yearFilter: document.querySelector("#year-filter"),
  clearFilters: document.querySelector("#clear-filters"),
  resetSearch: document.querySelector("#reset-search"),
  loadMore: document.querySelector("#load-more"),
  emptyState: document.querySelector("#empty-state"),
  resultCount: document.querySelector("#result-count"),
  menuToggle: document.querySelector("#menu-toggle"),
  siteNav: document.querySelector(".site-nav"),
};

const state = {
  movies: [],
  query: "",
  genre: "all",
  year: "all",
  sortBy: "recent",
  page: 1,
  total: 0,
  hasMore: false,
  genres: [],
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

function createMovieCard(movie) {
  const duracion = movie.duracion ? `<span class="movie-runtime">${movie.duracion} min</span>` : "";
  return `
    <article class="movie-card">
      <a href="movie.html?id=${encodeURIComponent(movie.id)}" aria-label="Ver ${escapeHtml(movie.titulo)}">
        <div class="poster">
          <img class="poster-image" src="${posterUrl(movie)}" alt="Portada de ${escapeHtml(movie.titulo)}" loading="lazy" />
        </div>
        <div class="movie-card-body">
          <p class="movie-genre">${escapeHtml(movie.genero)}</p>
          <h3>${escapeHtml(movie.titulo)}</h3>
          <p class="movie-meta">${escapeHtml(movie["año"])} ${duracion}</p>
        </div>
      </a>
    </article>
  `;
}

function createSkeletons(count = 6) {
  return Array(count).fill('<div class="skeleton-loader"></div>').join("");
}

async function loadGenres() {
  const { data, error } = await supabase.from("peliculas").select("genero");
  if (error) throw error;
  state.genres = ["all", ...new Set((data ?? []).map(item => item.genero).filter(Boolean))];
  elements.genreFilter.innerHTML = state.genres
    .map(genre => `<option value="${escapeHtml(genre)}">${genre === "all" ? "Todos los géneros" : escapeHtml(genre)}</option>`)
    .join("");
}

async function loadYears() {
  const { data, error } = await supabase.from("peliculas").select('"año"').order('"año"', { ascending: false });
  if (error) throw error;
  const years = ["all", ...new Set((data ?? []).map(item => item["año"]).filter(Boolean))];
  elements.yearFilter.innerHTML = years
    .map(year => `<option value="${year}">${year === "all" ? "Cualquier año" : year}</option>`)
    .join("");
}

function buildQuery() {
  let query = supabase.from("peliculas").select("*", { count: "exact" });

  if (state.query) {
    query = query.ilike("titulo", `%${state.query}%`);
  }

  if (state.genre !== "all") {
    query = query.eq("genero", state.genre);
  }

  if (state.year !== "all") {
    query = query.eq('"año"', Number(state.year));
  }

  // Apply sorting
  switch (state.sortBy) {
    case "popular":
      query = query.order("created_at", { ascending: false });
      break;
    case "rating":
      query = query.order("created_at", { ascending: false });
      break;
    case "title":
      query = query.order("titulo", { ascending: true });
      break;
    case "recent":
    default:
      query = query.order("created_at", { ascending: false });
  }

  const offset = (state.page - 1) * PAGE_SIZE;
  return query.range(offset, offset + PAGE_SIZE - 1);
}

async function loadMovies() {
  elements.moviesGrid.innerHTML = createSkeletons();
  elements.emptyState.hidden = true;

  const { data, error, count } = await buildQuery();

  if (error) {
    console.error(error);
    elements.moviesGrid.innerHTML = "";
    return;
  }

  const fetchedMovies = data ?? [];
  
  if (state.page === 1) {
    state.movies = fetchedMovies;
  } else {
    state.movies = [...state.movies, ...fetchedMovies];
  }

  state.total = count ?? 0;
  state.hasMore = (state.page - 1) * PAGE_SIZE + fetchedMovies.length < (count ?? 0);

  renderMovies();
}

function renderMovies() {
  if (state.movies.length === 0) {
    elements.moviesGrid.innerHTML = "";
    elements.emptyState.hidden = false;
  } else {
    elements.moviesGrid.innerHTML = state.movies.map(createMovieCard).join("");
    elements.emptyState.hidden = true;
  }

  elements.resultCount.textContent = `${state.movies.length} de ${state.total} películas`;
  elements.loadMore.hidden = !state.hasMore;
}

async function refreshMovies() {
  state.page = 1;
  await loadMovies();
}

function bindEvents() {
  // Search
  elements.searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    state.query = elements.searchInput.value.trim();
    refreshMovies();
  });

  // Typing search
  let timer;
  elements.searchInput.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      state.query = elements.searchInput.value.trim();
      refreshMovies();
    }, 300);
  });

  // Sort change
  elements.sortSelect.addEventListener("change", () => {
    state.sortBy = elements.sortSelect.value;
    refreshMovies();
  });

  // Genre filter
  elements.genreFilter.addEventListener("change", () => {
    state.genre = elements.genreFilter.value;
    refreshMovies();
  });

  // Year filter
  elements.yearFilter.addEventListener("change", () => {
    state.year = elements.yearFilter.value;
    refreshMovies();
  });

  // Clear filters
  elements.clearFilters.addEventListener("click", () => {
    state.query = "";
    state.genre = "all";
    state.year = "all";
    state.sortBy = "recent";
    elements.searchInput.value = "";
    elements.sortSelect.value = "recent";
    elements.genreFilter.value = "all";
    elements.yearFilter.selectedIndex = 0;
    refreshMovies();
  });

  // Reset search
  elements.resetSearch.addEventListener("click", () => {
    elements.searchInput.value = "";
    state.query = "";
    refreshMovies();
  });

  // Load more
  elements.loadMore.addEventListener("click", async () => {
    state.page += 1;
    await loadMovies();
  });

  // Menu toggle
  elements.menuToggle.addEventListener("click", () => {
    elements.menuToggle.classList.toggle("is-active");
    elements.siteNav.classList.toggle("is-open");
  });

  // Header scroll effect
  let lastScroll = 0;
  window.addEventListener("scroll", () => {
    const currentScroll = window.scrollY;
    document.querySelector(".site-header").classList.toggle("scrolled", currentScroll > 10);
    lastScroll = currentScroll;
  });
}

async function init() {
  try {
    bindEvents();
    await loadGenres();
    await loadYears();
    await refreshMovies();
  } catch (error) {
    console.error(error);
    elements.moviesGrid.innerHTML = "";
    elements.emptyState.hidden = false;
  }
}

init();