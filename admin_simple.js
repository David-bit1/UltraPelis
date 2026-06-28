import { createSupabaseBrowserClient } from "./supabase.js";

const supabase = createSupabaseBrowserClient();

const elements = {
  adminEmpty: document.querySelector("#admin-empty"),
  adminSearch: document.querySelector("#admin-search"),
  authStatus: document.querySelector("#auth-status"),
  cancelEdit: document.querySelector("#cancel-edit"),
  formStatus: document.querySelector("#form-status"),
  formTitle: document.querySelector("#form-title"),
  loginEmail: document.querySelector("#login-email"),
  loginForm: document.querySelector("#login-form"),
  loginPassword: document.querySelector("#login-password"),
  logoutButton: document.querySelector("#logout-button"),
  movieCount: document.querySelector("#movie-count"),
  movieForm: document.querySelector("#movie-form"),
  movieId: document.querySelector("#movie-id"),
  moviesTable: document.querySelector("#movies-table"),
  refreshButton: document.querySelector("#refresh-button"),
  sinopsis: document.querySelector("#sinopsis"),
  titulo: document.querySelector("#titulo"),
  anio: document.querySelector("#anio"),
  genero: document.querySelector("#genero"),
  generos: document.querySelector("#generos"),
  imagen: document.querySelector("#imagen"),
  backdrop: document.querySelector("#backdrop"),
  duracion: document.querySelector("#duracion"),
  clasificacion: document.querySelector("#clasificacion"),
  fecha_estreno: document.querySelector("#fecha_estreno"),
  tmdbId: document.querySelector("#tmdb-id"),
  tmdbIdHidden: document.querySelector("#tmdb-id-hidden"),
  fetchTmdbBtn: document.querySelector("#fetch-tmdb-btn"),
  fetchBtnText: document.querySelector("#fetch-btn-text"),
  tmdbStatus: document.querySelector("#tmdb-status"),
  tmdbSearchCard: document.querySelector("#tmdb-search-card"),
  tmdbPreviews: document.querySelector("#tmdb-previews"),
  tmdbPosterImg: document.querySelector("#tmdb-poster-img"),
  tmdbPosterPlaceholder: document.querySelector("#tmdb-poster-placeholder"),
  tmdbBackdropPreview: document.querySelector("#tmdb-backdrop-preview"),
  tmdbBackdropImg: document.querySelector("#tmdb-backdrop-img"),
  tmdbBackdropPlaceholder: document.querySelector("#tmdb-backdrop-placeholder"),
  tmdbTitulo: document.querySelector("#tmdb-titulo"),
  tmdbAnio: document.querySelector("#tmdb-anio"),
  tmdbGenerosList: document.querySelector("#tmdb-generos-list"),
  tmdbDuracion: document.querySelector("#tmdb-duracion"),
  tmdbClasificacion: document.querySelector("#tmdb-clasificacion"),
  tmdbFechaEstreno: document.querySelector("#tmdb-fecha-estreno"),
  iframe: document.querySelector("#iframe"),
  servidor2: document.querySelector("#servidor-2"),
  servidor3: document.querySelector("#servidor-3"),
  servidor4: document.querySelector("#servidor-4"),
};

