const repository = {
  owner: 'jasonxsth',
  name: 'jasonxsth',
  branch: 'master',
  contentPath: 'content/site.json',
};

const apiUrl = `https://api.github.com/repos/${repository.owner}/${repository.name}/contents/${repository.contentPath}`;
const sessionTokenKey = 'rendart-admin-github-token';

const elements = {
  authForm: document.querySelector('[data-auth-form]'),
  authDescription: document.querySelector('[data-auth-description]'),
  authIndicator: document.querySelector('[data-auth-indicator]'),
  connectionState: document.querySelector('[data-connection-state]'),
  contentForm: document.querySelector('[data-content-form]'),
  disconnect: document.querySelector('[data-disconnect]'),
  message: document.querySelector('[data-system-message]'),
  pageKicker: document.querySelector('[data-page-kicker]'),
  pageNav: document.querySelector('[data-page-nav]'),
  pageTitle: document.querySelector('[data-page-title]'),
  save: document.querySelector('[data-save]'),
  changeCount: document.querySelector('[data-change-count]'),
};

let content;
let originalContent;
let activePageId = 'home';
let githubToken = '';
let remoteSha = '';
let connected = false;
let busy = false;

const clone = (value) => JSON.parse(JSON.stringify(value));

const decodeBase64Utf8 = (value) => {
  const binary = atob(value.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

const encodeBase64Utf8 = (value) => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
};

const entries = (source) => source
  ? [source.global, ...source.pages, ...source.cases].filter(Boolean)
  : [];
const findPage = (source, pageId) => entries(source).find((page) => page.id === pageId);
const findField = (source, pageId, fieldKey) => findPage(source, pageId)?.fields?.find((field) => field.key === fieldKey);

const fieldIsDirty = (pageId, fieldKey) => {
  const current = findField(content, pageId, fieldKey)?.value;
  const original = findField(originalContent, pageId, fieldKey)?.value;
  return JSON.stringify(current) !== JSON.stringify(original);
};

const getDirtyFields = () => {
  if (!content || !originalContent) return [];
  return entries(content).flatMap((page) => page.fields
    .filter((field) => fieldIsDirty(page.id, field.key))
    .map((field) => ({ page, field })));
};

const setMessage = (message = '', type = '') => {
  elements.message.textContent = message;
  elements.message.className = 'system-message';
  if (!message) return;
  elements.message.classList.add('is-visible');
  if (type) elements.message.classList.add(`is-${type}`);
};

const setMessageWithLink = (message, label, href) => {
  elements.message.replaceChildren(document.createTextNode(`${message} `));
  const link = document.createElement('a');
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = label;
  link.style.textDecoration = 'underline';
  elements.message.append(link);
  elements.message.className = 'system-message is-visible is-success';
};

const validateContent = () => {
  if (content?.schemaVersion !== 2 || !content.global || !Array.isArray(content.pages) || !Array.isArray(content.cases)) {
    throw new Error('Файл контента имеет неподдерживаемую структуру');
  }

  const identifiers = new Set();
  for (const page of entries(content)) {
    if (!page.id || identifiers.has(page.id)) throw new Error('Идентификаторы разделов контента должны быть уникальными');
    identifiers.add(page.id);
    if (!Array.isArray(page.fields)) throw new Error(`${page.label}: поля контента не найдены`);
    for (const field of page.fields) {
      const values = Array.isArray(field.value) ? field.value : [field.value];
      for (const value of values) {
        if (typeof value !== 'string') throw new Error(`${page.label} / ${field.label}: значение должно быть текстом`);
      }

      if (field.mode === 'html') {
        const unsupportedTags = String(field.value)
          .replace(/<br\s*\/?>/gi, '')
          .replace(/<\/?em>/gi, '')
          .match(/<[^>]+>/g);
        if (unsupportedTags) throw new Error(`${page.label} / ${field.label}: разрешены только теги <br> и <em>`);

        let emphasisDepth = 0;
        for (const tag of String(field.value).match(/<\/?em>/gi) ?? []) {
          emphasisDepth += /^<em>$/i.test(tag) ? 1 : -1;
          if (emphasisDepth < 0) throw new Error(`${page.label} / ${field.label}: закрывающий <em> не имеет открывающего тега`);
        }
        if (emphasisDepth !== 0) throw new Error(`${page.label} / ${field.label}: проверьте парность тегов <em>`);
      }
    }
  }
};

const updateConnectionUi = () => {
  elements.connectionState.textContent = connected ? 'GitHub подключён' : 'Предпросмотр';
  elements.connectionState.classList.toggle('is-connected', connected);
  elements.authIndicator.classList.toggle('is-connected', connected);
  elements.authForm.hidden = connected;
  elements.disconnect.hidden = !connected;
  elements.authDescription.textContent = connected
    ? `Подключён ${repository.owner}/${repository.name}, ветка ${repository.branch}`
    : 'Подключите fine-grained GitHub token с доступом Contents: Read and write только к репозиторию сайта';
};

const updateDirtyUi = () => {
  const dirtyFields = getDirtyFields();
  const count = dirtyFields.length;
  elements.changeCount.textContent = count === 0
    ? 'Без изменений'
    : `${count} ${count === 1 ? 'изменение' : count < 5 ? 'изменения' : 'изменений'}`;
  elements.save.disabled = !connected || busy || count === 0;

  document.querySelectorAll('[data-field-key]').forEach((input) => {
    input.classList.toggle('is-dirty', fieldIsDirty(input.dataset.pageId, input.dataset.fieldKey));
  });
};

const createFieldInput = (page, field) => {
  const row = document.createElement('div');
  row.className = 'content-field';

  const id = `field-${page.id}-${field.key}`;
  const label = document.createElement('label');
  label.htmlFor = id;
  label.textContent = field.label;

  const hint = document.createElement('span');
  hint.textContent = field.mode === 'html'
    ? 'Разрешены <br> и <em>'
    : field.mode === 'list'
      ? 'Один пункт в строке'
      : field.group === 'SEO'
        ? 'SEO'
        : 'Текст';
  label.append(hint);

  const longValue = Array.isArray(field.value)
    || field.mode === 'html'
    || String(field.value).length > 78;
  const input = document.createElement(longValue ? 'textarea' : 'input');
  input.id = id;
  input.name = `${page.id}.${field.key}`;
  input.dataset.pageId = page.id;
  input.dataset.fieldKey = field.key;
  input.dataset.mode = field.mode;
  input.disabled = !connected;
  input.spellcheck = true;

  if (input instanceof HTMLInputElement) input.type = 'text';
  input.value = Array.isArray(field.value) ? field.value.join('\n') : field.value;

  input.addEventListener('input', () => {
    const target = findField(content, page.id, field.key);
    target.value = field.mode === 'list'
      ? input.value.split('\n').map((item) => item.trim()).filter(Boolean)
      : input.value;
    updateDirtyUi();
  });

  row.append(label, input);
  return row;
};

const renderPage = () => {
  const allEntries = entries(content);
  const page = findPage(content, activePageId) ?? allEntries[0];
  activePageId = page.id;
  elements.pageKicker.textContent = `Раздел / ${String(allEntries.indexOf(page) + 1).padStart(2, '0')}`;
  elements.pageTitle.textContent = page.label;
  elements.contentForm.replaceChildren();

  const groups = new Map();
  for (const field of page.fields) {
    if (!groups.has(field.group)) groups.set(field.group, []);
    groups.get(field.group).push(field);
  }

  [...groups.entries()].forEach(([groupName, fields], groupIndex) => {
    const section = document.createElement('section');
    section.className = 'field-group';

    const heading = document.createElement('div');
    heading.className = 'field-group-head';
    const index = document.createElement('span');
    index.textContent = String(groupIndex + 1).padStart(2, '0');
    const title = document.createElement('h3');
    title.textContent = groupName;
    heading.append(index, title);

    const list = document.createElement('div');
    list.className = 'field-list';
    fields.forEach((field) => list.append(createFieldInput(page, field)));
    section.append(heading, list);
    elements.contentForm.append(section);
  });

  elements.pageNav.querySelectorAll('button').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.pageId === activePageId);
    button.setAttribute('aria-current', button.dataset.pageId === activePageId ? 'page' : 'false');
  });
  updateDirtyUi();
};

