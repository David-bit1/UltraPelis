const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MOVIES_DIR = path.join(ROOT, 'peliculas');
const ENV_FILE = path.join(ROOT, '.env');
const TMDB_API = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] == null) process.env[key] = value;
  }
}

loadEnvFile(ENV_FILE);

const {
  ensureDatabase,
  syncMoviesFromHtml,
  renderMoviePage,
} = require('../server');

const MOVIES = [
  { title: 'Deadpool', year: 2016, slug: 'deadpool-2016', category: 'superheroes', displayTitle: 'Deadpool (2016)' },
  { title: 'Deadpool 2', year: 2018, slug: 'deadpool-2-2018', category: 'superheroes', displayTitle: 'Deadpool 2 (2018)' },
  { title: 'The Avengers', year: 2012, slug: 'the-avengers-2012', category: 'superheroes', displayTitle: 'The Avengers (2012)', tmdbId: 24428 },
  { title: 'Avengers: Age of Ultron', year: 2015, slug: 'avengers-age-of-ultron-2015', category: 'superheroes', displayTitle: 'Avengers: Era de Ultrón (2015)' },
  { title: 'Avengers: Infinity War', year: 2018, slug: 'avengers-infinity-war-2018', category: 'superheroes', displayTitle: 'Avengers: Infinity War (2018)' },
  { title: 'Wonder Woman', year: 2017, slug: 'wonder-woman-2017', category: 'superheroes', displayTitle: 'Wonder Woman (2017)' },
  { title: 'Wonder Woman 1984', year: 2020, slug: 'wonder-woman-1984-2020', category: 'superheroes', displayTitle: 'Wonder Woman 1984 (2020)' },
  { title: 'Man of Steel', year: 2013, slug: 'man-of-steel-2013', category: 'superheroes', displayTitle: 'Man of Steel (2013)' },
  { title: 'Batman v Superman: Dawn of Justice', year: 2016, slug: 'batman-v-superman-dawn-of-justice-2016', category: 'superheroes', displayTitle: 'Batman v Superman: Dawn of Justice (2016)' },
  { title: 'Suicide Squad', year: 2016, slug: 'suicide-squad-2016', category: 'superheroes', displayTitle: 'Suicide Squad (2016)' },
  { title: 'Zack Snyder\'s Justice League', year: 2021, slug: 'zack-snyders-justice-league-2021', category: 'superheroes', displayTitle: 'Zack Snyder’s Justice League (2021)' },
  { title: 'Aquaman', year: 2018, slug: 'aquaman-2018', category: 'superheroes', displayTitle: 'Aquaman (2018)' },
  { title: 'Shazam!', year: 2019, slug: 'shazam-2019', category: 'superheroes', displayTitle: 'Shazam! (2019)' },
  { title: 'Birds of Prey', year: 2020, slug: 'birds-of-prey-2020', category: 'superheroes', displayTitle: 'Birds of Prey (2020)' },
  { title: 'The Suicide Squad', year: 2021, slug: 'the-suicide-squad-2021', category: 'superheroes', displayTitle: 'The Suicide Squad (2021)' },
  { title: 'Black Adam', year: 2022, slug: 'black-adam-2022', category: 'superheroes', displayTitle: 'Black Adam (2022)' },
  { title: 'Shazam! Fury of the Gods', year: 2023, slug: 'shazam-fury-of-the-gods-2023', category: 'superheroes', displayTitle: 'Shazam! Fury of the Gods (2023)' },
  { title: 'The Flash', year: 2023, slug: 'the-flash-2023', category: 'superheroes', displayTitle: 'The Flash (2023)' },
  { title: 'Blue Beetle', year: 2023, slug: 'blue-beetle-2023', category: 'superheroes', displayTitle: 'Blue Beetle (2023)' },
  { title: 'Aquaman and the Lost Kingdom', year: 2023, slug: 'aquaman-and-the-lost-kingdom-2023', category: 'superheroes', displayTitle: 'Aquaman and the Lost Kingdom (2023)' },
  { title: 'Hannibal Rising', year: 2007, slug: 'hannibal-rising-2007', category: 'thriller', displayTitle: 'Hannibal: El origen del mal (2007)' },
  { title: 'Red Dragon', year: 2002, slug: 'red-dragon-2002', category: 'thriller', displayTitle: 'Dragón Rojo (2002)', tmdbId: 9533 },
  { title: 'The Silence of the Lambs', year: 1991, slug: 'the-silence-of-the-lambs-1991', category: 'thriller', displayTitle: 'El silencio de los inocentes (1991)', tmdbId: 274 },
  { title: 'Hannibal', year: 2001, slug: 'hannibal-2001', category: 'thriller', displayTitle: 'Hannibal (2001)' },
  { title: 'The Super Mario Bros. Movie', year: 2023, slug: 'the-super-mario-bros-movie-2023', category: 'animacion', displayTitle: 'Super Mario Bros. La película (2023)' },
];

const categoryNameMap = {
  superheroes: 'Superheroes',
  thriller: 'Thriller',
  animacion: 'Animacion',
};

function formatDateEs(iso) {
  if (!iso) return 'N/D';
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return 'N/D';
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  return `${date.getUTCDate()} de ${months[date.getUTCMonth()]} de ${date.getUTCFullYear()}`;
}

