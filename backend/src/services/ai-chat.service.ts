import { prisma } from '@/lib/prisma';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/error.middleware';
import { AIModelService } from '@/services/ai-model.service';
import { decrypt } from '@/utils/encryption';
import { buildAnthropicMessagesUrl, buildGeminiGenerateContentUrl, buildOpenAIChatCompletionsUrl, normalizeProviderType } from '@/utils/aiApiUrl';

export interface DivinationReadingOptions {
  stream?: boolean;
  language?: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIChatRequest {
  model: string;
  messages: ChatMessage[];
  stream: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface DivinationReadingResult {
  reading: string;
  modelId: number | null;
  modelName: string;
  providerName: string;
  tokensUsed?: number;
  tokensEstimated?: boolean;
  cost?: number;
  responseTimeMs: number;
  requestId?: string;
}

function estimateTokensFromText(text: string): number {
  const s = typeof text === 'string' ? text.trim() : '';
  if (!s) return 0;
  let ascii = 0;
  let cjk = 0;
  let other = 0;

  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    if (code <= 0x7f) {
      ascii += 1;
      continue;
    }
    const isCjk =
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0x20000 && code <= 0x2a6df) ||
      (code >= 0x2a700 && code <= 0x2b73f) ||
      (code >= 0x2b740 && code <= 0x2b81f) ||
      (code >= 0x2b820 && code <= 0x2ceaf) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0x2f800 && code <= 0x2fa1f);
    if (isCjk) cjk += 1;
    else other += 1;
  }

  const est = Math.ceil(cjk + ascii / 4 + other / 2);
  return Math.max(1, est);
}

function estimateTotalTokens(inputText: string, outputText: string): number | undefined {
  const inT = estimateTokensFromText(inputText);
  const outT = estimateTokensFromText(outputText);
  const total = (inT || 0) + (outT || 0);
  return total > 0 ? total : undefined;
}

function convertElementToChinese(element: string): string {
  switch ((element || '').toLowerCase()) {
    case 'wood': return '木';
    case 'fire': return '火';
    case 'earth': return '土';
    case 'metal': return '金';
    case 'water': return '水';
    default: return element || '未知';
  }
}

function convertYinYangToChinese(v: string): string {
  const s = String(v || '').trim().toLowerCase();
  if (s === 'yin' || s === '阴') return '阴';
  if (s === 'yang' || s === '阳') return '阳';
  return v || '未知';
}

function convertTiYongRelationToChinese(v: string): string {
  const s = String(v || '').trim().toLowerCase();
  if (s === 'bi_assist' || s === '体用比助' || s === '比助') return '体用比助';
  if (s === 'bi_rob' || s === '体用比劫' || s === '比劫') return '体用比劫';
  if (s === 'yong_ke_ti' || s === '用克体') return '用克体';
  if (s === 'ti_ke_yong' || s === '体克用') return '体克用';
  if (s === 'yong_sheng_ti' || s === '用生体') return '用生体';
  if (s === 'ti_sheng_yong' || s === '体生用') return '体生用';
  if (s === 'none' || s === '体用无明显生克' || s === '无明显生克') return '体用无明显生克';
  if (s === 'ti_he_yong' || s === '体合用') return '体合用';
  if (s === 'ti_yong_bi_he' || s === '体用比和') return '体用比和';
  return v || '未知';
}

function formatShanghaiTime(ts: number): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Shanghai',
  } as any);
}