const state = {
  movies: [],
  session: null,
  search: "",
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setStatus(message, kind = "info") {
  elements.formStatus.textContent = message;
  elements.formStatus.dataset.kind = kind;
}

function setTmdbStatus(message, kind = "info") {
  elements.tmdbStatus.textContent = message;
  elements.tmdbStatus.dataset.kind = kind;
}

function movieRow(movie) {
  return `
    <tr>
      <td>
        <strong>${escapeHtml(movie.titulo)}</strong>
        <span>${escapeHtml(movie.sinopsis)}</span>
      </td>
      <td>${escapeHtml(movie.año || movie["año"])}</td>
      <td>${escapeHtml(movie.genero)}</td>
      <td>
        <div class="row-actions">
          <button class="secondary-button" type="button" data-action="edit" data-id="${movie.id}">Editar</button>
          <button class="danger-button" type="button" data-action="delete" data-id="${movie.id}">Eliminar</button>
        </div>
      </td>
    </tr>
  `;
}

async function loadMovies() {
  const query = supabase.from("peliculas").select(
    "id, titulo, año, genero, sinopsis, imagen, iframe, servidor_2, servidor_3, servidor_4, backdrop, duracion, clasificacion, fecha_estreno, tmdb_id, generos, destacada, created_at"
  ).order("created_at", { ascending: false });

  if (state.search) {
    query.ilike("titulo", `%${state.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  state.movies = data ?? [];
}

function renderMovies() {
  elements.moviesTable.innerHTML = state.movies.map(movieRow).join("");
  elements.movieCount.textContent = `${state.movies.length} películas`;
  elements.adminEmpty.hidden = state.movies.length > 0;
}

function clearForm() {
  elements.movieId.value = "";
  elements.tmdbIdHidden.value = "";
  elements.tmdbId.value = "";
  elements.movieForm.reset();
  elements.formTitle.textContent = "Agregar película";
  elements.cancelEdit.hidden = true;
  elements.tmdbPreviews.hidden = true;
  elements.tmdbSearchCard.hidden = !state.session;
}

async function fillForm(movie) {
  elements.movieId.value = movie.id;
  elements.tmdbIdHidden.value = movie.tmdb_id ?? "";
  elements.titulo.value = movie.titulo ?? "";
  elements.anio.value = movie.año ?? movie["año"] ?? "";
  elements.genero.value = movie.genero ?? "";
  elements.generos.value = movie.generos ?? "";
  elements.sinopsis.value = movie.sinopsis ?? "";
  elements.imagen.value = movie.imagen ?? "";
  elements.backdrop.value = movie.backdrop ?? "";
  elements.duracion.value = movie.duracion ?? "";
  elements.clasificacion.value = movie.clasificacion ?? "";
  elements.fecha_estreno.value = movie.fecha_estreno ?? "";
  elements.iframe.value = movie.iframe ?? "";
  elements.servidor2.value = movie.servidor_2 ?? "";
  elements.servidor3.value = movie.servidor_3 ?? "";
  elements.servidor4.value = movie.servidor_4 ?? "";
  elements.formTitle.textContent = `Editando #${movie.id}`;
  elements.cancelEdit.hidden = false;
}

async function refreshMovies() {
  await loadMovies();
  renderMovies();
}

async function fetchFromTmdb(movieId) {
  const apiKey = document.querySelector('meta[name="tmdb-api-key"]')?.content;
  const response = await fetch(
    `https://api.themoviedb.org/3/movie/${movieId}?api_key=${apiKey}&language=es-ES&append_to_response=release_dates`
  );
  if (!response.ok) {
    if (response.status === 404) throw new Error("Película no encontrada en TMDb");
    if (response.status === 401) throw new Error("API Key de TMDb inválida");
    throw new Error(`Error TMDb: ${response.status}`);
  }
  return response.json();
}

function updateTmdbPreviews(data) {
  const posterPath = data.poster_path;
  if (posterPath) {
    elements.tmdbPosterImg.src = `https://image.tmdb.org/t/p/w500${posterPath}`;
    elements.tmdbPosterImg.hidden = false;
    elements.tmdbPosterPlaceholder.hidden = true;
    elements.imagen.value = `https://image.tmdb.org/t/p/w500${posterPath}`;
  }
  const backdropPath = data.backdrop_path;
  if (backdropPath) {
    elements.tmdbBackdropImg.src = `https://image.tmdb.org/t/p/w1280${backdropPath}`;
    elements.tmdbBackdropImg.hidden = false;
    elements.tmdbBackdropPreview.hidden = false;
  }
  elements.titulo.value = data.title || "";
  elements.anio.value = data.release_date ? new Date(data.release_date).getFullYear() : "";
  elements.sinopsis.value = data.overview || "";
  elements.duracion.value = data.runtime || "";
  elements.fecha_estreno.value = data.release_date || "";
  elements.genero.value = data.genres?.[0]?.name || "";
  elements.generos.value = data.genres?.map(g => g.name).join(", ") || "";
  const usRelease = data.release_dates?.results?.find(r => r.iso_3166_1 === "US");
  elements.clasificacion.value = usRelease?.release_dates?.[0]?.certification || "";
  elements.tmdbIdHidden.value = data.id;
  elements.tmdbPreviews.hidden = false;
}

async function handleTmdbFetch() {
  const tmdbId = elements.tmdbId.value.trim();
  if (!tmdbId) return setTmdbStatus("Escribe un TMDb ID", "error");
  elements.fetchTmdbBtn.disabled = true;
  elements.tmdbPreviews.hidden = true;
  try {
    const data = await fetchFromTmdb(tmdbId);
    updateTmdbPreviews(data);
    setTmdbStatus("Datos cargados", "success");
  } catch (error) {
    setTmdbStatus(error.message, "error");
  }
  elements.fetchTmdbBtn.disabled = false;
}

function updateAuthUI() {
  const signedIn = Boolean(state.session);
  elements.authStatus.textContent = signedIn ? `Conectado como ${state.session.user.email}` : "Desconectado";
  elements.authStatus.dataset.kind = signedIn ? "success" : "info";
  elements.logoutButton.hidden = !signedIn;
  elements.tmdbSearchCard.hidden = !signedIn;
  document.querySelectorAll("#movie-form input, #movie-form textarea, #movie-form select").forEach(
    (field) => (field.disabled = !signedIn)
  );
  document.querySelectorAll("#movie-form .form-actions button").forEach(
    (field) => (field.disabled = !signedIn)
  );
}

async function saveMovie(event) {
  event.preventDefault();
  const payload = {
    tmdb_id: elements.tmdbIdHidden.value ? Number(elements.tmdbIdHidden.value) : null,
    titulo: elements.titulo.value.trim(),
    año: Number(elements.anio.value),
    genero: elements.genero.value.trim(),
    generos: elements.generos.value.trim(),
    sinopsis: elements.sinopsis.value.trim(),
    imagen: elements.imagen.value.trim(),
    backdrop: elements.backdrop.value.trim(),
    duracion: elements.duracion.value ? Number(elements.duracion.value) : null,
    clasificacion: elements.clasificacion.value.trim(),
    fecha_estreno: elements.fecha_estreno.value || null,
    iframe: elements.iframe.value.trim() || null,
    servidor_2: elements.servidor2.value.trim() || null,
    servidor_3: elements.servidor3.value.trim() || null,
    servidor_4: elements.servidor4.value.trim() || null,
  };
  if (!payload.titulo || !payload.año || !payload.genero || !payload.sinopsis || !payload.imagen) {
    setStatus("Completa todos los campos obligatorios.", "error");
    return;
  }
  setStatus("Guardando...");
  const editingId = elements.movieId.value ? Number(elements.movieId.value) : null;
  const request = editingId
    ? supabase.from("peliculas").update(payload).eq("id", editingId)
    : supabase.from("peliculas").insert(payload);
  const { error } = await request;
  if (error) {
    setStatus(`Error: ${error.message}`, "error");
    return;
  }
  setStatus(editingId ? "Película actualizada." : "Película creada.", "success");
  clearForm();
  await refreshMovies();
}

async function deleteMovie(id) {
  if (!confirm(`¿Eliminar la película?`)) return;
  const { error } = await supabase.from("peliculas").delete().eq("id", id);
  if (error) return setStatus(`Error: ${error.message}`, "error");
  setStatus("Película eliminada.", "success");
  await refreshMovies();
}

function bindTableActions() {
  elements.moviesTable.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const movie = state.movies.find((m) => m.id === id);
    if (!movie) return;
    if (btn.dataset.action === "edit") {
      await fillForm(movie);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (btn.dataset.action === "delete") await deleteMovie(id);
  });
}

function bindSearch() {
  let timer;
  elements.adminSearch.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      state.search = elements.adminSearch.value.trim();
      await refreshMovies();
    }, 180);
  });
}

