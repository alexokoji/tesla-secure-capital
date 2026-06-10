import { useEffect, useRef, memo } from "react";

function TickerTapeComponent() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || ref.current.querySelector("script")) return;
    const s = document.createElement("script");
    s.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    s.async = true;
    s.innerHTML = JSON.stringify({
      symbols: [
        { proName: "NASDAQ:TSLA", title: "Tesla" },
        { proName: "BITSTAMP:BTCUSD", title: "BTC" },
        { proName: "BITSTAMP:ETHUSD", title: "ETH" },
        { proName: "NASDAQ:AAPL", title: "Apple" },
        { proName: "FOREXCOM:SPXUSD", title: "S&P 500" },
        { proName: "FX_IDC:EURUSD", title: "EUR/USD" },
      ],
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: "adaptive",
      colorTheme: "dark",
      locale: "en",
    });
    ref.current.appendChild(s);
  }, []);
  return <div className="tradingview-widget-container" ref={ref}><div className="tradingview-widget-container__widget" /></div>;
}
export const TickerTape = memo(TickerTapeComponent);