function buildTerminologyGlossary(targetLang: string): string {
  const lines: string[] = [];
  const lang = (targetLang || '').toLowerCase();
  if (lang.startsWith('en')) {
    lines.push('术语对照表：');
    lines.push(`大安=Da'an`);
    lines.push('留连=Liulian');
    lines.push('速喜=Suxi');
    lines.push('赤口=Chikou');
    lines.push('小吉=Xiaoji');
    lines.push('空亡=Kongwang');
    lines.push('五行：木=Wood, 火=Fire, 土=Earth, 金=Metal, 水=Water');
    lines.push('六神：青龙=Azure Dragon, 朱雀=Vermilion Bird, 勾陈=Gou Chen, 腾蛇=Soaring Serpent, 白虎=White Tiger, 玄武=Black Tortoise');
    lines.push('阴阳：阴=Yin, 阳=Yang');
    lines.push('六亲：父母=Parents, 子孙=Offspring, 官鬼=Authority, 妻财=Wealth, 兄弟=Siblings, 小人=Villain, 我=Self');
    lines.push('体用：体用比助=Mutual support, 体用比劫=Rivalry, 用生体=Use generates Body, 体生用=Body generates Use, 用克体=Use overcomes Body, 体克用=Body overcomes Use, 体用无明显生克=No clear interaction');
  } else if (lang.startsWith('ja')) {
    lines.push('用語対照表：');
    lines.push('大安=大安（たいあん）');
    lines.push('留连=留連（りゅうれん）');
    lines.push('速喜=速喜（そっき）');
    lines.push('赤口=赤口（しゃっこう）');
    lines.push('小吉=小吉（しょうきち）');
    lines.push('空亡=空亡（くうぼう）');
    lines.push('五行：木=木, 火=火, 土=土, 金=金, 水=水');
    lines.push('六神：青龙=青龍（せいりゅう）, 朱雀=朱雀（すざく）, 勾陈=勾陳（こうちん）, 腾蛇=騰蛇（とうだ）, 白虎=白虎（びゃっこ）, 玄武=玄武（げんぶ）');
  } else if (lang.startsWith('ko')) {
    lines.push('용어 대조표:');
    lines.push('大安=대안');
    lines.push('留连=유련');
    lines.push('速喜=속희');
    lines.push('赤口=적구');
    lines.push('小吉=소길');
    lines.push('空亡=공망');
    lines.push('五行：木=목, 火=화, 土=토, 金=금, 水=수');
    lines.push('六神：青龙=청룡, 朱雀=주작, 勾陈=구진, 腾蛇=등사, 白虎=백호, 玄武=현무');
  }
  return lines.join('\n');
}

function extractApiKeyMaybeDecrypted(maybeEncryptedOrPlain: unknown): string | null {
  if (typeof maybeEncryptedOrPlain !== 'string') return null;
  const raw = maybeEncryptedOrPlain.trim();
  if (!raw) return null;
  try {
    return decrypt(raw);
  } catch {
    return raw;
  }
}

function extractAnthropicText(payload: any): string | null {
  const blocks = payload?.content;
  if (Array.isArray(blocks)) {
    const parts = blocks
      .map((b: any) => (b && typeof b === 'object' ? b.text : undefined))
      .filter((t: any) => typeof t === 'string' && t.trim() !== '') as string[];
    if (parts.length) return parts.join('');
  }
  const alt = payload?.completion;
  if (typeof alt === 'string' && alt.trim() !== '') return alt;
  return null;
}

function extractGeminiText(payload: any): string | null {
  const candidates = payload?.candidates;
  if (Array.isArray(candidates) && candidates.length > 0) {
    const parts = candidates[0]?.content?.parts;
    if (Array.isArray(parts)) {
      const texts = parts
        .map((p: any) => (p && typeof p === 'object' ? p.text : undefined))
        .filter((t: any) => typeof t === 'string' && t.trim() !== '') as string[];
      if (texts.length) return texts.join('');
    }
  }
  const alt = payload?.text;
  if (typeof alt === 'string' && alt.trim() !== '') return alt;
  return null;
}