async function bootstrapAuth() {
  const { data } = await supabase.auth.getSession();
  state.session = data.session;
  updateAuthUI();
  supabase.auth.onAuthStateChange((_e, session) => {
    state.session = session;
    updateAuthUI();
  });
}

function bindAuth() {
  elements.loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("Iniciando sesión...");
    const { error } = await supabase.auth.signInWithPassword({
      email: elements.loginEmail.value,
      password: elements.loginPassword.value,
    });
    if (error) return setStatus(`Error: ${error.message}`, "error");
    setStatus("Sesión iniciada.", "success");
    elements.loginPassword.value = "";
  });
  elements.logoutButton.addEventListener("click", async () => {
    await supabase.auth.signOut();
    clearForm();
    setStatus("Sesión cerrada.");
  });
}

function bindForm() {
  elements.movieForm.addEventListener("submit", saveMovie);
  elements.cancelEdit.addEventListener("click", clearForm);
  elements.refreshButton.addEventListener("click", refreshMovies);
  elements.fetchTmdbBtn.addEventListener("click", handleTmdbFetch);
}

async function init() {
  try {
    bindAuth();
    bindForm();
    bindSearch();
    bindTableActions();
    await bootstrapAuth();
    await refreshMovies();
  } catch (error) {
    console.error(error);
    setStatus(`Error: ${error.message}`, "error");
  }
}

init();