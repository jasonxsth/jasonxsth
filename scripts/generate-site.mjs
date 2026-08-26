import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { applyRussianTypography } from './russian-typography.mjs';

const root = join(import.meta.dirname, '..');
const content = JSON.parse(readFileSync(join(root, 'content/site.json'), 'utf8'));

if (content.schemaVersion !== 2) throw new Error('Unsupported content schema');

const fields = (entry) => Object.fromEntries(entry.fields.map((field) => [field.key, field.value]));
const global = fields(content.global);
const pages = Object.fromEntries(content.pages.map((page) => [page.id, { ...page, data: fields(page) }]));
const cases = content.cases.map((project) => ({ ...project, data: fields(project) }));
const caseById = Object.fromEntries(cases.map((project) => [project.id, project]));

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const displayTitle = (value = '') => {
  const title = String(value);
  const parts = title.split(/\s+—\s+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return { attributes: '', html: escapeHtml(title) };
  return {
    attributes: ` class="display-title-stack" aria-label="${escapeHtml(title)}"`,
    html: parts.map((part) => `<span>${escapeHtml(part)}</span>`).join(''),
  };
};

const split = (value) => String(value).split('|||').map((part) => part.trim());
const splitRows = (rows = []) => rows.map(split);
const rootPrefix = (file) => '../'.repeat(dirname(file) === '.' ? 0 : dirname(file).split('/').length);
const href = (prefix, route) => route === '/' ? (prefix || './') : `${prefix}${route.replace(/^\//, '')}`;
const asset = (prefix, path) => `${prefix}${path}`;
const canonical = (route) => `${global.base_url}${route}`;
const routeForPage = (page) => page.id === 'home' ? '/' : page.id === 'not_found' ? '/404.html' : `/${page.id}/`;

const imageDimensions = new Map([
  ['assets/hero-material-axis.webp', [1536, 1024]],
  ['assets/projects/bathroom-study.webp', [1600, 2000]],
  ['assets/projects/calm-bedroom.webp', [1800, 2250]],
  ['assets/projects/collage-bathroom.webp', [1800, 1600]],
  ['assets/projects/collage-living.webp', [1800, 1576]],
  ['assets/projects/dark-bathroom.webp', [1600, 2000]],
  ['assets/projects/material-bathroom-green.webp', [1600, 2000]],
  ['assets/projects/material-precision-bedroom.webp', [1800, 1125]],
  ['assets/projects/technical-drawing.webp', [912, 672]],
  ['assets/projects/2026/brand-zone-showroom.webp', [1196, 1800]],
  ['assets/projects/2026/bedroom-gallery-01.webp', [1440, 1800]],
  ['assets/projects/2026/bedroom-gallery-02.webp', [1440, 1800]],
  ['assets/projects/2026/bedroom-gallery-03.webp', [1440, 1800]],
  ['assets/projects/2026/bedroom-soft-01.webp', [1440, 1800]],
  ['assets/projects/2026/bedroom-soft-02.webp', [1440, 1800]],
  ['assets/projects/2026/bedroom-soft-03.webp', [1440, 1800]],
  ['assets/projects/2026/bathroom-landscape-01.webp', [1440, 1800]],
  ['assets/projects/2026/bathroom-landscape-02.webp', [1440, 1800]],
  ['assets/projects/2026/bathroom-landscape-03.webp', [1440, 1800]],
  ['assets/projects/2026/bathroom-night-01.webp', [1440, 1800]],
  ['assets/projects/2026/bathroom-night-02.webp', [1440, 1800]],
  ['assets/projects/2026/bathroom-night-03.webp', [1440, 1800]],
  ['assets/projects/2026/cafe-wave-01.webp', [1800, 1350]],
  ['assets/projects/2026/cafe-wave-02.webp', [1440, 1800]],
  ['assets/projects/2026/cafe-wave-03.webp', [1440, 1800]],
  ['assets/projects/2026/collage-lobby-01.webp', [1800, 1350]],
  ['assets/projects/2026/sketch-dome-01.webp', [858, 1200]],
  ['assets/projects/2026/tbo-abber-01.webp', [1350, 1800]],
  ['assets/projects/2026/tbo-abber-02.webp', [1800, 1800]],
  ['assets/projects/2026/tbo-abber-03.webp', [1800, 1350]],
  ['assets/projects/2026/tbo-salini-01.webp', [1400, 1050]],
  ['assets/projects/2026/tbo-salini-02.webp', [1400, 1050]],
  ['assets/projects/2026/tbo-salini-03.webp', [1400, 1050]],
]);

const image = (prefix, path, alt, options = {}) => {
  const [width, height] = imageDimensions.get(path) ?? [1600, 1200];
  const loading = options.priority ? 'eager' : 'lazy';
  const priority = options.priority ? ' fetchpriority="high"' : '';
  const className = options.className ? ` class="${escapeHtml(options.className)}"` : '';
  return `<img src="${asset(prefix, path)}" width="${width}" height="${height}" alt="${escapeHtml(alt)}" loading="${loading}" decoding="async"${priority}${className} />`;
};

const organizationSchema = () => JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: global.site_name,
  url: `${global.base_url}/`,
  telephone: global.phone_href,
});

