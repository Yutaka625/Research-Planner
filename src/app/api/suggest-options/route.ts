import { NextResponse } from "next/server";
import {
  getInputSuggestionGroups,
  type ResearchPlanInput,
} from "@/lib/researchPlan";
import {
  buildOptionSuggestionPrompt,
  isSuggestionFieldName,
  normalizeSuggestionResponse,
  type SuggestionFieldName,
} from "@/lib/suggestionPrompt";

type SuggestOptionsRequest = {
  fieldName?: string;
  form?: ResearchPlanInput;
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

const GEMINI_API_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

function getModel() {
  return process.env.GEMINI_MODEL || "gemini-2.5-flash";
}

function extractJsonText(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fenced?.[1]?.trim() || trimmed;
}

function fallbackSuggestions(form: ResearchPlanInput, fieldName: SuggestionFieldName) {
  return getInputSuggestionGroups(form.research_theme, fieldName, form);
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  let body: SuggestOptionsRequest;

  try {
    body = (await request.json()) as SuggestOptionsRequest;
  } catch {
    return NextResponse.json(
      { error: "リクエストのJSONを読み取れませんでした。" },
      { status: 400 },
    );
  }

  if (!body.form || !body.fieldName || !isSuggestionFieldName(body.fieldName)) {
    return NextResponse.json(
      { error: "候補を作る設問が正しくありません。" },
      { status: 400 },
    );
  }

  if (!body.form.research_theme.trim()) {
    return NextResponse.json({
      suggestionGroups: [],
      source: "empty",
    });
  }

  const localFallback = fallbackSuggestions(body.form, body.fieldName);

  if (!apiKey) {
    return NextResponse.json({
      suggestionGroups: localFallback,
      source: "fallback",
      warning: "GEMINI_API_KEY が未設定のため、固定候補を表示しています。",
    });
  }

  try {
    const prompt = buildOptionSuggestionPrompt({
      fieldName: body.fieldName,
      form: body.form,
    });
    const response = await fetch(
      `${GEMINI_API_BASE_URL}/${encodeURIComponent(getModel())}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.35,
          },
          tools: [{ google_search: {} }],
        }),
      },
    );

    const data = (await response.json()) as GeminiGenerateContentResponse;

    if (!response.ok) {
      return NextResponse.json({
        suggestionGroups: localFallback,
        source: "fallback",
        warning:
          data.error?.message ||
          "Gemini APIで候補を生成できなかったため、固定候補を表示しています。",
      });
    }

    const rawText =
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim() || "";

    if (!rawText) {
      return NextResponse.json({
        suggestionGroups: localFallback,
        source: "fallback",
        warning: "候補生成結果が空だったため、固定候補を表示しています。",
      });
    }

    const parsed = normalizeSuggestionResponse(
      JSON.parse(extractJsonText(rawText)),
    );

    if (parsed.suggestionGroups.length === 0) {
      return NextResponse.json({
        suggestionGroups: localFallback,
        source: "fallback",
        warning: "候補生成結果を読み取れなかったため、固定候補を表示しています。",
      });
    }

    return NextResponse.json({
      ...parsed,
      source: "generated",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "候補生成中に不明なエラーが発生しました。";

    return NextResponse.json({
      suggestionGroups: localFallback,
      source: "fallback",
      warning: message,
    });
  }
}
