import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";
import { sendMessage, fetchMessages, fetchSentMessages, markMessageRead } from "@/lib/firestore";
import { useEffect } from "react";
import type { Message } from "@/types/content";
import { Send, CheckCheck } from "lucide-react";

const MessagesPage = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [sent, setSent] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [received, sentMsgs] = await Promise.all([
        fetchMessages(user.uid),
        fetchSentMessages(user.uid),
      ]);
      setMessages(received);
      setSent(sentMsgs);
    };
    load();
  }, [user]);

  const handleSend = async () => {
    if (!newMsg.trim() || !user) return;
    setLoading(true);
    await sendMessage(user.uid, "admin", newMsg.trim());
    setNewMsg("");
    const sentMsgs = await fetchSentMessages(user.uid);
    setSent(sentMsgs);
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Inicia sesión para ver tus mensajes</p>
        </div>
      </div>
    );
  }

  const allMessages = [...messages, ...sent].sort((a, b) => {
    const aTime = a.createdAt?.seconds || 0;
    const bTime = b.createdAt?.seconds || 0;
    return aTime - bTime;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 px-4 md:px-12 max-w-2xl mx-auto pb-16">
        <h1 className="text-2xl font-bold mb-6">Mensajes</h1>

        <div className="bg-card rounded-xl p-4 min-h-[400px] flex flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto mb-4 max-h-[500px]">
            {allMessages.length === 0 && (
              <p className="text-muted-foreground text-center py-8 text-sm">No hay mensajes aún</p>
            )}
            {allMessages.map((msg) => {
              const isMine = msg.from === user.uid;
              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] px-4 py-2 rounded-xl text-sm ${isMine ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                    <p>{msg.message}</p>
                    <div className="flex items-center justify-end gap-1 mt-1 opacity-60 text-xs">
                      {msg.createdAt && new Date(msg.createdAt.seconds * 1000).toLocaleString("es")}
                      {isMine && msg.read && <CheckCheck className="w-3 h-3" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2">
            <input
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              maxLength={1000}
              placeholder="Escribe un mensaje al admin..."
              className="flex-1 px-4 py-2 bg-secondary text-foreground rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <button
              onClick={handleSend}
              disabled={loading || !newMsg.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
