import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { encrypt } from '../src/utils/encryption';
import { generateApiKey } from '../src/utils/apiKey';

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化数据库...');

  // 1. 创建默认管理员用户
  const adminPasswordHash = await bcrypt.hash('admin123456', 10);
  
  const adminUser = await prisma.adminUser.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@divination.com',
      passwordHash: adminPasswordHash,
      fullName: '系统管理员',
      role: 'super_admin',
      permissions: [
        'ai_models:read', 'ai_models:create', 'ai_models:update', 'ai_models:delete',
        'prompts:read', 'prompts:create', 'prompts:update', 'prompts:delete',
        'configs:read', 'configs:create', 'configs:update', 'configs:delete',
        'hexagrams:read', 'hexagrams:create', 'hexagrams:update', 'hexagrams:delete',
        'analytics:read', 'users:read', 'users:create', 'users:update', 'users:delete',
        'api_keys:read', 'api_keys:create', 'api_keys:update', 'api_keys:delete'
      ],
      isActive: true,
    },
  });

  console.log('✅ 创建管理员用户:', adminUser.username);

  // 2. 创建AI服务服务商
  const providers = [
    {
      name: 'deepseek',
      displayName: 'DeepSeek',
      baseUrl: 'https://api.deepseek.com',
      supportedModels: ['deepseek-chat', 'deepseek-coder'],
      rateLimitRpm: 60,
      rateLimitTpm: 60000,
    },
    {
      name: 'openai',
      displayName: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1',
      supportedModels: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo'],
      rateLimitRpm: 60,
      rateLimitTpm: 60000,
    },
    {
      name: 'anthropic',
      displayName: 'Anthropic',
      baseUrl: 'https://api.anthropic.com',
      supportedModels: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
      rateLimitRpm: 60,
      rateLimitTpm: 60000,
    },
  ];

  for (const provider of providers) {
    const createdProvider = await prisma.aiProvider.upsert({
      where: { name: provider.name },
      update: {},
      create: provider,
    });
    console.log('✅ 创建AI服务商:', createdProvider.displayName);
  }

  // 3. 创建默认AI模型配置
  const deepseekProvider = await prisma.aiProvider.findUnique({
    where: { name: 'deepseek' }
  });

  if (deepseekProvider) {
    // 从环境变量或配置中获取API密钥
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY || 'sk-052946e9f1cd46fcb5af103c6033220c';
    const encryptedApiKey = encrypt(deepseekApiKey);

    await prisma.aiModel.upsert({
      where: {
        providerId_name: {
          providerId: deepseekProvider.id,
          name: 'deepseek-chat'
        }
      },
      update: {
        // 更新API密钥和参数
        apiKeyEncrypted: encryptedApiKey,
        parameters: {
          temperature: 0.7,
          max_tokens: 0,
          top_p: 1.0,
          frequency_penalty: 0.0,
          presence_penalty: 0.0,
          stream: false,
        },
        role: 'primary',
        priority: 1,
        isActive: true,
      },
      create: {
        providerId: deepseekProvider.id,
        name: 'deepseek-chat',
        displayName: 'DeepSeek Chat',
        apiKeyEncrypted: encryptedApiKey,
        modelType: 'chat',
        parameters: {
          temperature: 0.7,
          max_tokens: 0,
          top_p: 1.0,
          frequency_penalty: 0.0,
          presence_penalty: 0.0,
          stream: false,
        },
        role: 'primary',
        priority: 1,
        costPer1kTokens: 0.002,
        contextWindow: 32000,
        isActive: true,
      },
    });
    console.log('✅ 创建AI模型: DeepSeek Chat (已配置API密钥)');
  }

  // 4. 创建默认提示词模板
  const systemPrompt = await prisma.promptTemplate.upsert({
    where: { 
      name_version: {
        name: '六壬金口诀系统提示词',
        version: 1
      }
    },
    update: {},
    create: {
      name: '六壬金口诀系统提示词',
      type: 'system',
      category: 'divination',
      systemPrompt: `你是一名经验丰富的易学专家，精通六壬金口诀占卜术。你的任务是根据用户提供的卦象信息，给出专业、准确、有建设性的解读。

请遵循以下原则：
1. 基于传统六壬金口诀理论进行解读
2. 语言通俗易懂，避免过于深奥的术语
3. 既要指出问题，也要提供建设性建议
4. 保持客观中性，不做绝对化判断
5. 结合现代生活实际情况

解读格式要求：
- 使用"一、二、三、四、五"等中文数字标题
- 每个部分内容详实，逻辑清晰
- 包含宜忌建议和化解方法`,
      version: 1,
      status: 'active',
      description: '六壬金口诀占卜的标准系统提示词',
      tags: ['六壬', '金口诀', '占卜', '系统提示词'],
      createdBy: adminUser.id,
    },
  });

  console.log('✅ 创建提示词模板:', systemPrompt.name);

  // 5. 创建卦象数据
  const hexagrams = [
    {
      name: '大安',
      element: 'wood',
      description: '大安卦象征平安吉祥，事业稳定发展',
      interpretation: '大安为木，主静，主安稳。凡事宜守不宜动，静中有吉。',
      favorableActions: ['守成', '学习', '养生', '储蓄'],
      unfavorableActions: ['冒险', '投机', '争斗', '急躁'],
      timeInfo: { season: '春季', months: [1, 2, 3] },
      directionInfo: { direction: '东方', color: '青绿色' },
      resolutionMethods: ['多行善事', '保持耐心', '稳扎稳打'],
    },
    {
      name: '留连',
      element: 'earth',
      description: '留连卦象征拖延迟缓，需要耐心等待',
      interpretation: '留连为土，主迟，主牵连。凡事多有阻滞，需要耐心。',
      favorableActions: ['等待', '思考', '准备', '积累'],
      unfavorableActions: ['急进', '强求', '冲动', '放弃'],
      timeInfo: { season: '长夏', months: [6, 7, 8] },
      directionInfo: { direction: '中央', color: '黄色' },
      resolutionMethods: ['保持耐心', '完善计划', '寻求帮助'],
    },
    {
      name: '速喜',
      element: 'fire',
      description: '速喜卦象征快速成功，喜事临门',
      interpretation: '速喜为火，主快，主喜庆。凡事来得快，宜把握时机。',
      favorableActions: ['行动', '决断', '表达', '庆祝'],
      unfavorableActions: ['犹豫', '拖延', '消极', '保守'],
      timeInfo: { season: '夏季', months: [4, 5, 6] },
      directionInfo: { direction: '南方', color: '红色' },
      resolutionMethods: ['把握机会', '积极行动', '保持热情'],
    },
    {
      name: '赤口',
      element: 'metal',
      description: '赤口卦象征口舌是非，需要谨慎言行',
      interpretation: '赤口为金，主凶，主口舌。凡事多有争执，宜谨言慎行。',
      favorableActions: ['谨慎', '忍让', '化解', '沟通'],
      unfavorableActions: ['争论', '冲突', '多言', '固执'],
      timeInfo: { season: '秋季', months: [7, 8, 9] },
      directionInfo: { direction: '西方', color: '白色' },
      resolutionMethods: ['谨言慎行', '化干戈为玉帛', '寻求和解'],
    },
    {
      name: '小吉',
      element: 'water',
      description: '小吉卦象征小有收获，渐进发展',
      interpretation: '小吉为水，主吉，主和谐。凡事小有所成，宜循序渐进。',
      favorableActions: ['渐进', '合作', '学习', '调和'],
      unfavorableActions: ['贪大', '急功', '独断', '极端'],
      timeInfo: { season: '冬季', months: [10, 11, 12] },
      directionInfo: { direction: '北方', color: '黑色' },
      resolutionMethods: ['循序渐进', '团结合作', '保持谦逊'],
    },
    {
      name: '空亡',
      element: 'earth',
      description: '空亡卦象征虚无缥缈，需要重新规划',
      interpretation: '空亡为土，主空，主虚无。凡事多有变数，宜重新审视。',
      favorableActions: ['反思', '规划', '调整', '休息'],
      unfavorableActions: ['盲动', '投资', '决断', '冒险'],
      timeInfo: { season: '四季末', months: [3, 6, 9, 12] },
      directionInfo: { direction: '中央', color: '土黄色' },
      resolutionMethods: ['重新规划', '调整方向', '寻找新机会'],
    },
  ];

  for (const hexagram of hexagrams) {
    const created = await prisma.hexagramData.upsert({
      where: { name: hexagram.name },
      update: {},
      create: hexagram,
    });
    console.log('✅ 创建卦象数据:', created.name);
  }

  // 6. 创建五行关系
  const elementRelations = [
    // 相生关系
    { sourceElement: 'wood', targetElement: 'fire', relationType: 'generate', strength: 5, description: '木生火' },
    { sourceElement: 'fire', targetElement: 'earth', relationType: 'generate', strength: 5, description: '火生土' },
    { sourceElement: 'earth', targetElement: 'metal', relationType: 'generate', strength: 5, description: '土生金' },
    { sourceElement: 'metal', targetElement: 'water', relationType: 'generate', strength: 5, description: '金生水' },
    { sourceElement: 'water', targetElement: 'wood', relationType: 'generate', strength: 5, description: '水生木' },
    
    // 相克关系
    { sourceElement: 'wood', targetElement: 'earth', relationType: 'overcome', strength: 4, description: '木克土' },
    { sourceElement: 'earth', targetElement: 'water', relationType: 'overcome', strength: 4, description: '土克水' },
    { sourceElement: 'water', targetElement: 'fire', relationType: 'overcome', strength: 4, description: '水克火' },
    { sourceElement: 'fire', targetElement: 'metal', relationType: 'overcome', strength: 4, description: '火克金' },
    { sourceElement: 'metal', targetElement: 'wood', relationType: 'overcome', strength: 4, description: '金克木' },
  ];

  for (const relation of elementRelations) {
    await prisma.elementRelation.upsert({
      where: {
        sourceElement_targetElement: {
          sourceElement: relation.sourceElement,
          targetElement: relation.targetElement,
        }
      },
      update: {},
      create: relation,
    });
  }

  console.log('✅ 创建五行关系数据');

  // 7. 创建默认应用配置
  const defaultConfigs = [
    {
      platform: 'web',
      configKey: 'theme',
      configValue: {
        primary: '#1890ff',
        secondary: '#722ed1',
        chinese: {
          wood: '#7FB069',
          fire: '#8C1F28', 
          earth: '#D4AF37',
          metal: '#E1D4BB',
          water: '#3A5472'
        }
      },
      category: 'ui',
      description: '主题颜色配置',
    },
    {
      platform: 'web',
      configKey: 'features',
      configValue: {
        enableAI: true,
        enableShare: true,
        enableHistory: true,
        enableAnalytics: true
      },
      category: 'features',
      description: '功能开关配置',
    },
    // AI 提示词配置（可编辑文本），用于公开接口 /public/configs/web 返回
    {
      platform: 'web',
      configKey: 'ai_prompt.system.zh-CN',
      configValue: '你是一名经验丰富的易学专家，精通小六壬占卜的解读和应用。你有多年研究传统中国预测学的经验，能够从卦象中解读出深刻的含义并给予有益的指导。',
      dataType: 'string',
      category: 'ai_prompt',
      description: 'system 提示词（zh-CN）',
      isActive: true,
    },
    {
      platform: 'web',
      configKey: 'ai_prompt.user.head.zh-CN',
      configValue: '我需要你根据以下小六壬卦象信息，提供一个详细的解读。',
      dataType: 'string',
      category: 'ai_prompt',
      description: '用户提示词开头文案（zh-CN）',
      isActive: true,
    },
    {
      platform: 'web',
      configKey: 'ai_prompt.user.guide.zh-CN',
      configValue: `请给出详细的解读，包括以下内容：
1. 卦象综合解析（包括三宫关系和互动的深层含义）
2. 对用户问题的针对性回答（如果有问题）
3. 宜忌建议
4. 未来发展趋势
5. 化解方法或行动建议
如果是标题，请用中文数字+顿号开头，如“一、”；副标题，请用中文数字+.开头，如“1.”；内容，如果有顺序请用如“①②③④⑤⑥⑦⑧⑨⑩” 无顺序用“-”`,
      dataType: 'string',
      category: 'ai_prompt',
      description: '用户提示词“格式与内容要求”文案（zh-CN）',
      isActive: true,
    },
  ];

  for (const config of defaultConfigs) {
    await prisma.appConfig.upsert({
      where: {
        platform_configKey: {
          platform: config.platform,
          configKey: config.configKey,
        }
      },
      update: {},
      create: config,
    });
  }

  console.log('✅ 创建默认应用配置');

  // 8. 创建默认API Key（按名称查找，若不存在则创建）
  const existingDefaultApiKey = await prisma.apiKey.findFirst({
    where: { name: '默认应用API Key' },
  });
  const defaultApiKey = existingDefaultApiKey
    ? existingDefaultApiKey
    : await prisma.apiKey.create({
        data: {
          name: '默认应用API Key',
          key: generateApiKey(),
          permissions: [
            'configs:read',
            'ai_models:read',
            'prompts:read',
            'divination:analyze',
          ],
          description: '用于应用端获取配置与解读的默认API Key',
          isActive: true,
        },
      });

  console.log('✅ 创建默认API Key:', defaultApiKey.name);

  console.log('🎉 数据库初始化完成！');
  console.log('📋 默认管理员账号:');
  console.log('   用户名: admin');
  console.log('   密码: admin123456');
  console.log('   邮箱: admin@divination.com');
  console.log('🔑 默认API Key:', defaultApiKey.key);
}

main()
  .catch((e) => {
    console.error('❌ 数据库初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
