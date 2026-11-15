"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { PauseIcon, PlayIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from "@heroicons/react/24/solid";

function fmt(t: number) {
  const s = Math.max(0, Math.floor(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const ctl =
  "flex size-11 shrink-0 items-center justify-center rounded-full text-fg transition-colors duration-[var(--dur)] hover:bg-fg/10 focus-visible:bg-fg/10";

/**
 * Lecteur maison : pas de contrôles natifs. Lecture auto en sourdine (autoplay mobile), tap pour pause,
 * barre de lecture dont le curseur est une lame inclinée (clin d'oeil au logo), loader barber pole.
 */
export function VideoPlayer({
  src,
  poster,
  durationHint,
  muted,
  onMutedChange,
  label,
}: {
  src: string;
  poster: string;
  durationHint: number;
  muted: boolean;
  onMutedChange: (m: boolean) => void;
  label: string;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const scrubbing = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [failed, setFailed] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(durationHint);

  // Lecture automatique à l'apparition (sourdine par défaut : la seule autorisée sans geste).
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    // Les métadonnées peuvent être déjà là avant l'attache des écouteurs.
    if (v.readyState >= 1 && Number.isFinite(v.duration)) setDuration(v.duration);
    // React n'applique pas l'attribut muted à temps : sans cela, le navigateur refuse l'autoplay.
    v.muted = true;
    v.play().catch(() => setPlaying(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (video.current) video.current.muted = muted;
  }, [muted]);

  // Progression fluide (rAF) tant que la vidéo joue.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const v = video.current;
      if (v && !scrubbing.current) setTime(v.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const toggle = useCallback(() => {
    const v = video.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => undefined);
    else v.pause();
  }, []);

  // Raccourcis : espace/k = lecture, m = son. Ignorés si un contrôle a le focus.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("button, a, [role=slider]")) return;
      if (e.key === " " || e.key === "k") {
        e.preventDefault();
        toggle();
      } else if (e.key === "m") onMutedChange(!muted);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, muted, onMutedChange]);

  const seekTo = (clientX: number) => {
    const el = track.current;
    const v = video.current;
    if (!el || !v || !duration) return;
    const r = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    v.currentTime = ratio * duration;
    setTime(ratio * duration);
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    scrubbing.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    seekTo(e.clientX);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => scrubbing.current && seekTo(e.clientX);
  const onUp = () => {
    scrubbing.current = false;
  };
  const onSliderKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const v = video.current;
    if (!v) return;
    const step = e.key === "ArrowRight" ? 2 : e.key === "ArrowLeft" ? -2 : 0;
    if (step) {
      e.preventDefault();
      e.stopPropagation(); // flèches du viewer = changer de slide, ici = avancer dans la vidéo
      v.currentTime = Math.min(duration, Math.max(0, v.currentTime + step));
      setTime(v.currentTime);
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      v.currentTime = e.key === "Home" ? 0 : duration;
      setTime(v.currentTime);
    }
  };

  const ratio = duration > 0 ? Math.min(1, time / duration) : 0;

  return (
    <div className="relative size-full select-none">
      <video
        ref={video}
        src={src}
        poster={poster}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        aria-label={label}
        className="size-full object-contain"
        onClick={toggle}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onWaiting={() => setBuffering(true)}
        onCanPlay={() => setBuffering(false)}
        onPlaying={() => setBuffering(false)}
        onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
        onError={() => {
          setFailed(true);
          setBuffering(false);
        }}
      />

      {/* Loader barber pole : seul détail tricolore de l'écran, uniquement pendant le chargement. */}
      {buffering && !failed ? (
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="pole h-2 w-16" />
        </div>
      ) : null}

      {failed ? (
        <p role="status" className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 text-center text-[15px] text-fg-muted">
          Cette vidéo n&apos;a pas pu être chargée.
        </p>
      ) : null}

      {/* Grand repère de pause, discret. */}
      {!playing && !buffering && !failed ? (
        <button
          type="button"
          onClick={toggle}
          aria-label="Lecture"
          className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-bg/70 text-fg backdrop-blur-sm"
        >
          <PlayIcon className="size-7 translate-x-0.5" />
        </button>
      ) : null}

      {/* Barre de contrôle : fond plein sombre en bas du cadre, lisible sur n'importe quelle image. */}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-bg/80 px-2 py-1 backdrop-blur-sm" onPointerDown={(e) => e.stopPropagation()}>
        <button type="button" onClick={toggle} aria-label={playing ? "Pause" : "Lecture"} className={ctl}>
          {playing ? <PauseIcon className="size-5" /> : <PlayIcon className="size-5" />}
        </button>

        <div
          ref={track}
          role="slider"
          tabIndex={0}
          aria-label="Position dans la vidéo"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(time)}
          aria-valuetext={`${fmt(time)} sur ${fmt(duration)}`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onKeyDown={onSliderKey}
          className="group relative mx-2 flex h-11 flex-1 cursor-pointer touch-none items-center"
        >
          <div className="h-0.5 w-full bg-fg/25">
            <div className="h-full bg-fg" style={{ width: `${ratio * 100}%` }} />
          </div>
          {/* Curseur en lame : trait incliné comme la diagonale du logo. */}
          <span
            aria-hidden
            className="absolute top-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 rotate-[20deg] bg-fg transition-transform duration-150 group-hover:scale-y-125 group-focus-visible:scale-y-125"
            style={{ left: `${ratio * 100}%` }}
          />
        </div>

        <span className="min-w-[4.5rem] text-right text-[13px] tabular-nums text-fg-muted" aria-hidden>
          {fmt(time)} / {fmt(duration)}
        </span>

        <button type="button" onClick={() => onMutedChange(!muted)} aria-label={muted ? "Activer le son" : "Couper le son"} aria-pressed={!muted} className={ctl}>
          {muted ? <SpeakerXMarkIcon className="size-5" /> : <SpeakerWaveIcon className="size-5" />}
        </button>
      </div>
    </div>
  );
}
