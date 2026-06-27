import { createSupabaseBrowserClient } from "./supabase.js";

const supabase = createSupabaseBrowserClient();

const getTmdbApiKey = () => {
  return document.querySelector('meta[name="tmdb-api-key"]')?.content || "";
};

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
  serversList: document.querySelector("#servers-list"),
  addServerBtn: document.querySelector("#add-server"),
  serverModal: document.querySelector("#server-modal"),
  serverForm: document.querySelector("#server-form"),
  closeModal: document.querySelector("#close-modal"),
  serverNombre: document.querySelector("#server-nombre"),
  serverUrl: document.querySelector("#server-url"),
  serverIdioma: document.querySelector("#server-idioma"),
  serverSubtitulos: document.querySelector("#server-subtitulos"),
  serverIdiomaSubtitulos: document.querySelector("#server-idioma-subtitulos"),
  serverCalidad: document.querySelector("#server-calidad"),
  serverEstado: document.querySelector("#server-estado"),
  serverOrden: document.querySelector("#server-orden"),
  subtituloOptions: document.querySelector("#subtitulo-options"),
};

const state = {
  movies: [],
  session: null,
  search: "",
  tmdbLoading: false,
  servers: [],
  editingServerId: null,
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

function setTmdbLoading(loading) {
  state.tmdbLoading = loading;
  elements.fetchTmdbBtn.disabled = loading;
  elements.fetchBtnText.innerHTML = loading 
    ? '<span class="tmdb-loading"></span>' 
    : 'Buscar en TMDb';
}

function movieRow(movie) {
  const canEdit = Boolean(state.session);
  const serverCount = movie.server_count || 0;
  return `
    <tr>
      <td>
        <strong>${escapeHtml(movie.titulo)}</strong>
        <span>${escapeHtml(movie.sinopsis)}</span>
      </td>
      <td>${escapeHtml(movie["año"])}</td>
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
  const query = supabase.from("peliculas").select(`
    id, titulo, "año", genero, sinopsis,
    (select count(*) from servidores where pelicula_id = peliculas.id) as server_count
  `).order("created_at", { ascending: false });

  if (state.search) {
    query.ilike("titulo", `%${state.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  state.movies = data ?? [];
}

function renderMovies() {
  const movies = state.movies;
  elements.moviesTable.innerHTML = movies.map(movieRow).join("");
  elements.movieCount.textContent = `${movies.length} películas`;
  elements.adminEmpty.hidden = movies.length > 0;
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
  state.servers = [];
  renderServers();
}

async function loadServers(peliculaId) {
  const { data, error } = await supabase
    .from("servidores")
    .select("*")
    .eq("pelicula_id", peliculaId)
    .order("orden", { ascending: true });
  
  if (error) throw error;
  state.servers = data ?? [];
  renderServers();
}

function renderServers() {
  if (state.servers.length === 0) {
    elements.serversList.innerHTML = '<p class="no-servers">No hay servidores agregados. Haz clic en "Agregar servidor" para crear uno.</p>';
    return;
  }

  elements.serversList.innerHTML = state.servers.map((server) => `
    <div class="server-card" data-id="${server.id}">
      <div class="server-info">
        <strong>${escapeHtml(server.nombre)}</strong>
        <div class="server-meta">
          <span>🎧 ${getLanguageLabel(server.idioma_audio)}</span>
          <span>📺 ${server.calidad}</span>
          <span class="${server.estado === 'activo' ? 'status-ok' : 'status-error'}">● ${server.estado}</span>
        </div>
      </div>
      <div class="server-actions">
        <button class="secondary-button" type="button" data-action="edit-server" data-id="${server.id}">Editar</button>
        <button class="danger-button" type="button" data-action="delete-server" data-id="${server.id}">×</button>
      </div>
    </div>
  `).join("");
}

function getLanguageLabel(code) {
  const labels = {
    'es': 'Español Latino',
    'es-CO': 'Español Castellano',
    'en': 'English',
    'ja': 'Japanese',
    'other': 'Other'
  };
  return labels[code] || code;
}

async function fillForm(movie) {
  elements.movieId.value = movie.id;
  elements.tmdbIdHidden.value = movie.tmdb_id ?? "";
  elements.titulo.value = movie.titulo ?? "";
  elements.anio.value = movie["año"] ?? "";
  elements.genero.value = movie.genero ?? "";
  elements.generos.value = movie.generos ?? "";
  elements.sinopsis.value = movie.sinopsis ?? "";
  elements.imagen.value = movie.imagen ?? "";
  elements.backdrop.value = movie.backdrop ?? "";
  elements.duracion.value = movie.duracion ?? "";
  elements.clasificacion.value = movie.clasificacion ?? "";
  elements.fecha_estreno.value = movie.fecha_estreno ?? "";
  elements.formTitle.textContent = `Editando #${movie.id}`;
  elements.cancelEdit.hidden = false;
  
  await loadServers(movie.id);
}

async function refreshMovies() {
  await loadMovies();
  renderMovies();
}

async function fetchFromTmdb(movieId) {
  const apiKey = getTmdbApiKey();
  if (!apiKey || apiKey === "TU_API_KEY_AQUI") {
    throw new Error("Configura tu API Key de TMDb en la meta tag tmdb-api-key");
  }

  const response = await fetch(
    `https://api.themoviedb.org/3/movie/${movieId}?api_key=${apiKey}&language=es-ES&append_to_response=release_dates`,
    { headers: { "accept": "application/json" } }
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
    elements.tmdbPosterImg.alt = `Poster de ${data.title}`;
    elements.tmdbPosterImg.hidden = false;
    elements.tmdbPosterPlaceholder.hidden = true;
    elements.imagen.value = `https://image.tmdb.org/t/p/w500${posterPath}`;
  } else {
    elements.tmdbPosterImg.hidden = true;
    elements.tmdbPosterPlaceholder.hidden = false;
  }

  const backdropPath = data.backdrop_path;
  if (backdropPath) {
    elements.tmdbBackdropImg.src = `https://image.tmdb.org/t/p/w1280${backdropPath}`;
    elements.tmdbBackdropImg.alt = `Backdrop de ${data.title}`;
    elements.tmdbBackdropImg.hidden = false;
    elements.tmdbBackdropPlaceholder.hidden = true;
    elements.backdrop.value = `https://image.tmdb.org/t/p/w1280${backdropPath}`;
    elements.tmdbBackdropPreview.hidden = false;
  } else {
    elements.tmdbBackdropPreview.hidden = true;
  }

  elements.titulo.value = data.title || "";
  elements.anio.value = data.release_date ? new Date(data.release_date).getFullYear() : "";
  elements.sinopsis.value = data.overview || "";
  elements.duracion.value = data.runtime || "";
  elements.fecha_estreno.value = data.release_date || "";
  
  const genreNames = data.genres?.map(g => g.name).join(", ") || "";
  elements.genero.value = data.genres?.[0]?.name || "";
  elements.generos.value = genreNames;

  const usRelease = data.release_dates?.results?.find(r => r.iso_3166_1 === "US");
  elements.clasificacion.value = usRelease?.release_dates?.[0]?.certification || "";
  
  elements.tmdbIdHidden.value = data.id;
  elements.tmdbPreviews.hidden = false;
}

async function handleTmdbFetch() {
  const tmdbId = elements.tmdbId.value.trim();
  if (!tmdbId) {
    setTmdbStatus("Escribe un TMDb ID", "error");
    return;
  }

  setTmdbLoading(true);
  setTmdbStatus("Buscando...");

  try {
    const data = await fetchFromTmdb(tmdbId);
    updateTmdbPreviews(data);
    setTmdbStatus("Datos cargados", "success");
  } catch (error) {
    setTmdbStatus(error.message, "error");
    elements.tmdbPreviews.hidden = true;
  } finally {
    setTmdbLoading(false);
  }
}

async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

function updateAuthUI() {
  const signedIn = Boolean(state.session);
  elements.authStatus.textContent = signedIn ? `Conectado como ${state.session.user.email}` : "Desconectado";
  elements.authStatus.dataset.kind = signedIn ? "success" : "info";
  elements.logoutButton.hidden = !signedIn;
  elements.tmdbSearchCard.hidden = !signedIn;
  elements.addServerBtn.disabled = !signedIn;
  
  // Disable movie form fields only (not modal or add-server)
  document.querySelectorAll("#movie-form input, #movie-form textarea, #movie-form select").forEach((field) => {
    field.disabled = !signedIn;
  });
  
  // Disable submit and cancel buttons but not add-server
  document.querySelectorAll("#movie-form .form-actions button").forEach((field) => {
    field.disabled = !signedIn;
  });
}

async function saveMovie(event) {
  event.preventDefault();

  const payload = {
    tmdb_id: elements.tmdbIdHidden.value ? Number(elements.tmdbIdHidden.value) : null,
    titulo: elements.titulo.value.trim(),
    "año": Number(elements.anio.value),
    genero: elements.genero.value.trim(),
    generos: elements.generos.value.trim(),
    sinopsis: elements.sinopsis.value.trim(),
    imagen: elements.imagen.value.trim(),
    backdrop: elements.backdrop.value.trim(),
    duracion: elements.duracion.value ? Number(elements.duracion.value) : null,
    clasificacion: elements.clasificacion.value.trim(),
    fecha_estreno: elements.fecha_estreno.value || null,
  };

  if (!payload.titulo || !payload["año"] || !payload.genero || !payload.sinopsis || !payload.imagen) {
    setStatus("Completa todos los campos obligatorios.", "error");
    return;
  }

  const editingId = elements.movieId.value ? Number(elements.movieId.value) : null;
  setStatus("Guardando...");

  const request = editingId
    ? supabase.from("peliculas").update(payload).eq("id", editingId)
    : supabase.from("peliculas").insert(payload);

  const { error, data } = await request;
  if (error) {
    setStatus(`Error: ${error.message}`, "error");
    return;
  }

  const peliculaId = editingId || data[0].id;
  await saveServers(peliculaId);
  
  setStatus(editingId ? "Película actualizada." : "Película creada.", "success");
  clearForm();
  await refreshMovies();
}

async function saveServers(peliculaId) {
  for (const server of state.servers) {
    const serverPayload = {
      ...server,
      pelicula_id: peliculaId
    };
    
    if (server.id && server.id < 0) {
      const { error } = await supabase.from("servidores").insert({
        ...serverPayload,
        id: undefined
      });
      if (error) console.error("Error saving server:", error);
    } else if (server.id > 0) {
      const { error } = await supabase.from("servidores").update(serverPayload).eq("id", server.id);
      if (error) console.error("Error updating server:", error);
    }
  }
}

async function deleteMovie(id) {
  const movie = state.movies.find((item) => item.id === id);
  if (!movie) return;

  const confirmed = window.confirm(`¿Eliminar "${movie.titulo}"?`);
  if (!confirmed) return;

  const { error } = await supabase.from("peliculas").delete().eq("id", id);
  if (error) {
    setStatus(`Error: ${error.message}`, "error");
    return;
  }

  setStatus("Película eliminada.", "success");
  await refreshMovies();
}

async function openServerModal(serverId = null) {
  // Check if editing a movie (have movie-id)
  const editingId = elements.movieId.value;
  if (!editingId && !state.session) {
    setStatus("Inicia sesión para agregar servidores.", "error");
    return;
  }

  state.editingServerId = serverId;
  
  // Ensure modal elements are not disabled
  document.querySelectorAll("#server-modal input, #server-modal button, #server-modal select, #server-modal textarea").forEach(el => {
    el.disabled = false;
  });
  
  if (serverId) {
    const server = state.servers.find(s => s.id === serverId);
    if (server) {
      elements.serverNombre.value = server.nombre || "";
      elements.serverUrl.value = server.url || "";
      elements.serverIdioma.value = server.idioma_audio || "es";
      elements.serverSubtitulos.checked = server.subtitulos || false;
      elements.serverIdiomaSubtitulos.value = server.idioma_subtitulos || "es";
      elements.serverCalidad.value = server.calidad || "720p";
      elements.serverEstado.value = server.estado || "activo";
      elements.serverOrden.value = server.orden || 1;
      
      elements.subtituloOptions.hidden = !server.subtitulos;
    }
  } else {
    elements.serverForm.reset();
    elements.subtituloOptions.hidden = true;
  }
  
  elements.serverModal.hidden = false;
}

function closeServerModal() {
  elements.serverModal.hidden = true;
  state.editingServerId = null;
}

async function saveServer(event) {
  event.preventDefault();

  const serverData = {
    nombre: elements.serverNombre.value.trim(),
    url: elements.serverUrl.value.trim(),
    idioma_audio: elements.serverIdioma.value,
    subtitulos: elements.serverSubtitulos.checked,
    idioma_subtitulos: elements.serverSubtitulos.checked ? elements.serverIdiomaSubtitulos.value : null,
    calidad: elements.serverCalidad.value,
    estado: elements.serverEstado.value,
    orden: Number(elements.serverOrden.value) || 1,
  };

  if (state.editingServerId && state.editingServerId > 0) {
    const server = state.servers.find(s => s.id === state.editingServerId);
    if (server) {
      Object.assign(server, serverData);
    }
  } else {
    serverData.id = -(state.servers.length + 1); // Temporary negative ID
    state.servers.push(serverData);
  }

  closeServerModal();
  renderServers();
}

async function deleteServer(serverId) {
  const server = state.servers.find(s => s.id === serverId);
  if (!server) return;

  const confirmed = window.confirm(`¿Eliminar servidor "${server.nombre}"?`);
  if (!confirmed) return;

  if (serverId > 0) {
    const { error } = await supabase.from("servidores").delete().eq("id", serverId);
    if (error) {
      setStatus(`Error: ${error.message}`, "error");
      return;
    }
  }

  state.servers = state.servers.filter(s => s.id !== serverId);
  renderServers();
}

function bindTableActions() {
  elements.moviesTable.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = Number(button.dataset.id);
    const movie = state.movies.find((item) => item.id === id);
    if (!movie) return;

    if (button.dataset.action === "edit") {
      await fillForm(movie);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    if (button.dataset.action === "delete") {
      await deleteMovie(id);
    }
  });
}

function bindServersActions() {
  elements.serversList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const serverId = Number(button.dataset.id);
    
    if (button.dataset.action === "edit-server") {
      openServerModal(serverId);
    }
    
    if (button.dataset.action === "delete-server") {
      deleteServer(serverId);
    }
  });
}

