export type ResearchPlanInput = {
  research_theme: string;
  field: string;
  participants: string;
  intervention: string;
  purpose: string;
  environment: string;
  self_report_availability: string;
  output_format: string;
  participant_count?: string;
  measurement_time?: string;
  comparison_condition?: string;
  combined_metrics?: string;
  sensor_usage?: string;
  legal_region?: string;
  background_notes?: string;
};

export type FieldDefinition = {
  name: keyof ResearchPlanInput;
  label: string;
  required: boolean;
  type: "text" | "textarea" | "select";
  placeholder?: string;
};

export type SuggestionGroup = {
  label: string;
  options: string[];
};

type SuggestionProfile = {
  keywords: string[];
  groups: Partial<Record<keyof ResearchPlanInput, SuggestionGroup[]>>;
};

export const requiredFields: Array<keyof ResearchPlanInput> = [
  "research_theme",
  "field",
  "participants",
  "intervention",
  "purpose",
  "environment",
  "self_report_availability",
  "output_format",
];

export const fieldDefinitions: FieldDefinition[] = [
  {
    name: "research_theme",
    label: "ご相談内容",
    required: true,
    type: "textarea",
    placeholder:
      "例: レクリエーション中の反応を、アンケート以外の方法でも見てみたい",
  },
  { name: "field", label: "取り組みの種類", required: true, type: "select" },
  { name: "participants", label: "参加する方", required: true, type: "textarea" },
  {
    name: "intervention",
    label: "見てみたい場面や内容",
    required: true,
    type: "textarea",
  },
  {
    name: "purpose",
    label: "知りたいこと",
    required: true,
    type: "textarea",
  },
  { name: "environment", label: "行う場所", required: true, type: "textarea" },
  {
    name: "self_report_availability",
    label: "参加する方への簡単な質問",
    required: true,
    type: "select",
  },
  { name: "comparison_condition", label: "比べてみたいもの", required: false, type: "textarea" },
  {
    name: "combined_metrics",
    label: "一緒に見たい情報",
    required: false,
    type: "textarea",
  },
  { name: "sensor_usage", label: "心sensorの使い方", required: false, type: "select" },
  { name: "legal_region", label: "確認が必要なルール", required: false, type: "text" },
  { name: "output_format", label: "まとめ方", required: true, type: "select" },
];

export const emptyResearchPlanInput: ResearchPlanInput = {
  research_theme: "",
  field: "",
  participants: "",
  intervention: "",
  purpose: "",
  environment: "",
  self_report_availability: "",
  output_format: "",
  participant_count: "",
  measurement_time: "",
  comparison_condition: "",
  combined_metrics: "",
  sensor_usage: "",
  legal_region: "",
  background_notes: "",
};

export function validateResearchPlanInput(form: ResearchPlanInput) {
  return requiredFields.filter((field) => !form[field]?.trim());
}