const head = ({ prefix, title, description, route, ogImage = 'assets/hero-material-axis.webp', preloadImage = '', robots = 'index,follow', structuredData = organizationSchema() }) => `
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#f2eade" />
  <meta name="robots" content="${robots}" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${canonical(route)}" />
  <meta property="og:locale" content="ru_RU" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="RENDART" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${canonical(route)}" />
  <meta property="og:image" content="${global.base_url}/${ogImage}" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="icon" href="${asset(prefix, 'assets/favicon.webp')}" type="image/webp" />
  ${preloadImage ? `<link rel="preload" href="${asset(prefix, preloadImage)}" as="image" fetchpriority="high" />` : '<!-- no above-the-fold image preload -->'}
  <link rel="stylesheet" href="${asset(prefix, 'src/site.css')}" media="print" onload="this.media='all'" />
  <style>:root{--paper:#f2eade;--ink:#3f3d3d}*{box-sizing:border-box}html,body{margin:0;background:var(--paper);color:var(--ink)}body{font-family:Georgia,serif;overflow-x:clip}.hero{position:relative;min-height:100svh;overflow:hidden}.hero-media{position:absolute;inset:0;background:url('${asset(prefix, 'assets/hero-material-axis.webp')}') center/cover}.hero-descriptor{position:absolute;top:5.4vh;left:3.25vw;width:min(340px,38vw);margin:0;font:15px/1.35 Arial,sans-serif}.hero-wordmark{position:absolute;top:50%;left:0;display:grid;width:100%;grid-template-columns:50% 50%;font-family:Arial,sans-serif;font-size:clamp(78px,14.4vw,222px);letter-spacing:-.072em;line-height:.76;transform:translateY(-46%);white-space:nowrap}.wordmark-rnd{text-align:right}.wordmark-art{color:var(--paper);font-family:Georgia,serif}.hero-footer{position:absolute;right:3.25vw;bottom:7.6vh;left:3.25vw;display:flex;justify-content:space-between}.hero-cta{color:var(--paper)}@media(max-width:820px){.hero{min-height:max(720px,100svh)}.hero-descriptor{top:92px;width:min(310px,72vw);font-size:13px}.hero-wordmark{font-size:clamp(57px,15.6vw,108px)}.hero-nav{display:none}.hero-cta{margin-left:auto}}</style>
  <script type="application/ld+json">${structuredData}</script>`;

const logo = (prefix, className = 'site-logo') => `<a class="${className}" href="${href(prefix, '/')}" aria-label="RENDART — на главную"><span>REND</span><span>ART</span></a>`;

const navigation = (prefix, active = '') => {
  const links = [
    ['b2b', '/b2b/', global.menu_b2b],
    ['designers', '/designers/', global.menu_designers],
    ['portfolio', '/portfolio/', global.menu_portfolio],
    ['about', '/about/', global.menu_about],
  ];
  return `<header class="site-header${active === 'home' ? ' home-header' : ''}" data-site-header>
    ${logo(prefix)}
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav" data-menu-toggle><span data-menu-label>Меню</span></button>
    <nav class="site-nav" id="site-nav" aria-label="Основная навигация" data-site-nav>
      ${links.map(([id, route, label]) => `<a href="${href(prefix, route)}"${active === id ? ' aria-current="page"' : ''}>${escapeHtml(label)}</a>`).join('')}
      <a class="nav-contact" href="${href(prefix, '/contacts/')}"${active === 'contacts' ? ' aria-current="page"' : ''} data-track="cta_click" data-block="header">${escapeHtml(global.menu_contact)}</a>
    </nav>
  </header>`;
};

const footer = (prefix) => `<footer class="site-footer" data-header-theme="dark">
  <div class="footer-top">
    ${logo(prefix, 'footer-logo')}
    <p>Проектная студия для интерьерной индустрии</p>
    <a class="footer-phone" href="tel:${escapeHtml(global.phone_href)}" data-track="contact_click" data-channel="phone">${escapeHtml(global.phone_label)}</a>
  </div>
  <div class="footer-grid">
    <nav aria-label="Навигация в подвале">
      <a href="${href(prefix, '/b2b/')}">${escapeHtml(global.menu_b2b)}</a>
      <a href="${href(prefix, '/designers/')}">${escapeHtml(global.menu_designers)}</a>
      <a href="${href(prefix, '/portfolio/')}">${escapeHtml(global.menu_portfolio)}</a>
      <a href="${href(prefix, '/about/')}">${escapeHtml(global.menu_about)}</a>
    </nav>
    <nav aria-label="Контакты RENDART">
      ${messengers.map(([channel, label, url]) => `<a href="${escapeHtml(url)}" data-track="contact_click" data-channel="${escapeHtml(channel)}">${escapeHtml(label)}</a>`).join('')}
      ${contactEmails.map((email) => `<a href="mailto:${escapeHtml(email)}" data-track="contact_click" data-channel="email">${escapeHtml(email)}</a>`).join('')}
    </nav>
    <nav aria-label="Юридическая информация">
      <a href="${href(prefix, '/privacy/')}">Политика обработки персональных данных</a>
    </nav>
  </div>
  <div class="footer-bottom"><span>© RENDART, ${new Date().getFullYear()}</span><a href="#top">Наверх ↑</a></div>
</footer>`;

const pageShell = ({ page, route, body, bodyClass = '', prefix = rootPrefix(page.file), robots, ogImage, preloadImage, structuredData }) => `<!doctype html>
<html lang="ru">
<head>${head({ prefix, title: page.data.meta_title, description: page.data.meta_description ?? page.data.hero_title ?? '', route, robots, ogImage, preloadImage, structuredData })}
</head>
<body class="${bodyClass}" id="top">
  <a class="skip-link" href="#content">К содержанию</a>
  ${navigation(prefix, page.id)}
  ${body}
  ${footer(prefix)}
  <script type="module" src="${asset(prefix, 'src/site.js')}"></script>
</body>
</html>`;

