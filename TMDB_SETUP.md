# Guía: Obtener API Key de TMDb

## API Key ya configurada

Tu API Key v3 está configurada en `admin.html`:
```
b24af203b14e23f8c91844baae37cfab
```

## ¿Cómo obtener una nueva API Key? (Si necesitas reemplazarla)

### Paso 1: Crear cuenta en TMDb

1. Ve a [https://www.themoviedb.org](https://www.themoviedb.org)
2. Haz clic en **Join TMDb** (Registrarse)
3. Completa el formulario con tu email y crea una contraseña
4. Confirma tu email (revisa la bandeja de entrada)

### Paso 2: Crear una aplicación

1. Una vez loggeado, ve a [https://www.themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)
2. En **API Settings**, completa:
   - **App name**: UltraPelis Admin (o el nombre que prefieras)
   - **App URL**: La URL de tu sitio (ej: https://ultrapelis.netlify.app)
   - **Redirect URI**: La misma URL (puede ser opcional)
3. En **Message**: Explica que usarás la API para un catálogo de películas
4. Haz clic en **Create** / **Submit**

### Paso 3: Obtener la API Key

1. Después de crear la app, verás:
   - **API Key (v3 auth)**: **Esta es la que usamos** - formato: `b24af203b14e23f8c91844baae37cfab`
2. Copia la **API Key (v3 auth)**

### Paso 4: Configurar en admin.html

Reemplaza la API key en el meta tag:

```html
<meta name="tmdb-api-key" content="TU_NUEVA_API_KEY_V3" />
```

## Cómo usar el administrador

1. Escribe el **TMDb ID** de una película (ej: `550` para Fight Club)
2. Haz clic en **Buscar en TMDb**
3. El sistema cargará automáticamente:
   - Título
   - Año
   - Sinopsis
   - Duración
   - Clasificación (certificación MPAA)
   - Fecha de estreno
   - URL del póster
   - URL del backdrop
   - Géneros
4. Pega los iframes de los servidores manualmente (1-4)
5. Haz clic en **Guardar**

## Encontrar TMDb ID

- En la URL de TMDb: `https://www.themoviedb.org/movie/550` → ID es `550`
- Usa la búsqueda de TMDb para encontrar la película y copia el ID de la URL

## URLs de imágenes de TMDb

El sistema usa automáticamente estos tamaños:
- **Poster**: `https://image.tmdb.org/t/p/w500[poster_path]`
- **Backdrop**: `https://image.tmdb.org/t/p/w1280[backdrop_path]`

Ambas URLs se guardan directamente en Supabase.