function buildUserPrompt(result: any, userIntro: string, userGuidelines: string): string {
  let prompt = `${userIntro}\n`;

  const tsRaw = result?.timestamp;
  const ts = typeof tsRaw === 'number' ? tsRaw : Number(tsRaw);
  const timeString = formatShanghaiTime(Number.isFinite(ts) ? ts : Date.now());
  prompt += `\n起卦时间: ${timeString}\n`;

  const isTimeHexagram = typeof result?.isTimeHexagram === 'boolean' ? !!result.isTimeHexagram : undefined;
  if (isTimeHexagram !== undefined) {
    prompt += `\n起卦方式: ${isTimeHexagram ? '正时卦' : '活时卦'}\n`;
  }

  if (isTimeHexagram === false) {
    const n = result?.numbers;
    if (n && typeof n === 'object') {
      const sky = (n as any).sky;
      const earth = (n as any).earth;
      const human = (n as any).human;
      prompt += `\n天地人三数: 天=${sky} 地=${earth} 人=${human}\n`;
    }
  }

  if (result?.query) {
    prompt += `\n用户占问: ${result.query}\n`;
  }

  const threePalaces = result?.threePalaces;
  if (threePalaces) {
    const fmt = (label: string, palace: any) => {
      const name = palace?.name || '-';
      const element = convertElementToChinese(palace?.element);
      const sixGod = palace?.sixGod || '未知';
      const sixRelative = palace?.sixRelative || '未知';
      const season = palace?.season || '未知';
      const direction = palace?.direction || '未知';
      return `${label}: ${name} (五行:${element}) (六神:${sixGod}) (六亲:${sixRelative}) (季节:${season}) (方位:${direction})\n`;
    };
    prompt += `\n三宫信息：\n`
      + fmt('天宫', threePalaces?.sky)
      + fmt('地宫', threePalaces?.earth)
      + fmt('人宫', threePalaces?.human);
  }

  const tiYong = result?.tiYong;
  if (tiYong) {
    const bodyEl = convertElementToChinese(tiYong?.bodyElement);
    const bodyYY = convertYinYangToChinese(tiYong?.bodyYinYang);
    const useEl = convertElementToChinese(tiYong?.useElement);
    const useYY = convertYinYangToChinese(tiYong?.useYinYang);
    const rel = convertTiYongRelationToChinese(tiYong?.relation);
    prompt += `\n体用关系: 体=${bodyEl}(${bodyYY}) 用=${useEl}(${useYY}) 关系=${rel}\n`;
  }

  prompt += `\n${userGuidelines}`;
  return prompt;
}

async function getActivePromptTexts(): Promise<{ system_prompt: string; user_intro: string; user_guidelines: string } | null> {
  try {
    const t = await prisma.promptText.findFirst({
      where: { isActive: true, name: 'universal' },
      orderBy: [{ updatedAt: 'desc' }],
      select: { texts: true }
    });
    if (!t) return null;
    const texts: any = (t as any).texts || {};
    const systemPrompt = texts.system_prompt || '你是一名经验丰富的易学专家，精通小六壬占卜的解读和应用。你有多年研究传统中国预测学的经验，能够从卦象中解读出深刻的含义并给予有益的指导。';
    const userIntro = texts.user_intro || '我需要你根据以下小六壬卦象信息，提供一个详细的解读。';
    const userGuidelines =
      typeof texts.user_guidelines === 'string'
        ? texts.user_guidelines
        : '请给出详细的解读，包括以下内容：\n1. 卦象综合解析（包括三宫关系和互动的深层含义）\n2. 对用户问题的针对性回答（如果有问题）\n3. 宜忌建议\n4. 未来发展趋势\n5. 化解方法或行动建议\n如果是标题，请用中文数字+顿号开头，如“一、”；副标题，请用中文数字+.开头，如“1.”；内容，如果有顺序请用如“①②③④⑤⑥⑦⑧⑨⑩” 无顺序用“-”';
    return {
      system_prompt: systemPrompt,
      user_intro: userIntro,
      user_guidelines: userGuidelines,
    };
  } catch (e) {
    logger.warn('读取提示词文本失败，使用默认', e);
    return null;
  }
}

export class AIChatService {
  private aiModelService: AIModelService;

  constructor() {
    this.aiModelService = new AIModelService();
  }

