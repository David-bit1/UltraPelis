import { createSupabaseBrowserClient } from "./supabase.js";

const supabase = createSupabaseBrowserClient();

const elements = {
  adminEmpty: document.querySelector("#admin-empty"),
  adminSearch: document.querySelector("#admin-search"),
  authStatus: document.querySelector("#auth-status"),
  cancelEdit: document.querySelector("#cancel-edit"),
  formStatus: document.querySelector("#form-status"),
  formTitle: document.querySelector("#form-title"),
  iframe: document.querySelector("#iframe"),
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
  imagen: document.querySelector("#imagen"),
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

function movieRow(movie) {
  const canEdit = Boolean(state.session);
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
          <button class="secondary-button" type="button" data-action="edit" data-id="${movie.id}" ${canEdit ? "" : "disabled"}>Editar</button>
          <button class="danger-button" type="button" data-action="delete" data-id="${movie.id}" ${canEdit ? "" : "disabled"}>Eliminar</button>
        </div>
      </td>
    </tr>
  `;
}

async function loadMovies() {
  const query = supabase.from("peliculas").select("*").order("created_at", { ascending: false });

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
  elements.movieForm.reset();
  elements.formTitle.textContent = "Agregar película";
  elements.cancelEdit.hidden = true;
}

function fillForm(movie) {
  elements.movieId.value = movie.id;
  elements.titulo.value = movie.titulo ?? "";
  elements.anio.value = movie["año"] ?? "";
  elements.genero.value = movie.genero ?? "";
  elements.sinopsis.value = movie.sinopsis ?? "";
  elements.imagen.value = movie.imagen ?? "";
  elements.iframe.value = movie.iframe ?? "";
  elements.formTitle.textContent = `Editando #${movie.id}`;
  elements.cancelEdit.hidden = false;
}

async function refreshMovies() {
  await loadMovies();
  renderMovies();
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
  elements.movieForm.querySelectorAll("input, textarea, button").forEach((field) => {
    if (field.id === "cancel-edit") {
      field.disabled = !signedIn;
      return;
    }
    field.disabled = !signedIn;
  });
}

async function saveMovie(event) {
  event.preventDefault();

  const payload = {
    titulo: elements.titulo.value.trim(),
    "año": Number(elements.anio.value),
    genero: elements.genero.value.trim(),
    sinopsis: elements.sinopsis.value.trim(),
    imagen: elements.imagen.value.trim(),
    iframe: elements.iframe.value.trim(),
  };

  if (!payload.titulo || !payload["año"] || !payload.genero || !payload.sinopsis || !payload.imagen || !payload.iframe) {
    setStatus("Completa todos los campos.", "error");
    return;
  }

  const editingId = elements.movieId.value ? Number(elements.movieId.value) : null;
  setStatus("Guardando...");

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

function bindTableActions() {
  elements.moviesTable.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = Number(button.dataset.id);
    const movie = state.movies.find((item) => item.id === id);
    if (!movie) return;

    if (button.dataset.action === "edit") {
      fillForm(movie);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    if (button.dataset.action === "delete") {
      await deleteMovie(id);
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
    await bootstrapAuth();
    await refreshMovies();
    await initRealtime();
  } catch (error) {
    console.error(error);
    setStatus("No se pudo conectar con Supabase.", "error");
  }
}

init();
