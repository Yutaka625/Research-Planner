"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  emptyResearchPlanInput,
  fieldDefinitions,
  getInputSuggestionGroups,
  type FieldDefinition,
  type ResearchPlanInput,
  type SuggestionGroup,
  validateResearchPlanInput,
} from "@/lib/researchPlan";

type AppStep = "home" | "form" | "confirm" | "result";
type RuntimeStatus = {
  provider: string;
  model: string;
  apiKeyConfigured: boolean;
};
type StructuredFieldState = Partial<Record<keyof ResearchPlanInput, string[]>>;
type SupplementalNoteState = Partial<Record<keyof ResearchPlanInput, string>>;

const guardrailText =
  "この画面は、ご相談内容を整理し、心sensorの使い方を一緒に考えるためのものです。心sensorは感情を決めつけるものではなく、表情の変化から反応の傾向を見やすくするために使います。診断や評価の断定には使いません。";

const stepLabels = [
  { id: "home", label: "はじめに" },
  { id: "form", label: "内容の整理" },
  { id: "confirm", label: "確認" },
  { id: "result", label: "まとめ" },
] satisfies Array<{ id: AppStep; label: string }>;

function composeFieldValue(selectedValues: string[], supplementalNote: string) {
  const parts = [];

  if (selectedValues.length > 0) {
    parts.push(selectedValues.join("、"));
  }

  if (supplementalNote.trim()) {
    parts.push(`補足: ${supplementalNote.trim()}`);
  }

  return parts.join("\n");
}