const textLink = (prefix, route, label, attrs = '') => `<a class="text-link" href="${href(prefix, route)}" ${attrs}>${escapeHtml(label)} <span aria-hidden="true">↗</span></a>`;
const tags = (items = []) => `<ul class="tag-list" aria-label="Состав работ">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
const contactEmails = Array.isArray(global.contact_emails) ? global.contact_emails : [];
const messengers = splitRows(global.messenger_links ?? []);
const messengerLinks = (className = 'contact-links') => `<div class="${className}">${messengers.map(([channel, label, url]) => `<a href="${escapeHtml(url)}" data-track="contact_click" data-channel="${escapeHtml(channel)}"${url.startsWith('http') ? ' rel="noopener"' : ''}>${escapeHtml(label)}</a>`).join('')}</div>`;

const caseCard = (project, prefix, index) => {
  const data = project.data;
  return `<a class="case-card case-card-${index + 1} case-category-${escapeHtml(project.category ?? 'project')}" href="${href(prefix, `/portfolio/${project.slug}/`)}" data-track="portfolio_open" data-case-id="${project.id}" data-audience="${project.audience}" data-tags="${escapeHtml(data.tags.join(','))}">
    <figure>${image(prefix, project.cover, `${data.task} — работа RENDART`)}</figure>
    <div class="case-card-meta"><span>${escapeHtml(data.industry)}</span><span>${project.audience === 'brand' ? 'Брендам' : 'Дизайнерам'}</span></div>
    <h3>${escapeHtml(data.task)}</h3>
    <p>${escapeHtml(data.scope)}</p>
    ${tags(data.tags)}
  </a>`;
};

const caseGrid = (projects, prefix, className = '') => `<div class="case-grid ${className}">${projects.map((project, index) => caseCard(project, prefix, index)).join('')}</div>`;

const specialization = (prefix = '') => {
  const home = pages.home.data;
  return `<section class="specialization" aria-labelledby="specialization-title">
    <p class="section-kicker">Специализация</p>
    <h2 id="specialization-title">${escapeHtml(home.specialization_title)}</h2>
    <p class="specialization-terms">${escapeHtml(home.specialization_terms)}</p>
    <p>${escapeHtml(home.specialization_body)}</p>
  </section>`;
};

const processList = (rows, heading) => `<section class="process-section" aria-labelledby="process-title">
  <div class="process-heading"><p class="section-kicker">Рабочий процесс</p><h2 id="process-title">${escapeHtml(heading)}</h2></div>
  <ol class="process-list">${rows.map((row, index) => {
    const [title, body] = Array.isArray(row) ? row : [row, ''];
    return `<li><span>${String(index + 1).padStart(2, '0')}</span><div><h3>${escapeHtml(title)}</h3>${body ? `<p>${escapeHtml(body)}</p>` : ''}</div></li>`;
  }).join('')}</ol>
</section>`;

const priceSection = (intro, rows) => `<section class="price-section" aria-labelledby="price-title">
  <div class="price-heading"><p class="section-kicker">Стоимость</p><h2 id="price-title">Понятный состав до начала работ</h2><p>${escapeHtml(intro)}</p></div>
  <div class="price-list">${rows.map(([title, scope, price], index) => `<article><span>${String(index + 1).padStart(2, '0')}</span><div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(scope)}</p></div><strong>${escapeHtml(price)}</strong></article>`).join('')}</div>
  <p class="price-note">Точная стоимость зависит от качества исходной 3D-модели, количества ракурсов и уровня детализации</p>
</section>`;

const inquiryForm = (prefix, { audience = '', title, body, submitLabel = 'Получить состав и расчёт', compact = false } = {}) => `<section class="inquiry${compact ? ' inquiry-compact' : ''}" aria-labelledby="inquiry-title" data-header-theme="dark">
  <div class="inquiry-intro">
    <p class="section-kicker">Новый проект</p>
    <h2 id="inquiry-title">${escapeHtml(title)}</h2>
    <p>${escapeHtml(body)}</p>
    <a class="direct-phone" href="tel:${escapeHtml(global.phone_href)}" data-track="contact_click" data-channel="phone"><span>Можно сразу позвонить</span>${escapeHtml(global.phone_label)}</a>
    ${messengerLinks('inquiry-contact-links')}
  </div>
  <form class="inquiry-form" data-inquiry-form data-form-endpoint="${escapeHtml(global.form_endpoint)}" data-consent-version="${escapeHtml(global.consent_version)}" data-thanks-url="${href(prefix, '/thanks/')}" novalidate>
    <div class="form-row form-audience">
      <fieldset><legend>Кто вы</legend>
        <label><input type="radio" name="audience" value="brand"${audience === 'brand' ? ' checked' : ''} /><span>Интерьерный бренд</span></label>
        <label><input type="radio" name="audience" value="designer"${audience === 'designer' ? ' checked' : ''} /><span>Дизайнер или архитектор</span></label>
        <label><input type="radio" name="audience" value="other" /><span>Другое</span></label>
      </fieldset>
    </div>
    <div class="form-grid">
      <label class="field"><span>Как вас зовут</span><input type="text" name="name" autocomplete="name" maxlength="120" /></label>
      <label class="field"><span>Телефон, Telegram, MAX или email</span><input type="text" name="contact" autocomplete="tel" inputmode="text" placeholder="Удобный способ связи" maxlength="200" required /></label>
    </div>
    <div class="form-actions">
      <label class="consent-check"><input type="checkbox" name="consent" value="yes" /><span>Я даю согласие на обработку персональных данных в соответствии с <a href="${href(prefix, '/privacy/')}">Политикой</a></span></label>
      <button class="button button-light" type="submit">${escapeHtml(submitLabel)} <span aria-hidden="true">→</span></button>
    </div>
    <label class="field"><span>Коротко о задаче</span><textarea name="message" rows="3" placeholder="Продукт, пространство или нужный результат" maxlength="1500"></textarea></label>
    <details class="form-more">
      <summary>Добавить детали проекта</summary>
      <div class="form-grid">
        <label class="field"><span>Компания и роль</span><input type="text" name="company" autocomplete="organization" maxlength="200" /></label>
        <label class="field"><span>Желаемые сроки</span><input type="text" name="deadline" maxlength="120" /></label>
      </div>
      <label class="field"><span>Ссылка на исходные материалы</span><input type="text" name="materials" inputmode="text" placeholder="Ссылка или название папки" maxlength="500" /></label>
    </details>
    <label class="honeypot" aria-hidden="true">Не заполняйте это поле<input type="text" name="website" tabindex="-1" autocomplete="off" /></label>
    <p class="form-status" role="status" aria-live="polite" data-form-status></p>
  </form>
