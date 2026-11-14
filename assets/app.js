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

  function shell(content) {
    const nav = [["index.html", "Группы"], ["teachers.html", "Преподаватели"], ["rooms.html", "Аудитории"], ["changes.html", "Изменения"]]
      .map(([h, t]) => `<a href="${R}${h}">${t}</a>`).join("");
    app.innerHTML = `
      <header class="top"><a class="brand" href="${R}index.html"><img src="${R}assets/favicon.svg" alt="" width="22" height="22">Расписание · Филиал МГУ в Ереване</a><nav>${nav}</nav></header>
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
        .map((x) => `<li><a href="${R}${P.dir}/${x.slug}.html">${esc(x.name)}</a></li>`).join("") || `<li class="muted">Не найдено</li>`;
    };
    document.getElementById("q").oninput = draw;
    draw();
  }

  // ---------- лента изменений ----------
  function feedHtml(feed) {
    return feed.map((e) => `<div class="feed"><div class="when">${esc(e.t)}</div><ul>` +
      e.items.map((i) => `<li><b>${esc(i.g)}</b> — ${esc(i.x)}</li>`).join("") + `</ul></div>`).join("");
  }

  function renderFeed() {
    shell(`<h1>Последние изменения</h1>
      ${P.feed.length ? feedHtml(P.feed) : `<p class="muted">Изменений после первой публикации${P.since ? " " + esc(P.since) : ""} нет.</p>`}
      ${P.restarted ? `<p class="muted small">Расписание перестроено ${esc(P.since)}; более ранние изменения не показываются.</p>` : ""}`);
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
    const who = P.kind === "teacher" ? "" : `<div class="who">${esc(l.t)}</div>`;
    return `<div class="lesson${l.m ? " changed" : ""}${l.k ? " exam" : ""}">
      <div class="time"><b>${l.p}</b><span>${esc(l.s)}</span><span>${esc(l.e)}</span></div>
      <div class="what">
        <div class="title">${esc(l.c)}${l.sg ? ` <span class="tag sub">${esc(l.sg)}</span>` : ""}${!l.k && P.forms && P.forms[l.c] ? ` <span class="tag ctl" title="Форма контроля по РУП">${esc(P.forms[l.c])}</span>` : ""}</div>
        ${who}
        <div class="meta">${place}${l.g ? ` <span class="groups">${esc(l.g)}</span>` : ""}</div>
        ${l.m ? `<div class="mark">🔄 ${esc(l.m)}${l.b ? ` <span class="was">(${esc(l.b)})</span>` : ""}</div>` : ""}
      </div></div>`;
  }

  function renderSchedule() {
    const first = monday(parse(P.start)), last = monday(parse(P.end));
    const byDay = {};
    P.lessons.forEach((l) => (byDay[l.d] = byDay[l.d] || []).push(l));
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

    let cal = "";
    if (P.ics) {
      const https = location.protocol.startsWith("http");
      const url = new URL(P.ics, location.href);
      const webcal = https ? "webcal://" + url.host + url.pathname : "";
      cal = `<details class="cal"><summary>📅 Подписаться на календарь</summary>
        <p>Расписание появится в календаре телефона и будет обновляться само.</p>
        <p>${webcal ? `<a class="btn primary" href="${esc(webcal)}">Подписаться (iPhone, Mac, Outlook)</a> ` : ""}
        <a class="btn" href="${esc(P.ics)}" download>Скачать файл .ics</a></p>
        ${https ? `<p class="small muted">Google Календарь: «Другие календари» → «+» → «Добавить по URL» → вставьте адрес<br><code>${esc(url.href)}</code></p>` : ""}
      </details>`;
    }

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
        <h1>${esc(P.title)}</h1><p class="muted sub">${esc(P.sub)}</p>
        ${cal}
        <div class="weeknav">
          <button id="prev" ${+week <= +first ? "disabled" : ""} aria-label="Предыдущая неделя">‹</button>
          <div class="wl"><b>${weekLabel(week)}</b><span>${label}${prelim ? `${label ? " · " : ""}<span class="tag prelim">предварительно</span>` : ""}</span></div>
          <button id="next" ${+week >= +last ? "disabled" : ""} aria-label="Следующая неделя">›</button>
        </div>
        ${+week !== +cur ? `<p class="center"><button class="link" id="now">↩ ${+cur === +thisMon ? "К текущей неделе" : "К ближайшей неделе"}</button></p>` : ""}
        ${prelim ? `<p class="note">Неделя дальше окна оповещений: расписание предварительное и может измениться.</p>` : ""}
        ${days}
        ${P.feed && P.feed.length ? `<h2>Последние изменения группы</h2>${feedHtml(P.feed)}<p><a href="${R}changes.html">Все изменения →</a></p>` : ""}`);
      const go = (m) => { week = clamp(m); history.replaceState(null, "", "#w=" + iso(week)); draw(); window.scrollTo(0, 0); };
      document.getElementById("prev").onclick = () => go(add(week, -7));
      document.getElementById("next").onclick = () => go(add(week, 7));
      const n = document.getElementById("now");
      if (n) n.onclick = () => go(current());
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