export function ResearchPlanner() {
  const [step, setStep] = useState<AppStep>("home");
  const [form, setForm] = useState<ResearchPlanInput>(emptyResearchPlanInput);
  const [markdown, setMarkdown] = useState("");
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showManualCopy, setShowManualCopy] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<StructuredFieldState>(
    {},
  );
  const [supplementalNotes, setSupplementalNotes] =
    useState<SupplementalNoteState>({});
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus | null>(
    null,
  );

  const missingFields = useMemo(() => validateResearchPlanInput(form), [form]);
  const canConfirm = missingFields.length === 0;
  const answeredQuestionCount = fieldDefinitions.filter((field) =>
    form[field.name]?.trim(),
  ).length;

  useEffect(() => {
    let isMounted = true;

    async function loadRuntimeStatus() {
      try {
        const response = await fetch("/api/generate-plan");
        if (!response.ok) return;
        const data = (await response.json()) as RuntimeStatus;
        if (isMounted) setRuntimeStatus(data);
      } catch {
        if (isMounted) setRuntimeStatus(null);
      }
    }

    loadRuntimeStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  function updateField(name: keyof ResearchPlanInput, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
  }

  function updateStructuredField(
    name: keyof ResearchPlanInput,
    nextSelectedValues: string[],
    nextSupplementalNote: string,
  ) {
    setForm((current) => ({
      ...current,
      [name]: composeFieldValue(nextSelectedValues, nextSupplementalNote),
    }));
    setError("");
  }

  function toggleOption(name: keyof ResearchPlanInput, option: string) {
    setSelectedOptions((current) => {
      const currentValues = current[name] || [];
      const nextValues = currentValues.includes(option)
        ? currentValues.filter((value) => value !== option)
        : [...currentValues, option];
      updateStructuredField(name, nextValues, supplementalNotes[name] || "");

      return { ...current, [name]: nextValues };
    });
  }

  function updateSupplementalNote(
    name: keyof ResearchPlanInput,
    value: string,
  ) {
    setSupplementalNotes((current) => ({ ...current, [name]: value }));
    updateStructuredField(name, selectedOptions[name] || [], value);
  }

  function goToConfirm() {
    if (!canConfirm) {
      setError("必須の項目を入力してください。");
      return;
    }

    setError("");
    setStep("confirm");
  }

  async function generatePlan() {
    setIsGenerating(true);
    setCopied(false);
    setShowManualCopy(false);
    setError("");

    try {
      const response = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form }),
      });
      const data = (await response.json()) as {
        markdown?: string;
        error?: string;
      };

      if (!response.ok || !data.markdown) {
        throw new Error(data.error || "まとめの作成に失敗しました。");
      }

      setMarkdown(data.markdown);
      setStep("result");
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "まとめの作成に失敗しました。",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function copyMarkdown() {
    if (!markdown) return;

    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable.");
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setShowManualCopy(false);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = markdown;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      try {
        const copiedByFallback = document.execCommand("copy");
        if (!copiedByFallback) throw new Error("copy failed.");
        setCopied(true);
        setShowManualCopy(false);
        setError("");
        window.setTimeout(() => setCopied(false), 2200);
      } catch {
        setShowManualCopy(true);
        setError(
          "自動コピーができませんでした。下のテキスト欄を選択してコピーしてください。",
        );
      } finally {
        document.body.removeChild(textarea);
      }
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <Header />
        <Guardrail />

        <section className="grid flex-1 gap-6 py-6 lg:grid-cols-[300px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Flow
              </p>
              <ol className="mt-4 space-y-3">
                {stepLabels.map((item, index) => (
                  <li
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                      item.id === step
                        ? "bg-emerald-50 font-semibold text-emerald-950"
                        : "text-slate-600"
                    }`}
                    key={item.id}
                  >
                    <span
                      className={`flex size-7 items-center justify-center rounded-full text-xs ${
                        item.id === step
                          ? "bg-emerald-700 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {index + 1}
                    </span>
                    {item.label}
                  </li>
                ))}
              </ol>
              <RuntimeStatusCard status={runtimeStatus} />
            </div>
          </aside>

          <div className="min-w-0">
            {step === "home" && (
              <HomeScreen onStart={() => setStep("form")} />
            )}
            {step === "form" && (
              <FormScreen
                answeredQuestionCount={answeredQuestionCount}
                canConfirm={canConfirm}
                currentQuestionIndex={currentQuestionIndex}
                error={error}
                form={form}
                missingFields={missingFields}
                selectedOptions={selectedOptions}
                supplementalNotes={supplementalNotes}
                onChange={updateField}
                onConfirm={goToConfirm}
                onNextQuestion={() =>
                  setCurrentQuestionIndex((index) =>
                    Math.min(index + 1, fieldDefinitions.length - 1),
                  )
                }
                onPreviousQuestion={() =>
                  setCurrentQuestionIndex((index) => Math.max(index - 1, 0))
                }
                onSupplementalNoteChange={updateSupplementalNote}
                onToggleOption={toggleOption}
              />
            )}
            {step === "confirm" && (
              <ConfirmScreen
                error={error}
                form={form}
                isGenerating={isGenerating}
                onBack={() => setStep("form")}
                onGenerate={generatePlan}
              />
            )}
            {step === "result" && (
              <ResultScreen
                copied={copied}
                error={error}
                isGenerating={isGenerating}
                markdown={markdown}
                showManualCopy={showManualCopy}
                onBackToForm={() => setStep("form")}
                onCopy={copyMarkdown}
                onRegenerate={generatePlan}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Header() {
  return (
    <header className="border-b border-slate-200 pb-5">
      <div>
        <p className="text-sm font-semibold text-emerald-800">
          心sensor 活用メモ
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          ご相談内容から、最初の進め方を一緒に整理する
        </h1>
      </div>
    </header>
  );
}

function Guardrail() {
  return (
    <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
      {guardrailText}
    </div>
  );
}

function RuntimeStatusCard({ status }: { status: RuntimeStatus | null }) {
  return (
    <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        接続
      </p>
      <div className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500">利用先</span>
          <span className="font-semibold text-slate-900">
            {status?.provider || "確認中"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500">設定</span>
          <span
            className={`rounded-full px-2 py-1 text-xs font-semibold ${
              status?.apiKeyConfigured
                ? "bg-emerald-100 text-emerald-800"
                : "bg-rose-100 text-rose-800"
            }`}
          >
            {status?.apiKeyConfigured ? "利用できます" : "未設定"}
          </span>
        </div>
      </div>
    </div>
  );
}

function HomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="max-w-3xl">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
          心sensorで見てみたいことを整理する
        </h2>
        <p className="mt-4 text-base leading-7 text-slate-700">
          この画面では、どんな場面を見てみたいか、誰に参加していただくか、まずどのくらいの規模で試すかを整理します。最後に、打ち合わせ後に使える短いまとめを作成します。
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          ["困りごとから始める", "アンケートだけでは見えにくい反応や、説明しづらい点を整理します。"],
          ["見えることを確認する", "表情の変化を、時間の流れに沿って見やすくする使い方を考えます。"],
          ["小さく試す", "5〜10名、2〜3種類の内容、1つの場所など、始めやすい形にします。"],
        ].map(([title, body]) => (
          <div className="rounded-lg border border-slate-200 p-4" key={title}>
            <h3 className="font-semibold text-slate-950">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
          </div>
        ))}
      </div>

      <button
        className="mt-8 rounded-md bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
        onClick={onStart}
        type="button"
      >
        内容を整理する
      </button>
    </div>
  );
}

