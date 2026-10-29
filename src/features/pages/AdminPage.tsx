import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { resolveHomeOrder, labelForSection, type HomeSectionState } from "@/lib/homeSections";
import {
  fetchAllContent,
  updateContent,
  deleteContent,
  fetchAllMessages,
  sendMessage as sendFirestoreMessage,
  markMessageRead,
  deleteMessage,
  fetchPosterClicks,
  fetchWebConfig,
  updateWebConfig,
  fetchHomeSections,
  fetchAllUsers,
  updateUser,
  deleteUser as deleteFirestoreUser,
  importContent,
  fetchContentPaginated,
  fetchContentCount,
  fetchUsersPaginated,
} from "@/lib/firestore";
import {
  searchTmdb,
  fetchTmdbDetails,
  fetchTmdbSeasonDetails,
  TMDB_IMG_BASE,
  type TmdbSearchResult,
  type TmdbEpisode,
} from "@/lib/tmdb";
import type { Content, Message } from "@/types/content";
import { serverTimestamp } from "firebase/firestore";
import {
  Search, Trash2, Edit, MessageSquare, BarChart3, Settings,
  Film, Users, Home, Download, ChevronDown, ChevronUp,
  CheckCheck, Send, Plus, Shield, Star, Eye, X, Save,
  RefreshCw, ToggleLeft, ToggleRight, Image, Palette, Type,
} from "lucide-react";
import { getGenreName } from "@/lib/genres";
import { readCatalogIndex, rebuildCatalogIndex } from "@/lib/catalog";
import { getImageUrl } from "@/lib/image";
import { useToast } from "@/components/ui/use-toast";
import {
  FaAndroid, FaWhatsapp, FaTelegram, FaFacebookMessenger,
  FaInstagram, FaTiktok, FaYoutube, FaTwitter, FaDiscord,
  FaFacebook, FaGlobe, FaDownload, FaEnvelope, FaLink,
} from "react-icons/fa";
import type { IconType } from "react-icons";
import ColorTokenPicker from "@/components/admin/ColorTokenPicker";

type Tab = "tmdb" | "content" | "users" | "messages" | "sections" | "analytics" | "settings";

// ─── TMDB Import Modal ────────────────────────────────────────────────────────
interface ImportModalProps {
  item: TmdbSearchResult;
  onClose: () => void;
  onImported: () => void;
  adminEmail: string;
}

const PLATFORMS = [
  { id: "netflix", label: "Netflix" },
  { id: "disney", label: "Disney+" },
  { id: "hbo", label: "Max (HBO)" },
  { id: "prime", label: "Prime Video" },
  { id: "paramount", label: "Paramount+" },
];
const HOME_SECTIONS = [
  { id: "slider", label: "Slider Principal" },
  { id: "estreno", label: "En Estreno/Emisión" },
  { id: "agregado", label: "Recién Agregado" },
];
const MAIN_SECTIONS = [
  { id: "movies", label: "Películas" },
  { id: "series", label: "Series" },
  { id: "animes", label: "Animes" },
  { id: "doramas", label: "Doramas" },
];

