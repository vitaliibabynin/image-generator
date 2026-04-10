"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import {
  Aperture,
  ArrowsClockwise,
  CaretDown,
  Check,
  CircleNotch,
  DownloadSimple,
  Heart,
  Image as ImageIcon,
  Moon,
  ShareNetwork,
  Sparkle,
  Sun,
  X,
} from "@phosphor-icons/react";
import {
  DEFAULT_MODEL_ID,
  MODEL_CATALOG,
  firstI2IModel,
  getModel,
  modelSupportsI2I,
  type ModelConfig,
} from "@/lib/models";

type Theme = "light" | "dark";
type Mode = "text" | "image";
type AspectRatio = "1:1" | "3:2" | "16:9";

interface ReferenceImage {
  url: string;
  name: string;
  size: number;
}

interface GenerationResult {
  imageUrl: string;
  width: number;
  height: number;
  seed?: number;
  model: string;
  durationMs: number;
  prompt: string;
  mode: Mode;
  createdAt: number;
}

const HISTORY_KEY = "aperture-history";
const THEME_KEY = "aperture-theme";
const MODEL_KEY = "aperture-model";
const HISTORY_LIMIT = 12;

const ASPECT_OPTIONS: AspectRatio[] = ["1:1", "3:2", "16:9"];

export default function Home() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mode, setMode] = useState<Mode>("text");
  const [modelId, setModelId] = useState<string>(DEFAULT_MODEL_ID);
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("3:2");
  const [steps, setSteps] = useState(4);
  const [guidance, setGuidance] = useState(3.5);
  const [strength, setStrength] = useState(0.85);
  const [reference, setReference] = useState<ReferenceImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [history, setHistory] = useState<GenerationResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Hydrate theme + history + model
  useEffect(() => {
    const savedTheme = (localStorage.getItem(THEME_KEY) as Theme | null) ?? "light";
    setTheme(savedTheme);
    document.documentElement.dataset.theme = savedTheme;
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw) as GenerationResult[]);
    } catch {}
    const savedModel = localStorage.getItem(MODEL_KEY);
    if (savedModel && MODEL_CATALOG.some((m) => m.id === savedModel)) {
      setModelId(savedModel);
    }
  }, []);

  const selectedModel = useMemo(() => getModel(modelId), [modelId]);

  const applyModel = useCallback((id: string) => {
    setModelId(id);
    try {
      localStorage.setItem(MODEL_KEY, id);
    } catch {}
  }, []);

  const applyTheme = useCallback((next: Theme) => {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
  }, []);

  const saveHistory = useCallback((next: GenerationResult[]) => {
    setHistory(next);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  // Auto-switch mode when reference is attached/removed
  useEffect(() => {
    if (reference && mode !== "image") setMode("image");
    if (!reference && mode === "image") setMode("text");
  }, [reference, mode]);

  // If reference is attached but the current model can't do i2i, jump to one that can
  useEffect(() => {
    if (reference && !modelSupportsI2I(selectedModel)) {
      applyModel(firstI2IModel().id);
    }
  }, [reference, selectedModel, applyModel]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  }, [prompt]);

  const handleUpload = useCallback(async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Upload failed");
      }
      const data = (await res.json()) as ReferenceImage;
      setReference(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, []);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleUpload(file);
    e.target.value = "";
  };

  const canGenerate = prompt.trim().length > 0 && !generating && !uploading;

  const runGenerate = useCallback(async () => {
    if (!canGenerate) return;
    setError(null);
    setGenerating(true);
    setLiked(false);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          imageUrl: reference?.url,
          modelId,
          aspectRatio,
          steps,
          guidance,
          strength,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Generation failed");
      }
      const data = (await res.json()) as Omit<
        GenerationResult,
        "prompt" | "mode" | "createdAt"
      >;
      const next: GenerationResult = {
        ...data,
        prompt: prompt.trim(),
        mode: reference ? "image" : "text",
        createdAt: Date.now(),
      };
      setResult(next);
      saveHistory([next, ...history].slice(0, HISTORY_LIMIT));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }, [
    canGenerate,
    prompt,
    reference,
    modelId,
    aspectRatio,
    steps,
    guidance,
    strength,
    history,
    saveHistory,
  ]);

  const onPromptKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void runGenerate();
    }
  };

  const discard = () => {
    setPrompt("");
    setResult(null);
    setReference(null);
    setError(null);
    setLiked(false);
  };

  const shareCurrent = async () => {
    if (!result?.imageUrl) return;
    try {
      await navigator.clipboard.writeText(result.imageUrl);
      setError("Image URL copied to clipboard");
      setTimeout(() => setError(null), 1500);
    } catch {}
  };

  const downloadCurrent = async () => {
    if (!result?.imageUrl) return;
    try {
      const res = await fetch(result.imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aperture-${result.seed ?? Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Download failed");
    }
  };

  const resetSettings = () => {
    setAspectRatio("3:2");
    setSteps(4);
    setGuidance(3.5);
    setStrength(0.85);
  };

  const eyebrow = useMemo(() => {
    if (generating) return "Rendering…";
    if (result) return "Rendered composition";
    return "Untitled composition";
  }, [generating, result]);

  return (
    <div className="flex min-h-screen flex-col bg-surface-primary text-fg-primary font-sans">
      <TopNav theme={theme} onToggleTheme={() => applyTheme(theme === "light" ? "dark" : "light")} />

      <main className="flex flex-col gap-6 px-5 pb-10 pt-2 md:px-10 md:pb-10 md:pt-2">
        <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-6 lg:flex-row">
          {/* LEFT COLUMN */}
          <section className="flex min-w-0 flex-1 flex-col gap-5">
            <HeaderRow
              eyebrow={eyebrow}
              onDiscard={discard}
              onShare={shareCurrent}
              disabled={!result}
            />

            <OutputTile
              generating={generating}
              result={result}
              prompt={prompt}
              aspectRatio={aspectRatio}
              liked={liked}
              onLike={() => setLiked((v) => !v)}
              onDownload={downloadCurrent}
              onRegenerate={() => void runGenerate()}
            />

            <Composer
              mode={mode}
              onModeChange={(next) => {
                if (next === "image" && !reference) {
                  fileInputRef.current?.click();
                } else {
                  setMode(next);
                }
              }}
              prompt={prompt}
              onPromptChange={setPrompt}
              onPromptKeyDown={onPromptKeyDown}
              textareaRef={textareaRef}
              onAttachClick={() => fileInputRef.current?.click()}
              onEnhance={() => {
                if (!prompt.trim()) return;
                setPrompt((p) =>
                  p.trim() +
                  (p.trim().endsWith(".") ? " " : ", ") +
                  "cinematic lighting, 35mm analog grain, high detail",
                );
              }}
              canGenerate={canGenerate}
              generating={generating}
              onGenerate={() => void runGenerate()}
              hasReference={Boolean(reference)}
            />
          </section>

          {/* RIGHT COLUMN */}
          <aside className="flex w-full flex-col gap-5 lg:w-[380px] lg:shrink-0">
            <RefTile
              reference={reference}
              uploading={uploading}
              strength={strength}
              onStrengthChange={setStrength}
              onAttachClick={() => fileInputRef.current?.click()}
              onRemove={() => setReference(null)}
            />

            <SettingsCard
              selectedModel={selectedModel}
              onModelChange={applyModel}
              referenceAttached={Boolean(reference)}
              aspectRatio={aspectRatio}
              onAspectChange={setAspectRatio}
              steps={steps}
              onStepsChange={setSteps}
              guidance={guidance}
              onGuidanceChange={setGuidance}
              onReset={resetSettings}
            />

            <HistoryCard
              history={history}
              onSelect={(item) => {
                setResult(item);
                setPrompt(item.prompt);
              }}
            />
          </aside>
        </div>

        {error && (
          <div className="mx-auto w-full max-w-[1360px] rounded-full border border-border-app bg-raised px-5 py-3 text-center font-mono text-xs text-fg-secondary">
            {error}
          </div>
        )}
      </main>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onFileChange}
      />
    </div>
  );
}

