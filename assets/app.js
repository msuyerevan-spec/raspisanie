// Публичный сайт расписания: все данные страницы — в window.PAGE (собирает raspisanie/site/build.py).
"use strict";
(function () {
  const P = window.PAGE;
  const app = document.getElementById("app");
  const R = P.root || "";
  const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  const DAYS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
  const KEY = "raspisanie.group";

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const add = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const monday = (d) => add(d, -((d.getDay() + 6) % 7));
  const today = () => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); };
  const store = {
    get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* приватный режим */ } },
  };

  // ---------- карточка преподавателя (22.11): по наведению, на телефоне — по нажатию ----------
  // только заполненные поля: полное ФИО, учёная степень, учёное звание, должность, кафедра, факультет / организация
  const CARD = { degree: "Учёная степень", title: "Учёное звание", position: "Должность", department: "Кафедра", org: "Факультет / организация" };
  const card = (n) => (P.people ? P.people[n] : null);
  const tn = (n) => (card(n) ? `<span class="tname" data-tn="${esc(n)}" tabindex="0">${esc(n)}</span>` : esc(n));
  const tns = (s) => String(s || "").split(", ").map(tn).join(", ");
  // одна подсказка на страницу (22.11): на имени — карточка, на остальной строке — её подсказка (data-tip вместо
  // браузерного title); вместе не появляются; открывается туда, где есть место
  let tip = null;
  const touch = () => window.matchMedia && matchMedia("(hover: none)").matches;
  function tipBox() {
    if (!tip) { tip = document.createElement("div"); tip.className = "person-tip"; tip.setAttribute("role", "tooltip"); document.body.appendChild(tip); }
    return tip;
  }
  function placeTip(el, r) {
    const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight, pad = 8;
    el.style.maxWidth = Math.min(340, vw - 2 * pad) + "px";
    el.style.left = "0px"; el.style.top = "0px";
    const w = el.offsetWidth, h = el.offsetHeight;
    let left = r.left;
    if (left + w > vw - pad) left = r.right - w;
    left = Math.max(pad, Math.min(left, vw - w - pad));
    let top = r.bottom + 6;
    if (top + h > vh - pad && r.top - h - 6 >= pad) top = r.top - h - 6;
    el.style.left = left + window.scrollX + "px";
    el.style.top = Math.max(pad, top) + window.scrollY + "px";
  }
  function showTip(el) {
    const c = card(el.dataset.tn);
    if (!c) return;
    const t = tipBox();
    t.className = "person-tip";
    t.innerHTML = (c.full_name ? `<b>${esc(c.full_name)}</b>` : "") +
      Object.entries(CARD).filter(([k]) => c[k]).map(([k, l]) => `<div><span class="muted">${l}:</span> ${esc(c[k])}</div>`).join("");
    t.dataset.for = "tn:" + el.dataset.tn;
    t.hidden = false;
    placeTip(t, el.getBoundingClientRect());
  }
  function showCellTip(el) {
    const t = tipBox();
    if (!t.hidden && t.dataset.for === "cell:" + el.dataset.tip) return;
    t.className = "person-tip cell-tip";
    t.textContent = el.dataset.tip;
    t.dataset.for = "cell:" + el.dataset.tip;
    t.hidden = false;
    placeTip(t, el.getBoundingClientRect());
  }
  const hideTip = () => { if (tip) tip.hidden = true; };
  document.addEventListener("mouseover", (e) => {
    if (touch() || !e.target.closest) return;
    const n = e.target.closest(".tname");
    if (n) { showTip(n); return; }
    const c = e.target.closest("[data-tip]");
    if (c) showCellTip(c); else hideTip();
  });
  document.addEventListener("mouseout", (e) => { if (!e.relatedTarget) hideTip(); });
  // фокус с клавиатуры; на телефоне нажатие даёт и фокус, и щелчок — окошко ведёт только щелчок
  document.addEventListener("focusin", (e) => { if (!touch() && e.target.classList && e.target.classList.contains("tname")) showTip(e.target); });
  document.addEventListener("focusout", (e) => { if (!touch() && e.target.classList && e.target.classList.contains("tname")) hideTip(); });
  document.addEventListener("click", (e) => {
    const t = e.target.closest && e.target.closest(".tname");
    if (t) { e.preventDefault(); if (tip && !tip.hidden && tip.dataset.for === "tn:" + t.dataset.tn) hideTip(); else showTip(t); return; }
    hideTip();
  });
  window.addEventListener("scroll", () => hideTip(), { passive: true });

  function shell(content) {
    const nav = [["index.html", "Группы"], ["teachers.html", "Преподаватели"], ["rooms.html", "Аудитории"], ["changes.html", "Изменения"]]
      .map(([h, t]) => `<a href="${R}${h}">${t}</a>`).join("");
    app.innerHTML = `
      <header class="top"><a class="brand" href="${R}index.html"><img src="${R}assets/favicon.svg" alt="" width="22" height="22">Расписание · Филиал МГУ в Ереване</a><nav>${nav}</nav></header>
      <div class="trial">Пробный режим. Официальное расписание — PDF на <a href="https://msu.am" target="_blank" rel="noopener">msu.am</a>. Отзывы: бот или <a href="mailto:admin@msu.am">admin@msu.am</a></div>
      <main>${content}</main>
      <footer>${esc(P.semester)} · обновлено ${esc(P.built)}</footer>`;
  }

  // ---------- главная: направление → курс → группа ----------
  function renderIndex() {
    let step = { prog: null, course: null };
    const mine = store.get();
    const draw = () => {
      const progs = P.programs;
      let body = "";
      if (!step.prog) {
        const levels = [...new Set(progs.map((p) => p.level))];
        body = levels.map((lv) => `<h3>${esc(lv[0].toUpperCase() + lv.slice(1))}</h3><div class="choices">` +
          progs.filter((p) => p.level === lv).map((p) => `<button data-prog="${esc(p.code)}">${esc(p.name.replace(" (магистратура)", ""))}</button>`).join("") +
          `</div>`).join("");
      } else {
        const p = progs.find((x) => x.code === step.prog);
        const courses = [...new Set(p.groups.map((g) => g.course))];
        body = `<p class="crumbs"><button class="link" data-back="1">← Направления</button> · ${esc(p.name)}</p>`;
        if (courses.length === 1 || step.course) {
          const c = step.course || courses[0];
          const only = p.groups.filter((g) => g.course === c);
          if (only.length === 1) {                // одна группа на курсе — сразу её расписание
            store.set(only[0].id);
            location.href = `${R}g/${encodeURIComponent(only[0].id)}.html`;
            return;
          }
          body += `<h3>${c} курс</h3><div class="choices">` + p.groups.filter((g) => g.course === c)
            .map((g) => `<a class="btn" data-group="${esc(g.id)}" href="${R}g/${encodeURIComponent(g.id)}.html">Группа ${esc(g.id)}</a>`).join("") + `</div>`;
          if (courses.length > 1) body += `<p><button class="link" data-course="0">← Другой курс</button></p>`;
        } else {
          body += `<h3>Курс</h3><div class="choices">` + courses.map((c) => `<button data-course="${c}">${c} курс</button>`).join("") + `</div>`;
        }
      }
      shell(`
        <p class="lead">Расписание занятий Филиала МГУ в Ереване, осенний семестр 2026–27. Обновляется сразу после изменений.</p>
        ${P.bot ? `<p><a class="btn bot" href="${esc(P.bot)}" target="_blank" rel="noopener">✈️ Telegram-бот: расписание и уведомления о переносах</a></p>` : ""}
        ${mine ? `<div class="mine">Ваша группа: <a class="btn primary" href="${R}g/${encodeURIComponent(mine)}.html">Группа ${esc(mine)} →</a></div>` : ""}
        <h1>${mine ? "Выбрать другую группу" : "Выберите группу"}</h1>
        ${body}
        <p class="muted small">Также: <a href="${R}teachers.html">расписание преподавателей</a> (${P.teachers}) ·
        <a href="${R}rooms.html">занятость аудиторий</a> (${P.rooms}) · <a href="${R}changes.html">последние изменения</a>.</p>`);
      app.querySelectorAll("[data-prog]").forEach((b) => (b.onclick = () => { step = { prog: b.dataset.prog, course: null }; draw(); }));
      app.querySelectorAll("[data-course]").forEach((b) => (b.onclick = () => { step.course = +b.dataset.course || null; draw(); }));
      app.querySelectorAll("[data-back]").forEach((b) => (b.onclick = () => { step = { prog: null, course: null }; draw(); }));
      app.querySelectorAll("[data-group]").forEach((a) => (a.onclick = () => store.set(a.dataset.group)));
    };
    draw();
  }

  // ---------- список преподавателей / аудиторий ----------
  function renderList() {
    shell(`<h1>${esc(P.title)}</h1><input id="q" class="search" type="search" placeholder="Поиск" autocomplete="off"><ul class="plain" id="items"></ul>`);
    const draw = () => {
      const q = document.getElementById("q").value.trim().toLowerCase();
      document.getElementById("items").innerHTML = P.items.filter((x) => !q || x.name.toLowerCase().includes(q))
        .map((x) => `<li><a href="${R}${P.dir}/${x.slug}.html">${esc(x.name)}</a>${card(x.name) ? ` <span class="tname tinfo" data-tn="${esc(x.name)}" tabindex="0" aria-label="Сведения о преподавателе">ⓘ</span>` : ""}</li>`).join("") || `<li class="muted">Не найдено</li>`;
    };
    document.getElementById("q").oninput = draw;
    draw();
  }

  // ---------- лента изменений ----------
  // все изменения, и прошедших дней (18.11); в обновлении — текущая неделя первой и с цветным фоном (с пятницы 19:00
  // «текущей» считается следующая неделя), затем следующие недели, затем прошедшие дни; сокращённое название —
  // полное по наведению или нажатию; показываем по 30 строк, «Показать ещё 30» добавляет следующие
  // имена преподавателей в строке — жирным (17.11)
  function bold(text, names) {
    let h = esc(text);
    [...(names || [])].sort((a, b) => b.length - a.length).forEach((n) => {
      h = h.split(esc(n)).join(card(n) ? `<b class="tname" data-tn="${esc(n)}" tabindex="0">${esc(n)}</b>` : `<b>${esc(n)}</b>`);
    });
    return h;
  }
  function curRange() {
    const now = new Date(), t = today();
    let end = add(monday(t), 6);
    if ((now.getDay() === 5 && now.getHours() >= 19) || now.getDay() === 6 || now.getDay() === 0) end = add(monday(t), 13);
    return [iso(t), iso(end)];
  }
  const FEED_STEP = 30;
  const SUBS = ["Текущая неделя", "Следующие недели", "Прошедшие дни"];
  // limit — сколько строк показать (обновление, разрезанное границей, продолжается под тем же заголовком)
  function feedHtml(feed, limit = Infinity) {
    const [from, to] = curRange();
    const sec = (i) => !i.ds ? null : i.ds.some((x) => x >= from && x <= to) ? 0 : i.d >= from ? 1 : 2;
    const keyDate = (i) => { const f = (i.ds || []).filter((x) => x >= from); return f.length ? f[0] : (i.d || ""); };
    let left = limit, total = 0;
    const html = feed.map((e) => {
      const items = e.items.map((i) => ({ ...i, s: sec(i), k: keyDate(i) }));
      items.sort((a, b) => ((a.s ?? 1) - (b.s ?? 1)) || (a.s === 2 ? b.k.localeCompare(a.k) : a.k.localeCompare(b.k))
        || ((a.p || 0) - (b.p || 0)) || a.g.localeCompare(b.g));
      total += items.length;
      if (left <= 0) return "";
      const many = new Set(items.filter((i) => i.s !== null).map((i) => i.s)).size > 1;
      const shown = items.slice(0, left);
      left -= shown.length;
      let w = null;
      const li = shown.map((i) => {
        const head = many && i.s !== null && i.s !== w ? `<li class="feed-sub">${SUBS[i.s]}</li>` : "";
        if (i.s !== null) w = i.s;
        const txt = i.f ? `<span class="trunc" data-tip="${esc(i.f)}"><span class="s">${bold(i.x, i.tc)}</span><span class="f" hidden>${bold(i.f, i.tc)}</span></span>` : bold(i.x, i.tc);
        return `${head}<li${i.s === 0 ? ' class="cur"' : i.s === 2 ? ' class="past"' : ""}>${i.g ? `<b>${esc(i.g)}</b> — ` : ""}${txt}</li>`;
      }).join("");
      return `<div class="feed"><div class="when">${esc(e.t)}</div><ul>${li}</ul></div>`;
    }).join("");
    return limit === Infinity ? html : { html, more: total > limit };
  }
  document.addEventListener("click", (ev) => {
    const t = ev.target.closest && ev.target.closest(".trunc");
    if (t) t.querySelectorAll(".s, .f").forEach((x) => (x.hidden = !x.hidden));
  });

  // фильтры ленты: группа, преподаватель, период по дате обновления (не по дате пары)
  // метки: «102» — вся группа, «102-1» — подгруппа (18.11). Фильтр «102» — все строки группы, «102-1» — строки всей
  // группы и подгруппы 1, без 102-2
  const gBase = (x) => x.replace(/-\d+$/, "");
  const gIn = (gs, f) => gs.split(", ").some((x) => x === f || (f === gBase(f) ? gBase(x) === f : x === gBase(f)));
  function filterFeed(feed, f) {
    return feed.filter((e) => (!f.from || e.u >= f.from) && (!f.to || e.u <= f.to)).map((e) => ({ ...e,
      items: e.items.filter((i) => (!i.g ? !f.g && !f.t : (!f.g || gIn(i.g, f.g)) && (!f.t || (i.tc || []).includes(f.t)))) }))
      .filter((e) => e.items.length);
  }

  function renderFeed() {
    const labels = P.feed.flatMap((e) => e.items.flatMap((i) => (i.g ? i.g.split(", ") : [])));
    const groups = [...new Set([...labels, ...labels.map(gBase)])].sort();
    const teachers = [...new Set(P.feed.flatMap((e) => e.items.flatMap((i) => i.tc || [])))].sort((a, b) => a.localeCompare(b, "ru"));
    const opt = (xs, all) => `<option value="">${all}</option>` + xs.map((x) => `<option>${esc(x)}</option>`).join("");
    shell(`<h1>Последние изменения</h1>
      ${P.feed.length ? `<div class="filters">
        <label>Группа <select id="f-g">${opt(groups, "все")}</select></label>
        <label>Преподаватель <select id="f-t">${opt(teachers, "все")}</select></label>
        <label>Обновления с <input id="f-from" type="date"></label>
        <label>по <input id="f-to" type="date"></label></div><div id="feed-list"></div>`
        : `<p class="muted">Изменений после первой публикации${P.since ? " " + esc(P.since) : ""} нет.</p>`}
      ${P.restarted ? `<p class="muted small">Расписание перестроено ${esc(P.since)}; более ранние изменения не показываются.</p>` : ""}`);
    if (!P.feed.length) return;
    let limit = FEED_STEP;
    const draw = () => {
      const f = { g: document.getElementById("f-g").value, t: document.getElementById("f-t").value,
        from: document.getElementById("f-from").value, to: document.getElementById("f-to").value };
      const r = feedHtml(filterFeed(P.feed, f), limit);       // фильтр — по всей ленте, затем первые limit строк
      const box = document.getElementById("feed-list");
      box.innerHTML = (r.html || `<p class="muted">Изменений с такими условиями нет.</p>`)
        + (r.more ? `<p class="center"><button class="link" id="feed-more">Показать ещё ${FEED_STEP}</button></p>` : "");
      const b = document.getElementById("feed-more");
      if (b) b.onclick = () => { limit += FEED_STEP; draw(); };
    };
    app.querySelectorAll(".filters select, .filters input").forEach((x) => (x.onchange = () => { limit = FEED_STEP; draw(); }));
    draw();
  }

  // ---------- расписание на неделю ----------
  function weekLabel(m) {
    const s = add(m, 5);
    return m.getMonth() === s.getMonth() ? `${m.getDate()}–${s.getDate()} ${MONTHS[s.getMonth()]}`
      : `${m.getDate()} ${MONTHS[m.getMonth()]} – ${s.getDate()} ${MONTHS[s.getMonth()]}`;
  }

  function lessonHtml(l) {
    const place = l.o ? (l.r ? `<span class="tag online"><span class="full">${esc(l.w)}</span><span class="short">онлайн · группа в ауд. ${esc(l.r)}</span></span>`
      : `<span class="tag online">${esc(l.w || "онлайн")}</span>`) : `<span class="tag onsite">${esc(l.w)}${l.w === "спортзал" ? "" : " · очно"}</span>`;
    const who = P.kind === "teacher" ? "" : `<div class="who">${tns(l.t)}</div>`;
    if (l.x) return `<div class="lesson missed">
      <div class="time"><b>${l.p}</b><span>${esc(l.s)}</span><span>${esc(l.e)}</span></div>
      <div class="what"><div class="title">${esc(l.c)}${l.sg ? ` <span class="tag sub">${esc(l.sg)}</span>` : ""}</div>
        ${who}<div class="meta"><span class="tag missed">не состоялась</span></div></div></div>`;
    return `<div class="lesson${l.m ? " changed" : ""}${l.k ? " exam" : ""}">
      <div class="time"><b>${l.p}</b><span>${esc(l.s)}</span><span>${esc(l.e)}</span></div>
      <div class="what">
        <div class="title">${esc(l.c)}${l.sg ? ` <span class="tag sub">${esc(l.sg)}</span>` : ""}${!l.k && P.forms && P.forms[l.c] ? ` <span class="tag ctl" data-tip="Форма контроля по РУП">${esc(P.forms[l.c])}</span>` : ""}</div>
        ${who}
        <div class="meta">${place}${l.g ? ` <span class="groups">${esc(l.g)}</span>` : ""}</div>
        ${l.m ? `<div class="mark">🔄 ${esc(l.m)}${l.b ? ` <span class="was">(${esc(l.b)})</span>` : ""}</div>` : ""}
      </div></div>`;
  }

  // подгруппа на странице 102 / 106: «Вся группа» (0), 1 или 2; из адреса (?sg=1, ссылка из бота) или запомненная
  function subChoice() {
    if (!P.subs) return 0;
    const ok = (v) => P.subs.some((s) => String(s.n) === String(v));
    const k = "raspisanie.sub." + P.id;
    const q = new URLSearchParams(location.search).get("sg");
    if (q !== null && (q === "0" || ok(q))) { try { localStorage.setItem(k, q); } catch (e) { /* приватный режим */ } return +q; }
    let v = null;
    try { v = localStorage.getItem(k); } catch (e) { /* приватный режим */ }
    return ok(v) ? +v : 0;
  }

  function renderSchedule() {
    const first = monday(parse(P.start)), last = monday(parse(P.end));
    let sub = subChoice();
    let byDay = {};
    const regroup = () => {
      byDay = {};
      P.lessons.filter((l) => !sub || !l.sb || l.sb === sub).forEach((l) => (byDay[l.d] = byDay[l.d] || []).push(l));
    };
    regroup();
    const subOf = () => (P.subs || []).find((s) => s.n === sub);
    const clamp = (m) => (m < first ? first : m > last ? last : m);
    // текущая неделя для открытия: в воскресенье и в субботу после последней пары этой страницы — следующая
    const current = () => {
      const now = new Date(), t = today(), dow = t.getDay();
      let m = monday(t);
      if (dow === 0) m = add(t, 1);
      else if (dow === 6) {
        const ends = (byDay[iso(t)] || []).map((l) => l.e).sort();
        const hm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        if (!ends.length || hm >= ends[ends.length - 1]) m = add(t, 2);
      }
      return clamp(m);
    };
    const fromHash = () => { const m = /w=(\d{4}-\d\d-\d\d)/.exec(location.hash); return m ? clamp(monday(parse(m[1]))) : current(); };
    let week = fromHash();

    const calHtml = () => {
      const ics = subOf() ? subOf().ics : P.ics;
      if (!ics) return "";
      const https = location.protocol.startsWith("http");
      const url = new URL(ics, location.href);
      const webcal = https ? "webcal://" + url.host + url.pathname : "";
      return `<details class="cal"><summary>📅 Подписаться на календарь${subOf() ? " " + esc(subOf().label) : ""}</summary>
        <p>Расписание появится в календаре телефона и будет обновляться само.</p>
        <p>${webcal ? `<a class="btn primary" href="${esc(webcal)}">Подписаться (iPhone, Mac, Outlook)</a> ` : ""}
        <a class="btn" href="${esc(ics)}" download>Скачать файл .ics</a></p>
        ${https ? `<p class="small muted">Google Календарь: «Другие календари» → «+» → «Добавить по URL» → вставьте адрес<br><code>${esc(url.href)}</code></p>` : ""}
      </details>`;
    };
    // переключатель подгруппы и лента группы: «102-1» видит строки всей группы и свои, без 102-2
    const subsHtml = () => !P.subs ? "" : `<div class="subsel" role="group" aria-label="Подгруппа">` +
      [{ n: 0, label: "Вся группа" }, ...P.subs].map((s) => `<button data-sub="${s.n}" class="${s.n === sub ? "on" : ""}">${esc(s.label)}</button>`).join("") + `</div>`;
    const groupFeed = () => (P.feed || []).map((e) => ({ ...e, items: e.items.filter((i) => !sub || !i.g || gIn(i.g, `${P.id}-${sub}`)) }))
      .filter((e) => e.items.length);

    const draw = () => {
      const now = today(), cur = current();
      const prelimFrom = add(monday(now), 7 * P.notifyWeeks);
      const prelim = week >= prelimFrom;
      let days = "";
      for (let i = 0; i < 7; i++) {
        const d = add(week, i), key = iso(d), ls = byDay[key] || [];
        if (i === 6 && !ls.length) continue;
        const isToday = key === iso(now);
        const off = P.off[key];
        const head = `<h3 class="day${isToday ? " today" : ""}">${DAYS[i]}, ${d.getDate()} ${MONTHS[d.getMonth()]}${isToday ? ` <span class="tag now">сегодня</span>` : ""}</h3>`;
        const inSem = key >= P.start && key <= P.end;
        const body = ls.length ? ls.map(lessonHtml).join("") :
          `<p class="muted none">${off ? esc(off[0].toUpperCase() + off.slice(1)) : inSem ? "Пар нет" : "Вне семестра"}</p>`;
        days += `<section${isToday ? ' id="today"' : ""}>${head}${body}</section>`;
      }
      const thisMon = monday(now);
      const label = +week === +thisMon ? "текущая неделя" : +week === +add(thisMon, 7) ? "следующая неделя" : "";
      shell(`
        <h1>${subOf() ? esc("Группа " + subOf().label) : P.kind === "teacher" ? tn(P.title) : esc(P.title)}</h1><p class="muted sub">${esc(P.sub)}</p>
        ${subsHtml()}
        ${calHtml()}
        <div class="weeknav">
          <button id="prev" ${+week <= +first ? "disabled" : ""} aria-label="Предыдущая неделя">‹</button>
          <div class="wl"><b>${weekLabel(week)}</b><span>${label}${prelim ? `${label ? " · " : ""}<span class="tag prelim">предварительно</span>` : ""}</span></div>
          <button id="next" ${+week >= +last ? "disabled" : ""} aria-label="Следующая неделя">›</button>
        </div>
        ${+week !== +cur ? `<p class="center"><button class="link" id="now">↩ ${+cur === +thisMon ? "К текущей неделе" : "К ближайшей неделе"}</button></p>` : ""}
        ${prelim ? `<p class="note">Неделя дальше окна оповещений: расписание предварительное и может измениться.</p>` : ""}
        ${days}
        ${groupFeed().length ? `<h2>Последние изменения группы</h2>${feedHtml(groupFeed(), 15).html}<p><a href="${R}changes.html">Все изменения →</a></p>` : ""}`);
      const go = (m) => { week = clamp(m); history.replaceState(null, "", "#w=" + iso(week)); draw(); window.scrollTo(0, 0); };
      document.getElementById("prev").onclick = () => go(add(week, -7));
      document.getElementById("next").onclick = () => go(add(week, 7));
      const n = document.getElementById("now");
      if (n) n.onclick = () => go(current());
      app.querySelectorAll("[data-sub]").forEach((b) => (b.onclick = () => {
        sub = +b.dataset.sub;
        try { localStorage.setItem("raspisanie.sub." + P.id, String(sub)); } catch (e) { /* приватный режим */ }
        regroup(); draw();
      }));
    };
    window.addEventListener("hashchange", () => { week = fromHash(); draw(); });
    draw();
    // в будни при открытии — к сегодняшнему дню (под липкой строкой недели)
    const td = document.getElementById("today");
    if (td && !/w=/.test(location.hash)) {
      const nav = document.querySelector(".weeknav");
      window.scrollTo(0, td.getBoundingClientRect().top + window.scrollY - (nav ? nav.offsetHeight : 0) - 4);
    }
  }

  ({ index: renderIndex, list: renderList, feed: renderFeed, schedule: renderSchedule }[P.type] || renderIndex)();
})();