function bindSearch() {
  let timer = null;
  elements.adminSearch.addEventListener("input", () => {
    clearTimeout(timer);
    timer = window.setTimeout(async () => {
      state.search = elements.adminSearch.value.trim();
      await refreshMovies();
    }, 180);
  });
}

async function bootstrapAuth() {
  const { data } = await supabase.auth.getSession();
  state.session = data.session;
  updateAuthUI();

  supabase.auth.onAuthStateChange((_event, session) => {
    state.session = session;
    updateAuthUI();
  });
}

function bindAuth() {
  elements.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      setStatus("Iniciando sesión...");
      await signIn(elements.loginEmail.value.trim(), elements.loginPassword.value);
      setStatus("Sesión iniciada.", "success");
      elements.loginPassword.value = "";
    } catch (error) {
      setStatus(`Error: ${error.message}`, "error");
    }
  });

  elements.logoutButton.addEventListener("click", async () => {
    await signOut();
    clearForm();
    setStatus("Sesión cerrada.");
  });
}

function bindForm() {
  elements.movieForm.addEventListener("submit", saveMovie);
  elements.cancelEdit.addEventListener("click", clearForm);
  elements.refreshButton.addEventListener("click", refreshMovies);
  elements.fetchTmdbBtn.addEventListener("click", handleTmdbFetch);
  
  elements.addServerBtn.addEventListener("click", () => openServerModal());
  elements.closeModal.addEventListener("click", closeServerModal);
  elements.serverForm.addEventListener("submit", saveServer);
  
  elements.serverSubtitulos.addEventListener("change", () => {
    elements.subtituloOptions.hidden = !elements.serverSubtitulos.checked;
  });
}

async function initRealtime() {
  supabase
    .channel("peliculas-admin")
    .on("postgres_changes", { event: "*", schema: "public", table: "peliculas" }, async () => {
      await refreshMovies();
    })
    .subscribe();
}

async function init() {
  try {
    bindAuth();
    bindForm();
    bindSearch();
    bindTableActions();
    bindServersActions();
    await bootstrapAuth();
    await refreshMovies();
    await initRealtime();
  } catch (error) {
    console.error(error);
    setStatus("No se pudo conectar con Supabase.", "error");
  }
}

init();