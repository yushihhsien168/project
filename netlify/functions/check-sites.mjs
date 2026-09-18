import { getStore } from "@netlify/blobs";

// 六個專案的基本資料：id、顯示名稱、實際網址
const PROJECTS = [
  { id: "stratedge",    name: "策引 AI｜Strat Edge",              url: "https://ai-stratedge.netlify.app/" },
  { id: "aiops",        name: "AIOps 智慧巡檢通報與營運異常決策平台", url: "https://aiops-platform.netlify.app/" },
  { id: "hrmatch",      name: "人資面試履歷 AI 媒合決策系統",        url: "https://hr-matching.netlify.app/" },
  { id: "career",       name: "職透｜求職者履歷 AI 媒合＆決策系統",   url: "https://career168.netlify.app/" },
  { id: "lifecompass",  name: "人生羅盤 LifeCompass",              url: "https://lifecompass168.netlify.app/" },
  { id: "omniastro",    name: "真命盤",                            url: "https://omniastro.netlify.app/" }
];

// 從網頁原始碼裡嘗試抓出版本號，例如 v2.3.24 / V3.3.3 / v4.5.27
function extractVersion(html) {
  var m = html.match(/[vV]\s?(\d+\.\d+(?:\.\d+)?)/);
  return m ? m[1] : null;
}

function extractTitle(html) {
  var m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m ? m[1].trim() : null;
}

async function fetchOne(project) {
  var controller = new AbortController();
  var timeout = setTimeout(function () { controller.abort(); }, 9000);
  var startedAt = Date.now();
  try {
    var res = await fetch(project.url, { signal: controller.signal, redirect: "follow" });
    var html = await res.text();
    clearTimeout(timeout);
    return {
      id: project.id,
      name: project.name,
      url: project.url,
      ok: res.ok,
      httpStatus: res.status,
      title: extractTitle(html),
      version: extractVersion(html),
      responseMs: Date.now() - startedAt
    };
  } catch (err) {
    clearTimeout(timeout);
    return {
      id: project.id,
      name: project.name,
      url: project.url,
      ok: false,
      httpStatus: null,
      title: null,
      version: null,
      error: err && err.message ? err.message : String(err),
      responseMs: Date.now() - startedAt
    };
  }
}

export default async (req, context) => {
  try {
    var results = await Promise.all(PROJECTS.map(fetchOne));

    var store = getStore("portfolio-tracker");
    var previous = (await store.get("last-snapshot", { type: "json" })) || { results: [] };

    var merged = results.map(function (r) {
      var prev = previous.results.find(function (p) { return p.id === r.id; });
      var versionKnown = !!(prev && prev.version) && !!r.version;
      var changed = versionKnown && prev.version !== r.version;
      return Object.assign({}, r, {
        previousVersion: prev ? prev.version : null,
        changed: changed,
        versionUnknown: !versionKnown
      });
    });

    var checkedAt = new Date().toISOString();
    var snapshot = { checkedAt: checkedAt, results: results };
    await store.setJSON("last-snapshot", snapshot);

    // 歷史紀錄改為「每次檢查各自獨立的 key」寫入，而不是共用同一份陣列。
    // 這樣即使有兩個人在差不多時間各自按下「立即分析」，也不會有人的紀錄被另一個人覆蓋、憑空消失。
    var historyKey = "history/" + checkedAt;
    await store.setJSON(historyKey, {
      checkedAt: checkedAt,
      summary: merged.map(function (m) {
        return { id: m.id, version: m.version, changed: m.changed, ok: m.ok };
      })
    });

    var listResult = await store.list({ prefix: "history/" });
    var allKeys = listResult.blobs
      .map(function (b) { return b.key; })
      .sort()
      .reverse(); // ISO 時間字串可直接字典排序，最新的在最前面

    var recentKeys = allKeys.slice(0, 30);
    var history = (
      await Promise.all(recentKeys.map(function (k) { return store.get(k, { type: "json" }); }))
    ).filter(Boolean);

    // 清掉超過 30 筆的舊紀錄，避免資料無限增長（非本次修正重點，但順手保養）
    var staleKeys = allKeys.slice(30);
    if (staleKeys.length > 0) {
      await Promise.all(staleKeys.map(function (k) { return store.delete(k); }));
    }

    return new Response(
      JSON.stringify({ checkedAt: checkedAt, results: merged, history: history }, null, 2),
      { headers: { "content-type": "application/json; charset=utf-8" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err && err.message ? err.message : String(err) }),
      { status: 500, headers: { "content-type": "application/json; charset=utf-8" } }
    );
  }
};

export const config = { path: "/.netlify/functions/check-sites" };