</section>`;

const renderHome = () => {
  const page = pages.home;
  const data = page.data;
  const prefix = '';
  const selected = ['interior-approval', 'concept-to-docs', 'product-in-space', 'cafe-wave', 'tbo-salini'].map((id) => caseById[id]);
  const brandTasks = splitRows(data.brand_tasks);
  const designerTasks = splitRows(data.designer_tasks);
  const process = splitRows(data.process_items);
  const body = `<main id="content">
    <section class="hero" data-hero aria-label="RENDART">
      <div class="hero-media" role="img" aria-label="Граница чертежа и материала"></div>
      <p class="hero-descriptor">${escapeHtml(data.hero_descriptor)}</p>
      <div class="hero-wordmark" aria-hidden="true"><span class="wordmark-rnd">REND</span><span class="wordmark-art">ART</span></div>
      <div class="hero-footer">
        <nav class="hero-nav" aria-label="Быстрые разделы">
          <a href="${href(prefix, '/b2b/')}" data-track="audience_select" data-audience="brand">Брендам</a>
          <a href="${href(prefix, '/designers/')}" data-track="audience_select" data-audience="designer">Дизайнерам</a>
          <a href="${href(prefix, '/portfolio/')}">Портфолио</a>
          <a href="${href(prefix, '/about/')}">О RENDART</a>
        </nav>
        <a class="hero-cta" href="${href(prefix, '/contacts/')}" data-track="cta_click" data-block="hero">Обсудить проект <span aria-hidden="true">→</span></a>
      </div>
      <div class="hero-baseline" aria-hidden="true"><span></span></div>
    </section>

    <section class="positioning" aria-labelledby="position-title">
      <div class="section-head"><p class="section-kicker">Кто мы</p><span>01</span></div>
      <div class="positioning-grid">
        <h1 id="position-title">${escapeHtml(data.hero_title)}</h1>
        <div class="positioning-copy"><p>${escapeHtml(data.hero_body)}</p><div class="link-row">${textLink(prefix, '/portfolio/', 'Смотреть портфолио', 'data-track="cta_click" data-block="position"')}${textLink(prefix, '/contacts/', 'Обсудить проект', 'data-track="cta_click" data-block="position"')}</div></div>
      </div>
      <figure class="positioning-image" data-reveal>${image(prefix, 'assets/projects/2026/collage-lobby-01.webp', 'Коллаж, материалы и планировочная схема RENDART')}<figcaption><span>Исследование</span><span>Визуальное решение</span><span>Проектная логика</span></figcaption></figure>
    </section>

    <section class="audience-section" aria-labelledby="audience-title">
      <div class="section-head"><h2 id="audience-title">Два маршрута работы</h2><span>02</span></div>
      <div class="audience-split">
        <a class="audience-panel audience-brand" href="${href(prefix, '/b2b/')}" data-track="audience_select" data-audience="brand">
          ${image(prefix, 'assets/projects/2026/brand-zone-showroom.webp', 'Реализованная бренд-зона в интерьерном шоуруме')}
          <div><p>Интерьерным брендам</p><h3>${escapeHtml(data.brand_title)}</h3><span>${escapeHtml(data.brand_body)}</span><strong>Решения для брендов →</strong></div>
        </a>
        <a class="audience-panel audience-designers" href="${href(prefix, '/designers/')}" data-track="audience_select" data-audience="designer">
          ${image(prefix, 'assets/projects/2026/bedroom-soft-01.webp', 'Визуализация жилого интерьера')}
          <div><p>Дизайнерам и архитекторам</p><h3>${escapeHtml(data.designer_title)}</h3><span>${escapeHtml(data.designer_body)}</span><strong>Решения для дизайнеров →</strong></div>
        </a>
      </div>
    </section>

    <section class="trust-strip" aria-label="Условия работы">${data.trust_items.map((item, index) => `<div><span>${String(index + 1).padStart(2, '0')}</span><p>${escapeHtml(item)}</p></div>`).join('')}</section>

    <section class="portfolio-featured" aria-labelledby="featured-title">
      <div class="portfolio-heading"><div><p class="section-kicker">Портфолио</p><h2 id="featured-title">${escapeHtml(data.portfolio_title)}</h2></div><div><p>${escapeHtml(data.portfolio_body)}</p>${textLink(prefix, '/portfolio/', 'Смотреть всё портфолио')}</div></div>
      ${caseGrid(selected, prefix, 'case-grid-editorial')}
    </section>

    <section class="task-switcher brand-task-switcher" aria-labelledby="brand-tasks-title" data-task-switcher>
      <div class="task-visuals">${['assets/projects/2026/bathroom-night-01.webp', 'assets/projects/2026/brand-zone-showroom.webp', 'assets/projects/2026/collage-lobby-01.webp', 'assets/projects/2026/tbo-salini-03.webp'].map((path, index) => `<figure data-task-preview="${index}"${index === 0 ? ' class="is-active"' : ''}>${image(prefix, path, brandTasks[index][0])}</figure>`).join('')}</div>
      <div class="task-content"><p class="section-kicker">Брендам</p><h2 id="brand-tasks-title">Задачи интерьерных брендов</h2><ol>${brandTasks.map(([title, gets, benefit], index) => `<li${index === 0 ? ' class="is-active"' : ''}><button type="button" data-task-trigger="${index}" aria-expanded="${index === 0}"><span>${String(index + 1).padStart(2, '0')}</span><strong>${escapeHtml(title)}</strong></button><div><p><b>Что получает клиент</b>${escapeHtml(gets)}</p><p><b>Что это дает</b>${escapeHtml(benefit)}</p></div></li>`).join('')}</ol>${textLink(prefix, '/b2b/', 'Все решения для брендов')}</div>
    </section>

    <section class="designer-bridge" aria-labelledby="designer-bridge-title" data-header-theme="dark">
      <div class="designer-bridge-copy"><p class="section-kicker">Дизайнерам и архитекторам</p><h2 id="designer-bridge-title">Техническое продолжение проектной команды</h2><p>Берем на себя визуальную и техническую часть проекта, сохраняя авторский замысел и точность исходных материалов</p>${textLink(prefix, '/designers/', 'Подробнее для дизайнеров')}</div>
      <figure>${image(prefix, 'assets/projects/2026/bedroom-gallery-03.webp', 'Жилой интерьер — визуализация RENDART')}</figure>
      <ol>${designerTasks.map(([title, description], index) => `<li><span>${String(index + 1).padStart(2, '0')}</span><div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p></div></li>`).join('')}</ol>
    </section>

    ${specialization()}

    <section class="rnd-story" aria-labelledby="rnd-title" data-rnd-story data-header-theme="dark">
      <div class="rnd-stage">
        <div class="rnd-copy"><p class="section-kicker">Метод RENDART</p><h2 id="rnd-title">${escapeHtml(data.rnd_title)}</h2><p>${escapeHtml(data.rnd_body)}</p><ol><li class="is-active" data-rnd-step="0">Исследование</li><li data-rnd-step="1">Визуальное решение</li><li data-rnd-step="2">Техническая точность</li></ol></div>
        <div class="rnd-media">
          <figure class="is-active" data-rnd-image="0">${image(prefix, 'assets/projects/collage-living.webp', 'Коллаж и исследование материалов')}</figure>
          <figure data-rnd-image="1">${image(prefix, 'assets/projects/2026/bedroom-soft-02.webp', 'Финальная интерьерная визуализация')}</figure>
          <figure data-rnd-image="2">${image(prefix, 'assets/projects/technical-drawing.webp', 'Технический чертеж RENDART')}</figure>
        </div>
      </div>
    </section>

    <section class="system-section" aria-labelledby="system-title">
      <p class="section-kicker">Единая система</p><h2 id="system-title">${escapeHtml(data.system_title)}</h2><p class="system-chain">${escapeHtml(data.system_chain)}</p><p class="system-body">${escapeHtml(data.system_body)}</p>
    </section>

    ${processList(process, data.process_title)}
    ${inquiryForm(prefix, { title: data.form_title, body: data.form_body })}
  </main>`;
  return pageShell({ page, route: '/', body, bodyClass: 'home-page', preloadImage: 'assets/hero-material-axis.webp' });
};

const innerHero = ({ prefix, label, title, body, imagePath, imageAlt, primary, secondary, className = '' }) => {
  const heading = displayTitle(title);
  return `<section class="inner-hero ${className}">
  <div class="inner-hero-copy"><p class="section-kicker">${escapeHtml(label)}</p><h1${heading.attributes}>${heading.html}</h1><p>${escapeHtml(body)}</p><div class="link-row">${primary ? textLink(prefix, primary.route, primary.label, primary.attrs ?? '') : ''}${secondary ? textLink(prefix, secondary.route, secondary.label, secondary.attrs ?? '') : ''}</div></div>
  <figure>${image(prefix, imagePath, imageAlt, { priority: true })}</figure>
