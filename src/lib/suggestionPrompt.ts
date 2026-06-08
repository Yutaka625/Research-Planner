import {
  fieldDefinitions,
  type ResearchPlanInput,
  type SuggestionGroup,
} from "@/lib/researchPlan";

export type SuggestionFieldName = Exclude<
  keyof ResearchPlanInput,
  "research_theme"
>;

export type SuggestionPromptInput = {
  fieldName: SuggestionFieldName;
  form: ResearchPlanInput;
};

export type SuggestionResponse = {
  suggestionGroups: SuggestionGroup[];
  researchNotes?: string[];
};

const maxGroups = 3;
const maxOptionsPerGroup = 5;

export function isSuggestionFieldName(
  fieldName: string,
): fieldName is SuggestionFieldName {
  return fieldDefinitions.some(
    (field) => field.name === fieldName && field.name !== "research_theme",
  );
}

export function buildOptionSuggestionPrompt({
  fieldName,
  form,
}: SuggestionPromptInput) {
  const field = fieldDefinitions.find((item) => item.name === fieldName);
  const answeredContext = fieldDefinitions
    .filter((item) => item.name !== fieldName)
    .map((item) => {
      const value = form[item.name]?.trim();
      return value ? `- ${item.label}: ${value}` : "";
    })
    .filter(Boolean)
    .join("\n");

  return `
あなたは、心sensor/Affdex SDKを使った相談内容を整理するフォームの設問候補を作る支援者です。
回答済みの内容をふまえて、次の設問に対する選択肢候補を生成してください。

必要な作業:
- 回答済みの内容から文脈を読み取る。
- 必要に応じてネット調査を行い、対象領域で自然に使われる言葉や観点を反映する。
- 心sensor/Affdex SDKは、診断や断定ではなく、表情の変化から反応の傾向を見やすくする補助情報として扱う。
- 医療診断、心理状態、痛み、ストレス、認知能力を断定する選択肢は作らない。
- お客様が選びやすい短い日本語にする。

回答済みの内容:
${answeredContext || "- まだ十分な回答はありません。"}

候補を作る設問:
- 項目名: ${field?.label || fieldName}
- 内部名: ${fieldName}

出力形式:
- JSONだけを返す。Markdownや説明文は返さない。
- suggestionGroupsは最大${maxGroups}グループ。
- 各グループのoptionsは最大${maxOptionsPerGroup}個。
- optionsは短い選択肢文にする。

JSON形式:
{
  "suggestionGroups": [
    {
      "label": "観点名",
      "options": ["選択肢1", "選択肢2"]
    }
  ],
  "researchNotes": ["候補作成時に参考にした観点を短く記載"]
}
`;
}

function normalizeOption(option: unknown) {
  return typeof option === "string" ? option.trim() : "";
}

export function normalizeSuggestionResponse(
  value: unknown,
): SuggestionResponse {
  if (!value || typeof value !== "object") {
    return { suggestionGroups: [] };
  }

  const candidate = value as {
    researchNotes?: unknown;
    suggestionGroups?: unknown;
  };

  const rawGroups = Array.isArray(candidate.suggestionGroups)
    ? candidate.suggestionGroups
    : [];

  const suggestionGroups = rawGroups
    .map((group) => {
      if (!group || typeof group !== "object") return null;
      const typedGroup = group as { label?: unknown; options?: unknown };
      const label =
        typeof typedGroup.label === "string" && typedGroup.label.trim()
          ? typedGroup.label.trim()
          : "候補";
      const options = Array.isArray(typedGroup.options)
        ? Array.from(new Set(typedGroup.options.map(normalizeOption)))
            .filter(Boolean)
            .slice(0, maxOptionsPerGroup)
        : [];

      return options.length > 0 ? { label, options } : null;
    })
    .filter((group): group is SuggestionGroup => Boolean(group))
    .slice(0, maxGroups);

  const researchNotes = Array.isArray(candidate.researchNotes)
    ? candidate.researchNotes
        .map((note) => (typeof note === "string" ? note.trim() : ""))
        .filter(Boolean)
        .slice(0, 3)
    : undefined;

  return { suggestionGroups, researchNotes };
}