function FormScreen({
  answeredQuestionCount,
  canConfirm,
  currentQuestionIndex,
  error,
  form,
  missingFields,
  selectedOptions,
  supplementalNotes,
  onChange,
  onConfirm,
  onNextQuestion,
  onPreviousQuestion,
  onSupplementalNoteChange,
  onToggleOption,
}: {
  answeredQuestionCount: number;
  canConfirm: boolean;
  currentQuestionIndex: number;
  error: string;
  form: ResearchPlanInput;
  missingFields: Array<keyof ResearchPlanInput>;
  selectedOptions: StructuredFieldState;
  supplementalNotes: SupplementalNoteState;
  onChange: (name: keyof ResearchPlanInput, value: string) => void;
  onConfirm: () => void;
  onNextQuestion: () => void;
  onPreviousQuestion: () => void;
  onSupplementalNoteChange: (
    name: keyof ResearchPlanInput,
    value: string,
  ) => void;
  onToggleOption: (name: keyof ResearchPlanInput, option: string) => void;
}) {
  const field = fieldDefinitions[currentQuestionIndex];
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === fieldDefinitions.length - 1;
  const currentAnswer = form[field.name] || "";
  const currentQuestionAnswered = Boolean(currentAnswer.trim());
  const progress = Math.round(
    ((currentQuestionIndex + 1) / fieldDefinitions.length) * 100,
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">
              内容の整理
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              1つずつ確認します。近い候補を選び、必要なところだけ補足してください。
            </p>
          </div>
          <div className="text-sm text-slate-500">
            入力済み: {answeredQuestionCount}/{fieldDefinitions.length}
          </div>
        </div>

        <ProgressBar
          current={currentQuestionIndex + 1}
          label={field.label}
          total={fieldDefinitions.length}
          value={progress}
        />
      </div>

      {error && <ErrorMessage message={error} />}

      <div className="mt-6 rounded-lg border border-slate-200 p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-semibold text-white">
            ?
          </div>
          <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-950">
            <p className="font-semibold">
              {currentQuestionIndex + 1}. {field.label}
            </p>
            <p className="mt-1">
              {field.name === "research_theme"
                ? "まず、ご相談内容を自由に入力してください。"
                : "ここまでの内容に近い候補を表示しています。複数選んでも大丈夫です。"}
            </p>
          </div>
        </div>

        <FormField
          definition={field}
          missing={missingFields.includes(field.name)}
          suggestionGroups={getInputSuggestionGroups(
            form.research_theme,
            field.name,
            form,
          )}
          selectedValues={selectedOptions[field.name] || []}
          supplementalNote={supplementalNotes[field.name] || ""}
          value={currentAnswer}
          onChange={(value) => onChange(field.name, value)}
          onSupplementalNoteChange={(value) =>
            onSupplementalNoteChange(field.name, value)
          }
          onToggleOption={(option) => onToggleOption(field.name, option)}
        />

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
            disabled={isFirstQuestion}
            onClick={onPreviousQuestion}
            type="button"
          >
            前へ
          </button>
          {!isLastQuestion ? (
            <button
              className="rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={field.required && !currentQuestionAnswered}
              onClick={onNextQuestion}
              type="button"
            >
              次へ
            </button>
          ) : (
            <button
              className="rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!canConfirm}
              onClick={onConfirm}
              type="button"
            >
              内容を確認する
            </button>
          )}
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          入力内容はこの画面内だけで扱います。保存はされません。
        </p>
        <button
          className="rounded-md border border-emerald-700 px-5 py-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
          disabled={!canConfirm}
          onClick={onConfirm}
          type="button"
        >
          内容を確認する
        </button>
      </div>
    </div>
  );
}

