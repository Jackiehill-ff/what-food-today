// 多关键词搜索：空格分隔，全部命中才算匹配
export const splitKeywords = (query: string): string[] =>
  query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

export const matchesAllKeywords = (text: string, keywords: string[]): boolean =>
  keywords.every((keyword) => text.includes(keyword));
