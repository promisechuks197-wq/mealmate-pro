import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Bell } from "lucide-react";
import { toast } from "sonner";

const PRESETS = [3, 5, 10, 15, 20, 30];

function beep() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sine"; o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.4);
    o.start();
    o.stop(ctx.currentTime + 1.5);
    setTimeout(() => ctx.close(), 1800);
  } catch {}
}

export function CookTimer({ totalMinutes, dishName }: { totalMinutes: number; dishName: string }) {
  const [duration, setDuration] = useState(5 * 60);
  const [remaining, setRemaining] = useState(5 * 60);
  const [running, setRunning] = useState(false);
  const [elapsedTotal, setElapsedTotal] = useState(0);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    tickRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(tickRef.current!);
          setRunning(false);
          beep();
          toast.success(`Step complete! Move to next step ✅`, {
            description: `Your ${dishName} is ready for the next step! 🍛`,
          });
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("Step complete ✅", { body: `Your ${dishName} is ready for the next step!` });
          }
          return 0;
        }
        return r - 1;
      });
      setElapsedTotal((e) => Math.min(totalMinutes * 60, e + 1));
    }, 1000);
    return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
  }, [running, dishName, totalMinutes]);

  const setMinutes = (m: number) => {
    setDuration(m * 60);
    setRemaining(m * 60);
    setRunning(false);
  };

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const progress = duration ? ((duration - remaining) / duration) * 100 : 0;
  const totalProgress = totalMinutes ? Math.min(100, (elapsedTotal / (totalMinutes * 60)) * 100) : 0;

  const askReminder = async () => {
    if (typeof Notification === "undefined") {
      toast.error("Notifications not supported on this device");
      return;
    }
    let perm = Notification.permission;
    if (perm === "default") perm = await Notification.requestPermission();
    if (perm !== "granted") {
      toast.error("Enable notifications to set a reminder");
      return;
    }
    const now = new Date();
    const target = new Date();
    target.setHours(18, 0, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const ms = target.getTime() - now.getTime();
    window.setTimeout(() => {
      new Notification("Time to cook! 🍳", { body: `Don't forget your ${dishName} tonight.` });
    }, ms);
    toast.success(`Reminder set for ${target.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
  };

  return (
    <div className="rounded-3xl bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Cook timer</div>
          <div className="font-serif text-3xl tabular-nums mt-0.5">{mm}:{ss}</div>
        </div>
        <div className="flex items-center gap-2">
          {running ? (
            <button onClick={() => setRunning(false)} className="size-12 rounded-full bg-amber-500 text-white grid place-items-center shadow-md active:scale-95">
              <Pause className="size-5" />
            </button>
          ) : (
            <button onClick={() => { if (remaining === 0) setRemaining(duration); setRunning(true); }} className="size-12 rounded-full bg-[#008751] text-white grid place-items-center shadow-md active:scale-95">
              <Play className="size-5" />
            </button>
          )}
          <button onClick={() => { setRunning(false); setRemaining(duration); }} className="size-10 rounded-full bg-muted grid place-items-center" aria-label="Reset">
            <RotateCcw className="size-4" />
          </button>
        </div>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-[#FF6A00] transition-[width] duration-500" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {PRESETS.map((m) => (
          <button
            key={m}
            onClick={() => setMinutes(m)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              duration === m * 60
                ? "bg-[#008751] text-white border-[#008751]"
                : "bg-background border-border text-foreground hover:border-[#FF6A00]"
            }`}
          >
            {m} min
          </button>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-border">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Total cook progress</span>
          <span className="tabular-nums font-medium">{Math.floor(elapsedTotal / 60)} / {totalMinutes} min</span>
        </div>
        <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#008751] to-[#FF6A00] transition-[width] duration-500" style={{ width: `${totalProgress}%` }} />
        </div>
      </div>
      <button onClick={askReminder} className="mt-4 w-full py-2.5 rounded-2xl bg-[#FF6A00]/10 text-[#FF6A00] text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-[#FF6A00]/15">
        <Bell className="size-4" /> Remind me to cook tonight
      </button>
    </div>
  );
}