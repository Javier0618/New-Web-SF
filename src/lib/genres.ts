// TMDB genre ID → Spanish name mapping
const GENRE_MAP: Record<string, string> = {
  "28": "Acción",
  "12": "Aventura",
  "16": "Animación",
  "35": "Comedia",
  "80": "Crimen",
  "99": "Documental",
  "18": "Drama",
  "10751": "Familia",
  "14": "Fantasía",
  "36": "Historia",
  "27": "Terror",
  "10402": "Música",
  "9648": "Misterio",
  "10749": "Romance",
  "878": "Ciencia ficción",
  "10770": "Película de TV",
  "53": "Suspenso",
  "10752": "Bélica",
  "37": "Western",
  // TV genres
  "10759": "Acción y Aventura",
  "10762": "Infantil",
  "10763": "Noticias",
  "10764": "Reality",
  "10765": "Sci-Fi y Fantasía",
  "10766": "Telenovela",
  "10767": "Talk Show",
  "10768": "Guerra y Política",
};

export const getGenreName = (genreIdOrName: string): string => {
  return GENRE_MAP[genreIdOrName] || genreIdOrName;
};

/**
 * Los géneros llegan mezclados: unos como ID numérico, otros como nombre en
 * español y otros en inglés (p. ej. "Sci-Fi & Fantasy"). Eso hace que el mismo
 * género aparezca como varias filas distintas en la portada. `canonicalGenre`
 * normaliza cualquier variante a un único nombre en español para agrupar y
 * filtrar de forma consistente.
 */
const normalizeKey = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

const GENRE_SYNONYMS: Record<string, string> = {
  accion: "Acción",
  "action & adventure": "Acción",
  "accion y aventura": "Acción",
  aventura: "Acción",
  adventure: "Acción",
  "ciencia ficcion": "Ciencia ficción",
  "science fiction": "Ciencia ficción",
  "sci-fi & fantasy": "Ciencia ficción",
  "sci-fi y fantasia": "Ciencia ficción",
  fantasia: "Fantasía",
  fantasy: "Fantasía",
  suspenso: "Suspenso",
  suspense: "Suspenso",
  thriller: "Suspenso",
  familia: "Familia",
  family: "Familia",
  kids: "Familia",
  infantil: "Familia",
  belica: "Bélica",
  war: "Bélica",
  "war & politics": "Bélica",
  "guerra y politica": "Bélica",
  telenovela: "Telenovela",
  soap: "Telenovela",
  animacion: "Animación",
  animation: "Animación",
  comedia: "Comedia",
  comedy: "Comedia",
  crimen: "Crimen",
  crime: "Crimen",
  drama: "Drama",
  terror: "Terror",
  horror: "Terror",
  misterio: "Misterio",
  mystery: "Misterio",
  romance: "Romance",
  documental: "Documental",
  documentary: "Documental",
  musica: "Música",
  music: "Música",
  western: "Western",
  reality: "Reality",
  historia: "Historia",
  history: "Historia",
  noticias: "Noticias",
  news: "Noticias",
  "talk show": "Talk Show",
};

export const canonicalGenre = (genreIdOrName: string): string => {
  const name = getGenreName(String(genreIdOrName));
  return GENRE_SYNONYMS[normalizeKey(name)] || name;
};
