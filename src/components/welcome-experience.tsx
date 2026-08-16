"use client";

import * as React from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { pickWelcomeBackMessage } from "@/lib/welcome-messages";
import { completeWelcomeAction } from "@/app/(app)/welcome-actions";
import { ProductTour } from "@/components/product-tour";

const PARTICLE_COUNT = 18;

type Particle = {
  angle: number;
  distance: number;
  size: number;
  delay: number;
  fromBrand: boolean;
};

function createParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    angle: (360 / PARTICLE_COUNT) * i + (Math.random() * 12 - 6),
    distance: 90 + Math.random() * 90,
    size: 4 + Math.random() * 5,
    delay: Math.random() * 50,
    fromBrand: i % 2 === 0,
  }));
}

function Particles({ particles }: { particles: Particle[] }) {
  return (
    <>
      {particles.map((p, i) => (
        <span
          key={i}
          aria-hidden
          className="animate-particle-burst pointer-events-none absolute top-1/2 left-1/2 rounded-full"
          style={
            {
              width: p.size,
              height: p.size,
              backgroundColor: p.fromBrand ? "var(--brand-from)" : "var(--brand-to)",
              animationDelay: `${p.delay}ms`,
              "--angle": `${p.angle}deg`,
              "--distance": `${p.distance}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </>
  );
}

/**
 * Mounted once per app session (from AppShell, which persists across
 * client-side navigation). New users see a full-screen welcome overlay with
 * a particle-burst click animation; returning users just get a "welcome
 * back" toast with a message that varies each visit.
 */
export function WelcomeExperience({
  isNewUser,
  userName,
  ready,
}: {
  isNewUser: boolean;
  userName?: string | null;
  ready: boolean;
}) {
  const [open, setOpen] = React.useState(isNewUser);
  const [launching, setLaunching] = React.useState(false);
  const [particles, setParticles] = React.useState<Particle[] | null>(null);
  const [showTour, setShowTour] = React.useState(false);
  const hasGreeted = React.useRef(false);
  const firstName = userName?.split(" ")[0];

  React.useEffect(() => {
    if (!ready || isNewUser || hasGreeted.current) return;
    hasGreeted.current = true;
    toast(firstName ? `Welcome back, ${firstName}!` : "Welcome back!", {
      description: pickWelcomeBackMessage(),
      duration: 5000,
    });
  }, [ready, isNewUser, firstName]);

  function handleStart() {
    if (launching) return;
    setParticles(createParticles());
    setLaunching(true);
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(
      () => {
        setOpen(false);
        setShowTour(true);
        void completeWelcomeAction();
      },
      reduceMotion ? 150 : 650
    );
  }

  if (showTour) {
    return <ProductTour onFinish={() => setShowTour(false)} />;
  }

  if (!open || !ready) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-drift absolute -top-32 left-1/4 size-96 rounded-full bg-brand-gradient opacity-20 blur-3xl" />
        <div className="animate-drift absolute top-1/3 -right-32 size-96 rounded-full bg-brand-gradient opacity-15 blur-3xl [animation-delay:3s]" />
      </div>

      <div
        className={cn(
          "animate-fade-in-up relative flex w-full max-w-md flex-col items-center gap-5 rounded-2xl border border-border bg-card p-10 text-center shadow-xl",
          launching && "animate-welcome-exit"
        )}
      >
        <BrandMark className="size-14 text-2xl" />
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Welcome to Basis{firstName ? `, ${firstName}` : ""}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Let&apos;s turn your trade history into a clear picture of how you actually trade.
          </p>
        </div>
        <div className="relative">
          {launching && particles && <Particles particles={particles} />}
          <Button
            size="lg"
            className="border-glow relative"
            onClick={handleStart}
            disabled={launching}
          >
            Let&apos;s go
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
