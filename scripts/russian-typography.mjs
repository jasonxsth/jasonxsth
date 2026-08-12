const bindToNext = [
  'а', 'без', 'в', 'во', 'для', 'до', 'за', 'и', 'из', 'или', 'к', 'ко',
  'на', 'над', 'не', 'ни', 'но', 'о', 'об', 'обо', 'от', 'по', 'под',
  'пред', 'при', 'про', 'с', 'со', 'у',
];

const wordPattern = bindToNext
  .sort((a, b) => b.length - a.length)
  .join('|');

const hangingWordPattern = new RegExp(
  `(?<![\\p{L}\\p{N}])(${wordPattern})[ \\t\\r\\n]+(?=[\\p{L}\\p{N}«„"'])`,
  'giu',
);

const rawTextTags = new Set(['script', 'style', 'textarea', 'pre', 'code', 'noscript']);

export const bindRussianServiceWords = (text) => String(text).replace(
  hangingWordPattern,
  (_match, word) => `${word}\u00A0`,
);

const transformTextNodes = (html, transform) => {
  let result = '';
  let cursor = 0;
  let rawTextTag = '';

  for (const match of html.matchAll(/<[^>]*>/g)) {
    const tag = match[0];
    const text = html.slice(cursor, match.index);
    result += rawTextTag ? text : transform(text);
    result += tag;

    const tagName = tag.match(/^<\s*(\/?)\s*([a-z0-9-]+)/i);
    if (tagName) {
      const [, closing, nameValue] = tagName;
      const name = nameValue.toLowerCase();
      if (closing && rawTextTag === name) rawTextTag = '';
      else if (!closing && rawTextTags.has(name) && !/\/\s*>$/.test(tag)) rawTextTag = name;
    }

    cursor = match.index + tag.length;
  }

  const tail = html.slice(cursor);
  return result + (rawTextTag ? tail : transform(tail));
};

export const applyRussianTypography = (html) => {
  const bodyStart = html.search(/<body[\s>]/i);
  if (bodyStart === -1) return html;

  const contentStart = html.indexOf('>', bodyStart) + 1;
  const contentEnd = html.lastIndexOf('</body>');
  if (contentStart === 0 || contentEnd === -1) return html;

  const body = html.slice(contentStart, contentEnd);
  const fixedBody = transformTextNodes(body, bindRussianServiceWords);

  return `${html.slice(0, contentStart)}${fixedBody}${html.slice(contentEnd)}`;
};

export const findHangingRussianWords = (html) => {
  const bodyStart = html.search(/<body[\s>]/i);
  if (bodyStart === -1) return [];

  const contentStart = html.indexOf('>', bodyStart) + 1;
  const contentEnd = html.lastIndexOf('</body>');
  if (contentStart === 0 || contentEnd === -1) return [];

  const findings = [];
  transformTextNodes(html.slice(contentStart, contentEnd), (text) => {
    for (const match of text.matchAll(hangingWordPattern)) findings.push(match[1]);
    return text;
  });
  return findings;
};