const commonGroups: Partial<Record<keyof ResearchPlanInput, SuggestionGroup[]>> =
  {
    field: [
      {
        label: "目的",
        options: ["まず小さく試す", "今の取り組みを見直す", "内容を比べる", "説明資料を作る"],
      },
      {
        label: "場面",
        options: ["介護・福祉", "展示・施設", "研修・学習", "動画・広告"],
      },
    ],
    participants: [
      {
        label: "利用する方",
        options: ["一般の利用者", "来場者", "初めて利用する方", "いつも利用している方"],
      },
      {
        label: "回答が難しい場合がある方",
        options: ["高齢の方", "認知症の方", "介護施設を利用する方", "言葉での回答が難しい方"],
      },
    ],
    intervention: [
      {
        label: "内容",
        options: ["2〜3種類の動画", "レクリエーション", "展示コーナー", "説明用の映像"],
      },
      {
        label: "体験",
        options: ["サービスを使う場面", "画面を見る場面", "研修を受ける場面", "商品を見る場面"],
      },
    ],
    purpose: [
      {
        label: "見たいこと",
        options: [
          "アンケートだけでは見えにくい反応を補う",
          "内容ごとの反応の違いを見る",
          "より良くするための手がかりを得る",
          "説明しやすい材料を作る",
        ],
      },
      {
        label: "使い道",
        options: [
          "表情の変化を時間の流れに沿って見る",
          "本人の回答と見比べる",
          "次回の改善案につなげる",
          "まず小さく試す形にする",
        ],
      },
    ],
    environment: [
      {
        label: "場所",
        options: ["1つの施設", "介護施設", "展示スペース", "店舗やショールーム"],
      },
      {
        label: "実施しやすい環境",
        options: ["会議室", "個室", "研修室", "録画を見る環境"],
      },
    ],
    self_report_availability: [
      {
        label: "質問できるか",
        options: ["質問できる", "一部なら質問できる", "質問は難しい", "まだ分からない"],
      },
    ],
    output_format: [
      {
        label: "お客様と確認しやすい形",
        options: ["概要メモ", "お試し実施の案", "打ち合わせ後のまとめ", "活用イメージ"],
      },
      {
        label: "実施に向けた形",
        options: ["進め方の案", "行う場面のイメージ", "作成するものの一覧", "次に決めること"],
      },
    ],
    participant_count: [
      {
        label: "小さく始める",
        options: ["5〜10名", "10名程度", "1つの施設で行う", "1つの部署で行う"],
      },
      {
        label: "比べる場合",
        options: ["1つの内容につき5名程度", "20名程度", "まだ決めない"],
      },
    ],
    measurement_time: [
      {
        label: "短く試す",
        options: ["1人あたり3分", "1人あたり5分", "各動画2〜3分", "各内容5分"],
      },
      {
        label: "通常の流れに合わせる",
        options: ["1人あたり10分", "1回15分程度", "普段の体験時間に合わせる"],
      },
    ],
    comparison_condition: [
      {
        label: "内容を比べる",
        options: ["動画A / B / C", "内容A / B / C", "変更前 / 変更後", "実施前 / 実施後"],
      },
      {
        label: "場面を比べる",
        options: ["施設ごと", "初回 / 2回目以降", "説明あり / なし", "時間帯ごと"],
      },
    ],
    combined_metrics: [
      {
        label: "一緒に見る情報",
        options: ["満足度の質問", "簡単な感想", "観察メモ", "自由記述コメント"],
      },
      {
        label: "作成するもの",
        options: ["内容別の反応まとめ", "時間ごとの変化グラフ", "比較表", "改善案"],
      },
    ],
    sensor_usage: [
      {
        label: "使い方",
        options: ["録画後に確認する", "その場で確認する", "表に出して集計する", "まだ決めない"],
      },
    ],
    legal_region: [
      {
        label: "確認事項",
        options: ["日本国内", "社内ルールに従う", "施設のルールに従う", "撮影の許可を確認する", "まだ決めない"],
      },
    ],
    background_notes: [
      {
        label: "補足",
        options: [
          "まずは小さく試したい",
          "お客様に実施後のイメージを持ってもらいたい",
          "説明しやすい資料にしたい",
          "次回の打ち合わせにつなげたい",
        ],
      },
    ],
  };

