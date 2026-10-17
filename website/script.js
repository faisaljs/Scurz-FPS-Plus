(() => {
  'use strict';

  const OWNER = 'faisaljs';
  const REPO = 'Scurz-FPS-Plus';
  const API = `https://api.github.com/repos/${OWNER}/${REPO}/releases?per_page=100`;
  const WEB_REPO = `https://github.com/${OWNER}/${REPO}`;
  const $ = (id) => document.getElementById(id);

  const state = { releases: [], versions: [] };
  const els = {
    releaseList: $('release-list'), status: $('load-status'), empty: $('empty-state'),
    error: $('error-state'), refresh: $('refresh-button'), heroDownload: $('hero-download'),
    count: $('download-count'), filter: $('version-filter'), versionSource: $('version-source')
  };

  function safeText(value) {
    return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  }

  function isAllowedDownload(url) {
    try {
      const u = new URL(url);
      return u.protocol === 'https:' && (
        u.hostname === 'github.com' ||
        u.hostname === 'objects.githubusercontent.com' ||
        u.hostname === 'release-assets.githubusercontent.com'
      );
    } catch { return false; }
  }

  function minecraftVersionsFrom(release) {
    const title = safeText(release.name);
    const tag = safeText(release.tag_name);
    const body = safeText(release.body);
    const assetNames = (release.assets || []).map((a) => safeText(a.name)).join(' ');
    const all = `${title}\n${tag}\n${body}\n${assetNames}`;
    const found = new Set();

    // Prefer explicit Minecraft-version labels in release notes, titles or asset names.
    const contextual = /(?:minecraft(?:\s+java(?:\s+edition)?)?|mc(?:\s+version)?|game\s+version|supported\s+versions?|compatible\s+with)\s*[:=\- ]*([^\n\r]{0,100})/gi;
    let match;
    while ((match = contextual.exec(all)) !== null) {
      const segment = match[1] || '';
      const versions = segment.match(/\b(?:\d{1,2}\.\d{1,2}(?:\.\d{1,2})?|\d{4}\.\d{1,2}(?:\.\d{1,2})?)\b/g) || [];
      versions.forEach((v) => found.add(v));
    }

    // Handle compact asset/tag names such as mc1.20.1 or scurz-1.20.1.zip.
    const compactMc = all.match(/\bmc[-_ ]?v?(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)\b/gi) || [];
    compactMc.forEach((m) => {
      const v = m.match(/(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)$/);
      if (v) found.add(v[1]);
    });

    // If the release tag itself is a game version, accept it. Do not treat v1.0 as Minecraft 1.0.
    if (/^v?\d{1,2}\.\d{1,2}(?:\.\d{1,2})?$/.test(tag)) found.add(tag.replace(/^v/, ''));

    // Asset filenames commonly contain the target game version; generic 1.x versions are a fallback.
    if (found.size === 0) {
      const candidates = all.match(/\b1\.\d{1,2}(?:\.\d{1,2})?\b/g) || [];
      candidates.forEach((v) => found.add(v));
    }

    return [...found].sort(compareVersions);
  }

  function compareVersions(a, b) {
    const aa = a.split('.').map(Number); const bb = b.split('.').map(Number);
    for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
      const delta = (aa[i] || 0) - (bb[i] || 0);
      if (delta !== 0) return delta;
    }
    return a.localeCompare(b);
  }

  function formatDate(iso) {
    if (!iso) return 'Date not provided';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return 'Date not provided';
    return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
  }

  function formatSize(bytes) {
    if (!Number.isFinite(Number(bytes)) || Number(bytes) < 0) return '';
    const value = Number(bytes);
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(2)} MB`;
  }

  function packAssets(release) {
    return (release.assets || []).filter((asset) => {
      const name = safeText(asset.name).toLowerCase();
      return /\.(zip|mcpack)$/.test(name) && isAllowedDownload(asset.browser_download_url);
    });
  }

  function make(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function makeLink(url, className, label, newTab = true) {
    const a = make('a', className, label);
    a.href = url;
    if (newTab) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    return a;
  }

  function buildReleaseCard(release, index) {
    const card = make('article', 'release-card');
    card.dataset.versions = (release._mcVersions || []).join('|');
    card.dataset.hasAssets = packAssets(release).length ? 'yes' : 'no';

    const top = make('div', 'release-top');
    const title = make('div', 'release-title', safeText(release.name) || safeText(release.tag_name) || 'Untitled release');
    top.appendChild(title);
    if (index === 0) top.appendChild(make('span', 'latest-badge', 'LATEST'));
    card.appendChild(top);

    const chips = make('div', 'release-meta');
    const versions = release._mcVersions || [];
    if (versions.length) {
      versions.forEach((version) => chips.appendChild(make('span', 'version-chip', `Java ${version}`)));
    } else {
      chips.appendChild(make('span', 'version-chip unknown', 'Minecraft version not specified'));
    }
    card.appendChild(chips);
    card.appendChild(make('div', 'release-date', `Published ${formatDate(release.published_at || release.created_at)} · ${safeText(release.tag_name)}`));

    const notesText = safeText(release.body).slice(0, 400);
    if (notesText) card.appendChild(make('p', 'release-notes', notesText + (safeText(release.body).length > 400 ? '…' : '')));

    const bottom = make('div', 'release-bottom');
    const assets = packAssets(release);
    const assetInfo = make('div', 'asset-info', assets.length ? `${assets.length} downloadable pack${assets.length === 1 ? '' : 's'}` : 'No pack ZIP attached');
    bottom.appendChild(assetInfo);
    const actions = make('div', 'asset-buttons');
    if (assets.length) {
      assets.forEach((asset) => {
        const label = `↓ ${safeText(asset.name)}`;
        const link = makeLink(asset.browser_download_url, 'download-button', label);
        link.title = `${safeText(asset.name)}${asset.size ? ` (${formatSize(asset.size)})` : ''}`;
        if (asset.size) link.setAttribute('aria-label', `Download ${safeText(asset.name)}, ${formatSize(asset.size)}`);
        actions.appendChild(link);
      });
    } else {
      actions.appendChild(make('span', 'asset-unavailable', 'Add a .zip asset to enable direct download'));
    }
    actions.appendChild(makeLink(isAllowedDownload(release.html_url) ? release.html_url : `${WEB_REPO}/releases`, 'release-link', 'Release page ↗'));
    bottom.appendChild(actions);
    card.appendChild(bottom);
    return card;
  }

  function renderVersions(releases) {
    const versions = [...new Set(releases.flatMap((r) => r._mcVersions || []))].sort(compareVersions).reverse();
    state.versions = versions;
    const selected = els.filter.value;
    els.filter.replaceChildren();
    const allOption = make('option', '', 'All versions'); allOption.value = 'all'; els.filter.appendChild(allOption);
    versions.forEach((version) => {
      const option = make('option', '', `Minecraft Java ${version}`);
      option.value = version;
      els.filter.appendChild(option);
    });
    els.filter.value = versions.includes(selected) ? selected : 'all';
    els.versionSource.textContent = versions.length ? `Auto-detected ${versions.length} version${versions.length === 1 ? '' : 's'} from releases` : 'No version labels detected yet';
  }

  function applyVersionFilter() {
    const wanted = els.filter.value;
    const cards = [...els.releaseList.children];
    let visible = 0;
    cards.forEach((card) => {
      const tags = (card.dataset.versions || '').split('|').filter(Boolean);
      const shown = wanted === 'all' || tags.includes(wanted);
      card.hidden = !shown;
      if (shown) visible++;
    });
    const noMatch = state.releases.length > 0 && visible === 0;
    els.empty.hidden = state.releases.length > 0 || noMatch;
    let noMatchPanel = document.getElementById('no-filter-results');
    if (noMatch) {
      if (!noMatchPanel) {
        noMatchPanel = make('div', 'empty-state'); noMatchPanel.id = 'no-filter-results';
        noMatchPanel.appendChild(make('h3', '', 'No releases for this version'));
        noMatchPanel.appendChild(make('p', '', 'Try another Minecraft version or switch the filter back to All versions.'));
        els.releaseList.after(noMatchPanel);
      }
      noMatchPanel.hidden = false;
    } else if (noMatchPanel) noMatchPanel.hidden = true;
  }

  function latestDownloadableRelease(releases) {
    return releases.find((release) => packAssets(release).length > 0);
  }

  function render(releases) {
    state.releases = releases.map((release) => ({ ...release, _mcVersions: minecraftVersionsFrom(release) }));
    els.releaseList.replaceChildren();
    els.error.hidden = true;
    els.status.hidden = true;
    els.empty.hidden = state.releases.length > 0;
    state.releases.forEach((release, index) => els.releaseList.appendChild(buildReleaseCard(release, index)));
    const totalAssets = state.releases.reduce((sum, release) => sum + packAssets(release).length, 0);
    els.count.textContent = state.releases.length ? `${totalAssets} downloadable pack${totalAssets === 1 ? '' : 's'}` : 'No published builds yet';
    renderVersions(state.releases);

    const newestWithPack = latestDownloadableRelease(state.releases);
    if (newestWithPack) {
      const asset = packAssets(newestWithPack)[0];
      els.heroDownload.href = asset.browser_download_url;
      els.heroDownload.textContent = '↓ Download latest pack';
      els.heroDownload.removeAttribute('target');
      els.heroDownload.removeAttribute('rel');
    } else {
      els.heroDownload.href = `${WEB_REPO}/releases`;
      els.heroDownload.textContent = 'View GitHub releases ↗';
      els.heroDownload.target = '_blank';
      els.heroDownload.rel = 'noopener noreferrer';
    }
    applyVersionFilter();
  }

  async function loadReleases() {
    els.refresh.disabled = true;
    els.refresh.textContent = '↻ Loading…';
    els.status.hidden = false;
    els.status.replaceChildren();
    els.status.appendChild(make('span', 'spinner'));
    els.status.appendChild(document.createTextNode(' Checking GitHub for releases…'));
    els.error.hidden = true;
    try {
      const response = await fetch(API, {
        headers: { Accept: 'application/vnd.github+json' },
        cache: 'no-store'
      });
      if (!response.ok) throw new Error(`GitHub responded with ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Unexpected response from GitHub');
      render(data.filter((item) => item && !item.draft));
      els.status.hidden = false;
      if (!data.length) {
        els.status.textContent = 'Connected to GitHub. No published releases found yet.';
      } else {
        els.status.textContent = `Synced ${data.length} release${data.length === 1 ? '' : 's'} from GitHub just now.`;
      }
    } catch (error) {
      console.error('Unable to fetch Scurz FPS Plus releases:', error);
      els.status.hidden = true;
      els.error.hidden = false;
      els.count.textContent = 'Unable to load';
      els.versionSource.textContent = 'GitHub connection unavailable';
      els.empty.hidden = true;
      els.releaseList.replaceChildren();
    } finally {
      els.refresh.disabled = false;
      els.refresh.innerHTML = '<span aria-hidden="true">↻</span> Refresh';
    }
  }

  els.refresh.addEventListener('click', loadReleases);
  els.filter.addEventListener('change', applyVersionFilter);
  loadReleases();
})();