function ProgressBar({
  current,
  label,
  total,
  value,
}: {
  current: number;
  label: string;
  total: number;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-slate-800">
          {current}/{total}: {label}
        </span>
        <span className="text-slate-500">{value}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-emerald-700 transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function FormField({
  definition,
  missing,
  onChange,
  onSupplementalNoteChange,
  onToggleOption,
  selectedValues,
  suggestionGroups,
  supplementalNote,
  value,
}: {
  definition: FieldDefinition;
  missing: boolean;
  onChange: (value: string) => void;
  onSupplementalNoteChange: (value: string) => void;
  onToggleOption: (option: string) => void;
  selectedValues: string[];
  suggestionGroups: SuggestionGroup[];
  supplementalNote: string;
  value: string;
}) {
  const commonClassName =
    "mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";
  const visibleOptions = new Set(
    suggestionGroups.flatMap((group) => group.options),
  );
  const selectedOutsideGroups = selectedValues.filter(
    (option) => !visibleOptions.has(option),
  );
  const groupedOptions =
    selectedOutsideGroups.length > 0
      ? [
          { label: "選択中", options: selectedOutsideGroups },
          ...suggestionGroups,
        ]
      : suggestionGroups;

  return (
    <div className="block">
      <span className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-900">
        {definition.label}
        {definition.required && (
          <span className="text-xs font-medium text-rose-600">必須</span>
        )}
      </span>

      {definition.name === "research_theme" && (
        <textarea
          className={`${commonClassName} min-h-24 resize-y`}
          onChange={(event) => onChange(event.target.value)}
          placeholder={definition.placeholder}
          value={value}
        />
      )}

      {definition.name !== "research_theme" && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-500">
            候補から選んでください（複数選択できます）
          </p>
          {groupedOptions.length > 0 ? (
            <div className="mt-3 space-y-4">
              {groupedOptions.map((group) => (
                <div key={group.label}>
                  <p className="text-xs font-semibold text-slate-700">
                    {group.label}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {group.options.map((option) => {
                      const selected = selectedValues.includes(option);

                      return (
                        <button
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                            selected
                              ? "border-emerald-700 bg-emerald-700 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900"
                          }`}
                          key={option}
                          onClick={() => onToggleOption(option)}
                          type="button"
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              ご相談内容を入力すると候補が表示されます。
            </p>
          )}

          <label className="mt-4 block">
            <span className="text-xs font-semibold text-slate-500">補足</span>
            <textarea
              className={`${commonClassName} min-h-20 resize-y bg-white`}
              onChange={(event) =>
                onSupplementalNoteChange(event.target.value)
              }
              placeholder="候補だけでは足りないことがあれば入力してください"
              value={supplementalNote}
            />
          </label>
        </div>
      )}

      {missing && (
        <span className="mt-1 block text-xs text-rose-600">
          この項目は入力が必要です。
        </span>
      )}
    </div>
  );
}

function ConfirmScreen({
  error,
  form,
  isGenerating,
  onBack,
  onGenerate,
}: {
  error: string;
  form: ResearchPlanInput;
  isGenerating: boolean;
  onBack: () => void;
  onGenerate: () => void;
}) {
  const enteredFields = fieldDefinitions.filter(
    (field) => form[field.name]?.trim(),
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <h2 className="text-2xl font-semibold text-slate-950">内容の確認</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        この内容で、打ち合わせ後に使えるまとめを作成します。必要なら戻って修正してください。
      </p>

      {error && <ErrorMessage message={error} />}

      <dl className="mt-6 divide-y divide-slate-200 rounded-lg border border-slate-200">
        {enteredFields.map((field) => (
          <div
            className="grid gap-2 p-4 sm:grid-cols-[220px_1fr]"
            key={field.name}
          >
            <dt className="text-sm font-semibold text-slate-600">
              {field.label}
            </dt>
            <dd className="whitespace-pre-wrap text-sm leading-6 text-slate-950">
              {form[field.name]}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          className="rounded-md border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          disabled={isGenerating}
          onClick={onBack}
          type="button"
        >
          戻る
        </button>
        <button
          className="rounded-md bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:bg-slate-400"
          disabled={isGenerating}
          onClick={onGenerate}
          type="button"
        >
          {isGenerating ? "作成中..." : "まとめを作成する"}
        </button>
      </div>
    </div>
  );
}

function ResultScreen({
  copied,
  error,
  isGenerating,
  markdown,
  onBackToForm,
  onCopy,
  onRegenerate,
  showManualCopy,
}: {
  copied: boolean;
  error: string;
  isGenerating: boolean;
  markdown: string;
  showManualCopy: boolean;
  onBackToForm: () => void;
  onCopy: () => void;
  onRegenerate: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">まとめ</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            ご相談内容、心sensorで見やすくなること、最初の進め方、作成するものをまとめています。
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            onClick={onBackToForm}
            type="button"
          >
            入力を修正
          </button>
          <button
            className="rounded-md border border-emerald-700 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-wait disabled:border-slate-300 disabled:text-slate-400"
            disabled={isGenerating}
            onClick={onRegenerate}
            type="button"
          >
            {isGenerating ? "作成中..." : "作り直す"}
          </button>
          <button
            className="rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
            onClick={onCopy}
            type="button"
          >
            {copied ? "コピーしました" : "コピーする"}
          </button>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {showManualCopy && (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <label className="text-sm font-semibold text-amber-950">
            コピー用テキスト
            <textarea
              className="mt-2 h-40 w-full rounded-md border border-amber-200 bg-white p-3 text-sm leading-6 text-slate-900"
              readOnly
              value={markdown}
              onFocus={(event) => event.currentTarget.select()}
            />
          </label>
          <p className="mt-2 text-xs leading-5 text-amber-900">
            テキスト欄をクリックすると全選択されます。Ctrl + Cでコピーしてください。
          </p>
        </div>
      )}

      <article className="prose prose-slate mt-6 max-w-none rounded-lg border border-slate-200 bg-slate-50 p-5">
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </article>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="mt-5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
      {message}
    </div>
  );
}
