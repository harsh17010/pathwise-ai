import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { discoveryPrompts, isReadyToConfirm, nextDiscoveryStep, normalizeGuidedProfile, profileSummary, type GuidedFormat, type GuidedLevel, type GuidedProfile } from "@/lib/guidedDiscovery";
import { ArrowRight, Check, ChevronLeft, CircleCheckBig, MessageCircleQuestion, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

const formats: GuidedFormat[] = ["Guided course", "Hands-on course", "Project", "Self-paced"];
const levels: GuidedLevel[] = ["Beginner", "Intermediate", "Advanced"];
const weeklyOptions = [3, 6, 10, 15];
const timelineOptions = [6, 12, 16, 24];

type Props = {
  initialProfile: GuidedProfile;
  onConfirm: (profile: GuidedProfile) => void;
  isCreating?: boolean;
};

export function GuidedPathDiscovery({ initialProfile, onConfirm, isCreating }: Props) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<GuidedProfile>(initialProfile);
  const [skillsInput, setSkillsInput] = useState(initialProfile.knownSkills.join(", "));
  const isConfirmation = step === discoveryPrompts.length;
  const canAdvance = profile.goal.trim().length >= 8;
  const summary = useMemo(() => profileSummary(profile), [profile]);

  const next = () => {
    setStep(current => nextDiscoveryStep(current, profile.goal));
  };
  const confirm = () => {
    onConfirm(normalizeGuidedProfile({
      ...profile,
      knownSkills: skillsInput.split(","),
    }));
  };
  const toggleFormat = (format: GuidedFormat) => {
    setProfile(current => ({
      ...current,
      preferredFormats: current.preferredFormats.includes(format)
        ? current.preferredFormats.filter(item => item !== format)
        : [...current.preferredFormats, format],
    }));
  };

  return (
    <section className="guided-discovery glass-panel rounded-2xl p-5 three-d-card">
      <div className="flex items-start gap-3">
        <div className="guided-discovery__avatar grid size-10 shrink-0 place-items-center rounded-xl">
          <MessageCircleQuestion className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-lime-300">Guided path interview</p>
          <h3 className="mt-1 text-lg font-extrabold text-white">Let’s make the route fit your reality.</h3>
          <p className="mt-1 text-xs leading-5 text-slate-400">Pathwise asks five short questions, confirms your choices, then creates the sequence.</p>
        </div>
      </div>

      <div className="guided-progress mt-5 flex gap-1.5" aria-label={`Question ${Math.min(step + 1, discoveryPrompts.length)} of ${discoveryPrompts.length}`}>
        {discoveryPrompts.map((_, index) => <span key={index} className={cn(index <= step && "is-active")} />)}
      </div>

      {isConfirmation ? (
        <div className="guided-confirmation mt-5">
          <div className="flex items-center gap-2 text-lime-200"><CircleCheckBig className="size-5" /><span className="text-sm font-bold">Confirm your learning brief</span></div>
          <p className="mt-3 text-sm leading-6 text-slate-300">{profile.goal}</p>
          <div className="mt-4 rounded-xl border border-lime-300/15 bg-lime-300/[0.06] p-3">
            <p className="text-xs text-lime-100">{summary}</p>
            {skillsInput.trim() && <p className="mt-2 text-xs text-slate-400">Starting skills: {skillsInput}</p>}
          </div>
          <div className="mt-5 flex gap-2">
            <Button variant="outline" onClick={() => setStep(discoveryPrompts.length - 1)} className="border-slate-600 bg-slate-950/30 text-slate-200"><ChevronLeft className="mr-1 size-4" /> Edit</Button>
            <Button disabled={isCreating || !isReadyToConfirm(profile)} onClick={confirm} className="energy-button flex-1 bg-lime-300 text-slate-950 hover:bg-lime-200">
              {isCreating ? "Creating your route…" : "Confirm & create route"}<ArrowRight className="ml-1 size-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <div className="guided-question rounded-xl border border-white/8 bg-slate-950/30 p-4">
            <div className="flex gap-2 text-slate-100"><Sparkles className="mt-0.5 size-4 shrink-0 text-amber-300" /><p className="text-sm font-bold">{discoveryPrompts[step]}</p></div>
            {step === 0 && <Textarea value={profile.goal} onChange={event => setProfile(current => ({ ...current, goal: event.target.value }))} className="mt-3 min-h-28 border-slate-600 bg-slate-950/55 text-slate-100" placeholder="For example: I want to move into a data analyst role in three months." />}
            {step === 1 && <><div className="mt-3 grid grid-cols-3 gap-2">{levels.map(level => <button key={level} onClick={() => setProfile(current => ({ ...current, currentLevel: level }))} className={cn("guided-choice", profile.currentLevel === level && "is-selected")}>{profile.currentLevel === level && <Check className="size-3" />}{level}</button>)}</div><Input value={skillsInput} onChange={event => setSkillsInput(event.target.value)} className="mt-3 border-slate-600 bg-slate-950/55 text-slate-100" placeholder="Known skills, comma separated (optional)" /></>}
            {step === 2 && <div className="mt-3 grid grid-cols-4 gap-2">{weeklyOptions.map(hours => <button key={hours} onClick={() => setProfile(current => ({ ...current, weeklyHours: hours }))} className={cn("guided-choice", profile.weeklyHours === hours && "is-selected")}>{hours}h</button>)}</div>}
            {step === 3 && <div className="mt-3 grid grid-cols-4 gap-2">{timelineOptions.map(weeks => <button key={weeks} onClick={() => setProfile(current => ({ ...current, timelineWeeks: weeks }))} className={cn("guided-choice", profile.timelineWeeks === weeks && "is-selected")}>{weeks}w</button>)}</div>}
            {step === 4 && <div className="mt-3 flex flex-wrap gap-2">{formats.map(format => <button key={format} onClick={() => toggleFormat(format)} className={cn("guided-choice", profile.preferredFormats.includes(format) && "is-selected")}>{profile.preferredFormats.includes(format) && <Check className="size-3" />}{format}</button>)}</div>}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep(current => Math.max(0, current - 1))} className="text-slate-400 hover:bg-white/5 hover:text-white"><ChevronLeft className="mr-1 size-4" /> Back</Button>
            <Button onClick={next} disabled={step === 0 && !canAdvance} className="energy-button bg-lime-300 text-slate-950 hover:bg-lime-200">{step === discoveryPrompts.length - 1 ? "Review choices" : "Continue"}<ArrowRight className="ml-1 size-4" /></Button>
          </div>
        </div>
      )}
    </section>
  );
}
