const fetch = require('node-fetch');

exports.handler = async (event) => {
  const { video_id, tmdb, s, e, season, episode } = event.queryStringParameters;

  if (!video_id) {
    return { statusCode: 400, body: "Falta video_id" };
  }

  // Configuración estética (igual que tenías en PHP)
  const params = new URLSearchParams({
    video_id: video_id,
    tmdb: tmdb || "1",
    season: season || s || "0",
    episode: episode || e || "0",
    player_font: "Poppins",
    player_bg_color: "111827",
    player_font_color: "ffffff",
    player_primary_color: "34cfeb",
    player_secondary_color: "6900e0",
    player_loader: "5",
    preferred_server: "0",
    player_sources_toggle_type: "2"
  });

  const requestUrl = `https://getsuperembed.link/?${params.toString()}`;

  try {
    const response = await fetch(requestUrl);
    const playerUrl = await response.text();

    if (playerUrl.includes("https://")) {
      return {
        statusCode: 302,
        headers: { Location: playerUrl }
      };
    }
    return { statusCode: 200, body: playerUrl };
  } catch (error) {
    return { statusCode: 500, body: "Error al conectar con SuperEmbed" };
  }
};