/* ---------------------------- Sub‑components ---------------------------- */

function TopNav({
  theme,
  onToggleTheme,
}: {
  theme: Theme;
  onToggleTheme: () => void;
}) {
  return (
    <nav className="flex h-[72px] items-center justify-between bg-surface-primary px-5 md:px-10">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-surface-inverse">
          <Aperture size={18} weight="regular" className="text-fg-inverse" />
        </div>
        <span
          className="text-[17px] font-semibold tracking-[-0.3px] text-fg-primary"
          style={{ fontFamily: "var(--font-geist-sans)" }}
        >
          Aperture
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleTheme}
          className="flex items-center gap-0 rounded-full bg-surface-secondary p-[3px]"
          aria-label="Toggle theme"
        >
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
              theme === "light" ? "bg-raised" : ""
            }`}
          >
            <Sun
              size={14}
              weight={theme === "light" ? "fill" : "regular"}
              className={theme === "light" ? "text-fg-primary" : "text-fg-muted"}
            />
          </span>
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
              theme === "dark" ? "bg-raised" : ""
            }`}
          >
            <Moon
              size={14}
              weight={theme === "dark" ? "fill" : "regular"}
              className={theme === "dark" ? "text-fg-primary" : "text-fg-muted"}
            />
          </span>
        </button>
      </div>
    </nav>
  );
}

