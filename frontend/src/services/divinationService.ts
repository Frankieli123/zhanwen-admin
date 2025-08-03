import AIConfigService, { AIModelConfig } from './aiConfigService';

// 占卜结果接口
export interface DivinationResult {
  id: string;
  query?: string;
  hexagram: {
    name: string;
    element: string;
    sixGod?: string;
  };
  threePalaces?: {
    skyPalace: { hexagram: any };
    earthPalace: { hexagram: any };
    humanPalace: { hexagram: any };
  };
  aiReading?: string;
  timestamp: number;
}

// DeepSeek API请求接口
interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekRequest {
  model: string;
  messages: DeepSeekMessage[];
  stream: boolean;
  temperature?: number;
  max_tokens?: number;
}

interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: DeepSeekMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 占卜服务 - 使用动态AI配置
 */
export class DivinationService {
  /**
   * 生成卦象解读的提示模板
   */
  private static generatePrompt(result: DivinationResult): string {
    const hexagram = result.hexagram;
    const threePalaces = result.threePalaces;

    let prompt = `我需要你根据以下小六壬卦象信息，提供一个详细的解读。\n`;

    // 添加起卦时间信息
    const currentTime = new Date();
    const timeString = currentTime.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Shanghai'
    });
    prompt += `\n起卦时间: ${timeString}\n`;

    // 用户问题
    if (result.query) {
      prompt += `\n用户占问: ${result.query}\n`;
    }

    // 三宫卦信息
    if (threePalaces) {
      prompt += `\n三宫卦信息：
天宫: ${threePalaces.skyPalace.hexagram.name} (五行:${this.convertElementToChinese(threePalaces.skyPalace.hexagram.element)}) (六神:${threePalaces.skyPalace.hexagram.sixGod || '未知'})
地宫: ${threePalaces.earthPalace.hexagram.name} (五行:${this.convertElementToChinese(threePalaces.earthPalace.hexagram.element)}) (六神:${threePalaces.earthPalace.hexagram.sixGod || '未知'})
人宫: ${threePalaces.humanPalace.hexagram.name} (五行:${this.convertElementToChinese(threePalaces.humanPalace.hexagram.element)}) (六神:${threePalaces.humanPalace.hexagram.sixGod || '未知'})
`;
    }

    prompt += `\n请给出详细的解读，包括以下内容：
1. 卦象综合解析（包括三宫关系和互动的深层含义）
2. 对用户问题的针对性回答（如果有问题）
3. 宜忌建议
4. 未来发展趋势
5. 化解方法或行动建议
如果是标题，请用中文数字+顿号开头，如"一、"；副标题，请用中文数字+.开头，如"1."；内容，如果有顺序请用如"①②③④⑤⑥⑦⑧⑨⑩" 无顺序用"-"
`;

    return prompt;
  }

  /**
   * 将五行英文名称转换为中文
   */
  private static convertElementToChinese(element: string): string {
    switch (element) {
      case 'wood': return '木';
      case 'fire': return '火';
      case 'earth': return '土';
      case 'metal': return '金';
      case 'water': return '水';
      default: return element || '未知';
    }
  }

  /**
   * 调用AI API获取卦象解读
   */
  static async getHexagramReading(result: DivinationResult): Promise<string> {
    try {
      // 获取当前AI配置
      const apiConfig = await AIConfigService.getAPIConfig();
      
      if (!apiConfig) {
        throw new Error('未找到有效的AI配置，请联系管理员配置AI模型');
      }

      console.log('DivinationService: 使用AI配置', {
        model: apiConfig.model,
        apiUrl: apiConfig.apiUrl,
        hasApiKey: !!apiConfig.apiKey,
      });

      const prompt = this.generatePrompt(result);

      const request: DeepSeekRequest = {
        model: apiConfig.model,
        messages: [
          { 
            role: 'system', 
            content: '你是一名经验丰富的易学专家，精通小六壬占卜的解读和应用。你有多年研究传统中国预测学的经验，能够从卦象中解读出深刻的含义并给予有益的指导。' 
          },
          { role: 'user', content: prompt }
        ],
        stream: false,
        temperature: apiConfig.parameters.temperature || 0.7,
        max_tokens: apiConfig.parameters.max_tokens || 3000,
      };

      console.log('DivinationService: 发送API请求');

      const response = await fetch(apiConfig.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.apiKey}`
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('DivinationService: API返回错误', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });

        throw new Error(`AI API调用失败: ${response.status} - ${errorText}`);
      }

      const data: DeepSeekResponse = await response.json();
      console.log('DivinationService: API调用成功');

      const readingContent = data.choices[0].message.content;
      return readingContent;

    } catch (error) {
      console.error('DivinationService: 获取卦象解读失败', error);
      
      // 如果是配置问题，提供更友好的错误信息
      if (error instanceof Error && error.message.includes('未找到有效的AI配置')) {
        throw error;
      }
      
      throw new Error('获取卦象解读失败，请稍后重试');
    }
  }

  /**
   * 带故障转移的AI调用
   */
  static async getHexagramReadingWithFallback(result: DivinationResult): Promise<string> {
    try {
      // 获取模型选择策略
      const strategy = await AIConfigService.getModelSelectionStrategy();
      
      if (strategy.models.length === 0) {
        throw new Error('未找到可用的AI模型配置');
      }

      console.log('DivinationService: 使用故障转移策略', {
        modelsCount: strategy.models.length,
        strategy: strategy.strategy,
      });

      // 尝试每个模型
      for (let i = 0; i < strategy.models.length; i++) {
        const model = strategy.models[i];
        
        try {
          console.log(`DivinationService: 尝试模型 ${i + 1}/${strategy.models.length}: ${model.displayName}`);
          
          // 临时设置当前模型为主模型来获取配置
          const apiConfig = await this.getModelAPIConfig(model);
          const reading = await this.callAIAPI(result, apiConfig);
          
          console.log(`DivinationService: 模型 ${model.displayName} 调用成功`);
          return reading;
          
        } catch (modelError) {
          console.warn(`DivinationService: 模型 ${model.displayName} 调用失败`, modelError);
          
          // 如果不是最后一个模型，继续尝试下一个
          if (i < strategy.models.length - 1) {
            continue;
          } else {
            // 最后一个模型也失败了，抛出错误
            throw modelError;
          }
        }
      }
      
      throw new Error('所有AI模型都不可用');
      
    } catch (error) {
      console.error('DivinationService: 故障转移调用失败', error);
      throw error;
    }
  }

  /**
   * 获取特定模型的API配置
   */
  private static getModelAPIConfig(model: AIModelConfig) {
    let apiUrl = model.provider.baseUrl;
    if (model.provider.name === 'deepseek') {
      apiUrl = apiUrl.endsWith('/') ? apiUrl + 'chat/completions' : apiUrl + '/chat/completions';
    } else if (model.provider.name === 'openai') {
      apiUrl = apiUrl.endsWith('/') ? apiUrl + 'chat/completions' : apiUrl + '/chat/completions';
    }

    return {
      apiUrl,
      apiKey: model.apiKeyEncrypted || '',
      model: model.name,
      parameters: model.parameters,
    };
  }

  /**
   * 调用AI API
   */
  private static async callAIAPI(result: DivinationResult, apiConfig: any): Promise<string> {
    const prompt = this.generatePrompt(result);

    const request: DeepSeekRequest = {
      model: apiConfig.model,
      messages: [
        { 
          role: 'system', 
          content: '你是一名经验丰富的易学专家，精通小六壬占卜的解读和应用。你有多年研究传统中国预测学的经验，能够从卦象中解读出深刻的含义并给予有益的指导。' 
        },
        { role: 'user', content: prompt }
      ],
      stream: false,
      temperature: apiConfig.parameters.temperature || 0.7,
      max_tokens: apiConfig.parameters.max_tokens || 3000,
    };

    const response = await fetch(apiConfig.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API调用失败: ${response.status} - ${errorText}`);
    }

    const data: DeepSeekResponse = await response.json();
    return data.choices[0].message.content;
  }
}

export default DivinationService;
