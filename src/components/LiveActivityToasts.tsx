import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { TrendingUp, ArrowDownToLine, Sparkles } from "lucide-react";

const NAMES = [
  "James", "Aisha", "Diego", "Lin", "Sven", "Yara", "Marcus", "Priya", "Omar", "Chloe",
  "Ivan", "Nadia", "Kofi", "Mei", "Lucas", "Fatima", "Noah", "Sofia", "Hassan", "Elena",
  "Tobias", "Amara", "Viktor", "Leila", "Mateo", "Zara", "Andre", "Ingrid", "Rashid", "Camila",
];
const DOMAINS = ["gmail.com", "outlook.com", "icloud.com", "proton.me", "yahoo.com"];
const PLANS = ["Starter", "Silver", "Gold", "Platinum VIP"];

// Produces a hashed/masked email like "j••7a3@gmail.com" so it looks real but
// exposes nothing identifiable.
function hashedEmail(name: string) {
  const first = name[0].toLowerCase();
  const hash = Math.random().toString(36).slice(2, 6);
  const domain = DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
  return `${first}••${hash}@${domain}`;
}

function randAmount() {
  // weighted toward smaller amounts, rounded to the nearest $50
  const raw = 200 + Math.pow(Math.random(), 2.2) * 40000;
  return Math.round(raw / 50) * 50;
}

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

type Kind = "invest" | "profit" | "withdraw";

// Shared options: bottom-left + compact, so these never cover the header and
// stay visually distinct from the app's real (top-right) toasts.
const baseOpts = {
  position: "bottom-left" as const,
  duration: 4500,
  className: "live-activity-toast",
};

function fireOne() {
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  const email = hashedEmail(name);
  const amount = randAmount();
  const roll = Math.random();
  const kind: Kind = roll < 0.68 ? "invest" : roll < 0.86 ? "profit" : "withdraw";

  if (kind === "invest") {
    const plan = PLANS[Math.floor(Math.random() * PLANS.length)];
    toast.success(`${email} just invested`, {
      ...baseOpts,
      description: `${usd(amount)} in the ${plan} plan`,
      icon: <TrendingUp className="h-3.5 w-3.5" />,
    });
  } else if (kind === "profit") {
    toast.success(`${email} earned profit`, {
      ...baseOpts,
      description: `+${usd(Math.round(amount * 0.12))} daily ROI credited`,
      icon: <Sparkles className="h-3.5 w-3.5" />,
    });
  } else {
    toast(`${email} withdrew`, {
      ...baseOpts,
      description: `${usd(amount)} paid out successfully`,
      icon: <ArrowDownToLine className="h-3.5 w-3.5" />,
    });
  }
}

/**
 * Simulated live-activity feed rendered as toasts, to make the landing page
 * feel active. Renders nothing; drives the global <Toaster />. Client-only.
 */
export function LiveActivityToasts() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const schedule = (delay: number) => {
      timer.current = setTimeout(() => {
        if (cancelled) return;
        fireOne();
        schedule(7000 + Math.random() * 9000); // every 7–16s
      }, delay);
    };
    schedule(3500); // first pop shortly after load
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return null;
}
