import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { parseHTML } from 'linkedom';

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const sanitizeRichText = (value) => String(value)
  .split(/(<br\s*\/?\s*>|<\/?em>)/gi)
  .map((part) => {
    if (/^<br\s*\/?\s*>$/i.test(part)) return '<br />';
    if (/^<em>$/i.test(part)) return '<em>';
    if (/^<\/em>$/i.test(part)) return '</em>';
    return escapeHtml(part);
  })
  .join('');

const validateEmphasis = (page, field) => {
  if (field.mode !== 'html') return;
  let depth = 0;
  for (const tag of String(field.value).match(/<\/?em>/gi) ?? []) {
    depth += /^<em>$/i.test(tag) ? 1 : -1;
    if (depth < 0) throw new Error(`${page.id}.${field.key}: closing emphasis tag has no opening tag`);
  }
  if (depth !== 0) throw new Error(`${page.id}.${field.key}: emphasis tags are not balanced`);
};

const visibleText = (value) => String(value)
  .replace(/<[^>]*>/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const validateField = (page, field) => {
  if (!field.key || !field.label || !field.selector || !field.mode) {
    throw new Error(`${page.id}: content field is missing key, label, selector or mode`);
  }

  const values = Array.isArray(field.value) ? field.value : [field.value];
  for (const value of values) {
    if (typeof value !== 'string') throw new Error(`${page.id}.${field.key}: value must be a string`);
    if (visibleText(value).endsWith('.')) {
      throw new Error(`${page.id}.${field.key}: terminal periods are not allowed`);
    }
  }
  validateEmphasis(page, field);
};

const applyField = (document, page, field) => {
  validateField(page, field);
  const element = document.querySelector(field.selector);
  if (!element) throw new Error(`${page.id}.${field.key}: selector not found: ${field.selector}`);

  if (field.mode === 'html') {
    element.innerHTML = sanitizeRichText(field.value);
    return;
  }

  if (field.mode === 'text') {
    element.textContent = field.value;
    return;
  }

  if (field.mode === 'attribute') {
    if (!field.attribute) throw new Error(`${page.id}.${field.key}: attribute name is required`);
    element.setAttribute(field.attribute, field.value);
    return;
  }

  if (field.mode === 'list') {
    if (!Array.isArray(field.value)) throw new Error(`${page.id}.${field.key}: list value must be an array`);
    element.replaceChildren(...field.value.map((item) => {
      const listItem = document.createElement('li');
      listItem.textContent = item;
      return listItem;
    }));
    return;
  }

  throw new Error(`${page.id}.${field.key}: unsupported mode ${field.mode}`);
};

export const applyContent = (projectRoot) => {
  const root = resolve(projectRoot);
  const distRoot = resolve(root, 'dist');
  const sourcePath = resolve(root, 'content/site.json');
  const content = JSON.parse(readFileSync(sourcePath, 'utf8'));

  if (content.schemaVersion !== 1 || !Array.isArray(content.pages)) {
    throw new Error('content/site.json has an unsupported schema');
  }

  const pageIds = new Set();
  for (const page of content.pages) {
    if (!page.id || pageIds.has(page.id)) throw new Error(`Duplicate or missing page id: ${page.id}`);
    pageIds.add(page.id);

    const outputPath = resolve(distRoot, page.file);
    if (!outputPath.startsWith(`${distRoot}${sep}`) && outputPath !== distRoot) {
      throw new Error(`${page.id}: output path escapes dist`);
    }

    const html = readFileSync(outputPath, 'utf8');
    const { document } = parseHTML(html);
    const fieldKeys = new Set();
    for (const field of page.fields) {
      if (fieldKeys.has(field.key)) throw new Error(`${page.id}: duplicate field key ${field.key}`);
      fieldKeys.add(field.key);
      applyField(document, page, field);
    }

    writeFileSync(outputPath, document.toString());
  }

  const publicContentPath = resolve(distRoot, 'content/site.json');
  mkdirSync(dirname(publicContentPath), { recursive: true });
  copyFileSync(sourcePath, publicContentPath);
};
