import { MessageCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function FloatingChatButton() {
  const openChat = () => {
    const w = window as any;
    if (w.smartsupp && typeof w.smartsupp === "function") {
      w.smartsupp("chat:open");
    } else if (w.smartsupp && w.smartsupp.chat && typeof w.smartsupp.chat.open === "function") {
      w.smartsupp.chat.open();
    } else {
      // fallback: nothing, the Link will handle navigation
    }
  };

  return (
    <Link
      to="/support"
      onClick={(e) => {
        const w = window as any;
        if (w.smartsupp) {
          e.preventDefault();
          openChat();
        }
      }}
      className="fixed bottom-6 right-6 z-[9999] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 transition-transform hover:scale-110 hover:shadow-primary/60 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      aria-label="Open live chat"
    >
      <MessageCircle className="h-6 w-6" />
    </Link>
  );
}