function HeaderRow({
  eyebrow,
  onDiscard,
  onShare,
  disabled,
}: {
  eyebrow: string;
  onDiscard: () => void;
  onShare: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 px-1 pb-3 pt-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-[6px]">
        <span
          className="inline-flex w-fit items-center rounded-full bg-accent-soft px-[10px] py-1 text-[10px] font-normal uppercase tracking-[0.3px] text-fg-primary"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          {eyebrow}
        </span>
        <h1
          className="max-w-[560px] text-[28px] font-medium leading-[1.15] tracking-[-0.8px] text-fg-primary"
          style={{ fontFamily: "var(--font-geist-sans)" }}
        >
          Frame a scene, then let the model render it.
        </h1>
      </div>
      <div className="flex items-center gap-[10px]">
        <button
          onClick={onDiscard}
          disabled={disabled}
          className="rounded-full bg-surface-secondary px-4 py-[10px] text-xs font-medium text-fg-secondary transition hover:bg-surface-tertiary disabled:opacity-40"
        >
          Discard
        </button>
        <button
          onClick={onShare}
          disabled={disabled}
          className="flex items-center gap-[6px] rounded-full bg-surface-secondary px-4 py-[10px] text-xs font-medium text-fg-secondary transition hover:bg-surface-tertiary disabled:opacity-40"
        >
          <ShareNetwork size={12} weight="regular" />
          Share
        </button>
      </div>
    </div>
  );
}

