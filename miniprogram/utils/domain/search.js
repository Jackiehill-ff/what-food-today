// 多关键词搜索：空格分隔，全部命中才算匹配
const splitKeywords = (query) =>
  query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

const matchesAllKeywords = (text, keywords) => keywords.every((keyword) => text.includes(keyword));

module.exports = { splitKeywords, matchesAllKeywords };
