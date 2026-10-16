/* ==========================================================================
   LanTai 兰台 · 前端共享运行时
   无构建、无依赖：window.LT 暴露外壳渲染与通用组件。
   页面约定：
     <header class="topbar" data-lt-topbar></header>
     <main id="main">…</main>
     <footer class="sitefoot" data-lt-footer></footer>
     <script src="/app.js"></script>
     <script>LT.mountShell({active:"catalog"}); …</script>
   ========================================================================== */
(() => {
  const PUBLIC_NAV = [
    { id: "catalog", href: "/", label: "开始使用" },
    { id: "submit", href: "/submit", label: "贡献数据" },
    { id: "docs", href: "/docs/", label: "文档" },
  ];
  const CONSOLE_NAV = [
    { id: "datasets", href: "/admin", label: "数据集与 Schema" },
    { id: "review", href: "/review", label: "审阅队列" },
    { id: "ops", href: "/ops", label: "运营" },
  ];
  const DOCS_NAV = [
    { id: "docs", href: "/docs/", label: "总览" },
    { id: "reader", href: "/docs/reader.html", label: "读者指南" },
    { id: "contributor", href: "/docs/contributor.html", label: "贡献者指南" },
    { id: "operator", href: "/docs/operator.html", label: "运营者指南" },
  ];

  /* ---------- DOM helpers ---------- */
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === null || v === undefined || v === false) continue;
        if (k === "class") node.className = v;
        else if (k === "html") node.innerHTML = v;
        else if (k === "text") node.textContent = v;
        else if (k === "dataset") Object.assign(node.dataset, v);
        else if (k.startsWith("on") && typeof v === "function")
          node.addEventListener(k.slice(2).toLowerCase(), v);
        else if (v === true) node.setAttribute(k, "");
        else node.setAttribute(k, String(v));
      }
    }
    append(node, children);
    return node;
  }
  function append(parent, children) {
    if (children === null || children === undefined) return;
    const list = Array.isArray(children) ? children : [children];
    for (const c of list) {
      if (c === null || c === undefined || c === false) continue;
      parent.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
  }
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
    return node;
  }
  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ---------- formatters (Intl) ---------- */
  const _dtf = new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const _nf = new Intl.NumberFormat("zh-CN");
  function fmtDateTime(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? String(iso) : _dtf.format(d);
  }
  function fmtNumber(n) {
    return typeof n === "number" ? _nf.format(n) : String(n ?? "—");
  }

  /* ---------- api ---------- */
  async function api(path, init) {
    const res = await fetch(path, init);
    const text = await res.text();
    let body = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }
    if (!res.ok) {
      const err = new Error(
        body?.error ? `${body.error.message || body.error.code}` : `请求失败（HTTP ${res.status}）`,
      );
      err.status = res.status;
      err.code = body?.error ? body.error.code : undefined;
      err.body = body;
      throw err;
    }
    return body;
  }
  const get = (path) => api(path);
  const post = (path, body) =>
    api(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });

  /* ---------- toast ---------- */
  let toastHost = null;
  function toast(message, opts) {
    opts = opts || {};
    if (!toastHost) {
      toastHost = el("div", { class: "toast-host", "aria-live": "polite" });
      document.body.appendChild(toastHost);
    }
    const node = el("div", {
      class: `toast${opts.type ? ` toast--${opts.type}` : ""}`,
      role: "status",
      text: message,
    });
    toastHost.appendChild(node);
    const t = opts.timeout || 4200;
    setTimeout(() => {
      node.style.opacity = "0";
      setTimeout(() => node.remove(), 200);
    }, t);
  }

  /* ---------- confirm dialog ---------- */
  function confirmDialog(opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      const dlg = el("dialog", { class: "lt-dialog" });
      const body = el("div", { class: "lt-dialog__body" }, [
        el("h3", { text: opts.title || "请确认" }),
        el("p", { text: opts.message || "", class: "muted" }),
      ]);
      const cancel = el("button", {
        class: "btn btn--ghost",
        type: "button",
        text: opts.cancelLabel || "取消",
        onclick: () => {
          dlg.close();
          resolve(false);
        },
      });
      const ok = el("button", {
        class: `btn ${opts.danger ? "btn--danger" : "btn--primary"}`,
        type: "button",
        text: opts.confirmLabel || "确认",
        onclick: () => {
          dlg.close();
          resolve(true);
        },
      });
      dlg.appendChild(body);
      dlg.appendChild(el("div", { class: "lt-dialog__foot" }, [cancel, ok]));
      dlg.addEventListener("close", () => dlg.remove());
      dlg.addEventListener("cancel", (e) => {
        e.preventDefault();
        dlg.close();
        resolve(false);
      });
      document.body.appendChild(dlg);
      dlg.showModal();
      ok.focus();
    });
  }

  /* ---------- button busy state ---------- */
  function busy(btn, on) {
    if (!btn) return;
    if (on) {
      btn.dataset.label = btn.dataset.label || btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="btn__spinner" aria-hidden="true"></span>处理中…';
    } else {
      btn.disabled = false;
      if (btn.dataset.label) btn.innerHTML = btn.dataset.label;
    }
  }

  /* ---------- status tags ---------- */
  const STATUS_LABEL = {
    draft: "草稿",
    frozen: "已冻结",
    pending: "待审",
    staged: "已预发布",
    published: "已发布",
    rejected: "已驳回",
  };
  function statusTag(status) {
    const cls =
      {
        draft: "tag--draft",
        frozen: "tag--frozen",
        pending: "tag--pending",
        staged: "tag--staged",
        published: "tag--published",
        rejected: "tag--rejected",
      }[status] || "";
    return `<span class="tag ${cls}">${esc(STATUS_LABEL[status] || status)}</span>`;
  }

  /* ---------- shell ---------- */
  function buildTopbar(active) {
    const bar = el("div", { class: "topbar__inner container" });
    bar.appendChild(
      el("a", { class: "brand", href: "/" }, [
        el("span", { class: "brand__seal", text: "兰" }),
        el("span", { text: "兰台" }),
        el("span", { class: "brand__sub", text: "LanTai" }),
      ]),
    );
    const toggle = el("button", {
      class: "btn btn--ghost btn--sm navtoggle",
      type: "button",
      "aria-label": "打开导航菜单",
      "aria-expanded": "false",
      html: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    });
    const nav = el("nav", { class: "topnav", "aria-label": "主导航" });
    for (const item of PUBLIC_NAV) {
      const a = el("a", { href: item.href, text: item.label });
      if (item.id === active) a.setAttribute("aria-current", "page");
      nav.appendChild(a);
    }
    const chip = el("span", { class: "authchip", dataset: { state: "pending" } }, [
      el("span", { class: "authchip__dot" }),
      el("a", { class: "authchip__name", href: "/admin", text: "控制台" }),
    ]);
    nav.appendChild(chip);
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    bar.appendChild(toggle);
    bar.appendChild(nav);
    window.__ltAuthChip = chip;
    return bar;
  }

  function buildFooter() {
    const inner = el("div", { class: "container sitefoot__row" });
    inner.appendChild(
      el("div", {}, [
        el("strong", { text: "兰台 LanTai" }),
        el("span", { text: " · 公开数据发布与共享平台" }),
      ]),
    );
    const links = el("nav", { class: "cluster", "aria-label": "页脚导航" });
    links.appendChild(el("a", { href: "/docs/", text: "文档" }));
    links.appendChild(el("a", { href: "/docs/reader.html", text: "使用说明" }));
    links.appendChild(el("a", { href: "/submit", text: "贡献" }));
    inner.appendChild(links);
    return inner;
  }

  function renderSession(chip) {
    const link = chip.querySelector(".authchip__name");
    get("/api/admin/session")
      .then((s) => {
        chip.dataset.state = "in";
        const name = s?.actor ? s.actor : "控制台";
        link.textContent = name;
        link.title = "进入控制台";
      })
      .catch(() => {
        chip.dataset.state = "out";
        link.textContent = "登录";
        link.title = "登录并进入控制台";
      });
  }

  function mountShell(opts) {
    opts = opts || {};
    const active = opts.active || "";
    const top = $("[data-lt-topbar]");
    if (top) top.appendChild(buildTopbar(active));
    const foot = $("[data-lt-footer]");
    if (foot) foot.appendChild(buildFooter());
    if (window.__ltAuthChip) renderSession(window.__ltAuthChip);
    const side = $("[data-lt-sidenav]");
    if (side) mountSidenav(side, active);
    const dnav = $("[data-lt-docsnav]");
    if (dnav) mountDocsNav(dnav);
    document.documentElement.setAttribute("data-page", active);
  }

  function mountSidenav(node, active) {
    clear(node);
    node.appendChild(el("div", { class: "sidenav__group", text: "控制台" }));
    for (const item of CONSOLE_NAV) {
      const a = el("a", { href: item.href, text: item.label });
      if (item.id === active) a.setAttribute("aria-current", "page");
      node.appendChild(a);
    }
    node.appendChild(el("div", { class: "sidenav__group", text: "站点" }));
    node.appendChild(el("a", { href: "/", text: "返回公开站点" }));
    node.appendChild(el("a", { href: "/docs/", text: "文档" }));
  }

  function mountDocsNav(node, _active) {
    clear(node);
    const here = location.pathname.replace(/\/+$/, "/");
    node.appendChild(el("div", { class: "sidenav__group", text: "文档" }));
    for (const item of DOCS_NAV) {
      const a = el("a", { href: item.href, text: item.label });
      const target = item.href.replace(/\/+$/, "/");
      if (target === here) a.setAttribute("aria-current", "page");
      node.appendChild(a);
    }
    node.appendChild(el("div", { class: "sidenav__group", text: "相关" }));
    node.appendChild(el("a", { href: "/", text: "数据目录" }));
    node.appendChild(el("a", { href: "/search", text: "跨数据集搜索" }));
    node.appendChild(el("a", { href: "/submit", text: "贡献数据" }));
    node.appendChild(el("a", { href: "/status", text: "查询进度" }));
  }

  /* ---------- steps ---------- */
  function steps(mount, labels) {
    const list = el("ol", { class: "steps" });
    const items = labels.map((l) => el("li", { text: l }));
    for (const it of items) list.appendChild(it);
    mount.appendChild(list);
    return {
      go(i) {
        items.forEach((it, idx) => {
          it.dataset.state = idx < i ? "done" : idx === i ? "current" : "todo";
          it.removeAttribute("aria-current");
        });
        if (items[i]) items[i].setAttribute("aria-current", "step");
      },
      element: list,
    };
  }

  /* ---------- highlight + json tree ---------- */
  const HL_RE =
    /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}[\],:])/g;
  function highlightJson(src) {
    let out = "";
    let last = 0;
    HL_RE.lastIndex = 0;
    let m = HL_RE.exec(src);
    while (m) {
      out += esc(src.slice(last, m.index));
      if (m[1] !== undefined) {
        out += `<span class="${m[2] ? "tok-key" : "tok-str"}">${esc(m[1])}</span>`;
        if (m[2]) out += `<span class="tok-punc">${esc(m[2])}</span>`;
      } else if (m[3]) out += `<span class="tok-lit">${esc(m[3])}</span>`;
      else if (m[4]) out += `<span class="tok-num">${esc(m[4])}</span>`;
      else if (m[5]) out += `<span class="tok-punc">${esc(m[5])}</span>`;
      last = HL_RE.lastIndex;
      m = HL_RE.exec(src);
    }
    out += esc(src.slice(last));
    return out;
  }

  function jsonTree(value, opts) {
    opts = opts || {};
    const root = el("div", { class: "tree" });
    root.appendChild(nodeFor(value, opts.collapsed));
    return root;
  }
  function nodeFor(value, collapsed) {
    if (value === null) return el("span", { class: "tree-val tree-val--null", text: "null" });
    if (Array.isArray(value) || typeof value === "object") {
      const isArr = Array.isArray(value);
      const keys = isArr ? value.map((_, i) => i) : Object.keys(value);
      const details = el("details");
      if (!collapsed) details.open = true;
      const summary = el("summary", {
        text: isArr ? `Array(${value.length})` : `Object(${keys.length})`,
      });
      details.appendChild(summary);
      for (const k of keys) {
        const row = el("div", { class: "tree-row" });
        const keyEl = el("span", { class: "tree-key", text: isArr ? `[${k}]` : k });
        row.appendChild(keyEl);
        row.appendChild(nodeFor(value[k], collapsed));
        details.appendChild(row);
      }
      return details;
    }
    if (typeof value === "string") return el("span", { class: "tree-val", text: `"${value}"` });
    return el("span", { class: "tree-val", text: String(value) });
  }

  function renderFields(fields) {
    const wrap = el("div");
    for (const f of fields || []) wrap.appendChild(fieldNode(f));
    return wrap;
  }
  function fieldNode(f) {
    const box = el("div", { class: "render-field" });
    box.appendChild(
      el("div", { class: "render-label" }, [
        f.key ? el("span", { class: "render-key", text: f.key }) : null,
        el("span", { class: "render-title", text: f.title || "" }),
        f.type ? el("span", { class: "tag tag--plain", text: f.type }) : null,
      ]),
    );
    if (f.children) {
      const kids = el("div", { class: "render-children" });
      for (const c of f.children) kids.appendChild(fieldNode(c));
      box.appendChild(kids);
    } else {
      box.appendChild(
        el("div", {
          class: "render-value",
          text: typeof f.value === "string" ? f.value : JSON.stringify(f.value),
        }),
      );
    }
    return box;
  }

  const DIFF_LABEL = { added: "新增", removed: "移除", changed: "变更" };
  function diffView(entries) {
    const wrap = el("div", { class: "diff" });
    if (!entries || entries.length === 0) {
      wrap.appendChild(el("p", { class: "muted", text: "与当前已发布版本无差异。" }));
      return wrap;
    }
    for (const e of entries) {
      const fmt = (v) => (v === undefined ? "—" : JSON.stringify(v));
      wrap.appendChild(
        el("div", { class: `diff-row diff--${e.kind}` }, [
          el("div", { class: "diff-row__head" }, [
            el("span", { class: "tag tag--plain", text: DIFF_LABEL[e.kind] || e.kind }),
            el("code", { text: e.path || "/" }),
          ]),
          el("div", {
            class: "diff-row__body",
            text: `原值 ${fmt(e.before)} → 新值 ${fmt(e.after)}`,
          }),
        ]),
      );
    }
    return wrap;
  }

  /* ---------- JSON editor ---------- */
  function jsonEditor(mount, opts) {
    opts = opts || {};
    const editor = el("div", { class: "lt-editor" });
    const bar = el("div", { class: "lt-editor__bar" });
    const status = el("div", { class: "lt-editor__status", role: "status" });
    const code = el("div", { class: "lt-editor__code" });
    const stage = el("div", { class: "lt-editor__stage" });
    const hl = el("pre", { class: "lt-editor__hl", "aria-hidden": "true" });
    const input = el("textarea", {
      class: "lt-editor__input",
      spellcheck: "false",
      autocapitalize: "off",
      autocomplete: "off",
      "aria-label": opts.label || "JSON 内容",
      placeholder: opts.placeholder || "{\n  \n}",
    });
    input.value = opts.value != null ? opts.value : "";
    input.style.resize = "none";
    stage.appendChild(hl);
    stage.appendChild(input);
    code.appendChild(stage);

    const toolbar = [];
    if (opts.label) {
      toolbar.push(el("span", { class: "label", style: "margin:0", text: opts.label }));
    }
    const spacer = el("span", { class: "spacer" });
    const fmtBtn = el("button", {
      class: "btn btn--ghost btn--sm",
      type: "button",
      text: "格式化",
    });
    const minBtn = el("button", {
      class: "btn btn--ghost btn--sm",
      type: "button",
      text: "压缩",
    });
    const copyBtn = el("button", {
      class: "btn btn--ghost btn--sm",
      type: "button",
      text: "复制",
    });
    const previewBtn = el("button", {
      class: "btn btn--ghost btn--sm",
      type: "button",
      text: "树状预览",
      "aria-pressed": "false",
    });
    const previewWrap = el("div", {
      class: "card__body",
      style: "display:none;border-top:1px solid var(--rule)",
    });
    toolbar.push(spacer, fmtBtn, minBtn, copyBtn, previewBtn);
    for (const t of toolbar) bar.appendChild(t);

    if (opts.readOnly) {
      input.readOnly = true;
      fmtBtn.hidden = true;
      minBtn.hidden = true;
    }

    editor.appendChild(bar);
    editor.appendChild(code);
    editor.appendChild(status);
    editor.appendChild(previewWrap);
    if (mount) {
      clear(mount);
      mount.appendChild(editor);
    }

    let lastParse = { ok: true, value: undefined, error: null };
    function validate() {
      const raw = input.value;
      if (raw.trim() === "") {
        lastParse = { ok: true, value: undefined, error: null };
      } else {
        try {
          lastParse = { ok: true, value: JSON.parse(raw), error: null };
        } catch (err) {
          lastParse = { ok: false, value: undefined, error: err };
        }
      }
      return lastParse;
    }
    function refresh() {
      const raw = input.value;
      hl.innerHTML = `${highlightJson(raw)}\n`;
      hl.scrollLeft = input.scrollLeft;
      hl.scrollTop = input.scrollTop;
      input.style.height = "auto";
      input.style.height = `${input.scrollHeight}px`;
      const p = validate();
      clear(status);
      if (input.value.trim() === "") {
        status.appendChild(el("span", { class: "muted", text: "等待输入…" }));
      } else if (p.ok) {
        status.appendChild(el("span", { class: "tag tag--frozen", text: "JSON 有效" }));
        const root = p.value;
        if (root && typeof root === "object") {
          const n = Array.isArray(root)
            ? `${root.length} 项数组`
            : `${Object.keys(root).length} 个字段`;
          status.appendChild(el("span", { class: "muted", text: n }));
        }
      } else {
        status.appendChild(el("span", { class: "tag tag--error", text: "JSON 错误" }));
        status.appendChild(el("span", { class: "muted", text: p.error.message }));
      }
      if (opts.onChange) opts.onChange(p);
      if (previewBtn.getAttribute("aria-pressed") === "true") {
        clear(previewWrap);
        if (p.ok) previewWrap.appendChild(jsonTree(p.value));
        else previewWrap.appendChild(el("p", { class: "muted", text: "修正 JSON 后显示预览。" }));
      }
    }
    input.addEventListener("input", refresh);
    input.addEventListener("scroll", () => {
      hl.scrollLeft = input.scrollLeft;
      hl.scrollTop = input.scrollTop;
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const s = input.selectionStart;
        const en = input.selectionEnd;
        input.value = `${input.value.slice(0, s)}  ${input.value.slice(en)}`;
        input.selectionStart = input.selectionEnd = s + 2;
        refresh();
      }
    });
    fmtBtn.addEventListener("click", () => {
      const p = validate();
      if (p.ok && p.value !== undefined) {
        input.value = JSON.stringify(p.value, null, 2);
        refresh();
      } else {
        toast("JSON 无效，无法格式化", { type: "warn" });
      }
    });
    minBtn.addEventListener("click", () => {
      const p = validate();
      if (p.ok && p.value !== undefined) {
        input.value = JSON.stringify(p.value);
        refresh();
      } else {
        toast("JSON 无效，无法压缩", { type: "warn" });
      }
    });
    copyBtn.addEventListener("click", () => {
      navigator.clipboard?.writeText(input.value);
      toast("已复制到剪贴板", { type: "ok" });
    });
    previewBtn.addEventListener("click", () => {
      const on = previewBtn.getAttribute("aria-pressed") === "true";
      previewBtn.setAttribute("aria-pressed", on ? "false" : "true");
      previewWrap.style.display = on ? "none" : "";
      refresh();
    });

    // enable highlight overlay only after first successful paint
    editor.classList.add("is-enhanced");
    requestAnimationFrame(refresh);

    return {
      element: editor,
      value: () => input.value,
      parsed: () => validate(),
      setValue: (v) => {
        input.value = typeof v === "string" ? v : JSON.stringify(v, null, 2);
        refresh();
      },
      focus: () => input.focus(),
    };
  }

  /* ---------- misc ---------- */
  function param(name) {
    return new URLSearchParams(location.search).get(name);
  }
  function skeleton(lines) {
    const wrap = el("div", { class: "stack", "aria-hidden": "true" });
    for (let i = 0; i < (lines || 4); i++)
      wrap.appendChild(
        el("span", { class: "skeleton", style: `width:${60 + Math.random() * 35}%` }),
      );
    return wrap;
  }
  function emptyState(title, message, action) {
    const box = el("div", { class: "empty" }, [
      el("h3", { text: title }),
      message ? el("p", { class: "muted", text: message }) : null,
      action || null,
    ]);
    return box;
  }
  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }
  async function loadJsonStrict(path) {
    const res = await fetch(path, { headers: { accept: "application/json" } });
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }
  function datasetLink(slug) {
    return `/dataset?slug=${encodeURIComponent(slug)}`;
  }

  window.LT = {
    PUBLIC_NAV,
    CONSOLE_NAV,
    DOCS_NAV,
    // dom
    el,
    $,
    $$,
    clear,
    esc,
    // text
    fmtDateTime,
    fmtNumber,
    statusTag,
    STATUS_LABEL,
    // net
    api,
    get,
    post,
    loadJsonStrict,
    // ui
    toast,
    confirmDialog,
    busy,
    steps,
    jsonEditor,
    jsonTree,
    renderFields,
    diffView,
    highlightJson,
    skeleton,
    emptyState,
    debounce,
    // shell
    mountShell,
    mountSidenav,
    mountDocsNav,
    // misc
    param,
    datasetLink,
  };
})();