  /**
   * 在主/备模型间进行故障转移调用
   */
  async analyzeDivination(result: any, options?: DivinationReadingOptions): Promise<DivinationReadingResult> {
    const startAll = Date.now();
    const prompts = await getActivePromptTexts();
    const systemPrompt = prompts?.system_prompt || '你是一名经验丰富的易学专家，精通小六壬占卜的解读和应用。你有多年研究传统中国预测学的经验，能够从卦象中解读出深刻的含义并给予有益的指导。';
    const userPrompt = buildUserPrompt(
      result,
      prompts?.user_intro || '我需要你根据以下小六壬卦象信息，提供一个详细的解读。',
      prompts?.user_guidelines ?? '请给出详细的解读，包括以下内容：\n1. 卦象综合解析（包括三宫关系和互动的深层含义）\n2. 对用户问题的针对性回答（如果有问题）\n3. 宜忌建议\n4. 未来发展趋势\n5. 化解方法或行动建议\n如果是标题，请用中文数字+顿号开头，如“一、”；副标题，请用中文数字+.开头，如“1.”；内容，如果有顺序请用如“①②③④⑤⑥⑦⑧⑨⑩” 无顺序用“-”'
    );
    const targetLang = (options as any)?.language ? String((options as any).language).toLowerCase() : 'zh';
    let userPromptFinal = userPrompt;
    if (targetLang && !targetLang.startsWith('zh')) {
      const glossary = buildTerminologyGlossary(targetLang);
      let langName = targetLang;
      if (targetLang.startsWith('en')) langName = '英文';
      else if (targetLang.startsWith('ja')) langName = '日文';
      else if (targetLang.startsWith('ko')) langName = '韩文';
      const extra = `\n输出语言要求：请用${langName}撰写最终回答。分析与理解过程以中文进行，术语翻译按下表执行，首次出现请保留中文括注。\n${glossary}`;
      userPromptFinal += extra;
    }

    const { primary, backups } = await this.aiModelService.getAIConfiguration();

    const candidates = ([] as any[])
      .concat(primary ? [primary] : [])
      .concat(Array.isArray(backups) ? backups : [])
      .filter(m => !!m && m.isActive !== false);

    if (!candidates.length) {
      throw createError('没有可用的AI模型配置', 503, 'NO_ACTIVE_AI_MODEL');
    }

    const errors: any[] = [];

    for (const model of candidates) {
      try {
        const { provider } = model as any;
        const apiKey =
          extractApiKeyMaybeDecrypted((model as any).apiKeyEncrypted) ||
          extractApiKeyMaybeDecrypted((provider as any)?.apiKeyEncrypted) ||
          null;
        if (!apiKey || String(apiKey).trim() === '') {
          throw new Error('模型未配置API密钥');
        }

        const base = (model as any).customApiUrl || provider?.baseUrl;
        const providerType = normalizeProviderType(
          (provider as any)?.providerType || (provider as any)?.name || ''
        );

        const params = (model as any).parameters || {};
        const originalModelName = String(model.name || '');
        let targetModel = originalModelName;
        let reasoningEffort: 'minimal' | 'low' | 'medium' | 'high' | undefined;
        const g5 = originalModelName.match(/^gpt-5(?:-(minimal|low|medium|high))?$/i);
        if (g5) {
          targetModel = 'gpt-5';
          if (g5[1]) reasoningEffort = g5[1].toLowerCase() as any;
        }
        const provName = providerType || 'unknown';
        const rawMaxTokens =
          typeof params.max_tokens === 'number' && Number.isFinite(params.max_tokens)
            ? Math.trunc(params.max_tokens)
            : undefined;
        const unlimitedOutput = rawMaxTokens == null || rawMaxTokens <= 0 || rawMaxTokens === 3000;

        let maxTokens: number | undefined = unlimitedOutput ? undefined : rawMaxTokens;
        if (provName === 'deepseek') {
          if (typeof maxTokens === 'number') {
            if (maxTokens < 1) maxTokens = 1;
            if (maxTokens > 8192) maxTokens = 8192;
          }
        }
        const requestBody: any = {
          model: targetModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPromptFinal },
          ],
          stream: !!params.stream,
          temperature: params.temperature ?? 0.7,
          top_p: params.top_p,
          frequency_penalty: params.frequency_penalty,
          presence_penalty: params.presence_penalty,
        };
        if (typeof maxTokens === 'number') (requestBody as any).max_tokens = maxTokens;
        if (reasoningEffort) (requestBody as any).reasoning = { effort: reasoningEffort };

        const start = Date.now();
        try {
          logger.info('[Reading] sending', { 模型: model.name, 提供商: (provider as any)?.name || 'unknown' });
        } catch (_) {}

        if (providerType === 'anthropic') {
          const apiUrl = buildAnthropicMessagesUrl(base);
          const maxTokensAttempts = unlimitedOutput
            ? [64000, 8192, 4096]
            : typeof maxTokens === 'number' && maxTokens > 0
              ? [maxTokens]
              : [1024];

          let lastErr: unknown;
          for (let i = 0; i < maxTokensAttempts.length; i += 1) {
            const mt = maxTokensAttempts[i];
            const requestBody: any = {
              model: originalModelName,
              system: systemPrompt,
              messages: [{ role: 'user', content: userPromptFinal }],
              stream: false,
              temperature: params.temperature ?? 0.7,
              top_p: params.top_p,
              max_tokens: mt,
            };

            const resp = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
              },
              body: JSON.stringify(requestBody),
            });