const suggestionProfiles: SuggestionProfile[] = [
  {
    keywords: ["認知症", "高齢", "介護", "レクリエーション", "ケア", "施設"],
    groups: {
      field: [
        { label: "目的", options: ["まず小さく試す", "レクリエーションの反応を見る", "今の取り組みを見直す"] },
        { label: "場面", options: ["介護・福祉", "施設での活動", "日々のケア"] },
      ],
      participants: [
        { label: "参加する方", options: ["認知症の方", "介護施設を利用する方", "高齢の方", "言葉での回答が難しい方"] },
        { label: "一緒に確認する方", options: ["介護スタッフ", "施設の管理者", "ご家族への説明を担当する方"] },
      ],
      intervention: [
        { label: "内容", options: ["2〜3種類のレクリエーション動画", "音楽を使った活動", "体操の動画", "思い出を話すきっかけになる内容"] },
        { label: "始め方", options: ["1つの施設で行う", "少人数で行う", "普段のレクリエーションの中で行う"] },
      ],
      purpose: [
        {
          label: "困っていること",
          options: [
            "アンケートだけでは反応が分かりにくい",
            "レクリエーションの良さを説明しづらい",
            "どの内容が合っているか判断しづらい",
          ],
        },
        {
          label: "心sensorで見やすくなること",
          options: [
            "表情の変化から反応の傾向を見る",
            "内容ごとの反応の違いを見る",
            "言葉での回答が難しい方の反応把握を補う",
          ],
        },
      ],
      combined_metrics: [
        {
          label: "作成するもの",
          options: ["内容別の反応まとめ", "表情の変化グラフ", "観察メモとの比較表", "次回の活動改善案"],
        },
      ],
    },
  },
  {
    keywords: ["展示", "来場", "コーナー", "ミュージアム", "博物館", "満足"],
    groups: {
      field: [
        { label: "目的", options: ["展示ごとの反応を見る", "施設体験を見直す", "改善の手がかりを得る"] },
        { label: "場面", options: ["展示・施設", "来場者の体験", "満足度の確認"] },
      ],
      purpose: [
        {
          label: "困っていること",
          options: ["展示ごとの違いを説明しづらい", "見直すべき場所が分かりにくい", "アンケートだけでは場面ごとの反応が分かりにくい"],
        },
        {
          label: "心sensorで見やすくなること",
          options: ["展示コーナーごとの反応の違いを見る", "良い反応が出る場面を把握する", "滞在時間やアンケートと見比べる"],
        },
      ],
    },
  },
  {
    keywords: ["広告", "動画", "CM", "ブランド", "コンテンツ"],
    groups: {
      field: [
        { label: "目的", options: ["動画ごとの反応を見る", "内容を見直す", "説明材料を作る"] },
        { label: "場面", options: ["動画・広告", "内容の確認", "商品やサービスの紹介"] },
      ],
      purpose: [
        {
          label: "困っていること",
          options: ["どの場面が伝わっているか説明しづらい", "複数案の違いを比べにくい", "アンケートだけでは見直し点が分かりにくい"],
        },
        {
          label: "心sensorで見やすくなること",
          options: ["場面ごとの反応の傾向を見る", "動画案ごとの違いを見る", "好みの回答と表情の変化を見比べる"],
        },
      ],
    },
  },
];

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function mergeGroups(groups: SuggestionGroup[]) {
  const merged = new Map<string, string[]>();

  for (const group of groups) {
    const current = merged.get(group.label) || [];
    merged.set(group.label, uniqueValues([...current, ...group.options]));
  }

  return Array.from(merged, ([label, options]) => ({ label, options }));
}

export function getInputSuggestionGroups(
  theme: string,
  fieldName: keyof ResearchPlanInput,
  context?: ResearchPlanInput,
) {
  if (!theme.trim() || fieldName === "research_theme") {
    return [];
  }

  const contextText = [
    theme,
    ...(context
      ? Object.entries(context)
          .filter(([name]) => name !== fieldName)
          .map(([, value]) => value)
      : []),
  ]
    .join(" ")
    .toLowerCase();

  const matchedGroups = suggestionProfiles.flatMap((profile) => {
    const matched = profile.keywords.some((keyword) =>
      contextText.includes(keyword.toLowerCase()),
    );

    return matched ? profile.groups[fieldName] || [] : [];
  });

  const fallbackGroups = commonGroups[fieldName] || [];

  return mergeGroups([...matchedGroups, ...fallbackGroups])
    .map((group) => ({ ...group, options: group.options.slice(0, 6) }))
    .slice(0, 4);
}
