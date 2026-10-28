import { useParams } from "@/lib/react-router-shim";
import { useContentDetail } from "@/hooks/useContent";
import Navbar from "@/components/layout/Navbar";
import VideoPlayer from "@/components/content/VideoPlayer";

const WatchPage = () => {
  const { id } = useParams();
  const { content, loading } = useContentDetail(id);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!content || !content.video_url) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Navbar />
        <p className="text-muted-foreground">Video no disponible</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16">
        <VideoPlayer url={content.video_url} title={content.title} />
      </div>
    </div>
  );
};

export default WatchPage;