            if (!resp.ok) {
              const text = await resp.text().catch(() => '');
              const err = new Error(`HTTP ${resp.status}: ${resp.statusText} ${text}`.trim());
              lastErr = err;
              if (!unlimitedOutput || i === maxTokensAttempts.length - 1) throw err;
              continue;
            }

            const data = await resp.json() as any;
            const reading = extractAnthropicText(data);
            if (!reading || typeof reading !== 'string') {
              throw new Error('AI返回结果格式错误或为空');
            }

            const usage = data?.usage || {};
            const inputTokens = typeof usage?.input_tokens === 'number' ? usage.input_tokens : undefined;
            const outputTokens = typeof usage?.output_tokens === 'number' ? usage.output_tokens : undefined;
            let tokensUsed =
              typeof inputTokens === 'number' && typeof outputTokens === 'number'
                ? inputTokens + outputTokens
                : undefined;
            const tokensEstimated = tokensUsed == null;
            if (tokensUsed == null) {
              const inputText = [systemPrompt, userPromptFinal].filter(Boolean).join('\n\n');
              tokensUsed = estimateTotalTokens(inputText, reading) ?? undefined;
            }

            const responseTimeMs = Date.now() - start;
            let cost: number | undefined;
            try {
              const cpk = Number((model as any)?.costPer1kTokens ?? 0);
              if (tokensUsed != null && Number.isFinite(cpk) && cpk > 0) {
                cost = Number(((tokensUsed * cpk) / 1000).toFixed(6));
              }
            } catch {
              // ignore cost calc error
            }

            try {
              logger.info('[Reading] success', { 模型: model.name, 提供商: (provider as any)?.name || 'unknown', 请求ID: data?.id ?? null });
            } catch (_) {}