function formatRuntime(minutes) {
  const total = Number(minutes || 0);
  if (!Number.isFinite(total) || total <= 0) return 'N/D';
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return hours ? `${hours}h ${String(mins).padStart(2, '0')}m` : `${mins}m`;
}

function normalizeText(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`TMDB respondio ${response.status} para ${url}`);
  }
  return response.json();
}

async function searchMovie(title, year) {
  const params = new URLSearchParams({
    api_key: process.env.TMDB_API_KEY || '',
    language: 'es-MX',
    query: title,
    year: String(year),
    include_adult: 'false',
  });
  return fetchJson(`${TMDB_API}/search/movie?${params.toString()}`);
}

function pickBest(targetTitle, targetYear, results) {
  const list = Array.isArray(results) ? results : [];
  if (!list.length) return null;
  const wanted = normalizeText(targetTitle);
  let best = null;
  let bestScore = -Infinity;

  for (const item of list) {
    const title = normalizeText(item.title || item.original_title || '');
    const year = Number.parseInt(String(item.release_date || '').slice(0, 4), 10) || 0;
    let score = 0;
    if (title === wanted) score += 5;
    if (title.includes(wanted) || wanted.includes(title)) score += 2;
    if (year === targetYear) score += 4;
    if (Math.abs(year - targetYear) === 1) score += 1;
    if (item.poster_path) score += 0.5;
    if (item.backdrop_path) score += 0.25;
    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }

  return best;
}

async function getMovieDetails(id, language = 'es-MX') {
  const params = new URLSearchParams({
    api_key: process.env.TMDB_API_KEY || '',
    language,
    append_to_response: 'credits',
  });
  return fetchJson(`${TMDB_API}/movie/${id}?${params.toString()}`);
}

function getDirector(credits) {
  const crew = Array.isArray(credits?.crew) ? credits.crew : [];
  const director = crew.find((person) => String(person.job || '').toLowerCase() === 'director');
  return director?.name || 'N/D';
}

function getCast(credits) {
  const cast = Array.isArray(credits?.cast) ? credits.cast.slice(0, 6) : [];
  if (!cast.length) return 'N/D';
  return cast.map((person) => person.name).join(', ');
}

async function buildMovieData(item) {
  let movieId = Number(item.tmdbId || 0);
  if (!movieId) {
    const search = await searchMovie(item.title, item.year);
    const match = pickBest(item.title, item.year, search.results);
    movieId = Number(match?.id || 0);
  }

  if (!movieId) {
    throw new Error(`No encontre coincidencia en TMDB para ${item.title} (${item.year})`);
  }

  const detailsEs = await getMovieDetails(movieId, 'es-MX');
  const detailsEn = await getMovieDetails(movieId, 'en-US').catch(() => null);
  const overview = detailsEs.overview || detailsEn?.overview || 'Sinopsis no disponible.';
  const posterUrl = detailsEs.poster_path ? `${TMDB_IMG}/w500${detailsEs.poster_path}` : '/img/poster-fallback.svg';
  const bannerUrl = detailsEs.backdrop_path ? `${TMDB_IMG}/original${detailsEs.backdrop_path}` : posterUrl;
  const ratingValue = Number(detailsEs.vote_average || 0);

  return {
    categoria_slug: item.category,
    categoria_nombre: categoryNameMap[item.category] || item.category,
    titulo: item.displayTitle,
    slug: item.slug,
    ruta_html: `peliculas/${item.category}/${item.slug}.html`,
    descripcion: `Mira ${item.displayTitle} en Ultrapelis. Consulta ficha tecnica, sinopsis y opciones para ver la pelicula en linea.`,
    sinopsis: overview,
    director: getDirector(detailsEs.credits),
    reparto: getCast(detailsEs.credits),
    estreno_texto: formatDateEs(detailsEs.release_date),
    duracion: formatRuntime(detailsEs.runtime),
    idioma: 'Español (Latino)',
    calificacion: ratingValue > 0 ? `${ratingValue.toFixed(1)}/10` : 'N/D',
    poster_url: posterUrl,
    banner_url: bannerUrl,
    embed_url: '../../no-video.html',
    veo_embed_url: '',
    extra_embed_url: '',
  };
}

async function main() {
  if (!process.env.TMDB_API_KEY) {
    throw new Error('Falta TMDB_API_KEY en .env');
  }

  ensureDatabase();

  const created = [];
  for (const item of MOVIES) {
    const movie = await buildMovieData(item);
    const outDir = path.join(MOVIES_DIR, item.category);
    const outFile = path.join(outDir, `${item.slug}.html`);
    fs.mkdirSync(outDir, { recursive: true });

    const html = renderMoviePage(movie);
    fs.writeFileSync(outFile, html, 'utf8');
    created.push(path.relative(ROOT, outFile));
  }

  const synced = syncMoviesFromHtml();
  console.log(`Peliculas procesadas: ${created.length}`);
  created.forEach((file) => console.log(`- ${file}`));
  console.log(`Sincronizacion final: ${synced.movies} peliculas en ${synced.categories} categorias.`);
}

main().catch((error) => {
  console.error(error.message || String(error));
  process.exit(1);
});