function OutputTile({
  generating,
  result,
  prompt,
  aspectRatio,
  liked,
  onLike,
  onDownload,
  onRegenerate,
}: {
  generating: boolean;
  result: GenerationResult | null;
  prompt: string;
  aspectRatio: AspectRatio;
  liked: boolean;
  onLike: () => void;
  onDownload: () => void;
  onRegenerate: () => void;
}) {
  const echo = (result?.prompt ?? prompt).trim();
  const canvasImage = result?.imageUrl;

  return (
    <div className="flex flex-col gap-4 overflow-hidden rounded-[20px] bg-surface-secondary p-5">
      <div
        className="relative flex min-h-[320px] flex-col justify-end overflow-hidden rounded-[14px] bg-surface-tertiary p-5 md:min-h-[520px]"
        style={
          canvasImage
            ? {
                backgroundImage: `url(${canvasImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        {!canvasImage && !generating && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-primary/60">
              <Aperture size={22} weight="regular" className="text-fg-muted" />
            </div>
            <p
              className="max-w-[320px] text-xs text-fg-muted"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              your render will appear here · aspect {aspectRatio}
            </p>
          </div>
        )}

        {generating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-tertiary/70 backdrop-blur-sm">
            <CircleNotch
              size={28}
              weight="bold"
              className="animate-spin text-accent"
            />
            <p
              className="text-[11px] text-fg-secondary"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              rendering…
            </p>
          </div>
        )}

        {echo && (
          <div className="relative z-10 flex w-fit items-center gap-[10px] rounded-full bg-[#1A1A1Acc] px-[14px] py-[10px] text-[#F3EBE2]">
            <span className="h-[6px] w-[6px] rounded-full bg-accent" />
            <span
              className="line-clamp-1 max-w-[460px] text-[11px]"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              {echo}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-[6px] py-1">
        <div
          className="flex items-center gap-[18px] text-[10px] text-fg-muted"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          <Meta label="seed" value={result?.seed?.toString() ?? "—"} />
          <Meta
            label="size"
            value={
              result
                ? `${result.width}×${result.height}`
                : aspectRatio === "1:1"
                ? "1024×1024"
                : aspectRatio === "3:2"
                ? "1536×1024"
                : "1920×1080"
            }
          />
          <Meta
            label="took"
            value={
              result ? `${(result.durationMs / 1000).toFixed(1)}s` : "—"
            }
          />
        </div>
        <div className="flex items-center gap-2">
          <IconButton onClick={onLike} disabled={!result} aria-label="Like">
            <Heart
              size={14}
              weight={liked ? "fill" : "regular"}
              className={liked ? "text-accent" : "text-fg-secondary"}
            />
          </IconButton>
          <IconButton onClick={onDownload} disabled={!result} aria-label="Download">
            <DownloadSimple size={14} weight="regular" className="text-fg-secondary" />
          </IconButton>
          <IconButton
            onClick={onRegenerate}
            disabled={!result || generating}
            aria-label="Regenerate"
          >
            <ArrowsClockwise size={14} weight="regular" className="text-fg-secondary" />
          </IconButton>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-[6px]">
      <span className="text-fg-muted">{label}</span>
      <span className="font-medium text-fg-primary">{value}</span>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  disabled,
  ...rest
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-tertiary transition hover:bg-border-app disabled:opacity-40"
      {...rest}
    >
      {children}
    </button>
  );
}

function Composer({
  mode,
  onModeChange,
  prompt,
  onPromptChange,
  onPromptKeyDown,
  textareaRef,
  onAttachClick,
  onEnhance,
  canGenerate,
  generating,
  onGenerate,
  hasReference,
}: {
  mode: Mode;
  onModeChange: (m: Mode) => void;
  prompt: string;
  onPromptChange: (v: string) => void;
  onPromptKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onAttachClick: () => void;
  onEnhance: () => void;
  canGenerate: boolean;
  generating: boolean;
  onGenerate: () => void;
  hasReference: boolean;
}) {
  return (
    <div className="flex flex-col gap-[18px] rounded-[20px] bg-raised p-6 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-[10px]">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <span
            className="text-xs font-semibold tracking-[0.2px] text-fg-primary"
            style={{ fontFamily: "var(--font-geist-sans)" }}
          >
            Prompt
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-surface-primary p-1">
          <ModeBtn
            active={mode === "text"}
            onClick={() => onModeChange("text")}
          >
            Text → Image
          </ModeBtn>
          <ModeBtn
            active={mode === "image"}
            onClick={() => onModeChange("image")}
          >
            Image → Image
          </ModeBtn>
        </div>
      </div>

      <div className="relative flex min-h-[80px] py-1">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={onPromptKeyDown}
          placeholder="A lone cyclist crossing a wet neon-lit boulevard at dusk — heavy rain, cinematic long-lens shot, muted teal highlights, analog film grain."
          rows={3}
          className="aperture-scroll w-full resize-none bg-transparent text-[15px] leading-[1.5] text-fg-primary outline-none placeholder:text-fg-subtle"
          style={{ fontFamily: "var(--font-geist-sans)" }}
        />
        {!prompt && (
          <span
            className="aperture-caret pointer-events-none absolute left-0 top-[4px] text-[15px] text-accent"
            aria-hidden
          >
            |
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          <Chip onClick={onAttachClick}>
            <ImageIcon size={12} weight="regular" />
            {hasReference ? "Replace reference" : "Attach reference"}
          </Chip>
          <Chip onClick={onEnhance}>
            <Sparkle size={12} weight="regular" />
            Enhance prompt
          </Chip>
        </div>
        <button
          onClick={onGenerate}
          disabled={!canGenerate}
          className="group flex items-center gap-2 rounded-full bg-surface-inverse px-[22px] py-3 text-[13px] font-semibold text-fg-inverse transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {generating ? (
            <>
              <CircleNotch size={13} weight="bold" className="animate-spin" />
              Rendering
            </>
          ) : (
            <>
              Render
              <span
                className="rounded-[10px] bg-fg-secondary px-[6px] py-[2px] text-[10px] text-fg-inverse"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                ⌘↵
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function ModeBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-[6px] text-[11px] font-medium transition ${
        active
          ? "bg-surface-inverse text-fg-inverse"
          : "text-fg-muted hover:text-fg-secondary"
      }`}
    >
      {children}
    </button>
  );
}

function Chip({
  onClick,
  children,
}: {
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-[6px] rounded-full bg-surface-primary px-3 py-2 text-[11px] font-medium text-fg-secondary transition hover:bg-surface-secondary"
    >
      {children}
    </button>
  );
}

function RefTile({
  reference,
  uploading,
  strength,
  onStrengthChange,
  onAttachClick,
  onRemove,
}: {
  reference: ReferenceImage | null;
  uploading: boolean;
  strength: number;
  onStrengthChange: (v: number) => void;
  onAttachClick: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-[20px] bg-surface-secondary p-5">
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-semibold tracking-[0.2px] text-fg-primary"
          style={{ fontFamily: "var(--font-geist-sans)" }}
        >
          Reference image
        </span>
        <span
          className="rounded-full bg-accent-soft px-2 py-[3px] text-[9px] font-normal"
          style={{ fontFamily: "var(--font-geist-mono)", color: "#7A4B33" }}
        >
          i2i
        </span>
      </div>

      {reference ? (
        <div className="flex gap-3">
          <div
            className="relative h-[104px] w-[104px] shrink-0 overflow-hidden rounded-[14px] bg-surface-tertiary"
            style={{
              backgroundImage: `url(${reference.url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <button
              onClick={onRemove}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#1A1A1Acc] text-[#F3EBE2] transition hover:bg-[#1A1A1A]"
              aria-label="Remove reference"
            >
              <X size={10} weight="bold" />
            </button>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2 py-1">
            <div
              className="truncate text-[11px] font-medium text-fg-primary"
              style={{ fontFamily: "var(--font-geist-mono)" }}
              title={reference.name}
            >
              {reference.name}
            </div>
            <div
              className="text-[10px] text-fg-muted"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              {formatBytes(reference.size)}
            </div>
            <div className="flex flex-col gap-[6px] pt-[6px]">
              <div className="flex items-center justify-between">
                <span
                  className="text-[10px] text-fg-muted"
                  style={{ fontFamily: "var(--font-geist-mono)" }}
                >
                  strength
                </span>
                <span
                  className="text-[10px] font-semibold text-fg-primary"
                  style={{ fontFamily: "var(--font-geist-mono)" }}
                >
                  {strength.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                className="aperture-range"
                min={0}
                max={1}
                step={0.01}
                value={strength}
                onChange={(e) => onStrengthChange(Number(e.target.value))}
                style={
                  {
                    "--range-progress": `${strength * 100}%`,
                  } as React.CSSProperties
                }
              />
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={onAttachClick}
          className="flex flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-border-app bg-surface-primary/40 px-4 py-6 text-[11px] text-fg-muted transition hover:bg-surface-primary/70"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          {uploading ? (
            <>
              <CircleNotch size={16} weight="bold" className="animate-spin text-accent" />
              uploading…
            </>
          ) : (
            <>
              <ImageIcon size={16} weight="regular" />
              drop or click to attach
            </>
          )}
        </button>
      )}
    </div>
  );
}

function SettingsCard({
  selectedModel,
  onModelChange,
  referenceAttached,
  aspectRatio,
  onAspectChange,
  steps,
  onStepsChange,
  guidance,
  onGuidanceChange,
  onReset,
}: {
  selectedModel: ModelConfig;
  onModelChange: (id: string) => void;
  referenceAttached: boolean;
  aspectRatio: AspectRatio;
  onAspectChange: (a: AspectRatio) => void;
  steps: number;
  onStepsChange: (n: number) => void;
  guidance: number;
  onGuidanceChange: (n: number) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!dropdownRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const features = selectedModel.features;
  const showKnobs =
    features.aspectRatio || features.steps !== null || features.guidance;

  return (
    <div className="flex flex-col gap-1 rounded-[20px] bg-surface-secondary p-5">
      <div className="flex items-center justify-between pb-3">
        <span
          className="text-xs font-semibold tracking-[0.2px] text-fg-primary"
          style={{ fontFamily: "var(--font-geist-sans)" }}
        >
          Generation
        </span>
        <button
          onClick={onReset}
          className="text-[10px] text-fg-muted transition hover:text-fg-primary"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          reset
        </button>
      </div>

      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between py-3 text-left transition"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <div className="flex flex-col gap-[2px]">
            <span
              className="text-[11px] font-medium text-fg-secondary"
              style={{ fontFamily: "var(--font-geist-sans)" }}
            >
              Model
            </span>
            <span
              className="text-[10px] text-fg-muted"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              {selectedModel.label} · {selectedModel.tagline}
            </span>
          </div>
          <CaretDown
            size={12}
            className={`text-fg-secondary transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
        {open && (
          <div
            role="listbox"
            className="absolute left-0 right-0 top-full z-20 mt-2 flex flex-col gap-[2px] rounded-[14px] border border-border-app bg-raised p-2 shadow-[0_12px_32px_rgba(0,0,0,0.18)]"
          >
            {MODEL_CATALOG.map((m) => {
              const disabled = referenceAttached && !modelSupportsI2I(m);
              const active = m.id === selectedModel.id;
              return (
                <button
                  key={m.id}
                  role="option"
                  aria-selected={active}
                  disabled={disabled}
                  onClick={() => {
                    onModelChange(m.id);
                    setOpen(false);
                  }}
                  className={`flex items-center justify-between gap-3 rounded-[10px] px-3 py-2 text-left transition ${
                    active
                      ? "bg-surface-inverse text-fg-inverse"
                      : "text-fg-primary hover:bg-surface-tertiary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                  }`}
                >
                  <div className="flex min-w-0 flex-col gap-[2px]">
                    <span
                      className="truncate text-[11px] font-medium"
                      style={{ fontFamily: "var(--font-geist-sans)" }}
                    >
                      {m.label}
                    </span>
                    <span
                      className={`truncate text-[10px] ${
                        active ? "text-fg-inverse/70" : "text-fg-muted"
                      }`}
                      style={{ fontFamily: "var(--font-geist-mono)" }}
                    >
                      {m.tagline}
                      {disabled ? " · no i2i" : ""}
                    </span>
                  </div>
                  {active && (
                    <Check
                      size={12}
                      weight="bold"
                      className="shrink-0 text-fg-inverse"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {showKnobs && <Divider />}

      {features.aspectRatio && (
        <>
          <Row>
            <span
              className="text-[11px] font-medium text-fg-secondary"
              style={{ fontFamily: "var(--font-geist-sans)" }}
            >
              Aspect ratio
            </span>
            <div className="flex gap-1 rounded-full bg-surface-tertiary p-[3px]">
              {ASPECT_OPTIONS.map((a) => {
                const active = aspectRatio === a;
                return (
                  <button
                    key={a}
                    onClick={() => onAspectChange(a)}
                    className={`rounded-full px-[10px] py-1 text-[10px] transition ${
                      active
                        ? "bg-surface-inverse font-semibold text-fg-inverse"
                        : "text-fg-muted hover:text-fg-secondary"
                    }`}
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </Row>
          {(features.steps || features.guidance) && <Divider />}
        </>
      )}

      {features.steps && (
        <>
          <SliderRow
            label="Steps"
            value={Math.min(
              Math.max(steps, features.steps.min),
              features.steps.max,
            )}
            min={features.steps.min}
            max={features.steps.max}
            step={1}
            display={Math.min(
              Math.max(steps, features.steps.min),
              features.steps.max,
            ).toString()}
            onChange={onStepsChange}
          />
          {features.guidance && <Divider />}
        </>
      )}

      {features.guidance && (
        <SliderRow
          label="Guidance"
          value={guidance}
          min={0}
          max={20}
          step={0.1}
          display={guidance.toFixed(1)}
          onChange={onGuidanceChange}
        />
      )}

      {!showKnobs && (
        <div
          className="px-1 pb-2 pt-1 text-[10px] leading-[1.55] text-fg-muted"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          this model is prompt-only · no extra knobs to tune
        </div>
      )}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3">{children}</div>
  );
}

function Divider() {
  return <div className="h-px w-full bg-border-app" />;
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (n: number) => void;
}) {
  const progress = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex items-center justify-between">
        <span
          className="text-[11px] font-medium text-fg-secondary"
          style={{ fontFamily: "var(--font-geist-sans)" }}
        >
          {label}
        </span>
        <span
          className="text-[11px] font-semibold text-fg-primary"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          {display}
        </span>
      </div>
      <input
        type="range"
        className="aperture-range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ "--range-progress": `${progress}%` } as React.CSSProperties}
      />
    </div>
  );
}

function HistoryCard({
  history,
  onSelect,
}: {
  history: GenerationResult[];
  onSelect: (g: GenerationResult) => void;
}) {
  const todayCount = useMemo(() => {
    const now = new Date();
    return history.filter((h) => {
      const d = new Date(h.createdAt);
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    }).length;
  }, [history]);

  return (
    <div className="flex flex-col gap-4 rounded-[20px] bg-surface-inverse p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-[6px] w-[6px] rounded-full bg-accent" />
          <span
            className="text-xs font-semibold tracking-[0.2px] text-fg-inverse"
            style={{ fontFamily: "var(--font-geist-sans)" }}
          >
            Recent renders
          </span>
        </div>
        <span
          className="text-[10px] text-fg-muted"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          {history.length > 3 ? "see all" : ""}
        </span>
      </div>

      {history.length === 0 ? (
        <div
          className="rounded-[14px] bg-surface-primary/10 p-6 text-center text-[10px] text-fg-muted"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          no renders yet
        </div>
      ) : (
        <div className="flex flex-col gap-[10px]">
          {history.slice(0, 3).map((h) => (
            <button
              key={h.createdAt}
              onClick={() => onSelect(h)}
              className="h-24 w-full overflow-hidden rounded-[14px] bg-surface-tertiary transition hover:opacity-90"
              style={{
                backgroundImage: `url(${h.imageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
              aria-label={h.prompt}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between px-1 pt-1">
        <span
          className="text-[10px] text-fg-muted"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          {todayCount} render{todayCount === 1 ? "" : "s"} today
        </span>
        <div className="flex items-center gap-[6px]">
          <span className="h-[5px] w-[5px] rounded-full bg-[#6ad18d]" />
          <span
            className="text-[10px] text-fg-muted"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            synced
          </span>
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
