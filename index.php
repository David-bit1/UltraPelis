<?php
/**
 * Ultrapelis - Generador Dinámico de Catálogo para PHP
 */

// 1. Cargar el contenido base de index.html
$html = file_get_contents(__DIR__ . '/index.html');

// 2. Función para buscar películas en las subcarpetas
function obtenerTarjetasPeliculas() {
    $baseDir = __DIR__ . '/peliculas';
    $tarjetas = "";
    
    // Escanea carpetas de géneros (accion, drama, etc)
    $generos = array_diff(scandir($baseDir), array('..', '.'));

    foreach ($generos as $genero) {
        $rutaGenero = $baseDir . '/' . $genero;
        if (is_dir($rutaGenero)) {
            $archivos = glob($rutaGenero . "/*.html");
            foreach ($archivos as $archivo) {
                $slug = basename($archivo, '.html');
                $contenido = file_get_contents($archivo);

                // Extraer Título (del h1 o title)
                preg_match('/<h1[^>]*id="movie-title"[^>]*>(.*?)<\/h1>/i', $contenido, $matchTitulo);
                $titulo = isset($matchTitulo[1]) ? trim($matchTitulo[1]) : str_replace('-', ' ', $slug);

                // Extraer Poster (del og:image o meta)
                preg_match('/property="og:image"\s+content="(.*?)"/i', $contenido, $matchPoster);
                $poster = isset($matchPoster[1]) ? $matchPoster[1] : 'img/poster-fallback.svg';

                // Extraer Género y Duración
                preg_match('/<p[^>]*class="hero-copy"[^>]*>(.*?)<\/p>/i', $contenido, $matchMeta);
                $meta = isset($matchMeta[1]) ? trim($matchMeta[1]) : ucfirst($genero);

                // Crear el HTML de la tarjeta (clase catalog-card para que inicio.js la reconozca)
                $tarjetas .= '
                <article class="catalog-card">
                    <div class="catalog-poster">
                        <img alt="Poster de ' . htmlspecialchars($titulo) . '" loading="lazy" src="' . $poster . '">
                    </div>
                    <div class="catalog-title">' . htmlspecialchars($titulo) . '</div>
                    <div class="catalog-meta">' . htmlspecialchars($meta) . '</div>
                    <a class="catalog-button" href="peliculas/' . $genero . '/' . $slug . '.html">Ver ahora</a>
                </article>';
            }
        }
    }
    return $tarjetas;
}

// 3. Inyectar las películas encontradas en el grid del catálogo
$gridStart = '<div class="catalog-grid" id="catalog-grid">';
$gridEnd = '</div>';

$posStart = strpos($html, $gridStart);
$posEnd = strpos($html, $gridEnd, $posStart);

if ($posStart !== false && $posEnd !== false) {
    $nuevoCatalogo = $gridStart . obtenerTarjetasPeliculas();
    $html = substr_replace($html, $nuevoCatalogo, $posStart, $posEnd - $posStart);
}

echo $html;
?>