            return {
              reading,
              modelId: (model as any).id ?? null,
              modelName: model.name,
              providerName: provider?.name || 'unknown',
              tokensUsed,
              tokensEstimated,
              cost,
              responseTimeMs,
              requestId: data?.id,
            };
          }

          throw lastErr instanceof Error ? lastErr : new Error('Anthropic 请求失败');
        }

        if (providerType === 'gemini') {
          const apiUrl = buildGeminiGenerateContentUrl(base, originalModelName);
          const combinedPrompt = systemPrompt ? `${systemPrompt}\n\n${userPromptFinal}` : userPromptFinal;

          const buildRequestBody = (outputTokens?: number) => {
            const generationConfig: any = {};
            if (typeof params.temperature === 'number') generationConfig.temperature = params.temperature;
            if (typeof params.top_p === 'number') generationConfig.topP = params.top_p;
            if (typeof outputTokens === 'number' && outputTokens > 0) generationConfig.maxOutputTokens = outputTokens;

            const body: any = {
              contents: [{ role: 'user', parts: [{ text: combinedPrompt }] }],
            };
            if (Object.keys(generationConfig).length > 0) body.generationConfig = generationConfig;
            return body;
          };

          const fetchOnce = async (outputTokens?: number) => {
            const resp = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey,
                'Accept': 'application/json',
              },
              body: JSON.stringify(buildRequestBody(outputTokens)),
            });
            if (!resp.ok) {
              const text = await resp.text().catch(() => '');
              throw new Error(`HTTP ${resp.status}: ${resp.statusText} ${text}`.trim());
            }
            return resp.json();
          };

          let data: any;
          if (typeof maxTokens === 'number' && maxTokens > 0) {
            try {
              data = await fetchOnce(maxTokens);
            } catch (e) {
              data = await fetchOnce(undefined);
            }
          } else {
            data = await fetchOnce(undefined);
          }

          const reading = extractGeminiText(data);
          if (!reading || typeof reading !== 'string') {
            throw new Error('AI返回结果格式错误或为空');
          }

          const usage = data?.usageMetadata || {};
          let tokensUsed = typeof usage?.totalTokenCount === 'number' ? usage.totalTokenCount : undefined;
          const tokensEstimated = tokensUsed == null;
          if (tokensUsed == null) {
            tokensUsed = estimateTotalTokens(combinedPrompt, reading) ?? undefined;
          }

          const responseTimeMs = Date.now() - start;
          let cost: number | undefined;
          try {
            const cpk = Number((model as any)?.costPer1kTokens ?? 0);
            if (tokensUsed != null && Number.isFinite(cpk) && cpk > 0) {
              cost = Number(((tokensUsed * cpk) / 1000).toFixed(6));
            }
          } catch {
            // ignore cost calc error
          }

          try {
            logger.info('[Reading] success', { 模型: model.name, 提供商: (provider as any)?.name || 'unknown' });
          } catch (_) {}

          return {
            reading,
            modelId: (model as any).id ?? null,
            modelName: model.name,
            providerName: provider?.name || 'unknown',
            tokensUsed,
            tokensEstimated,
            cost,
            responseTimeMs,
            requestId: undefined,
          };
        }

        const apiUrl = buildOpenAIChatCompletionsUrl(providerType, base);
        const resp = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (!resp.ok) {
          const text = await resp.text().catch(() => '');
          throw new Error(`HTTP ${resp.status}: ${resp.statusText} ${text}`.trim());
        }

        const data = await resp.json() as any;
        const reading = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text;
        if (!reading || typeof reading !== 'string') {
          throw new Error('AI返回结果格式错误或为空');
        }

        const usage = data?.usage || {};
        let tokensUsed =
          usage?.total_tokens ||
          (usage?.prompt_tokens && usage?.completion_tokens ? usage.prompt_tokens + usage.completion_tokens : undefined);
        const tokensEstimated = tokensUsed == null;
        if (tokensUsed == null) {
          const inputText = [systemPrompt, userPromptFinal].filter(Boolean).join('\n\n');
          tokensUsed = estimateTotalTokens(inputText, reading) ?? undefined;
        }
        const responseTimeMs = Date.now() - start;
        let cost: number | undefined;
        try {
          const cpk = Number((model as any)?.costPer1kTokens ?? 0);
          if (tokensUsed != null && Number.isFinite(cpk) && cpk > 0) {
            cost = Number(((tokensUsed * cpk) / 1000).toFixed(6));
          }
        } catch {
          // ignore cost calc error
        }

        try {
          logger.info('[Reading] success', { 模型: model.name, 提供商: (provider as any)?.name || 'unknown', 请求ID: data?.id ?? null });
        } catch (_) {}

        return {
          reading,
          modelId: (model as any).id ?? null,
          modelName: model.name,
          providerName: provider?.name || 'unknown',
          tokensUsed,
          tokensEstimated,
          cost,
          responseTimeMs,
          requestId: data?.id,
        };
      } catch (err) {
        logger.warn('模型调用失败，尝试下一个', {
          model: model?.name,
          provider: (model as any)?.provider?.name,
          error: err instanceof Error ? err.message : String(err),
        });
        errors.push({ model: model?.name, provider: (model as any)?.provider?.name, error: err instanceof Error ? err.message : String(err) });
        continue;
      }
    }

    // 全部失败
    const totalMs = Date.now() - startAll;
    logger.error('所有模型均调用失败', { totalMs, errors });
    throw createError('AI服务暂不可用，请稍后再试', 502, 'ALL_MODELS_FAILED');
  }
}