</section>`;
};

const rowsSection = ({ id, kicker, title, rows, className = '', numbered = false }) => `<section class="rows-section ${className}" aria-labelledby="${id}">
  <div class="rows-heading"><p class="section-kicker">${escapeHtml(kicker)}</p><h2 id="${id}">${escapeHtml(title)}</h2></div>
  <div class="ruled-rows${numbered ? ' ruled-rows-numbered' : ''}">${rows.map(([heading, body], index) => `<article>${numbered ? `<span>${String(index + 1).padStart(2, '0')}</span>` : ''}<h3>${escapeHtml(heading)}</h3><p>${escapeHtml(body)}</p></article>`).join('')}</div>
</section>`;

const renderB2B = () => {
  const page = pages.b2b;
  const data = page.data;
  const prefix = '../';
  const brandCases = ['tbo-salini', 'brand-space', 'cafe-wave', 'collection-launch', 'product-in-space'].map((id) => caseById[id]);
  const tasks = splitRows(data.tasks);
  const services = splitRows(data.services);
  const digital = splitRows(data.digital_items);
  const formats = splitRows(data.formats);
  const body = `<main id="content">
    ${innerHero({ prefix, label: 'Интерьерным брендам', title: data.hero_title, body: data.hero_body, imagePath: 'assets/projects/2026/brand-zone-showroom.webp', imageAlt: 'Реализованная бренд-зона в интерьерном шоуруме', primary: { route: '/contacts/?audience=brand&source=b2b-hero', label: 'Обсудить запуск', attrs: 'data-track="cta_click" data-block="hero"' }, secondary: { route: '/portfolio/#brands', label: 'Смотреть B2B-проекты' }, className: 'inner-hero-b2b' })}
    <section class="portfolio-featured compact-cases" aria-labelledby="b2b-projects"><div class="portfolio-heading"><div><p class="section-kicker">Портфолио</p><h2 id="b2b-projects">${escapeHtml(data.portfolio_title)}</h2></div><div><p>${escapeHtml(data.portfolio_body)}</p>${textLink(prefix, '/portfolio/#brands', 'Все B2B-проекты')}</div></div>${caseGrid(brandCases, prefix)}</section>
    ${rowsSection({ id: 'b2b-tasks', kicker: 'Задачи и результат', title: 'Что можно решить с RENDART', rows: tasks, numbered: true })}
    ${rowsSection({ id: 'b2b-services', kicker: 'Полный состав услуг', title: 'От изображения до готового комплекта', rows: services, className: 'rows-dark' })}
    ${specialization()}
    <section class="system-section system-section-b2b" aria-labelledby="b2b-system"><p class="section-kicker">Комплексный подход</p><h2 id="b2b-system">${escapeHtml(data.system_title)}</h2><p class="system-body">${escapeHtml(data.system_body)}</p></section>
    ${rowsSection({ id: 'digital-title', kicker: 'Digital и технологии', title: data.digital_title, rows: digital, className: 'rows-teal' })}
    ${processList(data.process_items.map((item) => [item, '']), 'Путь от задачи до готового комплекта')}
    <section class="formats-section" aria-labelledby="formats-title"><p class="section-kicker">Форматы сотрудничества</p><h2 id="formats-title">Подключаемся в нужном масштабе</h2><div>${formats.map(([title, body], index) => `<article><span>${String(index + 1).padStart(2, '0')}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></article>`).join('')}</div></section>
    <section class="convenience-section" aria-labelledby="convenience-title" data-header-theme="dark"><div><p class="section-kicker">Сервис</p><h2 id="convenience-title">С нами удобно</h2></div><ul>${data.convenience.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>
    ${inquiryForm(prefix, { audience: 'brand', title: data.form_title, body: data.form_body, submitLabel: 'Обсудить B2B-задачу' })}
  </main>`;
  return pageShell({ page, route: '/b2b/', body, bodyClass: 'b2b-page', preloadImage: 'assets/projects/2026/brand-zone-showroom.webp' });
};

const renderDesigners = () => {
  const page = pages.designers;
  const data = page.data;
  const prefix = '../';
  const designerCases = cases.filter((project) => project.audience === 'designer');
  const body = `<main id="content">
    ${innerHero({ prefix, label: 'Дизайнерам и архитекторам', title: data.hero_title, body: data.hero_body, imagePath: 'assets/projects/2026/bedroom-gallery-01.webp', imageAlt: 'Интерьерная визуализация RENDART', primary: { route: '/contacts/?audience=designer&source=designers-hero', label: 'Обсудить проект', attrs: 'data-track="cta_click" data-block="hero"' }, secondary: { route: '/portfolio/#designers', label: 'Посмотреть работы' }, className: 'inner-hero-designers' })}
    <section class="context-statement" aria-labelledby="designer-context"><p class="section-kicker">Контекст</p><h2 id="designer-context">${escapeHtml(data.context_title)}</h2><p>${escapeHtml(data.context_body)}</p></section>
    <section class="portfolio-featured compact-cases" aria-labelledby="designer-projects"><div class="portfolio-heading"><div><p class="section-kicker">Портфолио</p><h2 id="designer-projects">Проекты для дизайнеров и архитекторов</h2></div><div><p>Визуализация, документация и комплектация в составе одного проекта</p>${textLink(prefix, '/portfolio/#designers', 'Смотреть все работы')}</div></div>${caseGrid(designerCases, prefix)}</section>
    ${rowsSection({ id: 'designer-tasks', kicker: 'Задачи и результат', title: 'Что можно передать RENDART', rows: splitRows(data.tasks), numbered: true })}
    ${rowsSection({ id: 'designer-services', kicker: 'Услуги', title: 'Один комплект для презентации и реализации', rows: splitRows(data.services), className: 'rows-dark' })}
    ${rowsSection({ id: 'designer-reasons', kicker: 'Почему RENDART', title: 'Техническая часть под авторским контролем', rows: splitRows(data.reasons), className: 'reasons-grid' })}
    ${priceSection(data.prices_intro, splitRows(data.prices))}
    ${inquiryForm(prefix, { audience: 'designer', title: data.form_title, body: data.form_body, submitLabel: 'Обсудить проект' })}
  </main>`;
  return pageShell({ page, route: '/designers/', body, bodyClass: 'designers-page', preloadImage: 'assets/projects/2026/bedroom-gallery-01.webp' });
};

const renderPortfolio = () => {
  const page = pages.portfolio;
  const data = page.data;
  const prefix = '../';
  const portfolioCases = cases.filter((project) => project.portfolio !== false);
  const brandCases = portfolioCases.filter((project) => project.audience === 'brand');
  const designerCases = portfolioCases.filter((project) => project.audience === 'designer');
  const body = `<main id="content">
    <section class="portfolio-hero"><p class="section-kicker">Работы RENDART</p><h1>${escapeHtml(data.hero_title)}</h1><p>${escapeHtml(data.hero_body)}</p></section>
    <section class="portfolio-audience" id="brands" aria-labelledby="brand-portfolio-title"><div class="portfolio-audience-head"><span>01 / 02</span><h2 id="brand-portfolio-title">Для интерьерных брендов</h2><p>Продукт, пространство, документация и материалы для запуска</p></div>${caseGrid(brandCases, prefix, 'portfolio-list')}</section>
    <section class="portfolio-audience portfolio-audience-designers" id="designers" aria-labelledby="designer-portfolio-title"><div class="portfolio-audience-head"><span>02 / 02</span><h2 id="designer-portfolio-title">Для дизайнеров и архитекторов</h2><p>Визуализация и технический комплект для реализации проекта</p></div>${caseGrid(designerCases, prefix, 'portfolio-list')}</section>
    ${inquiryForm(prefix, { title: 'Обсудим похожую задачу', body: 'Расскажите о продукте, пространстве или проекте — предложим состав работ и следующий шаг', compact: true })}
  </main>`;
  return pageShell({ page, route: '/portfolio/', body, bodyClass: 'portfolio-page' });
};

const renderAbout = () => {
  const page = pages.about;
  const data = page.data;
  const prefix = '../';
  const body = `<main id="content">
    <section class="about-hero" data-header-theme="dark"><p class="section-kicker">Research & Development + Art</p><h1>RENDART</h1><p>${escapeHtml(data.hero_body)}</p></section>
    <section class="about-meaning"><div><p class="section-kicker">Название и метод</p><h2>${escapeHtml(data.meaning_title)}</h2></div><p>${escapeHtml(data.meaning_body)}</p></section>
    ${specialization()}
    <section class="team-model" aria-labelledby="team-title"><figure>${image(prefix, 'assets/projects/collage-living.webp', 'Коллаж и проектные материалы RENDART')}</figure><div><p class="section-kicker">Команда</p><h2 id="team-title">${escapeHtml(data.team_title)}</h2><p>${escapeHtml(data.team_body)}</p></div></section>
    ${rowsSection({ id: 'principles-title', kicker: 'Принципы', title: 'Как устроена работа', rows: splitRows(data.principles), numbered: true })}
    <section class="about-service" aria-labelledby="about-service-title" data-header-theme="dark"><p class="section-kicker">Сервис и доверие</p><h2 id="about-service-title">${escapeHtml(data.service_title)}</h2><p>${escapeHtml(data.service_body)}</p></section>
    ${inquiryForm(prefix, { title: data.form_title, body: data.form_body, compact: true })}
  </main>`;
  return pageShell({ page, route: '/about/', body, bodyClass: 'about-page' });
};

const renderContacts = () => {
  const page = pages.contacts;
  const data = page.data;
  const prefix = '../';
  const body = `<main id="content" class="contact-main">
    <section class="contact-intro"><p class="section-kicker">Новый проект</p><h1>${escapeHtml(data.hero_title)}</h1><p>${escapeHtml(data.hero_body)}</p><div class="contact-directory"><a class="contact-phone" href="tel:${escapeHtml(global.phone_href)}" data-track="contact_click" data-channel="phone"><span>Телефон, Telegram и MAX</span>${escapeHtml(global.phone_label)}</a>${messengerLinks('contact-messengers')}<div class="contact-emails"><span>Email команды</span>${contactEmails.map((email) => `<a href="mailto:${escapeHtml(email)}" data-track="contact_click" data-channel="email">${escapeHtml(email)}</a>`).join('')}</div></div></section>
    ${inquiryForm(prefix, { title: 'Расскажите, как с вами связаться', body: 'Оставьте телефон, Telegram, MAX или email — выберите удобный способ связи', submitLabel: 'Получить состав и расчёт' })}
  </main>`;
  return pageShell({ page, route: '/contacts/', body, bodyClass: 'contacts-page' });
};

const renderLegal = (page, route) => {
  const prefix = '../';
  const body = `<main id="content" class="legal-main"><section><p class="section-kicker">Юридический документ</p><h1>${escapeHtml(page.data.hero_title)}</h1><p class="legal-version">Версия ${escapeHtml(global.consent_version)}</p><div class="legal-notice"><h2>Обработка обращений</h2><p>${escapeHtml(global.legal_status)}</p><p>Отправляя форму, пользователь подтверждает согласие на обработку указанных им данных для рассмотрения обращения и обратной связи</p></div>${textLink(prefix, '/contacts/', 'Вернуться к обсуждению проекта')}</section></main>`;
  return pageShell({ page, route, body, bodyClass: 'legal-page', robots: 'noindex,follow' });
};

const renderThanks = () => {
  const page = pages.thanks;
  const prefix = '../';
  const body = `<main id="content" class="status-main"><section><p class="section-kicker">RENDART</p><h1>${escapeHtml(page.data.hero_title)}</h1><p>${escapeHtml(page.data.hero_body)}</p><div class="link-row">${textLink(prefix, '/portfolio/', 'Смотреть портфолио')}${textLink(prefix, '/', 'На главную')}</div></section></main>`;
  return pageShell({ page, route: '/thanks/', body, bodyClass: 'status-page', robots: 'noindex,nofollow' });
};

const renderNotFound = () => {
  const page = pages.not_found;
  const prefix = '';
  const body = `<main id="content" class="status-main"><section><p class="status-code">404</p><h1>${escapeHtml(page.data.hero_title)}</h1><p>${escapeHtml(page.data.hero_body)}</p><div class="link-row">${textLink(prefix, '/', 'Вернуться на главную')}${textLink(prefix, '/portfolio/', 'Открыть портфолио')}</div></section></main>`;
  return pageShell({ page, route: '/404.html', body, bodyClass: 'status-page', robots: 'noindex,follow' });
};

const renderCase = (project, index) => {
  const prefix = '../../';
  const data = project.data;
  const route = `/portfolio/${project.slug}/`;
  const next = cases[(index + 1) % cases.length];
  const supportImage = project.images[1];
  const galleryImages = project.images.slice(2);
  const breadcrumb = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      JSON.parse(organizationSchema()),
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Главная', item: `${global.base_url}/` },
          { '@type': 'ListItem', position: 2, name: 'Портфолио', item: `${global.base_url}/portfolio/` },
          { '@type': 'ListItem', position: 3, name: data.task, item: canonical(route) },
        ],
      },
    ],
  });
  const page = {
    id: 'portfolio',
    file: `portfolio/${project.slug}/index.html`,
    data: {
      meta_title: `${data.task} — портфолио RENDART`,
      meta_description: `${data.industry}: ${data.task}. ${data.scope}`,
    },
  };
  const body = `<main id="content" class="case-main">
    <section class="case-hero"><div class="case-hero-copy"><a class="case-back" href="${href(prefix, '/portfolio/')}">← Портфолио</a><p class="section-kicker">${escapeHtml(data.industry)}</p><h1>${escapeHtml(data.task)}</h1><p>${escapeHtml(data.scope)}</p>${tags(data.tags)}</div><figure>${image(prefix, project.cover, `${data.task} — ключевой визуал RENDART`, { priority: true })}</figure></section>
    <section class="case-context"><div><p class="section-kicker">Задача</p><h2>Контекст и ограничения</h2></div><div><p class="case-lead">${escapeHtml(data.context)}</p><p>${escapeHtml(data.constraints)}</p></div></section>
    <section class="case-developed" data-header-theme="dark"><div><p class="section-kicker">Состав проекта</p><h2>Что разработал RENDART</h2></div><ol>${data.developed.map((item, itemIndex) => `<li><span>${String(itemIndex + 1).padStart(2, '0')}</span>${escapeHtml(item)}</li>`).join('')}</ol></section>
    <section class="case-chapter${supportImage ? '' : ' case-chapter-text'}"><div><p class="section-kicker">Проектная основа</p><h2>${escapeHtml(data.foundation)}</h2></div>${supportImage ? `<figure>${image(prefix, supportImage, `Проектная основа: ${data.task}`)}</figure>` : ''}</section>
${galleryImages.length ? `    <section class="case-gallery" aria-label="Финальное решение">${galleryImages.map((path, imageIndex) => `<figure>${image(prefix, path, `${data.task}, материал ${imageIndex + 2}`)}</figure>`).join('')}</section>` : ''}
    <section class="case-results"><article><p class="section-kicker">Финальное решение</p><h2>${escapeHtml(data.final)}</h2></article><article><p class="section-kicker">Документация</p><h2>${escapeHtml(data.documentation)}</h2></article><article class="case-result"><p class="section-kicker">Результат</p><h2>${escapeHtml(data.result)}</h2></article></section>
    <section class="next-case"><p class="section-kicker">Следующий кейс</p><a href="${href(prefix, `/portfolio/${next.slug}/`)}" data-track="portfolio_open" data-case-id="${next.id}"><span>${escapeHtml(next.data.industry)}</span><strong>${escapeHtml(next.data.task)}</strong><span aria-hidden="true">→</span></a></section>
    ${inquiryForm(prefix, { audience: project.audience, title: 'Обсудим похожую задачу', body: 'Опишите продукт, пространство или необходимый результат — предложим подходящий состав работ', submitLabel: 'Обсудить похожую задачу', compact: true })}
  </main>`;
  return pageShell({ page, route, body, bodyClass: `case-page case-${project.id}`, prefix, ogImage: project.cover, preloadImage: project.cover, structuredData: breadcrumb });
};

const outputs = new Map([
  [pages.home.file, renderHome()],
  [pages.b2b.file, renderB2B()],
  [pages.designers.file, renderDesigners()],
  [pages.portfolio.file, renderPortfolio()],
  [pages.about.file, renderAbout()],
  [pages.contacts.file, renderContacts()],
  [pages.privacy.file, renderLegal(pages.privacy, '/privacy/')],
  [pages.consent.file, renderLegal(pages.consent, '/consent/')],
  [pages.thanks.file, renderThanks()],
  [pages.not_found.file, renderNotFound()],
]);

cases.forEach((project, index) => outputs.set(`portfolio/${project.slug}/index.html`, renderCase(project, index)));

for (const [file, html] of outputs) {
  const target = join(root, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${applyRussianTypography(html).trim()}\n`);
}

const indexedRoutes = ['/', '/b2b/', '/designers/', '/portfolio/', ...cases.map((project) => `/portfolio/${project.slug}/`), '/about/', '/contacts/'];
writeFileSync(join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexedRoutes.map((route) => `  <url><loc>${canonical(route)}</loc><lastmod>2026-08-26</lastmod></url>`).join('\n')}
</urlset>\n`);

writeFileSync(join(root, 'robots.txt'), `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /thanks/
Sitemap: ${global.base_url}/sitemap.xml
`);

console.log(`Generated ${outputs.size} RENDART pages from content/site.json`);
