import { prisma } from '@/lib/prisma';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/error.middleware';
import { AIModelService } from '@/services/ai-model.service';

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
  responseTimeMs: number;
  requestId?: string;
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

function buildTerminologyGlossary(targetLang: string): string {
  const lines: string[] = [];
  const lang = (targetLang || '').toLowerCase();
  if (lang.startsWith('en')) {
    lines.push('术语对照表：');
    lines.push('大安=Great Peace');
    lines.push('留连=Lingering');
    lines.push('速喜=Swift Joy');
    lines.push('赤口=Red Mouth');
    lines.push('小吉=Lesser Auspice');
    lines.push('空亡=Void');
    lines.push('五行：木=Wood, 火=Fire, 土=Earth, 金=Metal, 水=Water');
    lines.push('六神：青龙=Azure Dragon, 朱雀=Vermilion Bird, 勾陈=Gou Chen, 腾蛇=Soaring Snake, 白虎=White Tiger, 玄武=Black Tortoise');
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

function buildFullApiUrl(providerName: string, baseUrl: string): string {
  if (!baseUrl) return baseUrl;
  let full = baseUrl.trim();
  if (/\/v1\/chat\/completions\/?$/.test(full) || /\/chat\/completions\/?$/.test(full)) {
    return full;
  }
  const endsWithSlash = full.endsWith('/');
  if ((providerName || '').toLowerCase() === 'deepseek') {
    return endsWithSlash ? full + 'chat/completions' : full + '/chat/completions';
  }
  if (full.endsWith('/v1')) {
    return full + '/chat/completions';
  }
  if (endsWithSlash) {
    return full + 'v1/chat/completions';
  }
  return full + '/v1/chat/completions';
}

function buildUserPrompt(result: any, userIntro: string, userGuidelines: string): string {
  const threePalaces = result?.threePalaces;
  let prompt = `${userIntro}\n`;

  const currentTime = new Date();
  const timeString = currentTime.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'Asia/Shanghai'
  } as any);
  prompt += `\n起卦时间: ${timeString}\n`;

  if (result?.query) {
    prompt += `\n用户占问: ${result.query}\n`;
  }

  if (threePalaces) {
    try {
      const sky = threePalaces.skyPalace?.hexagram;
      const earth = threePalaces.earthPalace?.hexagram;
      const human = threePalaces.humanPalace?.hexagram;
      prompt += `\n三宫卦信息：\n`
        + `天宫: ${sky?.name || '-'} (五行:${convertElementToChinese(sky?.element)}) (六神:${sky?.sixGod || '未知'})\n`
        + `地宫: ${earth?.name || '-'} (五行:${convertElementToChinese(earth?.element)}) (六神:${earth?.sixGod || '未知'})\n`
        + `人宫: ${human?.name || '-'} (五行:${convertElementToChinese(human?.element)}) (六神:${human?.sixGod || '未知'})\n`;
    } catch (e) {
      // ignore
    }
  }

  prompt += `\n${userGuidelines}`;
  return prompt;
}

async function getActivePromptTexts(): Promise<{ system_prompt: string; user_intro: string; user_guidelines: string } | null> {
  try {
    const t = await prisma.promptText.findFirst({
      where: { isActive: true },
      orderBy: [{ updatedAt: 'desc' }],
      select: { texts: true }
    });
    if (!t) return null;
    const texts: any = (t as any).texts || {};
    return {
      system_prompt: texts.system_prompt || '你是一名经验丰富的易学专家，精通小六壬占卜的解读和应用。你有多年研究传统中国预测学的经验，能够从卦象中解读出深刻的含义并给予有益的指导。',
      user_intro: texts.user_intro || '我需要你根据以下小六壬卦象信息，提供一个详细的解读。',
      user_guidelines: texts.user_guidelines || '请给出详细的解读，包括以下内容：\n1. 卦象综合解析（包括三宫关系和互动的深层含义）\n2. 对用户问题的针对性回答（如果有问题）\n3. 宜忌建议\n4. 未来发展趋势\n5. 化解方法或行动建议\n如果是标题，请用中文数字+顿号开头，如“一、”；副标题，请用中文数字+.开头，如“1.”；内容，如果有顺序请用如“①②③④⑤⑥⑦⑧⑨⑩” 无顺序用“-”',
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
      prompts?.user_guidelines || '请给出详细的解读，包括以下内容：\n1. 卦象综合解析（包括三宫关系和互动的深层含义）\n2. 对用户问题的针对性回答（如果有问题）\n3. 宜忌建议\n4. 未来发展趋势\n5. 化解方法或行动建议\n如果是标题，请用中文数字+顿号开头，如“一、”；副标题，请用中文数字+.开头，如“1.”；内容，如果有顺序请用如“①②③④⑤⑥⑦⑧⑨⑩” 无顺序用“-”'
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
        const apiKey = (model as any).apiKeyEncrypted || null; // 这里字段已在AIModelService中解密
        if (!apiKey || String(apiKey).trim() === '') {
          throw new Error('模型未配置API密钥');
        }

        const base = (model as any).customApiUrl || provider?.baseUrl;
        const apiUrl = buildFullApiUrl((provider?.name || '').toLowerCase(), base);

        const params = (model as any).parameters || {};
        const originalModelName = String(model.name || '');
        let targetModel = originalModelName;
        let reasoningEffort: 'minimal' | 'low' | 'medium' | 'high' | undefined;
        const g5 = originalModelName.match(/^gpt-5(?:-(minimal|low|medium|high))?$/i);
        if (g5) {
          targetModel = 'gpt-5';
          if (g5[1]) reasoningEffort = g5[1].toLowerCase() as any;
        }
        const provName = (provider as any)?.name ? String((provider as any).name).toLowerCase() : 'unknown';
        let maxTokens: number | undefined = typeof params.max_tokens === 'number' ? params.max_tokens : undefined;
        if (provName === 'deepseek') {
          if (typeof maxTokens !== 'number') maxTokens = 2048;
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
        const tokensUsed = usage?.total_tokens || (usage?.prompt_tokens && usage?.completion_tokens ? usage.prompt_tokens + usage.completion_tokens : undefined);
        const responseTimeMs = Date.now() - start;

        try {
          logger.info('[Reading] success', { 模型: model.name, 提供商: (provider as any)?.name || 'unknown', 请求ID: data?.id ?? null });
        } catch (_) {}

        return {
          reading,
          modelId: (model as any).id ?? null,
          modelName: model.name,
          providerName: provider?.name || 'unknown',
          tokensUsed,
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
