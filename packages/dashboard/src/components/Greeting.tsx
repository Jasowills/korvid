import { useState, useEffect } from "react";
import { BRAND, rgba } from "../lib/brand.js";

interface GreetingProps {
  connected: boolean;
}

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

function getSubtitle(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "systems online. what's first?";
  if (hour >= 12 && hour < 17) return "all systems operational. what's next?";
  if (hour >= 17 && hour < 21) return "still here. what needs doing?";
  return "burning the midnight oil? i'm here.";
}

export function Greeting({ connected }: GreetingProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    if (connected) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, [connected]);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => setDismissed(true), 10000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible || dismissed) return null;

  const greeting = getTimeGreeting();
  const subtitle = getSubtitle();
  const timeStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      onClick={() => setDismissed(true)}
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 10,
        textAlign: "center",
        cursor: "pointer",
        animation: "fadeInScale 0.6s ease-out",
        pointerEvents: "auto",
      }}
    >
      <div style={{
        fontFamily: BRAND.font.display,
        fontSize: 32,
        fontWeight: 600,
        color: BRAND.color.white,
        letterSpacing: "-0.03em",
        marginBottom: 8,
        animation: "textGlow 4s ease-in-out infinite",
      }}>
        good {greeting}
      </div>
      <div style={{
        fontFamily: BRAND.font.mono,
        fontSize: 12,
        color: BRAND.color.sheen,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        opacity: 0.7,
        animation: "fadeIn 0.8s ease-out 0.2s both",
      }}>
        {subtitle}
      </div>
      <div style={{
        fontFamily: BRAND.font.mono,
        fontSize: 10,
        color: BRAND.color["text-muted"],
        marginTop: 20,
        animation: "fadeIn 0.8s ease-out 0.4s both",
      }}>
        {timeStr} &middot; click anywhere to dismiss
      </div>
    </div>
  );
}
