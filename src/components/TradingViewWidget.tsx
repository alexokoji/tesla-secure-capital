import { useEffect, useRef } from "react";

export function TradingViewWidget({ symbol = "NASDAQ:TSLA" }: { symbol?: string }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    container.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: "D",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: true,
      hide_top_toolbar: false,
      backgroundColor: "rgba(20, 20, 28, 1)",
      gridColor: "rgba(80, 80, 100, 0.1)",
      support_host: "https://www.tradingview.com",
    });
    container.current.appendChild(script);
  }, [symbol]);

  return (
    <div className="tradingview-widget-container h-[500px] w-full rounded-xl overflow-hidden border border-border" ref={container}>
      <div className="tradingview-widget-container__widget h-full w-full" />
    </div>
  );
}
