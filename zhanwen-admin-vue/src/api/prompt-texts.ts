import request from '@/utils/http'

export interface PromptTexts {
  id: number
  name: string
  version: string
  active: boolean
  texts: {
    system_prompt: string
    user_intro: string
    user_guidelines: string
  }
  createdAt: string
  lastUsedAt?: string
  updatedAt: string
}

export interface PromptTextsQuery {
  name?: string
  version?: string
  active?: boolean
  page?: number
  pageSize?: number
}

// 公共：列表
export const getPromptTexts = (params?: PromptTextsQuery) => {
  return request.get<PromptTexts[]>({
    url: '/public/prompt-texts',
    params
  })
}

// 公共：获取活跃文本
export const getActivePromptTexts = (params?: PromptTextsQuery) => {
  return request.get<PromptTexts>({
    url: '/public/prompt-texts/active',
    params
  })
}

// 公共：详情
export const getPromptTextsDetail = (id: number) => {
  return request.get<PromptTexts>({
    url: `/public/prompt-texts/${id}`
  })
}

// 管理端：更新三段文本（需管理员JWT）
export const updatePromptTexts = (
  id: number,
  payload: {
    name?: string
    version?: string
    isActive?: boolean
    texts?: { system_prompt: string; user_intro: string; user_guidelines: string }
  }
) => {
  return request.put<PromptTexts>({
    url: `/api/prompt-texts/${id}`,
    data: payload
  })
}

// 管理端：复制三段文本
export const duplicatePromptTexts = (
  id: number,
  payload?: { newName?: string; newVersion?: string }
) => {
  return request.post<PromptTexts>({
    url: `/api/prompt-texts/${id}/duplicate`,
    data: payload
  })
}

// 管理端：删除三段文本
export const deletePromptTexts = (id: number) => {
  return request.del({
    url: `/api/prompt-texts/${id}`
  })
}
