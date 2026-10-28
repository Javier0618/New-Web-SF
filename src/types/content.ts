import { Timestamp } from "firebase/firestore";

export interface Episode {
  episode_number: number;
  name: string;
  overview: string;
  still_path: string;
  video_url: string;
  /** Marcas en segundos (las mismas que usan las apps móvil y TV). */
  intro_start?: number | null;
  intro_end?: number | null;
  credits_start?: number | null;
}

export interface Season {
  season_number: number;
  episodes: Record<string, Episode>;
}

export interface DisplayOptions {
  main_sections: string[];
  home_sections: string[];
  platforms: string[];
}

export interface Cast {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface Crew {
  id: number;
  name: string;
  job: string;
  department: string;
}

export interface Credits {
  cast: Cast[];
  crew: Crew[];
}

export interface Content {
  id: number;
  media_type: "movie" | "tv";
  title: string;
  original_title?: string;
  overview: string;
  poster_path: string;
  backdrop_path?: string;
  release_date?: string;
  vote_average?: number;
  genres: string[];
  video_url?: string;
  seasons?: Record<string, Season>;
  display_options: DisplayOptions;
  imported_by: string;
  imported_at: Timestamp;
  docId?: string;
  credits?: Credits;
}

export interface Message {
  id?: string;
  from: string;
  to: string;
  message: string;
  createdAt: Timestamp;
  read: boolean;
}

export interface HomeSection {
  id?: string;
  title: string;
  type: string;
  filter?: string;
  order?: number;
}

export interface WebConfig {
  [key: string]: any;
}