const renderNavigation = () => {
  const caseIds = new Set(content.cases.map((project) => project.id));
  elements.pageNav.replaceChildren(...entries(content).map((page) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.pageId = page.id;
    button.textContent = caseIds.has(page.id) ? `Кейс · ${page.label}` : page.label;
    button.addEventListener('click', () => {
      activePageId = page.id;
      renderPage();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    return button;
  }));
};

const render = () => {
  renderNavigation();
  renderPage();
  updateConnectionUi();
};

const githubHeaders = () => ({
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${githubToken}`,
  'X-GitHub-Api-Version': '2022-11-28',
});

const loadPublishedContent = async () => {
  const response = await fetch('../content/site.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Не удалось загрузить опубликованный контент');
  content = await response.json();
  validateContent();
  originalContent = clone(content);
  render();
  setMessage('Контент загружен в режиме предпросмотра');
};

const connectGithub = async (token, remember) => {
  busy = true;
  githubToken = token.trim();
  setMessage('Проверяем доступ и загружаем актуальную версию из GitHub');
  updateDirtyUi();

  try {
    const response = await fetch(`${apiUrl}?ref=${encodeURIComponent(repository.branch)}`, {
      headers: githubHeaders(),
      cache: 'no-store',
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new Error('GitHub не принял token или у него нет доступа Contents: Read and write');
      throw new Error(`GitHub вернул ошибку ${response.status}`);
    }

    const payload = await response.json();
    const remoteContent = JSON.parse(decodeBase64Utf8(payload.content));
    content = remoteContent;
    validateContent();
    originalContent = clone(content);
    remoteSha = payload.sha;
    connected = true;
    if (remember) sessionStorage.setItem(sessionTokenKey, githubToken);
    else sessionStorage.removeItem(sessionTokenKey);
    render();
    setMessage('GitHub подключён, поля доступны для редактирования', 'success');
  } catch (error) {
    githubToken = '';
    connected = false;
    sessionStorage.removeItem(sessionTokenKey);
    updateConnectionUi();
    setMessage(error.message, 'error');
  } finally {
    busy = false;
    updateDirtyUi();
  }
};

const saveContent = async () => {
  if (!connected || busy || getDirtyFields().length === 0) return;

  try {
    validateContent();
  } catch (error) {
    setMessage(error.message, 'error');
    return;
  }

  busy = true;
  updateDirtyUi();
  setMessage('Сохраняем контент и запускаем публикацию');

  try {
    content.updatedAt = new Date().toISOString();
    const body = {
      message: `Update RENDART content via admin`,
      content: encodeBase64Utf8(`${JSON.stringify(content, null, 2)}\n`),
      sha: remoteSha,
      branch: repository.branch,
    };

    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: { ...githubHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 409) throw new Error('Контент уже изменился в GitHub, переподключите доступ и повторите правки');
      if (response.status === 401 || response.status === 403) throw new Error('Недостаточно прав для публикации в GitHub');
      throw new Error(`GitHub не сохранил изменения, код ${response.status}`);
    }

    const payload = await response.json();
    remoteSha = payload.content.sha;
    originalContent = clone(content);
    renderPage();
    setMessageWithLink('Изменения сохранены, GitHub Actions собирает новую версию сайта', 'Открыть commit', payload.commit.html_url);
  } catch (error) {
    setMessage(error.message, 'error');
  } finally {
    busy = false;
    updateDirtyUi();
  }
};

elements.authForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(elements.authForm);
  connectGithub(String(formData.get('token') || ''), formData.get('remember') === 'on');
});

elements.disconnect.addEventListener('click', async () => {
  githubToken = '';
  remoteSha = '';
  connected = false;
  sessionStorage.removeItem(sessionTokenKey);
  elements.authForm.reset();
  updateConnectionUi();
  await loadPublishedContent();
});

elements.save.addEventListener('click', saveContent);

window.addEventListener('beforeunload', (event) => {
  if (getDirtyFields().length === 0) return;
  event.preventDefault();
  event.returnValue = '';
});

const initialize = async () => {
  try {
    await loadPublishedContent();
    const savedToken = sessionStorage.getItem(sessionTokenKey);
    if (savedToken) connectGithub(savedToken, true);
  } catch (error) {
    setMessage(error.message, 'error');
  }
};

initialize();
