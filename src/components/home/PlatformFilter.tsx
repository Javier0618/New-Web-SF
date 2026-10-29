import { motion } from "framer-motion";
import { useNavigate } from "@/lib/react-router-shim";
import { useWebConfig } from "@/hooks/useWebConfig";

const platforms = [
  {
    id: "netflix",
    label: "Netflix",
    logo: <svg viewBox="0 0 111 30" className="h-5 fill-current" aria-label="Netflix"></svg>,
  },
  {
    id: "disney",
    label: "Disney+",
    logo: <svg viewBox="0 0 80 32" className="h-6 fill-current" aria-label="Disney+"></svg>,
  },
  {
    id: "hbo",
    label: "Max",
    logo: <svg viewBox="0 0 60 28" className="h-7 fill-current" aria-label="Max"></svg>,
  },
  {
    id: "prime",
    label: "Prime Video",
    logo: <svg viewBox="0 0 120 28" className="h-5 fill-current" aria-label="Prime Video"></svg>,
  },
  {
    id: "paramount",
    label: "Paramount+",
    logo: (
      <svg viewBox="0 0 90 36" className="h-8 fill-current" aria-label="Paramount+">
        <path d="M20 22 L27 10 L34 22Z" />
        <path d="M26 22 L33 8 L40 22Z" opacity="0.7" />
        <circle cx="33" cy="5" r="1.2" />
        <circle cx="27" cy="7" r="1.2" />
        <circle cx="21" cy="10" r="1.2" />
        <circle cx="39" cy="7" r="1.2" />
        <circle cx="45" cy="10" r="1.2" />
        <text x="2" y="34" fontSize="9" fontWeight="700" fontFamily="sans-serif" letterSpacing="1">
          PARAMOUNT+
        </text>
      </svg>
    ),
  },
];

interface PlatformFilterProps {
  content: { display_options?: { platforms?: string[] } }[];
  visiblePlatforms?: string[];
}

const PlatformFilter = ({ content, visiblePlatforms }: PlatformFilterProps) => {
  const navigate = useNavigate();
  const { data: config } = useWebConfig();
  const platformImages = config?.platformImages || {};

  const availablePlatforms = platforms.filter((p) => {
    const hasContent = content.some((c) => c.display_options?.platforms?.includes(p.id));
    if (!hasContent) return false;
    // If visiblePlatforms is configured, only show those that are enabled
    if (visiblePlatforms && visiblePlatforms.length > 0) {
      return visiblePlatforms.includes(p.id);
    }
    return true;
  });

  if (availablePlatforms.length === 0) return null;

  return (
    <div className="w-full mb-8 overflow-hidden">
      <div className="flex items-center md:justify-center gap-2 px-4 md:px-10 py-2 overflow-x-auto scrollbar-hide flex-nowrap min-w-full">
        {availablePlatforms.map((platform, i) => (
          <motion.button
            key={platform.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            onClick={() => navigate(`/category/${encodeURIComponent(platform.id)}`)}
            aria-label={platform.label}
            className="group flex items-center justify-center h-14 px-5 md:px-8 rounded-xl bg-card border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary transition-colors flex-shrink-0"
          >
            <span className="opacity-80 group-hover:opacity-100 transition-[opacity,transform] duration-500 ease-out scale-100 group-hover:scale-[1.04]">
              {platformImages?.[platform.id] ? (
                <img
                  src={platformImages[platform.id]}
                  alt={platform.label}
                  className="h-6 md:h-8 object-contain"
                />
              ) : (
                <div className="h-6 md:h-8 flex items-center">{platform.logo}</div>
              )}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default PlatformFilter;
