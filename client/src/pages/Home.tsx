import { AIChatBox, type Message } from "@/components/AIChatBox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  BookOpen,
  Bot,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleDot,
  Clock3,
  Compass,
  Layers3,
  Lightbulb,
  ListTree,
  Menu,
  MoreHorizontal,
  Orbit,
  Route,
  Sparkles,
  Target,
  TimerReset,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";

type Level = "Beginner" | "Intermediate" | "Advanced";
type Format = "Guided course" | "Hands-on course" | "Project" | "Self-paced";
type Status = "planned" | "in_progress" | "completed" | "skipped" | "deferred";
type Rating =
  | "too_easy"
  | "just_right"
  | "too_difficult"
  | "not_relevant"
  | "prefer_hands_on";
type RoadmapItem = {
  id: string;
  title: string;
  type: "course" | "project";
  description: string;
  skills: string[];
  level: Level;
  durationHours: number;
  format: string;
  prerequisites: string[];
  catalogFact: string;
  sequence: number;
  reason: string;
  status: Status;
  milestone: string;
};
type Roadmap = {
  goalLabel: string;
  targetSkills: string[];
  skillGaps: string[];
  totalHours: number;
  rationale: string;
  items: RoadmapItem[];
};

const navigation = [
  ["overview", "Overview", Compass],
  ["roadmap", "My path", Route],
  ["skills", "Skills", BrainCircuit],
  ["profile", "Profile", UserRound],
  ["assistant", "Assistant", Bot],
] as const;

const formatOptions: Format[] = [
  "Guided course",
  "Hands-on course",
  "Project",
  "Self-paced",
];
const levelOptions: Level[] = ["Beginner", "Intermediate", "Advanced"];
const trajectoryLabels = [
  "Profile",
  "Align",
  "Build",
  "Practice",
  "Evidence",
  "Advance",
];

function Stat({
  label,
  value,
  detail,
  accent = "lime",
}: {
  label: string;
  value: string;
  detail: string;
  accent?: "lime" | "amber" | "blue";
}) {
  const color =
    accent === "amber"
      ? "text-amber-300"
      : accent === "blue"
        ? "text-sky-300"
        : "text-lime-300";
  return (
    <div className="glass-panel rounded-2xl p-4 three-d-card">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={cn("mt-2 text-2xl font-bold tracking-tight", color)}>
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </div>
  );
}

