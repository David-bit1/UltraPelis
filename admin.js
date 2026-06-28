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
  serversContainer: document.querySelector("#servers-container"),
};

for (let i = 1; i <= 4; i++) {
  elements[`servidor${i}_nombre`] = document.querySelector(`#servidor${i}_nombre`);
  elements[`servidor${i}_iframe`] = document.querySelector(`#servidor${i}_iframe`);
  elements[`servidor${i}_idioma`] = document.querySelector(`#servidor${i}_idioma`);
  elements[`servidor${i}_subtitulos`] = document.querySelector(`#servidor${i}_subtitulos`);
  elements[`servidor${i}_idioma_sub`] = document.querySelector(`#servidor${i}_idioma_sub`);
  elements[`servidor${i}_calidad`] = document.querySelector(`#servidor${i}_calidad`);
}

const state = { movies: [], session: null, search: "", tmdbLoading: false, editingServerNum: null };

function escapeHtml(v) { return String(v).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;"); }

function setStatus(m, k = "info") { elements.formStatus.textContent = m; elements.formStatus.dataset.kind = k; }

function setTmdbStatus(m, k = "info") { elements.tmdbStatus.textContent = m; elements.tmdbStatus.dataset.kind = k; }

function setTmdbLoading(l) { state.tmdbLoading = l; elements.fetchTmdbBtn.disabled = l; elements.fetchBtnText.innerHTML = l ? '<span class="tmdb-loading"></span>' : 'Buscar en TMDb'; }

function movieRow(m) { return `<tr><td><strong>${escapeHtml(m.titulo)}</strong><span>${escapeHtml(m.sinopsis)}</span></td><td>${escapeHtml(m.año)}</td><td>${escapeHtml(m.genero)}</td><td><div class="row-actions"><button class="secondary-button" type="button" data-action="edit" data-id="${m.id}">Editar</button><button class="danger-button" type="button" data-action="delete" data-id="${m.id}">Eliminar</button></div></td></tr>`; }

function getLanguageLabel(c) { return { 'es': 'Español Latino', 'es-CO': 'Español Castellano', 'en': 'English', 'ja': 'Japanese', 'other': 'Other' }[c] || c; }

async function loadMovies() {
  const { data, error } = await supabase.from("peliculas")
    .select("id, titulo, \"año\", genero, sinopsis, imagen, backdrop, duracion, clasificacion, fecha_estreno, tmdb_id, generos, destacada, created_at, iframe, servidor1_nombre, servidor1_iframe, servidor1_idioma, servidor1_subtitulos, servidor1_idioma_sub, servidor1_calidad, servidor2_nombre, servidor2_iframe, servidor2_idioma, servidor2_subtitulos, servidor2_idioma_sub, servidor2_calidad, servidor3_nombre, servidor3_iframe, servidor3_idioma, servidor3_subtitulos, servidor3_idioma_sub, servidor3_calidad, servidor4_nombre, servidor4_iframe, servidor4_idioma, servidor4_subtitulos, servidor4_idioma_sub, servidor4_calidad")
    .order("created_at", { ascending: false });
  if (error) throw error;
  state.movies = data ?? [];
}

function renderMovies() { elements.moviesTable.innerHTML = state.movies.map(movieRow).join(""); elements.movieCount.textContent = `${state.movies.length} películas`; elements.adminEmpty.hidden = state.movies.length > 0; }

async function refreshMovies() { await loadMovies(); renderMovies(); }

function clearAllServers() { for (let i = 1; i <= 4; i++) setServerFields(i, { nombre: "", iframe: "", idioma: "es", subtitulos: false, idioma_sub: "", calidad: "720p" }); }

function clearForm() {
  elements.movieId.value = ""; elements.tmdbIdHidden.value = ""; elements.tmdbId.value = ""; elements.movieForm.reset();
  elements.formTitle.textContent = "Agregar película"; elements.cancelEdit.hidden = true; elements.tmdbPreviews.hidden = true; elements.tmdbSearchCard.hidden = !state.session;
  clearAllServers();
}

function setServerFields(s, d) {
  if (elements[`servidor${s}_nombre`]) elements[`servidor${s}_nombre`].value = d.nombre || "";
  if (elements[`servidor${s}_iframe`]) elements[`servidor${s}_iframe`].value = d.iframe || "";
  if (elements[`servidor${s}_idioma`]) elements[`servidor${s}_idioma`].value = d.idioma || "es";
  if (elements[`servidor${s}_subtitulos`]) elements[`servidor${s}_subtitulos`].checked = !!d.subtitulos;
  if (elements[`servidor${s}_idioma_sub`]) elements[`servidor${s}_idioma_sub`].value = d.idioma_sub || "es";
  if (elements[`servidor${s}_calidad`]) elements[`servidor${s}_calidad`].value = d.calidad || "720p";
}

function getServerFields(s) {
  const st = elements[`servidor${s}_subtitulos`]?.checked;
  return { nombre: elements[`servidor${s}_nombre`]?.value.trim() || "", iframe: elements[`servidor${s}_iframe`]?.value.trim() || "", idioma: elements[`servidor${s}_idioma`]?.value || "es", subtitulos: st || false, idioma_sub: st ? (elements[`servidor${s}_idioma_sub`]?.value || "es") : null, calidad: elements[`servidor${s}_calidad`]?.value || "720p" };
}

async function fillForm(m) {
  elements.movieId.value = m.id; elements.tmdbIdHidden.value = m.tmdb_id ?? ""; elements.titulo.value = m.titulo ?? ""; elements.anio.value = m.año ?? "";
  elements.genero.value = m.genero ?? ""; elements.generos.value = m.generos ?? ""; elements.sinopsis.value = m.sinopsis ?? ""; elements.imagen.value = m.imagen ?? "";
  elements.backdrop.value = m.backdrop ?? ""; elements.duracion.value = m.duracion ?? ""; elements.clasificacion.value = m.clasificacion ?? ""; elements.fecha_estreno.value = m.fecha_estreno ?? "";
  elements.formTitle.textContent = `Editando #${m.id}`; elements.cancelEdit.hidden = false;
  for (let i = 1; i <= 4; i++) setServerFields(i, { nombre: m[`servidor${i}_nombre`] || "", iframe: m[`servidor${i}_iframe`] || "", idioma: m[`servidor${i}_idioma`] || "es", subtitulos: m[`servidor${i}_subtitulos`] || false, idioma_sub: m[`servidor${i}_idioma_sub`] || "", calidad: m[`servidor${i}_calidad`] || "720p" });
}

async function fetchFromTmdb(id) {
  const key = document.querySelector('meta[name="tmdb-api-key"]')?.content || "";
  if (!key || key === "TU_API_KEY_AQUI") throw new Error("Configura tu API Key de TMDb");
  const r = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${key}&language=es-ES&append_to_response=release_dates`);
  if (!r.ok) throw r.status === 404 ? new Error("Película no encontrada en TMDb") : r.status === 401 ? new Error("API Key de TMDb inválida") : new Error(`Error TMDb: ${r.status}`);
  return r.json();
}

function updateTmdbPreviews(d) {
  if (d.poster_path) { elements.tmdbPosterImg.src = `https://image.tmdb.org/t/p/w500${d.poster_path}`; elements.tmdbPosterImg.alt = `Poster de ${d.title}`; elements.tmdbPosterImg.hidden = false; elements.tmdbPosterPlaceholder.hidden = true; elements.imagen.value = `https://image.tmdb.org/t/p/w500${d.poster_path}`; }
  else { elements.tmdbPosterImg.hidden = true; elements.tmdbPosterPlaceholder.hidden = false; }
  if (d.backdrop_path) { elements.tmdbBackdropImg.src = `https://image.tmdb.org/t/p/w1280${d.backdrop_path}`; elements.tmdbBackdropImg.alt = `Backdrop de ${d.title}`; elements.tmdbBackdropImg.hidden = false; elements.tmdbBackdropPlaceholder.hidden = true; elements.backdrop.value = `https://image.tmdb.org/t/p/w1280${d.backdrop_path}`; elements.tmdbBackdropPreview.hidden = false; }
  else { elements.tmdbBackdropPreview.hidden = true; }
  elements.titulo.value = d.title || ""; elements.anio.value = d.release_date ? new Date(d.release_date).getFullYear() : ""; elements.sinopsis.value = d.overview || "";
  elements.duracion.value = d.runtime || ""; elements.fecha_estreno.value = d.release_date || "";
  elements.genero.value = d.genres?.[0]?.name || ""; elements.generos.value = d.genres?.map(g => g.name).join(", ") || "";
  const us = d.release_dates?.results?.find(r => r.iso_3166_1 === "US"); elements.clasificacion.value = us?.release_dates?.[0]?.certification || "";
  elements.tmdbIdHidden.value = d.id; elements.tmdbPreviews.hidden = false;
}

async function handleTmdbFetch() {
  const id = elements.tmdbId.value.trim();
  if (!id) { setTmdbStatus("Escribe un TMDb ID", "error"); return; }
  setTmdbLoading(true); setTmdbStatus("Buscando...");
  try { const d = await fetchFromTmdb(id); updateTmdbPreviews(d); setTmdbStatus("Datos cargados", "success"); }
  catch (e) { setTmdbStatus(e.message, "error"); elements.tmdbPreviews.hidden = true; }
  finally { setTmdbLoading(false); }
}

async function signIn(e, p) { const { error } = await supabase.auth.signInWithPassword({ email: e, password: p }); if (error) throw error; }
async function signOut() { const { error } = await supabase.auth.signOut(); if (error) throw error; }

function updateAuthUI() {
  const si = !!state.session; elements.authStatus.textContent = si ? `Conectado como ${state.session.user.email}` : "Desconectado";
  elements.authStatus.dataset.kind = si ? "success" : "info"; elements.logoutButton.hidden = !si; elements.tmdbSearchCard.hidden = !si;
  document.querySelectorAll("#movie-form input, #movie-form textarea, #movie-form select").forEach(f => f.disabled = !si);
  document.querySelectorAll("#movie-form .form-actions button").forEach(f => f.disabled = !si);
}

async function saveMovie(e) {
  e.preventDefault();
  const payload = { tmdb_id: elements.tmdbIdHidden.value ? Number(elements.tmdbIdHidden.value) : null, titulo: elements.titulo.value.trim(), "año": Number(elements.anio.value), genero: elements.genero.value.trim(), generos: elements.generos.value.trim(), sinopsis: elements.sinopsis.value.trim(), imagen: elements.imagen.value.trim(), backdrop: elements.backdrop.value.trim(), duracion: elements.duracion.value ? Number(elements.duracion.value) : null, clasificacion: elements.clasificacion.value.trim(), fecha_estreno: elements.fecha_estreno.value || null };
  for (let i = 1; i <= 4; i++) { const s = getServerFields(i); payload[`servidor${i}_nombre`] = s.nombre || null; payload[`servidor${i}_iframe`] = s.iframe || null; payload[`servidor${i}_idioma`] = s.nombre ? s.idioma : null; payload[`servidor${i}_subtitulos`] = s.nombre ? s.subtitulos : false; payload[`servidor${i}_idioma_sub`] = s.subtitulos ? s.idioma_sub : null; payload[`servidor${i}_calidad`] = s.nombre ? s.calidad : null; }
  if (!payload.titulo || !payload["año"] || !payload.genero || !payload.sinopsis || !payload.imagen) { setStatus("Completa todos los campos obligatorios.", "error"); return; }
  const editingId = elements.movieId.value ? Number(elements.movieId.value) : null; setStatus("Guardando...");
  const req = editingId ? supabase.from("peliculas").update(payload).eq("id", editingId) : supabase.from("peliculas").insert(payload);
  const { error } = await req; if (error) { setStatus(`Error: ${error.message}`, "error"); return; }
  setStatus(editingId ? "Película actualizada." : "Película creada.", "success"); clearForm(); await refreshMovies();
}

async function deleteMovie(id) { const m = state.movies.find(x => x.id === id); if (!m) return; if (!window.confirm(`¿Eliminar "${m.titulo}"?`)) return; const { error } = await supabase.from("peliculas").delete().eq("id", id); if (error) { setStatus(`Error: ${error.message}`, "error"); return; } setStatus("Película eliminada.", "success"); await refreshMovies(); }

function openServerModal(s) {
  if (!state.session) { setStatus("Inicia sesión para agregar servidores.", "error"); return; }
  state.editingServerNum = s; const sv = getServerFields(s);
  elements.serverNombre.value = sv.nombre || ""; elements.serverUrl.value = sv.iframe || ""; elements.serverIdioma.value = sv.idioma || "es";
  elements.serverSubtitulos.checked = sv.subtitulos || false; elements.serverIdiomaSubtitulos.value = sv.idioma_sub || "es"; elements.serverCalidad.value = sv.calidad || "720p";
  elements.subtituloOptions.hidden = !sv.subtitulos; elements.serverModal.hidden = false; elements.serverModal.style.display = "flex";
}

function closeServerModal() { elements.serverModal.hidden = true; elements.serverModal.style.display = "none"; state.editingServerNum = null; }

function saveServerToForm() { const s = state.editingServerNum; if (!s) return; setServerFields(s, { nombre: elements.serverNombre.value.trim(), iframe: elements.serverUrl.value.trim(), idioma: elements.serverIdioma.value, subtitulos: elements.serverSubtitulos.checked, idioma_sub: elements.serverSubtitulos.checked ? elements.serverIdiomaSubtitulos.value : null, calidad: elements.serverCalidad.value }); closeServerModal(); }

function clearServer(s) { if (!state.session) return; if (confirm(`¿Eliminar datos del Servidor ${s}?`)) setServerFields(s, { nombre: "", iframe: "", idioma: "es", subtitulos: false, idioma_sub: "", calidad: "720p" }); }

function bindTableActions() { elements.moviesTable.addEventListener("click", async (ev) => { const btn = ev.target.closest("button[data-action]"); if (!btn) return; const id = Number(btn.dataset.id); const m = state.movies.find(x => x.id === id); if (!m) return; if (btn.dataset.action === "edit") { await fillForm(m); window.scrollTo({ top: 0, behavior: "smooth" }); } if (btn.dataset.action === "delete") await deleteMovie(id); }); }

function bindSearch() { let t; elements.adminSearch.addEventListener("input", () => { clearTimeout(t); t = window.setTimeout(async () => { state.search = elements.adminSearch.value.trim(); await refreshMovies(); }, 180); }); }

function bindAuth() { elements.loginForm.addEventListener("submit", async (ev) => { try { setStatus("Iniciando sesión..."); await signIn(elements.loginEmail.value.trim(), elements.loginPassword.value); setStatus("Sesión iniciada.", "success"); elements.loginPassword.value = ""; } catch (e) { setStatus(`Error: ${e.message}`, "error"); } }); elements.logoutButton.addEventListener("click", async () => { await signOut(); clearForm(); setStatus("Sesión cerrada."); }); }

function bindForm() {
  elements.movieForm.addEventListener("submit", saveMovie); elements.cancelEdit.addEventListener("click", clearForm);
  elements.refreshButton.addEventListener("click", refreshMovies); elements.fetchTmdbBtn.addEventListener("click", handleTmdbFetch);
  document.querySelectorAll("[id^='edit-server-']").forEach(btn => btn.addEventListener("click", () => openServerModal(Number(btn.id.split('-').pop()))));
  document.querySelectorAll("[id^='clear-server-']").forEach(btn => btn.addEventListener("click", () => clearServer(Number(btn.id.split('-').pop()))));
  if (elements.closeModal) elements.closeModal.addEventListener("click", closeServerModal);
  if (elements.serverForm) elements.serverForm.addEventListener("submit", (ev) => { ev.preventDefault(); saveServerToForm(); });
  elements.serverSubtitulos?.addEventListener("change", () => { elements.subtituloOptions.hidden = !elements.serverSubtitulos.checked; });
  if (elements.serverModal) elements.serverModal.addEventListener("click", (ev) => { if (ev.target === elements.serverModal) closeServerModal(); });
}

function initRealtime() { supabase.channel("peliculas-admin").on("postgres_changes", { event: "*", schema: "public", table: "peliculas" }, async () => { await refreshMovies(); }).subscribe(); }

async function bootstrapAuth() { const { data } = await supabase.auth.getSession(); state.session = data.session; updateAuthUI(); supabase.auth.onAuthStateChange((_e, s) => { state.session = s; updateAuthUI(); }); }

async function init() { try { bindAuth(); bindForm(); bindSearch(); bindTableActions(); await bootstrapAuth(); await refreshMovies(); initRealtime(); } catch (e) { console.error("Init error:", e); setStatus(`Error de conexión: ${e.message}`, "error"); } }

init();