function ImportModal({ item, onClose, onImported, adminEmail }: ImportModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"urls" | "options">("urls");
  const [loading, setLoading] = useState(false);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [movieUrl, setMovieUrl] = useState("");
  const [seasons, setSeasons] = useState<any[]>([]);
  const [expandedSeason, setExpandedSeason] = useState<number | null>(null);
  const [episodeUrls, setEpisodeUrls] = useState<Record<string, string>>({});
  const [selectedMainSections, setSelectedMainSections] = useState<string[]>(
    item.media_type === "movie" ? ["movies"] : ["series"]
  );
  const [selectedHomeSections, setSelectedHomeSections] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  useEffect(() => {
    if (item.media_type === "tv") loadSeasons();
  }, []);

  const loadSeasons = async () => {
    setLoadingSeasons(true);
    try {
      const details = await fetchTmdbDetails(item.id, "tv");
      const seasonsData: any[] = [];
      for (const s of (details.seasons || [])) {
        if (s.season_number === 0) continue;
        const seasonDetail = await fetchTmdbSeasonDetails(item.id, s.season_number);
        seasonsData.push({ ...s, episodes: seasonDetail.episodes || [] });
      }
      setSeasons(seasonsData);
    } catch (e) {
      toast({ title: "Error", description: "No se pudieron cargar las temporadas", variant: "destructive" });
    } finally {
      setLoadingSeasons(false);
    }
  };

  const handleEpUrl = (seasonNum: number, epNum: number, value: string) => {
    setEpisodeUrls(prev => ({ ...prev, [`s${seasonNum}e${epNum}`]: value }));
  };

  const toggleSection = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      const displayOptions = {
        main_sections: selectedMainSections,
        home_sections: selectedHomeSections,
        platforms: selectedPlatforms,
      };

      const base: any = {
        id: item.id,
        media_type: item.media_type,
        title: item.title || item.name || "",
        original_title: item.original_title || item.original_name,
        overview: item.overview,
        poster_path: item.poster_path || "",
        backdrop_path: item.backdrop_path,
        release_date: item.release_date || item.first_air_date,
        vote_average: item.vote_average,
        genres: item.genre_ids || [],
        display_options: displayOptions,
        imported_by: adminEmail,
        imported_at: serverTimestamp(),
      };

      if (item.media_type === "movie") {
        base.video_url = movieUrl;
      } else {
        const seasonsMap: any = {};
        for (const season of seasons) {
          const eps: any = {};
          for (const ep of (season.episodes || [])) {
            eps[ep.episode_number] = {
              episode_number: ep.episode_number,
              name: ep.name,
              overview: ep.overview || "",
              still_path: ep.still_path || "",
              video_url: episodeUrls[`s${season.season_number}e${ep.episode_number}`] || "",
            };
          }
          seasonsMap[season.season_number] = {
            season_number: season.season_number,
            episodes: eps,
          };
        }
        base.seasons = seasonsMap;
      }

      await importContent(base, item.id);
      toast({ title: "Importado", description: `"${base.title}" importado correctamente` });
      onImported();
      onClose();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Error al importar", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-3 py-2 bg-secondary text-foreground rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="bg-card rounded-xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-3">
            {item.poster_path && (
              <img src={`${TMDB_IMG_BASE}/w92${item.poster_path}`} alt={item.title || item.name} className="w-10 h-14 object-cover rounded" />
            )}
            <div>
              <h3 className="font-bold text-sm">{item.title || item.name}</h3>
              <p className="text-xs text-muted-foreground">{item.media_type === "movie" ? "Película" : "Serie"} · {(item.release_date || item.first_air_date || "").split("-")[0]}</p>
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Step 1: URLs */}
          {step === "urls" && (
            <>
              <h4 className="font-semibold text-sm flex items-center gap-2"><Film className="w-4 h-4" /> Agregar URLs de Video</h4>
              {item.media_type === "movie" ? (
                <div>
                  <label className="text-xs text-muted-foreground">URL del Video</label>
                  <input value={movieUrl} onChange={e => setMovieUrl(e.target.value)} className={inputCls} placeholder="https://..." />
                </div>
              ) : loadingSeasons ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {seasons.map(season => (
                    <div key={season.season_number} className="border border-border rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedSeason(expandedSeason === season.season_number ? null : season.season_number)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-secondary hover:bg-accent text-sm font-medium"
                      >
                        <span>Temporada {season.season_number} · {season.episodes?.length || 0} episodios</span>
                        {expandedSeason === season.season_number ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {expandedSeason === season.season_number && (
                        <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                          {(season.episodes || []).map((ep: TmdbEpisode) => (
                            <div key={ep.episode_number} className="space-y-1">
                              <label className="text-xs text-muted-foreground">Ep. {ep.episode_number}: {ep.name}</label>
                              <input
                                value={episodeUrls[`s${season.season_number}e${ep.episode_number}`] || ""}
                                onChange={e => handleEpUrl(season.season_number, ep.episode_number, e.target.value)}
                                className={inputCls}
                                placeholder="https://..."
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => setStep("options")} className="w-full py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90">
                Siguiente → Opciones de Importación
              </button>
            </>
          )}

          {/* Step 2: Options */}
          {step === "options" && (
            <>
              <h4 className="font-semibold text-sm">Opciones de Importación</h4>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Secciones Principales:</p>
                <div className="grid grid-cols-2 gap-2">
                  {MAIN_SECTIONS.map(s => (
                    <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={selectedMainSections.includes(s.id)} onChange={() => toggleSection(selectedMainSections, setSelectedMainSections, s.id)} />
                      {s.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Secciones de Inicio:</p>
                <div className="grid grid-cols-2 gap-2">
                  {HOME_SECTIONS.map(s => (
                    <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={selectedHomeSections.includes(s.id)} onChange={() => toggleSection(selectedHomeSections, setSelectedHomeSections, s.id)} />
                      {s.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Plataformas:</p>
                <div className="grid grid-cols-2 gap-2">
                  {PLATFORMS.map(p => (
                    <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={selectedPlatforms.includes(p.id)} onChange={() => toggleSection(selectedPlatforms, setSelectedPlatforms, p.id)} />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setStep("urls")} className="flex-1 py-2 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-accent">
                  ← Volver
                </button>
                <button onClick={handleImport} disabled={loading} className="flex-1 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
                  {loading ? "Importando..." : "Importar"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Edit Content Modal (Options + URLs) ─────────────────────────────────────
function EditOptionsModal({ content, onClose, onSaved }: { content: Content; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [editTab, setEditTab] = useState<"urls" | "options">("urls");
  const [mainSections, setMainSections] = useState<string[]>(content.display_options?.main_sections || []);
  const [homeSections, setHomeSections] = useState<string[]>(content.display_options?.home_sections || []);
  const [platforms, setPlatforms] = useState<string[]>(content.display_options?.platforms || []);
  const [saving, setSaving] = useState(false);

  // URLs state
  const [movieUrl, setMovieUrl] = useState(content.video_url || "");
  const [episodeUrls, setEpisodeUrls] = useState<Record<string, string>>(() => {
    const urls: Record<string, string> = {};
    if (content.seasons) {
      Object.entries(content.seasons).forEach(([sKey, season]) => {
        Object.entries(season.episodes || {}).forEach(([eKey, ep]) => {
          urls[`s${season.season_number}e${ep.episode_number}`] = ep.video_url || "";
        });
      });
    }
    return urls;
  });
  const [expandedSeason, setExpandedSeason] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);

  const toggle = (arr: string[], setArr: (v: string[]) => void, val: string) =>
    setArr(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);

  const handleEpUrl = (seasonNum: number, epNum: number, value: string) => {
    setEpisodeUrls(prev => ({ ...prev, [`s${seasonNum}e${epNum}`]: value }));
  };

  const handleSyncTmdb = async () => {
    if (!content.docId || content.media_type !== "tv") return;
    setSyncing(true);
    try {
      const details = await fetchTmdbDetails(content.id, "tv");
      const newSeasons: Record<string, any> = {};
      const existing = content.seasons || {};
      const seasonsMeta = (details.seasons || []).filter((s: any) => s.season_number > 0);
      let addedSeasons = 0;
      let addedEpisodes = 0;
      for (const s of seasonsMeta) {
        const sKey = String(s.season_number);
        const prevSeason = existing[sKey];
        if (!prevSeason) addedSeasons++;
        const seasonDetail = await fetchTmdbSeasonDetails(content.id, s.season_number);
        const newEpisodes: Record<string, any> = {};
        for (const ep of seasonDetail.episodes || []) {
          const eKey = String(ep.episode_number);
          const prevEp = prevSeason?.episodes?.[eKey];
          if (!prevEp) addedEpisodes++;
          const localUrl = episodeUrls[`s${s.season_number}e${ep.episode_number}`];
          const preservedUrl = (localUrl ?? prevEp?.video_url) || "";
          newEpisodes[eKey] = {
            episode_number: ep.episode_number,
            name: ep.name || "",
            overview: ep.overview || "",
            still_path: ep.still_path || "",
            video_url: preservedUrl,
          };
        }
        newSeasons[sKey] = { season_number: s.season_number, episodes: newEpisodes };
      }
      await updateContent(content.docId, {
        seasons: newSeasons,
        overview: details.overview || content.overview,
        backdrop_path: details.backdrop_path || content.backdrop_path,
        poster_path: details.poster_path || content.poster_path,
        vote_average: details.vote_average ?? content.vote_average,
        genres: (details.genres || []).map((g: any) => g.name),
      } as any);
      toast({
        title: "Sincronizado con TMDB",
        description: `${addedSeasons} temporada(s) y ${addedEpisodes} episodio(s) nuevos. URLs existentes conservadas.`,
      });
      onSaved();
      onClose();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "No se pudo sincronizar", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async () => {
    if (!content.docId) return;
    setSaving(true);
    try {
      const updateData: any = {
        display_options: { main_sections: mainSections, home_sections: homeSections, platforms },
      };

      if (content.media_type === "movie") {
        updateData.video_url = movieUrl;
      } else if (content.seasons) {
        const updatedSeasons: any = {};
        Object.entries(content.seasons).forEach(([sKey, season]) => {
          const updatedEps: any = {};
          Object.entries(season.episodes || {}).forEach(([eKey, ep]) => {
            updatedEps[eKey] = {
              ...ep,
              video_url: episodeUrls[`s${season.season_number}e${ep.episode_number}`] || ep.video_url || "",
            };
          });
          updatedSeasons[sKey] = { ...season, episodes: updatedEps };
        });
        updateData.seasons = updatedSeasons;
      }

      await updateContent(content.docId, updateData);
      toast({ title: "Guardado", description: "Contenido actualizado correctamente" });
      onSaved();
      onClose();
    } catch {
      toast({ title: "Error", description: "No se pudo guardar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3 py-2 bg-secondary text-foreground rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-card rounded-xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="font-bold text-sm">Editar: {content.title}</h3>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setEditTab("urls")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${editTab === "urls" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Film className="w-4 h-4 inline mr-1.5" />URLs de Video
          </button>
          <button
            onClick={() => setEditTab("options")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${editTab === "options" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Settings className="w-4 h-4 inline mr-1.5" />Opciones
          </button>
        </div>

        <div className="p-4 space-y-4">
          {editTab === "urls" && (
            <>
              {content.media_type === "movie" ? (
                <div>
                  <label className="text-xs text-muted-foreground">URL del Video</label>
                  <input value={movieUrl} onChange={e => setMovieUrl(e.target.value)} className={inputCls} placeholder="https://..." />
                </div>
              ) : content.seasons ? (
                <div className="space-y-2">
                  <button
                    onClick={handleSyncTmdb}
                    disabled={syncing}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-secondary hover:bg-accent rounded-md text-sm font-medium border border-border disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                    {syncing ? "Sincronizando con TMDB..." : "Sincronizar temporadas/episodios desde TMDB"}
                  </button>
                  {Object.entries(content.seasons)
                    .sort(([, a], [, b]) => a.season_number - b.season_number)
                    .map(([sKey, season]) => (
                    <div key={sKey} className="border border-border rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedSeason(expandedSeason === season.season_number ? null : season.season_number)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-secondary hover:bg-accent text-sm font-medium"
                      >
                        <span>Temporada {season.season_number} · {Object.keys(season.episodes || {}).length} episodios</span>
                        {expandedSeason === season.season_number ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {expandedSeason === season.season_number && (
                        <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                          {Object.entries(season.episodes || {})
                            .sort(([, a], [, b]) => a.episode_number - b.episode_number)
                            .map(([eKey, ep]) => (
                            <div key={eKey} className="space-y-1">
                              <label className="text-xs text-muted-foreground">Ep. {ep.episode_number}: {ep.name}</label>
                              <input
                                value={episodeUrls[`s${season.season_number}e${ep.episode_number}`] || ""}
                                onChange={e => handleEpUrl(season.season_number, ep.episode_number, e.target.value)}
                                className={inputCls}
                                placeholder="https://..."
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Esta serie no tiene temporadas importadas.</p>
                  <button
                    onClick={handleSyncTmdb}
                    disabled={syncing}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-secondary hover:bg-accent rounded-md text-sm font-medium border border-border disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                    {syncing ? "Sincronizando..." : "Importar temporadas desde TMDB"}
                  </button>
                </div>
              )}
            </>
          )}

          {editTab === "options" && (
            <>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Secciones Principales:</p>
                <div className="grid grid-cols-2 gap-2">
                  {MAIN_SECTIONS.map(s => (
                    <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={mainSections.includes(s.id)} onChange={() => toggle(mainSections, setMainSections, s.id)} />
                      {s.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Secciones de Inicio:</p>
                <div className="grid grid-cols-2 gap-2">
                  {HOME_SECTIONS.map(s => (
                    <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={homeSections.includes(s.id)} onChange={() => toggle(homeSections, setHomeSections, s.id)} />
                      {s.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Plataformas:</p>
                <div className="grid grid-cols-2 gap-2">
                  {PLATFORMS.map(p => (
                    <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={platforms.includes(p.id)} onChange={() => toggle(platforms, setPlatforms, p.id)} />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          <button onClick={handleSave} disabled={saving} className="w-full py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
            {saving ? "Guardando..." : "Guardar Todo"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main AdminPage ───────────────────────────────────────────────────────────
const AdminPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("tmdb");
  const [loading, setLoading] = useState(false);

  // TMDB
  const [tmdbQuery, setTmdbQuery] = useState("");
  const [tmdbResults, setTmdbResults] = useState<TmdbSearchResult[]>([]);
  const [tmdbLoading, setTmdbLoading] = useState(false);
  const [importingItem, setImportingItem] = useState<TmdbSearchResult | null>(null);
  const [importedIds, setImportedIds] = useState<Set<number>>(new Set());

  // Content management
  const [contentList, setContentList] = useState<Content[]>([]);
  const [lastContentDoc, setLastContentDoc] = useState<any>(null);
  const [hasMoreContent, setHasMoreContent] = useState(true);
  const [totalContentCount, setTotalContentCount] = useState<number | null>(null);
  const [contentSearch, setContentSearch] = useState("");
  const [isSearchingContent, setIsSearchingContent] = useState(false);
  // Carga progresiva: el catálogo completo solo se trae bajo demanda al buscar.
  const [allContentLoaded, setAllContentLoaded] = useState(false);
  const [loadingAllForSearch, setLoadingAllForSearch] = useState(false);
  const [editingOptions, setEditingOptions] = useState<Content | null>(null);

  // Users
  const [users, setUsers] = useState<any[]>([]);
  const [lastUserDoc, setLastUserDoc] = useState<any>(null);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState<"all" | "online" | "offline">("all");
  const [msgToUser, setMsgToUser] = useState<string | null>(null);
  const [msgToAll, setMsgToAll] = useState(false);
  const [adminMsg, setAdminMsg] = useState("");

  // Messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyMsg, setReplyMsg] = useState("");

  // Home sections
  const [homeSections, setHomeSections] = useState<any[]>([]);

  // Analytics
  const [clicks, setClicks] = useState<any[]>([]);

  // Settings
  const [config, setConfig] = useState<Record<string, any>>({});
  const [settingsSubTab, setSettingsSubTab] = useState<"general" | "inicio" | "anuncios" | "botones">("general");

  const inputCls = "w-full px-3 py-2 bg-secondary text-foreground rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm";

  useEffect(() => {
    loadTabData(tab);
  }, [tab]);

  const loadMoreContent = async () => {
    if (isSearchingContent) return;
    try {
      const { content: newContent, lastVisible } = await fetchContentPaginated(30, lastContentDoc);
      setContentList(prev => {
        const existing = new Set(prev.map(c => c.docId));
        return [...prev, ...newContent.filter(c => !existing.has(c.docId))];
      });
      setLastContentDoc(lastVisible);
      setHasMoreContent(newContent.length === 30);
      setImportedIds(prev => {
        const next = new Set(prev);
        newContent.forEach(c => next.add(c.id));
        return next;
      });
    } catch (e) {
      console.error("Error loading more content:", e);
    }
  };

  // Trae el resto del catálogo de una sola vez, pero SOLO cuando el admin
  // busca, para que la búsqueda cubra todos los títulos sin leerlos al entrar.
  const loadAllContent = async () => {
    if (allContentLoaded || loadingAllForSearch) return;
    setLoadingAllForSearch(true);
    try {
      let cursor: any = lastContentDoc;
      const PAGE = 200;
      while (cursor) {
        const { content: more, lastVisible: next } = await fetchContentPaginated(PAGE, cursor);
        if (more.length === 0) break;
        setContentList(prev => {
          const existing = new Set(prev.map(c => c.docId));
          return [...prev, ...more.filter(c => !existing.has(c.docId))];
        });
        setImportedIds(prev => {
          const n = new Set(prev);
          more.forEach(c => n.add(c.id));
          return n;
        });
        cursor = more.length < PAGE ? null : next;
      }
      setHasMoreContent(false);
      setLastContentDoc(null);
      setAllContentLoaded(true);
    } catch (e) {
      console.error("[admin] Error cargando el catálogo para la búsqueda:", e);
    } finally {
      setLoadingAllForSearch(false);
    }
  };

  // Al escribir una búsqueda, si aún no está todo cargado, trae el resto.
  useEffect(() => {
    if (contentSearch.trim() && !allContentLoaded && !loadingAllForSearch) {
      loadAllContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentSearch, allContentLoaded]);

  const loadMoreUsers = async () => {
    if (!hasMoreUsers || loading) return;
    try {
      const { users: newUsers, lastVisible } = await fetchUsersPaginated(30, lastUserDoc);
      setUsers(prev => [...prev, ...newUsers]);
      setLastUserDoc(lastVisible);
      setHasMoreUsers(newUsers.length === 30);
    } catch (e) {
      console.error("Error loading more users:", e);
    }
  };

  // Carga el total real de la colección 'content' (1 sola lectura agregada).
  // Se ejecuta una sola vez al montar el panel y se refresca cada vez que
  // cambia el número de items cargados (importar / borrar).
  useEffect(() => {
    let cancelled = false;
    fetchContentCount()
      .then((count: number) => {
        if (!cancelled) setTotalContentCount(count);
      })
      .catch((err: unknown) => {
        console.error("[admin] No se pudo obtener el total de contenido:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [contentList.length]);

  const loadTabData = async (t: Tab) => {
    setLoading(true);
    try {
      if (t === "tmdb" || t === "content") {
        if (contentList.length === 0) {
          // Solo la primera página: el resto se carga al deslizar (scroll) o,
          // si el admin busca, bajo demanda con loadAllContent(). Así abrir la
          // pestaña ya no lee miles de documentos de golpe.
          const PAGE = 60;
          const { content, lastVisible } = await fetchContentPaginated(PAGE);
          setContentList(content);
          setLastContentDoc(lastVisible);
          setImportedIds(new Set(content.map(item => item.id)));
          const stillMore = content.length === PAGE;
          setHasMoreContent(stillMore);
          setAllContentLoaded(!stillMore);
        }
      }
      if (t === "users") {
        if (users.length === 0) {
          const { users: u, lastVisible } = await fetchUsersPaginated(30);
          setUsers(u);
          setLastUserDoc(lastVisible);
          setHasMoreUsers(u.length === 30);
        }
      }
      if (t === "messages") {
        const [m, allUsers] = await Promise.all([fetchAllMessages(), fetchAllUsers()]);
        setMessages(m);
        if (users.length === 0) setUsers(allUsers);
      }
      if (t === "sections") {
        const [s, cfg] = await Promise.all([fetchHomeSections(), fetchWebConfig()]);
        setHomeSections(s);
        if (cfg) setConfig(cfg);
      }
      if (t === "analytics") {
        const cl = await fetchPosterClicks();
        setClicks(cl.sort((a: any, b: any) => (b.clicks || b.clickCount || 0) - (a.clicks || a.clickCount || 0)));
      }
      if (t === "settings") {
        const cfg = await fetchWebConfig();
        if (cfg) setConfig(cfg);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ── TMDB Search ──
  const handleTmdbSearch = async () => {
    if (!tmdbQuery.trim()) return;
    setTmdbLoading(true);
    try {
      const results = await searchTmdb(tmdbQuery);
      setTmdbResults(results);
    } catch {
      toast({ title: "Error", description: "Error buscando en TMDB", variant: "destructive" });
    } finally {
      setTmdbLoading(false);
    }
  };

  // ── Content Search ──
  const filteredContent = useMemo(() => {
    const search = contentSearch.toLowerCase().trim();
    if (!search) return contentList;
    return contentList.filter(c => 
      c.title?.toLowerCase().includes(search) || 
      c.original_title?.toLowerCase().includes(search)
    );
  }, [contentList, contentSearch]);

  const filteredUsers = useMemo(() => users.filter(u => {
    const matchesSearch = (u.name || "").toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(userSearch.toLowerCase());
    if (!matchesSearch) return false;
    if (userStatusFilter === "all") return true;
    const ls = u.lastSeen?.toDate?.();
    const isOnline = ls && (Date.now() - ls.getTime()) < 5 * 60 * 1000;
    return userStatusFilter === "online" ? isOnline : !isOnline;
  }), [users, userSearch, userStatusFilter]);

  const { displayed: displayedContent, sentinelRef: contentSentinel, isLoadingMore: loadingContent } = useInfiniteScroll(
    filteredContent,
    30,
    contentSearch ? undefined : loadMoreContent,
    hasMoreContent
  );


  // ── Índice del catálogo ──
  const [rebuildingIndex, setRebuildingIndex] = useState(false);
  const handleRebuildIndex = async () => {
    setRebuildingIndex(true);
    try {
      const count = await rebuildCatalogIndex();
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
      toast({ title: "Índice reconstruido", description: `${count} títulos indexados` });
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "No se pudo reconstruir el índice",
        variant: "destructive",
      });
    } finally {
      setRebuildingIndex(false);
    }
  };

  // Si el índice aún no existe (primera vez tras la actualización), se crea solo.
  useEffect(() => {
    readCatalogIndex()
      .then((idx) => {
        if (idx === null) handleRebuildIndex();
      })
      .catch((e) => console.warn("[catalog] No se pudo comprobar el índice:", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Content delete ──
  const handleDeleteContent = async (docId: string) => {
    if (!confirm("¿Eliminar este contenido?")) return;
    await deleteContent(docId);
    queryClient.invalidateQueries({ queryKey: ["catalog"] });
    setContentList(prev => prev.filter(c => c.docId !== docId));
    toast({ title: "Eliminado", description: "Contenido eliminado" });
  };

  // ── Users ──
  const handleSendMsgToUser = async (toUid: string) => {
    if (!adminMsg.trim() || !user) return;
    await sendFirestoreMessage(user.uid, toUid, adminMsg.trim());
    setAdminMsg("");
    setMsgToUser(null);
    toast({ title: "Enviado", description: "Mensaje enviado" });
  };

  const handleSendToAll = async () => {
    if (!adminMsg.trim() || !user) return;
    for (const u of users) {
      await sendFirestoreMessage(user.uid, u.id, adminMsg.trim());
    }
    setAdminMsg("");
    setMsgToAll(false);
    toast({ title: "Enviado", description: `Mensaje enviado a ${users.length} usuarios` });
  };

  const handleDeleteUser = async (uid: string) => {
    if (!confirm("¿Eliminar este usuario?")) return;
    await deleteFirestoreUser(uid);
    setUsers(prev => prev.filter(u => u.id !== uid));
    toast({ title: "Eliminado", description: "Usuario eliminado" });
  };

  // ── Messages ──
  const handleReply = async (toUid: string) => {
    if (!replyMsg.trim() || !user) return;
    await sendFirestoreMessage(user.uid, toUid, replyMsg.trim());
    setReplyMsg("");
    setReplyTo(null);
    const m = await fetchAllMessages();
    setMessages(m);
    toast({ title: "Enviado", description: "Respuesta enviada" });
  };

  // ── Settings ──
  const handleSaveConfig = async () => {
    // Quitamos cualquier campo temporal de UI (prefijo "_") antes de guardar,
    // para que no se persista basura y el documento refleje exactamente la
    // configuración que se ve en el panel.
    const configToSave = Object.fromEntries(
      Object.entries(config).filter(([key]) => !key.startsWith("_")),
    );
    // Al ser reemplazo completo, nunca guardamos un objeto vacío: evita borrar
    // toda la configuración si aún no terminó de cargarse.
    if (Object.keys(configToSave).length === 0) {
      toast({
        title: "Aún no se puede guardar",
        description: "La configuración todavía no terminó de cargar.",
        variant: "destructive",
      });
      return;
    }
    try {
      await updateWebConfig(configToSave);
      queryClient.invalidateQueries({ queryKey: ["web-config"] });
      toast({ title: "Guardado", description: "Configuración guardada" });
    } catch (e: any) {
      toast({
        title: "Error al guardar",
        description: e?.message || "No se pudo guardar la configuración",
        variant: "destructive",
      });
    }
  };


  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "tmdb", label: "Importar TMDB", icon: <Download className="w-4 h-4" /> },
    { id: "content", label: "Gestionar", icon: <Film className="w-4 h-4" /> },
    { id: "users", label: "Usuarios", icon: <Users className="w-4 h-4" /> },
    { id: "messages", label: "Mensajes", icon: <MessageSquare className="w-4 h-4" /> },
    { id: "sections", label: "Secciones", icon: <Home className="w-4 h-4" /> },
    { id: "analytics", label: "Estadísticas", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "settings", label: "Configuración", icon: <Settings className="w-4 h-4" /> },
  ];
  
  const { displayed: displayedUsers, sentinelRef: usersSentinel, isLoadingMore: loadingUsers } = useInfiniteScroll(
    filteredUsers, 
    30, 
    userSearch ? undefined : loadMoreUsers, 
    hasMoreUsers
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {importingItem && (
        <ImportModal
          item={importingItem}
          adminEmail={user?.email || ""}
          onClose={() => setImportingItem(null)}
          onImported={() => {
            queryClient.invalidateQueries({ queryKey: ["catalog"] });
            loadTabData("tmdb");
          }}
        />
      )}
      {editingOptions && (
        <EditOptionsModal
          content={editingOptions}
          onClose={() => setEditingOptions(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["catalog"] });
            queryClient.invalidateQueries({ queryKey: ["content-detail"] });
            loadTabData("content");
          }}
        />
      )}

      <div className="pt-20 px-4 md:px-8 pb-16 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-11 h-11 rounded-xl bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight leading-none">
              Panel de Administración
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Gestiona tu catálogo, usuarios y la configuración del sitio.
            </p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Contenido", value: totalContentCount ?? contentList.length, icon: <Film className="w-5 h-5" /> },
            { label: "Usuarios", value: users.length, icon: <Users className="w-5 h-5" /> },
            { label: "Mensajes", value: messages.length, icon: <MessageSquare className="w-5 h-5" /> },
            { label: "Clicks totales", value: clicks.reduce((a: number, c: any) => a + (c.clicks || c.clickCount || 0), 0), icon: <BarChart3 className="w-5 h-5" /> },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 transition-colors hover:border-primary/40">
              <div className="p-2.5 bg-primary/10 ring-1 ring-primary/20 rounded-lg text-primary flex-shrink-0">{s.icon}</div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                <p className="font-display text-2xl font-extrabold leading-tight tracking-tight">
                  {typeof s.value === "number" ? s.value.toLocaleString("es") : s.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                tab === t.id
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                  : "bg-secondary/60 text-secondary-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ══ TMDB IMPORT TAB ══════════════════════════════════════════════ */}
            {tab === "tmdb" && (
              <div>
                <div className="flex gap-2 mb-4">
                  <input
                    value={tmdbQuery}
                    onChange={e => setTmdbQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleTmdbSearch()}
                    placeholder="Buscar película o serie en TMDB..."
                    className={inputCls}
                  />
                  <button
                    onClick={handleTmdbSearch}
                    disabled={tmdbLoading}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                  >
                    {tmdbLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Buscar
                  </button>
                </div>

                {tmdbResults.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {tmdbResults.map(item => {
                      const alreadyImported = importedIds.has(item.id);
                      return (
                        <div key={item.id} className="bg-card border border-border rounded-lg overflow-hidden group">
                          <div className="relative aspect-[2/3]">
                            {item.poster_path ? (
                              <img
                                src={`${TMDB_IMG_BASE}/w300${item.poster_path}`}
                                alt={item.title || item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-secondary flex items-center justify-center">
                                <Film className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}
                            <div className="absolute top-2 right-2">
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${item.media_type === "movie" ? "bg-primary" : "bg-accent"} text-primary-foreground`}>
                                {item.media_type === "movie" ? "PELI" : "SERIE"}
                              </span>
                            </div>
                            {alreadyImported && (
                              <div className="absolute inset-0 bg-primary/60 flex items-center justify-center">
                                <span className="text-primary-foreground text-xs font-bold bg-primary px-2 py-1 rounded">✓ Importado</span>
                              </div>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="text-xs font-medium truncate">{item.title || item.name}</p>
                            <p className="text-xs text-muted-foreground">{(item.release_date || item.first_air_date || "").split("-")[0]}</p>
                            <div className="mt-2">
                              {alreadyImported ? (
                                <button
                                  onClick={() => {
                                    const existing = contentList.find(c => c.id === item.id);
                                    if (existing) handleDeleteContent(existing.docId!);
                                  }}
                                  className="w-full py-1 text-xs bg-destructive/20 text-destructive rounded hover:bg-destructive/30 transition-colors"
                                >
                                  Eliminar
                                </button>
                              ) : (
                                <button
                                  onClick={() => setImportingItem(item)}
                                  className="w-full py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
                                >
                                  <Download className="w-3 h-3" /> Importar
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {tmdbResults.length === 0 && tmdbQuery && !tmdbLoading && (
                  <div className="text-center py-16 text-muted-foreground">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>No se encontraron resultados para "{tmdbQuery}"</p>
                  </div>
                )}

                {tmdbResults.length === 0 && !tmdbQuery && (
                  <div className="text-center py-16 text-muted-foreground">
                    <Download className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium mb-2">Importar desde TMDB</p>
                    <p className="text-sm">Busca películas y series para importarlas a tu catálogo</p>
                  </div>
                )}
              </div>
            )}

            {/* ══ CONTENT MANAGEMENT TAB ══════════════════════════════════════ */}
            {tab === "content" && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      value={contentSearch}
                      onChange={e => setContentSearch(e.target.value)}
                      placeholder="Buscar contenido..."
                      className={inputCls + " pl-9"}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground whitespace-nowrap flex items-center gap-2">
                    {contentSearch ? (
                      loadingAllForSearch ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          Buscando en todo el catálogo…
                        </>
                      ) : (
                        `${filteredContent.length} resultados`
                      )
                    ) : totalContentCount !== null ? (
                      `${contentList.length} de ${totalContentCount} títulos`
                    ) : (
                      `${contentList.length} títulos`
                    )}
                  </span>
                  <button
                    onClick={handleRebuildIndex}
                    disabled={rebuildingIndex}
                    title="Regenera el índice ligero que usan los visitantes. Se actualiza solo al importar, editar o borrar; úsalo si ves títulos desactualizados."
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md bg-secondary hover:bg-secondary/80 border border-border whitespace-nowrap disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${rebuildingIndex ? "animate-spin" : ""}`} />
                    Reconstruir índice
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {displayedContent.map(c => (
                    <div key={c.docId} className="bg-card rounded-lg border border-border overflow-hidden flex flex-col group relative">
                      <div className="aspect-[2/3] relative overflow-hidden">
                        <img
                          src={c.poster_path ? `${TMDB_IMG_BASE}/w342${c.poster_path}` : "/placeholder.svg"}
                          alt={c.title}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                          <button
                            onClick={() => setEditingOptions(c)}
                            className="w-full py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 flex items-center justify-center gap-1.5"
                          >
                            <Edit className="w-3.5 h-3.5" /> Editar
                          </button>
                          <button
                            onClick={() => c.docId && handleDeleteContent(c.docId)}
                            className="w-full py-1.5 bg-destructive text-destructive-foreground rounded-md text-xs font-medium hover:bg-destructive/90 flex items-center justify-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Eliminar
                          </button>
                        </div>
                        {c.media_type && (
                          <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-[10px] font-bold px-1.5 py-0.5 rounded uppercase text-white">
                            {c.media_type === "movie" ? "PELI" : "SERIE"}
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h4 className="font-bold text-sm line-clamp-1 mb-1">{c.title}</h4>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-wider">
                          <span>{(c.release_date || "").split("-")[0]}</span>
                          <div className="flex gap-1">
                            {c.display_options?.home_sections?.includes("slider") && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                            {c.display_options?.home_sections?.includes("estreno") && <Eye className="w-3 h-3 text-primary" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={contentSentinel} className="h-20 w-full col-span-full flex items-center justify-center bg-transparent">
                    {loadingContent && <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />}
                  </div>
                  {filteredContent.length === 0 && (
                    <div className="col-span-full text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl bg-card">
                      <Film className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p>No hay contenido</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══ USERS TAB ════════════════════════════════════════════════════ */}
            {tab === "users" && (
              <div>
                {/* Send message to all */}
                <div className="bg-card border border-border rounded-xl p-4 mb-4">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Send className="w-4 h-4" /> Enviar mensaje
                  </h3>
                  <div className="flex gap-2">
                    <input
                      value={adminMsg}
                      onChange={e => setAdminMsg(e.target.value)}
                      placeholder="Escribe el mensaje..."
                      className={inputCls}
                    />
                    <button
                      onClick={handleSendToAll}
                      disabled={!adminMsg.trim()}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 whitespace-nowrap"
                    >
                      A todos
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      placeholder="Buscar usuarios..."
                      className={inputCls + " pl-9"}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    {(["all", "online", "offline"] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setUserStatusFilter(f)}
                        className={`text-xs px-2.5 py-1 rounded-full transition-colors ${userStatusFilter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
                      >
                        {f === "all" ? "Todos" : f === "online" ? "🟢 En línea" : "⚫ Offline"}
                      </button>
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {users.filter(u => {
                      const ls = u.lastSeen?.toDate?.();
                      return ls && (Date.now() - ls.getTime()) < 5 * 60 * 1000;
                    }).length} en línea · {users.length} usuarios
                  </span>
                </div>

                <div className="space-y-2">
                  {displayedUsers.map(u => (
                    <div key={u.id} className="bg-card border border-border rounded-xl p-4 transition-colors hover:border-primary/30">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-primary/15 ring-1 ring-primary/25 text-primary flex items-center justify-center font-display font-bold text-base flex-shrink-0 uppercase">
                            {(u.name || u.email || "?").charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{u.name || "Sin nombre"}</p>
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              {(() => {
                                const ls = u.lastSeen?.toDate?.();
                                const isOnline = ls && (Date.now() - ls.getTime()) < 5 * 60 * 1000;
                                return (
                                  <span className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-1 ${isOnline ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"}`}>
                                    <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-muted-foreground/50"}`} />
                                    {isOnline ? "En línea" : ls ? `Visto ${ls.toLocaleDateString("es")} ${ls.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}` : "Sin actividad"}
                                  </span>
                                );
                              })()}
                              {u.registeredAt && (
                                <span className="text-xs text-muted-foreground">
                                  Registro: {u.registeredAt?.toDate?.()?.toLocaleDateString("es") || "N/A"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => setMsgToUser(msgToUser === u.id ? null : u.id)}
                            className="p-2 hover:bg-accent rounded-md transition-colors text-muted-foreground hover:text-foreground"
                            title="Enviar mensaje"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-2 hover:bg-destructive/20 rounded-md transition-colors text-destructive"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {msgToUser === u.id && (
                        <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                          <input
                            value={adminMsg}
                            onChange={e => setAdminMsg(e.target.value)}
                            placeholder="Mensaje individual..."
                            className={inputCls + " flex-1"}
                          />
                          <button
                            onClick={() => handleSendMsgToUser(u.id)}
                            disabled={!adminMsg.trim()}
                            className="px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 disabled:opacity-50"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={usersSentinel} className="h-20 w-full flex items-center justify-center bg-transparent">
                    {loadingUsers && <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />}
                  </div>
                  {filteredUsers.length === 0 && (
                    <div className="text-center py-16 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p>No hay usuarios registrados</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══ MESSAGES TAB ═════════════════════════════════════════════════ */}
            {tab === "messages" && (
              <div className="space-y-3">
                {messages.map(msg => {
                  const fromUser = users.find(u => u.id === msg.from);
                  const toUser = users.find(u => u.id === msg.to);
                  const fromName = fromUser?.name || fromUser?.email || msg.from;
                  const toName = msg.to === "admin" ? "admin" : (toUser?.name || toUser?.email || msg.to);
                  return (
                  <div key={msg.id} className="bg-card rounded-lg p-4 border border-border">
                    <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
                      <div>
                        <span className="text-xs text-muted-foreground">De: <span className="text-foreground">{fromName}</span></span>
                        <span className="text-xs text-muted-foreground ml-3">A: <span className="text-foreground">{toName}</span></span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className={`text-xs px-2 py-0.5 rounded ${msg.read ? "bg-primary/10 text-primary" : "bg-accent text-accent-foreground"}`}>
                          {msg.read ? "Leído" : "No leído"}
                        </span>
                        {!msg.read && (
                          <button onClick={() => msg.id && markMessageRead(msg.id).then(() => loadTabData("messages"))} className="text-xs text-primary hover:underline">
                            Marcar leído
                          </button>
                        )}
                        <button onClick={() => msg.id && deleteMessage(msg.id).then(() => loadTabData("messages"))} className="text-destructive hover:text-destructive/80">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm mb-2">{msg.message}</p>
                    {msg.createdAt && (
                      <p className="text-xs text-muted-foreground mb-2">
                        {new Date(msg.createdAt.seconds * 1000).toLocaleString("es")}
                      </p>
                    )}
                    <button onClick={() => setReplyTo(replyTo === msg.from ? null : msg.from)} className="text-xs text-primary hover:underline">
                      {replyTo === msg.from ? "Cancelar" : "Responder"}
                    </button>
                    {replyTo === msg.from && (
                      <div className="flex gap-2 mt-2">
                        <input value={replyMsg} onChange={e => setReplyMsg(e.target.value)} placeholder="Responder..." className={inputCls + " flex-1"} />
                        <button onClick={() => handleReply(msg.from)} className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90">
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  );
                })}
                {messages.length === 0 && (
                  <div className="text-center py-16 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>No hay mensajes</p>
                  </div>
                )}
              </div>
            )}

            {/* ══ HOME SECTIONS TAB ════════════════════════════════════════════ */}
            {tab === "sections" && (() => {
              const order = resolveHomeOrder(config.homeOrder as HomeSectionState[] | undefined);
              const commit = (next: HomeSectionState[]) =>
                setConfig(prev => ({ ...prev, homeOrder: next }));
              const move = (idx: number, dir: number) => {
                const j = idx + dir;
                if (j < 0 || j >= order.length) return;
                const next = [...order];
                [next[idx], next[j]] = [next[j], next[idx]];
                commit(next);
              };
              const toggle = (idx: number) =>
                commit(order.map((s, i) => (i === idx ? { ...s, enabled: !s.enabled } : s)));
              return (
              <div>
                <div className="flex items-end justify-between gap-4 mb-5 flex-wrap">
                  <div>
                    <h2 className="font-display text-xl font-bold tracking-tight flex items-center gap-2">
                      <Home className="w-5 h-5 text-primary" /> Secciones de la portada
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Activa, desactiva y reordena las filas de tu página de inicio. Los cambios se aplican al guardar.
                    </p>
                  </div>
                  <button
                    onClick={handleSaveConfig}
                    className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/30 hover:brightness-110 active:scale-[0.98] transition flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" /> Guardar orden
                  </button>
                </div>
                <div className="space-y-2">
                  {order.map((s, i) => (
                    <div
                      key={s.id}
                      className={`bg-card border rounded-xl p-3 flex items-center gap-3 transition-colors ${s.enabled ? "border-border" : "border-border/50 opacity-70"}`}
                    >
                      <span className="font-display text-lg font-extrabold text-primary/50 w-6 text-center flex-shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm ${s.enabled ? "" : "line-through text-muted-foreground"}`}>
                          {labelForSection(s.id)}
                        </p>
                      </div>
                      <div
                        onClick={() => toggle(i)}
                        role="switch"
                        aria-checked={s.enabled}
                        className={`relative w-11 h-6 rounded-full cursor-pointer transition-colors flex-shrink-0 ${s.enabled ? "bg-primary" : "bg-secondary"}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${s.enabled ? "translate-x-6" : "translate-x-1"}`} />
                      </div>
                      <div className="flex flex-col flex-shrink-0">
                        <button
                          onClick={() => move(i, -1)}
                          disabled={i === 0}
                          aria-label="Subir"
                          className="p-1 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => move(i, 1)}
                          disabled={i === order.length - 1}
                          aria-label="Bajar"
                          className="p-1 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              );
            })()}

            {/* ══ ANALYTICS TAB ════════════════════════════════════════════════ */}
            {tab === "analytics" && (() => {
              const getCount = (c: any) => c.clicks || c.clickCount || 0;
              const maxClicks = Math.max(1, ...clicks.map(getCount));
              const totalClicks = clicks.reduce((a: number, c: any) => a + getCount(c), 0);
              return (
              <div>
                {/* Encabezado + resumen */}
                <div className="flex items-end justify-between gap-4 mb-5 flex-wrap">
                  <div>
                    <h2 className="font-display text-xl font-bold tracking-tight flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-primary" /> Top contenido por clics
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Los títulos más abiertos por tus visitantes.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <div className="bg-card border border-border rounded-xl px-4 py-2.5 text-center">
                      <p className="text-xs text-muted-foreground">Clics totales</p>
                      <p className="font-display text-xl font-extrabold">{totalClicks.toLocaleString("es")}</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl px-4 py-2.5 text-center">
                      <p className="text-xs text-muted-foreground">Títulos</p>
                      <p className="font-display text-xl font-extrabold">{clicks.length.toLocaleString("es")}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {clicks.map((c: any, i) => {
                    const count = getCount(c);
                    const pct = Math.round((count / maxClicks) * 100);
                    return (
                      <div key={c.id} className="bg-card rounded-xl p-3 border border-border flex items-center gap-4 transition-colors hover:border-primary/30">
                        <span className="font-display text-xl font-extrabold text-primary/50 w-7 text-center flex-shrink-0">{i + 1}</span>
                        {c.posterPath && (
                          <img src={`${TMDB_IMG_BASE}/w92${c.posterPath}`} alt={c.title} className="w-10 h-14 object-cover rounded flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{c.title || c.id}</p>
                          <p className="text-xs text-muted-foreground mb-1.5">{c.mediaType === "movie" ? "Película" : "Serie"}</p>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-display text-xl font-extrabold text-primary">{count.toLocaleString("es")}</p>
                          <p className="text-xs text-muted-foreground">clics</p>
                        </div>
                      </div>
                    );
                  })}
                  {clicks.length === 0 && (
                    <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl bg-card">
                      <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p>Sin datos de clics aún</p>
                    </div>
                  )}
                </div>
              </div>
              );
            })()}

            {/* ══ SETTINGS TAB ═════════════════════════════════════════════════ */}
            {tab === "settings" && (
              <div className="space-y-6">
                <div className="bg-card rounded-xl p-6 border border-border">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Settings className="w-5 h-5" /> Configuración Web</h2>

                  {/* Sub-tabs */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {[
                      { id: "general" as const, label: "General", icon: <Settings className="w-4 h-4" /> },
                      { id: "inicio" as const, label: "Inicio", icon: <Home className="w-4 h-4" /> },
                      { id: "anuncios" as const, label: "Anuncios", icon: <span className="text-base leading-none">📢</span> },
                      { id: "botones" as const, label: "Botones & Plataformas", icon: <span className="text-base leading-none">🔘</span> },
                    ].map(st => (
                      <button
                        key={st.id}
                        onClick={() => setSettingsSubTab(st.id)}
                        className={`px-3.5 py-2 text-sm font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                          settingsSubTab === st.id
                            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                            : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }`}
                      >
                        {st.icon} {st.label}
                      </button>
                    ))}
                  </div>

                  {/* ─── GENERAL ─── */}
                  {settingsSubTab === "general" && (
                    <div className="space-y-6">
                      {/* Logo */}
                      <div>
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Image className="w-4 h-4" /> Logo del Sitio</h3>
                        <div>
                          <label className="text-xs text-muted-foreground">URL de la imagen del logo (dejar vacío para mostrar texto)</label>
                          <input value={config.logoUrl || ""} onChange={e => setConfig({ ...config, logoUrl: e.target.value })} className={inputCls} placeholder="https://..." />
                        </div>
                        {config.logoUrl && (
                          <img src={config.logoUrl} alt="Logo preview" className="mt-2 h-10 object-contain rounded border border-border bg-background p-1" onError={e => (e.currentTarget.style.display = "none")} />
                        )}
                      </div>

                      {/* Site name / lang / hero */}
                      <div className="border-t border-border pt-4">
                        <h3 className="text-sm font-semibold mb-3">Datos generales y Hero</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-muted-foreground">Nombre del sitio</label>
                            <input value={config.site_name || ""} onChange={e => setConfig({ ...config, site_name: e.target.value })} className={inputCls} />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Idioma de importación</label>
                            <select value={config.importLanguage || "es-MX"} onChange={e => setConfig({ ...config, importLanguage: e.target.value })} className={inputCls}>
                              <option value="es-MX">Español (MX)</option>
                              <option value="es-ES">Español (ES)</option>
                              <option value="en-US">English (US)</option>
                              <option value="pt-BR">Português (BR)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Posters en slider hero</label>
                            <input type="number" value={config.heroSlider?.posters || 8} onChange={e => setConfig({ ...config, heroSlider: { ...(config.heroSlider || {}), posters: Number(e.target.value) } })} className={inputCls} min={1} max={20} />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Posters aleatorios en hero</label>
                            <input type="number" value={config.heroSlider?.random || 4} onChange={e => setConfig({ ...config, heroSlider: { ...(config.heroSlider || {}), random: Number(e.target.value) } })} className={inputCls} min={0} max={10} />
                          </div>
                        </div>
                        <div className="mt-4">
                          <label className="text-xs text-muted-foreground">Texto del footer (pie de página)</label>
                          <input
                            value={config.footerText || ""}
                            onChange={e => setConfig({ ...config, footerText: e.target.value })}
                            className={inputCls}
                            placeholder="© 2026 StreamFusion.top. Todos los derechos reservados."
                          />
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Se muestra al final de cada página (excepto admin, login y reproductor).
                          </p>
                        </div>
                      </div>

                      {/* Theme & Colors */}
                      <div className="border-t border-border pt-4">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Palette className="w-4 h-4" /> Tema y Colores</h3>
                        <p className="text-xs text-muted-foreground mb-3">
                          Elige cada color con la paleta o pega un valor HSL <code className="bg-secondary px-1 rounded">H S% L%</code>.
                          Los fondos principales (Fondo, Primario, Secundario, Accent, Tarjetas, Muted, Destructivo) admiten <strong>degradado</strong>.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {[
                            { key: "background", label: "Fondo", def: "0 0% 4%", grad: true },
                            { key: "foreground", label: "Texto principal", def: "0 0% 95%", grad: false },
                            { key: "primary", label: "Primario (acento)", def: "0 85% 50%", grad: true },
                            { key: "primaryForeground", label: "Texto sobre primario", def: "0 0% 100%", grad: false },
                            { key: "secondary", label: "Secundario", def: "0 0% 14%", grad: true },
                            { key: "secondaryForeground", label: "Texto secundario", def: "0 0% 90%", grad: false },
                            { key: "accent", label: "Accent", def: "0 0% 16%", grad: true },
                            { key: "accentForeground", label: "Texto accent", def: "0 0% 95%", grad: false },
                            { key: "card", label: "Tarjetas", def: "0 0% 8%", grad: true },
                            { key: "cardForeground", label: "Texto tarjetas", def: "0 0% 95%", grad: false },
                            { key: "muted", label: "Muted", def: "0 0% 12%", grad: true },
                            { key: "mutedForeground", label: "Texto muted", def: "0 0% 55%", grad: false },
                            { key: "destructive", label: "Destructivo", def: "0 84% 60%", grad: true },
                            { key: "border", label: "Bordes", def: "0 0% 16%", grad: false },
                            { key: "ring", label: "Anillo focus", def: "0 85% 50%", grad: false },
                          ].map(({ key, label, def, grad }) => (
                            <ColorTokenPicker
                              key={key}
                              label={label}
                              fallback={def}
                              allowGradient={grad}
                              value={config.theme?.[key]}
                              onChange={(next) =>
                                setConfig({
                                  ...config,
                                  theme: { ...(config.theme || {}), [key]: next },
                                })
                              }
                            />
                          ))}
                        </div>
                        <button
                          onClick={() => setConfig({ ...config, theme: {} })}
                          className="mt-3 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md text-xs font-medium hover:bg-accent"
                        >
                          Restablecer colores por defecto
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ─── INICIO ─── */}
                  {settingsSubTab === "inicio" && (
                    <div className="space-y-6">
                      {/* Top 10 */}
                      <div>
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Star className="w-4 h-4" /> Top 10 Más Vistos</h3>
                        <div className="space-y-3">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <span className="text-sm font-medium">Activar Top 10</span>
                            <div
                              onClick={() => setConfig({ ...config, top10: { ...(config.top10 || {}), enabled: !(config.top10?.enabled ?? true) } })}
                              className={`relative w-12 h-6 rounded-full transition-colors ${(config.top10?.enabled ?? true) ? "bg-primary" : "bg-secondary"}`}
                            >
                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${(config.top10?.enabled ?? true) ? "translate-x-7" : "translate-x-1"}`} />
                            </div>
                          </label>
                          <div>
                            <label className="text-xs text-muted-foreground">Título de la sección</label>
                            <input value={config.top10?.title || "Top 10 Más Vistos"} onChange={e => setConfig({ ...config, top10: { ...(config.top10 || {}), title: e.target.value } })} className={inputCls} />
                          </div>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <span className="text-sm font-medium">Selección aleatoria</span>
                            <div
                              onClick={() => setConfig({ ...config, top10: { ...(config.top10 || {}), random: !(config.top10?.random ?? true) } })}
                              className={`relative w-12 h-6 rounded-full transition-colors ${(config.top10?.random ?? true) ? "bg-primary" : "bg-secondary"}`}
                            >
                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${(config.top10?.random ?? true) ? "translate-x-7" : "translate-x-1"}`} />
                            </div>
                          </label>
                          <div>
                            <label className="text-xs text-muted-foreground">Selección manual — buscar y agregar contenido al Top 10</label>
                            <div className="flex gap-2 mt-1">
                              <input
                                id="top10-search"
                                placeholder="Buscar título..."
                                className={inputCls}
                                onKeyDown={e => {
                                  if (e.key === "Enter") {
                                    const val = (e.target as HTMLInputElement).value.toLowerCase();
                                    if (!val) return;
                                    const found = contentList.filter(c => c.title?.toLowerCase().includes(val) || c.original_title?.toLowerCase().includes(val));
                                    setConfig(prev => ({ ...prev, _top10SearchResults: found }));
                                  }
                                }}
                              />
                              <button
                                onClick={() => {
                                  const el = document.getElementById("top10-search") as HTMLInputElement;
                                  const val = el?.value?.toLowerCase();
                                  if (!val) return;
                                  const found = contentList.filter(c => c.title?.toLowerCase().includes(val) || c.original_title?.toLowerCase().includes(val));
                                  setConfig(prev => ({ ...prev, _top10SearchResults: found }));
                                }}
                                className="px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
                              >
                                <Search className="w-4 h-4" />
                              </button>
                            </div>
                            {(config._top10SearchResults || []).length > 0 && (
                              <div className="mt-2 max-h-48 overflow-y-auto border border-border rounded-lg">
                                {(config._top10SearchResults || []).map((c: Content) => {
                                  const manualIds: string[] = config.top10?.manualIds || [];
                                  const isAdded = manualIds.includes(String(c.id));
                                  return (
                                    <div key={c.docId} className="flex items-center gap-2 p-2 hover:bg-accent text-sm border-b border-border last:border-b-0">
                                      <img src={getImageUrl(c.poster_path)} alt={c.title} className="w-8 h-12 object-cover rounded" />
                                      <span className="flex-1 truncate">{c.title}</span>
                                      <button
                                        onClick={() => {
                                          const ids = [...manualIds];
                                          if (isAdded) {
                                            setConfig({ ...config, top10: { ...(config.top10 || {}), manualIds: ids.filter(id => id !== String(c.id)) } });
                                          } else {
                                            ids.push(String(c.id));
                                            setConfig({ ...config, top10: { ...(config.top10 || {}), manualIds: ids } });
                                          }
                                        }}
                                        className={`px-2 py-1 rounded text-xs font-medium ${isAdded ? "bg-destructive/20 text-destructive" : "bg-primary text-primary-foreground"}`}
                                      >
                                        {isAdded ? "Quitar" : "Agregar"}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          {(config.top10?.manualIds || []).length > 0 && (
                            <div>
                              <label className="text-xs text-muted-foreground">Contenido seleccionado manualmente:</label>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {(config.top10?.manualIds || []).map((id: string) => {
                                  const c = contentList.find(x => String(x.id) === id);
                                  return (
                                    <div key={id} className="flex items-center gap-1.5 bg-secondary rounded-full px-3 py-1 text-xs">
                                      <span>{c?.title || id}</span>
                                      <button
                                        onClick={() => setConfig({ ...config, top10: { ...(config.top10 || {}), manualIds: (config.top10?.manualIds || []).filter((x: string) => x !== id) } })}
                                        className="text-destructive hover:text-destructive/80"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Section Titles */}
                      <div className="border-t border-border pt-4">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Type className="w-4 h-4" /> Títulos de Secciones (Inicio)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {[
                            { key: "enEstreno", label: "En Estreno/Emisión", def: "En Estreno/Emisión" },
                            { key: "recienAgregado", label: "Recién Agregado", def: "Recién Agregado" },
                            { key: "peliculasPopulares", label: "Películas Populares", def: "Películas Populares" },
                            { key: "seriesPopulares", label: "Series Populares", def: "Series Populares" },
                          ].map(({ key, label, def }) => (
                            <div key={key}>
                              <label className="text-xs text-muted-foreground">{label}</label>
                              <input
                                value={config.sectionTitles?.[key] || ""}
                                onChange={e => setConfig({ ...config, sectionTitles: { ...(config.sectionTitles || {}), [key]: e.target.value } })}
                                className={inputCls}
                                placeholder={def}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Posters per Section */}
                      <div className="border-t border-border pt-4">
                        <h3 className="text-sm font-semibold mb-3">Cantidad de Posters por Sección</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {[
                            { key: "enEstreno", label: "En Estreno/Emisión" },
                            { key: "recienAgregado", label: "Recién Agregado" },
                            { key: "peliculasPopulares", label: "Películas Populares" },
                            { key: "seriesPopulares", label: "Series Populares" },
                          ].map(({ key, label }) => (
                            <div key={key}>
                              <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                              <input
                                type="number"
                                min={1}
                                max={50}
                                value={config.homepageSections?.[key] ?? 20}
                                onChange={(e) =>
                                  setConfig({
                                    ...config,
                                    homepageSections: {
                                      ...(config.homepageSections || {}),
                                      [key]: parseInt(e.target.value) || 20,
                                    },
                                  })
                                }
                                className={inputCls}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Visibility: Fixed sections + Genres */}
                      <div className="border-t border-border pt-4">
                        <h3 className="text-sm font-semibold mb-3">Visibilidad de Secciones Fijas</h3>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {[
                            { label: "Películas Populares", key: "peliculas" },
                            { label: "Series Populares", key: "series" },
                            { label: "En Estreno/Emisión", key: "enEstreno" },
                            { label: "Recién Agregado", key: "recienAgregado" },
                          ].map(({ label, key }) => {
                            const cats: string[] = config.visibleCategories || [];
                            const visible = cats.length === 0 || cats.includes(key);
                            return (
                              <button
                                key={key}
                                onClick={() => {
                                  const list = cats.length === 0
                                    ? ["peliculas", "series", "enEstreno", "recienAgregado"]
                                    : cats;
                                  setConfig({
                                    ...config,
                                    visibleCategories: visible ? list.filter((c) => c !== key) : [...list, key],
                                  });
                                }}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                  visible ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>

                        <h3 className="text-sm font-semibold mb-2">Visibilidad de Géneros</h3>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            const genreSet = new Set<string>();
                            contentList.forEach((c: any) => {
                              c.genres?.forEach((g: any) => genreSet.add(getGenreName(g)));
                            });
                            return Array.from(genreSet).sort();
                          })().map((genre) => {
                            const key = genre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                            const cats: string[] = config.visibleCategories || [];
                            const visible = cats.length === 0 || cats.includes(key);
                            return (
                              <button
                                key={genre}
                                onClick={() => {
                                  const list = cats.length === 0 ? [key] : cats;
                                  setConfig({
                                    ...config,
                                    visibleCategories: visible ? list.filter((c) => c !== key) : [...list, key],
                                  });
                                }}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                  visible ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                                }`}
                              >
                                {genre}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Visibility platforms */}
                      <div className="border-t border-border pt-4">
                        <h3 className="text-sm font-semibold mb-3">Visibilidad de Plataformas</h3>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { label: "Netflix", key: "netflix" },
                            { label: "Disney+", key: "disney" },
                            { label: "Max", key: "hbo" },
                            { label: "Prime Video", key: "prime" },
                            { label: "Paramount+", key: "paramount" },
                          ].map(({ label, key }) => {
                            const plats: string[] = config.visiblePlatforms || [];
                            const visible = plats.length === 0 || plats.includes(key);
                            return (
                              <button
                                key={key}
                                onClick={() => {
                                  const list = plats.length === 0
                                    ? ["netflix", "disney", "hbo", "prime", "paramount"]
                                    : plats;
                                  setConfig({
                                    ...config,
                                    visiblePlatforms: visible ? list.filter((p) => p !== key) : [...list, key],
                                  });
                                }}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                  visible ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ─── ANUNCIOS ─── */}
                  {settingsSubTab === "anuncios" && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">📢 Anuncios</h3>
                      <label className="flex items-center gap-3 cursor-pointer mb-4">
                        <span className="text-sm font-medium">Activar anuncios globalmente</span>
                        <div
                          onClick={() => setConfig({ ...config, ads: { ...(config.ads || {}), enabled: !(config.ads?.enabled) } })}
                          className={`relative w-12 h-6 rounded-full transition-colors ${config.ads?.enabled ? "bg-primary" : "bg-secondary"}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${config.ads?.enabled ? "translate-x-7" : "translate-x-1"}`} />
                        </div>
                      </label>
                      {config.ads?.enabled && (
                        <div className="space-y-3">
                          <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-border p-3">
                            <div
                              onClick={() => setConfig({ ...config, ads: { ...(config.ads || {}), antiAdblock: !(config.ads?.antiAdblock) } })}
                              className={`relative h-6 w-12 rounded-full transition-colors ${config.ads?.antiAdblock ? "bg-primary" : "bg-secondary"}`}
                            >
                              <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${config.ads?.antiAdblock ? "translate-x-7" : "translate-x-1"}`} />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Forzar desactivación del bloqueador</p>
                              <p className="text-xs text-muted-foreground">
                                Muestra un modal persistente cuando detecta Brave Shields, extensiones tipo uBlock/AdBlock/AdGuard u otros bloqueos similares.
                              </p>
                            </div>
                          </label>
                          <div className="space-y-3 mb-4">
                            <div>
                              <label className="text-xs text-muted-foreground">Código global en &lt;head&gt; (verificación, pixels, scripts de carga)</label>
                              <textarea
                                value={config.ads?.headCode || ""}
                                onChange={e => setConfig({ ...config, ads: { ...(config.ads || {}), headCode: e.target.value } })}
                                placeholder="<script>...</script> o <meta ...>"
                                className={inputCls + " font-mono text-xs min-h-[80px]"}
                                rows={4}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Código global en &lt;body&gt; (tags noscript, pixels visibles, etc.)</label>
                              <textarea
                                value={config.ads?.bodyCode || ""}
                                onChange={e => setConfig({ ...config, ads: { ...(config.ads || {}), bodyCode: e.target.value } })}
                                placeholder="<noscript>...</noscript>"
                                className={inputCls + " font-mono text-xs min-h-[80px]"}
                                rows={4}
                              />
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">Slots de anuncios por sección (HTML/JS de tu plataforma — AdSense, Adsterra, Exoclick, etc.)</p>
                          {[
                            { id: "home_top", label: "Inicio — Arriba" },
                            { id: "home_middle", label: "Inicio — Medio" },
                            { id: "home_bottom", label: "Inicio — Abajo" },
                            { id: "movies_top", label: "Películas — Arriba" },
                            { id: "movies_bottom", label: "Películas — Abajo" },
                            { id: "series_top", label: "Series — Arriba" },
                            { id: "series_bottom", label: "Series — Abajo" },
                            { id: "animes_top", label: "Animes — Arriba" },
                            { id: "animes_bottom", label: "Animes — Abajo" },
                            { id: "doramas_top", label: "Doramas — Arriba" },
                            { id: "doramas_bottom", label: "Doramas — Abajo" },
                            { id: "content_top", label: "Contenido (ver) — Arriba" },
                            { id: "content_middle", label: "Contenido (ver) — Medio" },
                            { id: "content_bottom", label: "Contenido (ver) — Abajo" },
                          ].map(slot => {
                            const slotData = config.ads?.slots?.[slot.id] || { enabled: false, code: "" };
                            return (
                              <div key={slot.id} className="border border-border rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium">{slot.label}</span>
                                  <div
                                    onClick={() => {
                                      const slots = { ...(config.ads?.slots || {}) };
                                      slots[slot.id] = { ...slotData, enabled: !slotData.enabled };
                                      setConfig({ ...config, ads: { ...(config.ads || {}), slots } });
                                    }}
                                    className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${slotData.enabled ? "bg-primary" : "bg-secondary"}`}
                                  >
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${slotData.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
                                  </div>
                                </div>
                                {slotData.enabled && (
                                  <textarea
                                    value={slotData.code || ""}
                                    onChange={e => {
                                      const slots = { ...(config.ads?.slots || {}) };
                                      slots[slot.id] = { ...slotData, code: e.target.value };
                                      setConfig({ ...config, ads: { ...(config.ads || {}), slots } });
                                    }}
                                    placeholder="Pega aquí el código del anuncio..."
                                    className={inputCls + " font-mono text-xs min-h-[80px]"}
                                    rows={3}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── BOTONES & PLATAFORMAS ─── */}
                  {settingsSubTab === "botones" && (
                    <div className="space-y-6">
                      {/* Floating Buttons */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold flex items-center gap-2">🔘 Botones Flotantes</h3>
                          <button
                            onClick={() => {
                              const list = Array.isArray(config.floatingButtons)
                                ? [...config.floatingButtons]
                                : (config.floatingButton ? [config.floatingButton] : []);
                              list.push({ id: `fb_${Date.now()}`, enabled: true, url: "", icon: "android", tooltip: "" });
                              setConfig({ ...config, floatingButtons: list });
                            }}
                            className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-xs font-semibold hover:bg-primary/90 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Agregar botón
                          </button>
                        </div>
                        {(() => {
                          const ICONS = [
                            { id: "android", label: "Android", color: "#3DDC84", Icon: FaAndroid },
                            { id: "whatsapp", label: "WhatsApp", color: "#25D366", Icon: FaWhatsapp },
                            { id: "telegram", label: "Telegram", color: "#0088cc", Icon: FaTelegram },
                            { id: "messenger", label: "Messenger", color: "#006AFF", Icon: FaFacebookMessenger },
                            { id: "instagram", label: "Instagram", color: "#E1306C", Icon: FaInstagram },
                            { id: "tiktok", label: "TikTok", color: "#000000", Icon: FaTiktok },
                            { id: "youtube", label: "YouTube", color: "#FF0000", Icon: FaYoutube },
                            { id: "twitter", label: "Twitter", color: "#1DA1F2", Icon: FaTwitter },
                            { id: "discord", label: "Discord", color: "#5865F2", Icon: FaDiscord },
                            { id: "facebook", label: "Facebook", color: "#1877F2", Icon: FaFacebook },
                            { id: "web", label: "Web", color: "#6366f1", Icon: FaGlobe },
                            { id: "download", label: "Descarga", color: "#10b981", Icon: FaDownload },
                            { id: "email", label: "Email", color: "#EA4335", Icon: FaEnvelope },
                            { id: "link", label: "Enlace", color: "#8b5cf6", Icon: FaLink },
                          ] as { id: string; label: string; color: string; Icon: IconType }[];

                          const list: any[] = Array.isArray(config.floatingButtons)
                            ? config.floatingButtons
                            : (config.floatingButton ? [config.floatingButton] : []);

                          const updateAt = (idx: number, patch: any) => {
                            const next = [...list];
                            next[idx] = { ...next[idx], ...patch };
                            setConfig({ ...config, floatingButtons: next });
                          };
                          const removeAt = (idx: number) => {
                            const next = list.filter((_, i) => i !== idx);
                            setConfig({ ...config, floatingButtons: next });
                          };

                          if (list.length === 0) {
                            return <p className="text-xs text-muted-foreground">No hay botones configurados. Pulsa "Agregar botón" para crear uno.</p>;
                          }

                          return (
                            <div className="space-y-4">
                              {list.map((fb, idx) => (
                                <div key={fb.id || idx} className="border border-border rounded-lg p-3 space-y-3 bg-background/50">
                                  <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                      <span className="text-sm font-medium">Botón #{idx + 1}</span>
                                      <div
                                        onClick={() => updateAt(idx, { enabled: !fb.enabled })}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${fb.enabled ? "bg-primary" : "bg-secondary"}`}
                                      >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${fb.enabled ? "translate-x-7" : "translate-x-1"}`} />
                                      </div>
                                    </label>
                                    <button
                                      onClick={() => removeAt(idx)}
                                      className="text-destructive hover:text-destructive/80 p-1"
                                      title="Eliminar"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <label className="text-xs text-muted-foreground">URL del enlace</label>
                                      <input value={fb.url || ""} onChange={e => updateAt(idx, { url: e.target.value })} className={inputCls} placeholder="https://..." />
                                    </div>
                                    <div>
                                      <label className="text-xs text-muted-foreground">Tooltip</label>
                                      <input value={fb.tooltip || ""} onChange={e => updateAt(idx, { tooltip: e.target.value })} className={inputCls} placeholder="Ej: Descargar App" />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground mb-2 block">Ícono</label>
                                    <div className="grid grid-cols-7 gap-2">
                                      {ICONS.map(ic => {
                                        const selected = (fb.icon || "android") === ic.id;
                                        return (
                                          <button
                                            key={ic.id}
                                            type="button"
                                            onClick={() => updateAt(idx, { icon: ic.id })}
                                            className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-colors ${selected ? "border-primary bg-primary/10" : "border-border hover:bg-accent"}`}
                                            title={ic.label}
                                          >
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: ic.color }}>
                                              <ic.Icon className="w-4 h-4 text-white" />
                                            </div>
                                            <span className="truncate w-full text-center">{ic.label}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Platform Images */}
                      <div className="border-t border-border pt-4">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Image className="w-4 h-4" /> Imágenes de Plataformas</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {PLATFORMS.map(p => (
                            <div key={p.id}>
                              <label className="text-xs text-muted-foreground">{p.label} — URL de imagen</label>
                              <input
                                value={config.platformImages?.[p.id] || ""}
                                onChange={e => setConfig({
                                  ...config,
                                  platformImages: { ...(config.platformImages || {}), [p.id]: e.target.value }
                                })}
                                className={inputCls}
                                placeholder="https://..."
                              />
                              {config.platformImages?.[p.id] && (
                                <img src={config.platformImages[p.id]} alt={p.label} className="mt-1 h-8 object-contain rounded" onError={e => (e.currentTarget.style.display = "none")} />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-8 flex justify-end sticky bottom-4 z-10">
                    <button
                      onClick={handleSaveConfig}
                      className="px-7 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/30 ring-4 ring-background hover:brightness-110 active:scale-[0.98] transition flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" /> Guardar Configuración
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