export default function Home() {
  const [activeView, setActiveView] =
    useState<(typeof navigation)[number][0]>("overview");
  const [goal, setGoal] = useState(
    "I want to become a job-ready data analyst in 12 weeks. I know Excel and can study six hours each week. I learn best by doing projects."
  );
  const [currentLevel, setCurrentLevel] = useState<Level>("Beginner");
  const [knownSkills, setKnownSkills] = useState("Excel");
  const [timelineWeeks, setTimelineWeeks] = useState(12);
  const [weeklyHours, setWeeklyHours] = useState(6);
  const [formats, setFormats] = useState<Format[]>([
    "Hands-on course",
    "Project",
  ]);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [adaptationNote, setAdaptationNote] = useState(
    "Your path will explain every sequence decision."
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  const profile = useMemo(
    () => ({
      goal,
      currentLevel,
      knownSkills: knownSkills
        .split(",")
        .map(skill => skill.trim())
        .filter(Boolean),
      timelineWeeks,
      weeklyHours,
      preferredFormats: formats,
    }),
    [goal, currentLevel, knownSkills, timelineWeeks, weeklyHours, formats]
  );
  const extractProfile = trpc.learning.extractProfile.useMutation({
    onSuccess: ({ profile: extracted }) => {
      setCurrentLevel(extracted.currentLevel);
      setKnownSkills(extracted.knownSkills.join(", "));
      setTimelineWeeks(extracted.timelineWeeks);
      setWeeklyHours(extracted.weeklyHours);
      setFormats(extracted.preferredFormats);
    },
  });
  const explainPath = trpc.learning.explainRoadmap.useMutation({
    onSuccess: ({ explanation }) => setAdaptationNote(explanation.summary),
  });
  const generatePath = trpc.learning.buildRoadmap.useMutation({
    onSuccess: data => {
      setRoadmap(data);
      setAdaptationNote(data.rationale);
      explainPath.mutate({ profile, items: data.items });
      setActiveView("roadmap");
    },
  });
  const adaptPath = trpc.learning.adaptRoadmap.useMutation({
    onSuccess: data => {
      setRoadmap(current =>
        current ? { ...current, items: data.items } : current
      );
      setAdaptationNote(data.note);
    },
  });
  const chat = trpc.learning.chat.useMutation({
    onSuccess: ({ answer }) =>
      setMessages(current => [
        ...current,
        { role: "assistant", content: answer },
      ]),
    onError: () =>
      setMessages(current => [
        ...current,
        {
          role: "assistant",
          content:
            "I could not reach the assistant right now. Your current roadmap still contains the next grounded recommendation.",
        },
      ]),
  });

  const completion = roadmap
    ? Math.round(
        (roadmap.items.filter(item => item.status === "completed").length /
          roadmap.items.length) *
          100
      )
    : 0;
  const nextItem =
    roadmap?.items.find(
      item => item.status === "planned" || item.status === "in_progress"
    ) ?? roadmap?.items[0];
  const doneItems =
    roadmap?.items.filter(item => item.status === "completed").length ?? 0;

  function toggleFormat(format: Format) {
    setFormats(current =>
      current.includes(format)
        ? current.filter(item => item !== format)
        : [...current, format]
    );
  }
  function createRoadmap() {
    generatePath.mutate(profile);
  }
  function applyAction(item: RoadmapItem, status: Status, rating?: Rating) {
    if (!roadmap) return;
    adaptPath.mutate({ items: roadmap.items, itemId: item.id, status, rating });
  }
  function sendMessage(content: string) {
    if (!roadmap) {
      setMessages(current => [
        ...current,
        { role: "user", content },
        {
          role: "assistant",
          content:
            "Create a roadmap first so I can ground my answer in your actual catalog items.",
        },
      ]);
      return;
    }
    setMessages(current => [...current, { role: "user", content }]);
    chat.mutate({ question: content, profile, items: roadmap.items });
  }

  const renderOverview = () => (
    <div className="space-y-6">
      <section className="hero-3d-shell three-d-stage overflow-hidden rounded-[1.75rem] glass-panel relative p-6 sm:p-8">
        <div className="absolute inset-0 mesh-grid opacity-60" />
        <div className="relative grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
          <div>
            <Badge className="border border-lime-300/25 bg-lime-300/10 text-lime-200 hover:bg-lime-300/10">
              Grounded learning intelligence
            </Badge>
            <h1 className="mt-4 max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              Turn intention into a{" "}
              <span className="text-lime-300">credible path.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">
              Pathwise combines your goal, time, strengths, and the uploaded
              80-course catalog to create a prerequisite-aware learning sequence
              you can inspect and adapt.
            </p>
            <div className="path-facts mt-5 flex flex-wrap gap-2" aria-label="Pathwise learning-path guarantees">
              <span><Check className="size-3" /> Gap-aware</span>
              <span><Route className="size-3" /> Prerequisite-safe</span>
              <span><Lightbulb className="size-3" /> Explainable</span>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                onClick={() => setActiveView("profile")}
                className="energy-button bg-lime-300 text-slate-950 hover:bg-lime-200"
              >
                Build my path <ChevronRight className="ml-1 size-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setActiveView("roadmap")}
                className="border-slate-600 bg-slate-900/40 text-slate-100 hover:bg-slate-800"
              >
                Explore roadmap
              </Button>
            </div>
          </div>
          <div className="path-constellation relative mx-auto h-52 w-52 sm:h-60 sm:w-60" aria-hidden="true">
            <div className="constellation-glow absolute inset-0 rounded-full" />
            <div className="orbit orbit--wide absolute inset-1 rounded-full border border-lime-300/30" />
            <div className="orbit orbit--tilted absolute inset-8 rounded-full border border-sky-300/30" />
            <div className="orbit orbit--inner absolute inset-[3.4rem] rounded-full border border-amber-300/35" />
            <div className="orbital-core absolute inset-[31%] rounded-2xl" />
            <div className="path-node path-node--one absolute left-5 top-10" />
            <div className="path-node path-node--two absolute right-8 top-6" />
            <div className="path-node path-node--three absolute bottom-5 left-10" />
            <div className="orbital-caption absolute bottom-1 right-1 rounded-lg px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-lime-100">Path logic</div>
          </div>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 three-d-stage">
        <Stat
          label="Path completion"
          value={`${completion}%`}
          detail={
            roadmap
              ? `${doneItems} of ${roadmap.items.length} milestones complete`
              : "Create a path to start"
          }
        />
        <Stat
          label="Current focus"
          value={nextItem ? `#${nextItem.sequence}` : "—"}
          detail={nextItem?.title ?? "Your next course will appear here"}
          accent="amber"
        />
        <Stat
          label="Weekly capacity"
          value={`${weeklyHours}h`}
          detail={`Over ${timelineWeeks} weeks`}
          accent="blue"
        />
        <Stat
          label="Catalog coverage"
          value="80"
          detail="Normalized courses, fact-grounded"
        />
      </section>
      <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="glass-panel trajectory-hologram rounded-2xl p-5 three-d-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">
                Learning trajectory
              </p>
              <p className="mt-1 text-xs text-slate-400">
                A transparent sequence that honors prerequisites.
              </p>
            </div>
            <BarChart3 className="size-5 text-lime-300" />
          </div>
          <div className="trajectory-rail mt-8 grid grid-cols-6 gap-1.5 sm:gap-3">
            {trajectoryLabels.map((label, index) => {
              const item = roadmap?.items[index];
              const isComplete = item?.status === "completed";
              const isCurrent = index === 0 && !isComplete;
              return (
                <div className="relative min-w-0" key={label}>
                  {index < trajectoryLabels.length - 1 && <div className="trajectory-link absolute left-1/2 right-[-55%] top-4" />}
                  <div className={cn("trajectory-stop mx-auto", isComplete && "trajectory-stop--complete", isCurrent && "trajectory-stop--current")} style={{ animationDelay: `${index * 100}ms` }}>
                    {isComplete ? <Check className="size-3.5" /> : <span>{index + 1}</span>}
                  </div>
                  <p className="mt-3 truncate text-center text-[10px] font-semibold tracking-wide text-slate-400">{item?.milestone ?? label}</p>
                  <p className="mt-1 hidden truncate text-center text-[9px] text-slate-600 sm:block">{item?.title ?? (index === 0 ? "Define objective" : "Awaiting path")}</p>
                </div>
              );
            })}
          </div>
          <div className="trajectory-insight mt-6 rounded-xl border border-lime-200/10 bg-lime-200/5 p-3 text-xs leading-5 text-lime-100">
            <Lightbulb className="mr-2 inline size-4 text-lime-300" />
            {adaptationNote}
          </div>
        </div>
        <div className="glass-panel rounded-2xl p-5 three-d-card">
          <div className="flex items-center gap-2">
            <Target className="size-5 text-amber-300" />
            <p className="text-sm font-bold text-white">Next best action</p>
          </div>
          {nextItem ? (
            <>
              <p className="mt-5 text-lg font-bold text-slate-100">
                {nextItem.title}
              </p>
              <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-400">
                {nextItem.reason}
              </p>
              <Button
                onClick={() => applyAction(nextItem, "in_progress")}
                className="energy-button mt-5 w-full bg-amber-300 text-slate-950 hover:bg-amber-200"
              >
                Start this step
              </Button>
            </>
          ) : (
            <>
              <p className="mt-5 text-sm text-slate-400">
                We need a learner profile before the next action can be
                selected.
              </p>
              <Button
                onClick={() => setActiveView("profile")}
                className="energy-button mt-5 w-full bg-lime-300 text-slate-950"
              >
                Set up profile
              </Button>
            </>
          )}
        </div>
      </section>
    </div>
  );

  const renderProfile = () => (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="glass-panel rounded-2xl p-5 sm:p-7 three-d-card">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-lime-300/10 p-2">
            <Sparkles className="size-5 text-lime-300" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">
              Describe your destination
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Use your own words first. The profile remains fully editable.
            </p>
          </div>
        </div>
        <label className="mt-6 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          Natural-language goal
        </label>
        <Textarea
          value={goal}
          onChange={event => setGoal(event.target.value)}
          className="mt-2 min-h-32 border-slate-600 bg-slate-950/45 text-slate-100 placeholder:text-slate-500 focus-visible:ring-lime-300"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            disabled={extractProfile.isPending}
            onClick={() => extractProfile.mutate({ goal })}
            variant="outline"
            className="border-lime-300/35 bg-lime-300/5 text-lime-100 hover:bg-lime-300/10"
          >
            {extractProfile.isPending
              ? "Analyzing profile…"
              : "AI-assisted profile extraction"}
          </Button>
          <span className="self-center text-xs text-slate-500">
            Validated server-side; a safe editable fallback is used if
            unavailable.
          </span>
        </div>
        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Current level
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {levelOptions.map(level => (
                <button
                  key={level}
                  onClick={() => setCurrentLevel(level)}
                  className={cn(
                    "rounded-xl border px-2 py-2 text-xs transition",
                    currentLevel === level
                      ? "border-lime-300 bg-lime-300 text-slate-950"
                      : "border-slate-700 bg-slate-950/30 text-slate-300 hover:border-slate-500"
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Known skills
            </label>
            <Input
              value={knownSkills}
              onChange={event => setKnownSkills(event.target.value)}
              className="mt-2 border-slate-600 bg-slate-950/45 text-slate-100"
              placeholder="e.g. Excel, Python"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Target timeline
            </label>
            <div className="mt-2 flex items-center gap-2">
              <Input
                min={2}
                max={104}
                type="number"
                value={timelineWeeks}
                onChange={event => setTimelineWeeks(Number(event.target.value))}
                className="border-slate-600 bg-slate-950/45 text-slate-100"
              />
              <span className="text-xs text-slate-400">weeks</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Weekly availability
            </label>
            <div className="mt-2 flex items-center gap-2">
              <Input
                min={1}
                max={40}
                type="number"
                value={weeklyHours}
                onChange={event => setWeeklyHours(Number(event.target.value))}
                className="border-slate-600 bg-slate-950/45 text-slate-100"
              />
              <span className="text-xs text-slate-400">hours</span>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Preferred formats
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {formatOptions.map(format => (
              <button
                key={format}
                onClick={() => toggleFormat(format)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition",
                  formats.includes(format)
                    ? "border-amber-300 bg-amber-300/15 text-amber-100"
                    : "border-slate-700 text-slate-400 hover:border-slate-500"
                )}
              >
                {formats.includes(format) && (
                  <Check className="mr-1 inline size-3" />
                )}
                {format}
              </button>
            ))}
          </div>
        </div>
        <Button
          disabled={generatePath.isPending || formats.length === 0}
          onClick={createRoadmap}
          className="energy-button mt-7 w-full bg-lime-300 text-slate-950 hover:bg-lime-200"
        >
          {generatePath.isPending
            ? "Creating your pathway…"
            : "Generate my grounded roadmap"}
          <ChevronRight className="ml-1 size-4" />
        </Button>
      </section>
      <aside className="space-y-5">
        <div className="glass-panel rounded-2xl p-5 three-d-card">
          <div className="flex gap-3">
            <Layers3 className="mt-0.5 size-5 text-lime-300" />
            <div>
              <p className="font-bold text-white">
                Why Pathwise is explainable
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Every item is scored against your skill gaps, level, time
                budget, preferred format, and prerequisite dependencies. Course
                claims come only from the normalized catalog.
              </p>
            </div>
          </div>
        </div>
        <div className="glass-panel rounded-2xl p-5 three-d-card">
          <p className="font-bold text-white">Your input snapshot</p>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Starting point</span>
              <span className="text-slate-200">{currentLevel}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Time capacity</span>
              <span className="text-slate-200">
                {weeklyHours * timelineWeeks}h total
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Learning mode</span>
              <span className="max-w-40 text-right text-slate-200">
                {formats.join(", ")}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );

  const renderRoadmap = () => (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge className="border border-amber-300/25 bg-amber-300/10 text-amber-100 hover:bg-amber-300/10">
            Prerequisite-aware sequence
          </Badge>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white">
            Your adaptive pathway
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            {roadmap?.rationale ??
              "Generate your profile-based roadmap to view sequenced, catalog-grounded steps."}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setActiveView("profile")}
          className="border-slate-600 bg-slate-900/40 text-slate-200"
        >
          Refine profile
        </Button>
      </section>
      {!roadmap ? (
        <div className="glass-panel rounded-2xl p-10 text-center three-d-card">
          <Route className="mx-auto size-10 text-lime-300" />
          <h3 className="mt-4 text-xl font-bold text-white">
            Your roadmap is waiting
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            Tell us where you are going and what time you have. The
            deterministic engine will build an explainable sequence from the
            catalog.
          </p>
          <Button
            onClick={() => setActiveView("profile")}
            className="energy-button mt-6 bg-lime-300 text-slate-950"
          >
            Create roadmap
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Stat
              label="Target capability"
              value={roadmap.goalLabel}
              detail={`${roadmap.skillGaps.length} active skill gaps`}
            />
            <Stat
              label="Estimated effort"
              value={`${roadmap.totalHours}h`}
              detail={`${weeklyHours} hours each week`}
              accent="amber"
            />
            <Stat
              label="Milestones"
              value={`${roadmap.items.length}`}
              detail="Courses and applied proof"
              accent="blue"
            />
          </div>
          <div className="space-y-4 three-d-stage">
            {roadmap.items.map((item, index) => (
              <article
                key={item.id}
                className={cn(
                  "glass-panel roadmap-card rounded-2xl p-5 three-d-card",
                  item.status === "completed" && "border-lime-300/35"
                )}
              >
                <div className="flex gap-4">
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl border font-mono text-sm font-bold",
                      item.status === "completed"
                        ? "border-lime-300/50 bg-lime-300 text-slate-950"
                        : "border-slate-600 bg-slate-900 text-slate-300"
                    )}
                  >
                    {item.status === "completed" ? (
                      <Check className="size-5" />
                    ) : (
                      item.sequence
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-white">{item.title}</h3>
                          <Badge
                            variant="outline"
                            className="border-slate-600 text-slate-300"
                          >
                            {item.level}
                          </Badge>
                          <Badge className="border-0 bg-slate-700/60 text-slate-300 hover:bg-slate-700/60">
                            {item.milestone}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          {item.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock3 className="size-3.5" />
                        {item.durationHours}h
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
                      <div className="rounded-xl border border-lime-300/10 bg-lime-300/5 p-3 text-xs leading-5 text-lime-100">
                        <Lightbulb className="mr-1 inline size-3.5 text-lime-300" />
                        <strong>Why this now:</strong> {item.reason}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {item.status !== "completed" && (
                          <Button
                            size="sm"
                            onClick={() => applyAction(item, "completed")}
                            className="energy-button bg-lime-300 text-slate-950 hover:bg-lime-200"
                          >
                            Complete
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => applyAction(item, "deferred")}
                          className="border-slate-600 bg-slate-900/40 text-slate-200"
                        >
                          Defer
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            applyAction(item, "planned", "just_right")
                          }
                          className="text-lime-200 hover:bg-lime-300/10 hover:text-lime-100"
                        >
                          Just right
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            applyAction(item, "planned", "too_easy")
                          }
                          className="text-sky-200 hover:bg-sky-300/10 hover:text-sky-100"
                        >
                          Too easy
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            applyAction(item, "planned", "too_difficult")
                          }
                          className="text-amber-200 hover:bg-amber-300/10 hover:text-amber-100"
                        >
                          Too difficult
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            applyAction(item, "skipped", "not_relevant")
                          }
                          className="text-rose-200 hover:bg-rose-300/10 hover:text-rose-100"
                        >
                          Not relevant
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => applyAction(item, "skipped")}
                          className="text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                        >
                          Skip
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            applyAction(item, "skipped", "prefer_hands_on")
                          }
                          className="text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                        >
                          Prefer hands-on
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.skills.map(skill => (
                        <span
                          key={skill}
                          className="rounded-full bg-sky-300/8 px-2 py-1 text-[11px] text-sky-200"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                    {index < roadmap.items.length - 1 && (
                      <div className="mt-5 h-6 border-l border-dashed border-slate-600/70 ml-5" />
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );

  const renderSkills = () => (
    <div className="space-y-6">
      <section>
        <Badge className="border border-sky-300/25 bg-sky-300/10 text-sky-100 hover:bg-sky-300/10">
          Gap-aware skills map
        </Badge>
        <h2 className="mt-3 text-3xl font-extrabold text-white">
          Build the capabilities that matter
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Skills are matched to your stated target. They become complete through
          roadmap actions, not through claims alone.
        </p>
      </section>
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="glass-panel rounded-2xl p-6 three-d-card">
          <div className="progress-orb mx-auto flex size-52 items-center justify-center rounded-full border-[18px] border-slate-700 [box-shadow:inset_0_0_38px_rgba(0,0,0,.28)]">
            <div className="text-center">
              <p className="text-4xl font-extrabold text-lime-300">
                {completion}%
              </p>
              <p className="mt-1 text-xs text-slate-400">path progress</p>
            </div>
          </div>
          <p className="mt-6 text-center text-sm leading-6 text-slate-400">
            The progress ring updates from completed roadmap milestones. Skill
            confidence is visible only when supported by an action.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            roadmap?.targetSkills ?? [
              "Python",
              "SQL",
              "Data Analysis",
              "Visualization",
              "Statistics",
              "Communication",
            ]
          ).map((skill, index) => {
            const isGap = roadmap?.skillGaps.includes(skill) ?? true;
            const level = isGap ? Math.max(12, completion - index * 4) : 72;
            return (
              <div
                key={skill}
                className="glass-panel rounded-2xl p-4 three-d-card"
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-100">{skill}</p>
                  <CircleDot
                    className={cn(
                      "size-4",
                      isGap ? "text-amber-300" : "text-lime-300"
                    )}
                  />
                </div>
                <Progress
                  value={level}
                  className="mt-4 h-2 bg-slate-700 [&>div]:bg-lime-300"
                />
                <p className="mt-2 text-xs text-slate-400">
                  {isGap
                    ? "Active gap — prioritized in your path"
                    : "Known skill — used as a foundation"}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderAssistant = () => (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.75fr]">
      <section>
        <div className="mb-4">
          <Badge className="border border-lime-300/25 bg-lime-300/10 text-lime-100 hover:bg-lime-300/10">
            Catalog-grounded assistant
          </Badge>
          <h2 className="mt-3 text-3xl font-extrabold text-white">
            Ask about your pathway
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            The assistant is constrained to the current pathway and catalog
            facts. It will not invent course details.
          </p>
        </div>
        <AIChatBox
          messages={messages}
          onSendMessage={sendMessage}
          isLoading={chat.isPending}
          height="560px"
          className="border-slate-600 bg-slate-950/30"
          placeholder="Ask why an item is next, or what you should focus on…"
          emptyStateMessage="Ask Pathwise about your current roadmap"
          suggestedPrompts={[
            "Why is my next item scheduled now?",
            "Which skill gap should I prioritize?",
            "How does this path fit my weekly time?",
          ]}
        />
      </section>
      <aside className="space-y-5">
        <div className="glass-panel rounded-2xl p-5 three-d-card">
          <div className="flex items-center gap-2">
            <Orbit className="size-5 text-lime-300" />
            <p className="font-bold text-white">Grounding controls</p>
          </div>
          <ul className="mt-4 space-y-3 text-sm leading-5 text-slate-400">
            <li>
              Course names, technical descriptions, and prerequisites come from
              the normalized catalog.
            </li>
            <li>
              Path ordering comes from deterministic scores and dependency
              checks.
            </li>
            <li>
              LLM wording is validated by a server-side fallback when
              unavailable or ungrounded.
            </li>
          </ul>
        </div>
        <div className="glass-panel rounded-2xl p-5 three-d-card">
          <p className="font-bold text-white">Current context</p>
          <p className="mt-3 text-sm text-slate-400">
            {roadmap
              ? `${roadmap.items.length} selected path items • ${roadmap.skillGaps.length} active gaps • ${currentLevel} start`
              : "No roadmap yet. Create one to give the assistant a grounded context."}
          </p>
        </div>
      </aside>
    </div>
  );

  const page =
    activeView === "overview"
      ? renderOverview()
      : activeView === "profile"
        ? renderProfile()
        : activeView === "roadmap"
          ? renderRoadmap()
          : activeView === "skills"
            ? renderSkills()
            : renderAssistant();
  return (
    <div className="min-h-screen text-slate-100 mesh-grid">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r border-white/5 bg-[#101a31]/90 px-4 py-6 backdrop-blur-xl transition-transform md:!translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center gap-3 px-2">
          <div className="brand-emblem grid size-10 place-items-center rounded-xl bg-lime-300 text-slate-950 shadow-[0_0_32px_rgba(163,230,53,.25)]">
            <span className="brand-route brand-route--one" />
            <span className="brand-route brand-route--two" />
            <span className="brand-route brand-route--three" />
          </div>
          <div>
            <p className="brand-wordmark font-extrabold tracking-tight text-white">Pathwise</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-lime-300">
              Learning intelligence
            </p>
          </div>
        </div>
        <div className="mt-7 rounded-xl border border-lime-300/15 bg-lime-300/[0.045] p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-lime-100">
            <Route className="size-4 text-lime-300" />
            Credible path engine
          </div>
          <div className="mt-3 flex items-center">
            <span className="size-2 rounded-full bg-lime-300" />
            <span className="h-px flex-1 bg-lime-300/35" />
            <span className="size-2 rounded-full border border-amber-300 bg-[#101a31]" />
            <span className="h-px flex-1 bg-slate-600" />
            <span className="size-2 rounded-full border border-slate-500 bg-[#101a31]" />
          </div>
          <p className="mt-2 text-[10px] leading-4 text-slate-400">
            Goals → prerequisites → applied proof
          </p>
        </div>
        <nav className="mt-7 space-y-1">
          {navigation.map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => {
                setActiveView(id);
                setMobileOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition",
                activeView === id
                  ? "bg-lime-300 text-slate-950 shadow-[0_10px_30px_rgba(163,230,53,.16)]"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-6 left-4 right-4 rounded-xl border border-white/6 bg-white/[0.035] p-3">
          <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
            Path reliability
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="size-2 rounded-full bg-lime-300 shadow-[0_0_13px_rgba(163,230,53,.9)]" />
            <span className="text-xs text-slate-300">
              Deterministic + grounded
            </span>
          </div>
        </div>
      </aside>
      <div className="md:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/5 bg-[#101a31]/70 px-4 backdrop-blur-xl sm:px-7">
          <button
            onClick={() => setMobileOpen(open => !open)}
            className="rounded-lg p-2 text-slate-300 hover:bg-white/5 md:hidden"
          >
            <Menu className="size-5" />
          </button>
          <div className="hidden items-center gap-2 text-xs text-slate-400 sm:flex">
            <TimerReset className="size-4 text-lime-300" />
            Adaptive path updates in real time
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-bold text-slate-200">Demo learner</p>
              <p className="text-[11px] text-slate-500">Workspace mode</p>
            </div>
            <div className="grid size-8 place-items-center rounded-full border border-lime-300/30 bg-lime-300/10 text-xs font-bold text-lime-200">
              DL
            </div>
            <Button
              onClick={() => setActiveView("profile")}
              size="sm"
              className="energy-button bg-lime-300 text-slate-950 hover:bg-lime-200"
            >
              New path
            </Button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-7">{page}</main>
      </div>
    </div>
  );
}
