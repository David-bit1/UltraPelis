const carousel = document.querySelector("#featured-carousel");
const emptyState = document.querySelector("#empty-state");
const genreFilters = document.querySelector("#genre-filters");
const heroMeta = document.querySelector("#hero-meta");
const heroPoster = document.querySelector("#hero-poster");
const heroTitle = document.querySelector("#hero-title");
const moviesGrid = document.querySelector("#movies-grid");
const resultCount = document.querySelector("#result-count");
const searchForm = document.querySelector("#search-form");
const searchInput = document.querySelector("#search-input");
const nextButton = document.querySelector("#featured-next");
const prevButton = document.querySelector("#featured-prev");

let allMovies = [];
let activeGenre = "Todos";
let activeQuery = "";

async function loadMovies() {
  const response = await fetch("data/movies.json");
  if (!response.ok) {
    throw new Error("No se pudo cargar data/movies.json");
  }
  return response.json();
}

function normalizeText(value) {
  return String(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getMovieUrl(movie) {
  return `movie.html?id=${encodeURIComponent(movie.id)}`;
}

function createMovieCard(movie, featured = false) {
  const card = document.createElement("article");
  card.className = featured ? "movie-card featured-card" : "movie-card";
  card.innerHTML = `
    <a href="${getMovieUrl(movie)}" aria-label="Ver ${movie.title}">
      <div class="poster-wrap">
        <img src="${movie.poster}" alt="Portada de ${movie.title}" loading="lazy" />
        <span class="play-badge">Ver</span>
      </div>
      <div class="movie-info">
        <p class="movie-genre">${movie.genre}</p>
        <h3>${movie.title}</h3>
        <p class="movie-meta">${movie.year}</p>
      </div>
    </a>
  `;
  return card;
}

function renderHero(movies) {
  const featuredMovie = movies.find((movie) => movie.featured) || movies[0];
  if (!featuredMovie) return;
  heroPoster.src = featuredMovie.poster;
  heroPoster.alt = `Portada de ${featuredMovie.title}`;
  heroTitle.textContent = featuredMovie.title;
  heroMeta.textContent = `${featuredMovie.genre} | ${featuredMovie.year}`;
}

function renderCarousel(movies) {
  const featuredMovies = movies.filter((movie) => movie.featured);
  carousel.innerHTML = "";
  featuredMovies.forEach((movie) => {
    carousel.appendChild(createMovieCard(movie, true));
  });
}

function renderGenres(movies) {
  const genres = ["Todos", ...new Set(movies.map((movie) => movie.genre))];
  genreFilters.innerHTML = "";
  genres.forEach((genre) => {
    const button = document.createElement("button");
    button.className = genre === activeGenre ? "genre-button is-active" : "genre-button";
    button.type = "button";
    button.textContent = genre;
    button.addEventListener("click", () => {
      activeGenre = genre;
      renderGenres(allMovies);
      renderGrid();
    });
    genreFilters.appendChild(button);
  });
}

function filterMovies() {
  const query = normalizeText(activeQuery);
  return allMovies.filter((movie) => {
    const matchesGenre = activeGenre === "Todos" || movie.genre === activeGenre;
    const searchable = normalizeText(`${movie.title} ${movie.genre} ${movie.year} ${movie.synopsis}`);
    return matchesGenre && searchable.includes(query);
  });
}

function renderGrid() {
  const movies = filterMovies();
  moviesGrid.innerHTML = "";
  movies.forEach((movie) => {
    moviesGrid.appendChild(createMovieCard(movie));
  });
  resultCount.textContent = `${movies.length} pelicula${movies.length === 1 ? "" : "s"}`;
  emptyState.hidden = movies.length > 0;
}

function bindSearch() {
  searchInput.addEventListener("input", () => {
    activeQuery = searchInput.value.trim();
    renderGrid();
  });

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    activeQuery = searchInput.value.trim();
    renderGrid();
    document.querySelector("#catalogo").scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function bindCarouselControls() {
  nextButton.addEventListener("click", () => {
    carousel.scrollBy({ left: carousel.clientWidth * 0.85, behavior: "smooth" });
  });

  prevButton.addEventListener("click", () => {
    carousel.scrollBy({ left: -carousel.clientWidth * 0.85, behavior: "smooth" });
  });
}

async function initHome() {
  try {
    allMovies = await loadMovies();
    renderHero(allMovies);
    renderCarousel(allMovies);
    renderGenres(allMovies);
    renderGrid();
    bindSearch();
    bindCarouselControls();
  } catch (error) {
    moviesGrid.innerHTML = `<p class="empty-state">No se pudo cargar el catalogo.</p>`;
    console.error(error);
  }
}

initHome();
