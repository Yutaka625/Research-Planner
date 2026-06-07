import { NextResponse } from "next/server";
import { buildResearchPlanPrompt } from "@/lib/prompt";
import {
  type ResearchPlanInput,
  validateResearchPlanInput,
} from "@/lib/researchPlan";

type GeneratePlanRequest = {
  form?: ResearchPlanInput;
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
  error?: {
    message?: string;
  };
};

type GeminiResult =
  | {
      ok: true;
      markdown: string;
      model: string;
      fallbackUsed: boolean;
    }
  | {
      ok: false;
      error: string;
      status: number;
    };

const GEMINI_API_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

function getModelCandidates() {
  const primary = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const fallback =
    process.env.GEMINI_FALLBACK_MODEL || "gemini-2.5-flash-lite";

  return Array.from(new Set([primary, fallback].filter(Boolean)));
}

function isHighDemandError(message: string, status: number) {
  const normalized = message.toLowerCase();

  return (
    status === 429 ||
    status === 503 ||
    normalized.includes("high demand") ||
    normalized.includes("overloaded") ||
    normalized.includes("temporarily unavailable") ||
    normalized.includes("try again later")
  );
}

function isSelfSignedCertificateError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes("self-signed certificate")
  );
}

async function generateWithModel({
  apiKey,
  fallbackUsed,
  model,
  prompt,
}: {
  apiKey: string;
  fallbackUsed: boolean;
  model: string;
  prompt: string;
}): Promise<GeminiResult> {
  const response = await fetch(
    `${GEMINI_API_BASE_URL}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
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
          temperature: 0.4,
        },
      }),
    },
  );

  const data = (await response.json()) as GeminiGenerateContentResponse;

  if (!response.ok) {
    return {
      ok: false,
      error:
        data.error?.message ||
        "Gemini APIで提案資料の生成に失敗しました。",
      status: response.status,
    };
  }

  const markdown =
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim() || "";

  if (!markdown) {
    return {
      ok: false,
      error:
        "生成結果が空でした。入力内容を見直して、もう一度生成してください。",
      status: 502,
    };
  }

  return {
    ok: true,
    fallbackUsed,
    markdown,
    model,
  };
}

export function GET() {
  const [model, fallbackModel] = getModelCandidates();

  return NextResponse.json({
    provider: "Gemini",
    model,
    fallbackModel,
    apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "GEMINI_API_KEY を環境変数に設定してください。",
      },
      { status: 500 },
    );
  }

  let body: GeneratePlanRequest;

  try {
    body = (await request.json()) as GeneratePlanRequest;
  } catch {
    return NextResponse.json(
      { error: "リクエストのJSONを読み取れませんでした。" },
      { status: 400 },
    );
  }

  if (!body.form) {
    return NextResponse.json(
      { error: "提案資料フォームの入力内容がありません。" },
      { status: 400 },
    );
  }

  const missingFields = validateResearchPlanInput(body.form);

  if (missingFields.length > 0) {
    return NextResponse.json(
      { error: `必須項目が未入力です: ${missingFields.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    const prompt = buildResearchPlanPrompt(body.form);
    const modelCandidates = getModelCandidates();
    let lastError: GeminiResult | null = null;

    for (const [index, model] of modelCandidates.entries()) {
      const result = await generateWithModel({
        apiKey,
        fallbackUsed: index > 0,
        model,
        prompt,
      });

      if (result.ok) {
        return NextResponse.json({
          markdown: result.markdown,
          model: result.model,
          fallbackUsed: result.fallbackUsed,
        });
      }

      lastError = result;

      if (!isHighDemandError(result.error, result.status)) {
        break;
      }
    }

    return NextResponse.json(
      {
        error:
          lastError?.error ||
          "Gemini APIで提案資料の生成に失敗しました。",
      },
      { status: lastError?.status || 502 },
    );
  } catch (error) {
    if (isSelfSignedCertificateError(error)) {
      return NextResponse.json(
        {
          error:
            "Gemini APIへのTLS接続で自己署名証明書が検出されました。社内プロキシやTLS検査を利用している場合は、Node.jsが会社のルート証明書を信頼できるように設定してください。PowerShellで `$env:NODE_OPTIONS='--use-system-ca'` を設定してから開発サーバーを再起動すると解決する場合があります。",
        },
        { status: 502 },
      );
    }

    if (error instanceof TypeError && error.message === "fetch failed") {
      const cause = error.cause;

      if (isSelfSignedCertificateError(cause)) {
        return NextResponse.json(
          {
            error:
              "Gemini APIへのTLS接続で自己署名証明書が検出されました。社内プロキシやTLS検査を利用している場合は、Node.jsが会社のルート証明書を信頼できるように設定してください。PowerShellで `$env:NODE_OPTIONS='--use-system-ca'` を設定してから開発サーバーを再起動すると解決する場合があります。",
          },
          { status: 502 },
        );
      }

      return NextResponse.json(
        {
          error:
            "Gemini APIへ接続できませんでした。開発サーバーを起動している環境のネットワーク接続、プロキシ、ファイアウォール、またはCodexのネットワーク権限を確認してください。",
        },
        { status: 502 },
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "提案資料の生成中に不明なエラーが発生しました。";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
