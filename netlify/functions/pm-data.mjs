import { getStore } from "@netlify/blobs";

// 白名單：只允許這些「資料類別」被寫入，避免被任意呼叫寫入未知的資料集
const ALLOWED_COLLECTIONS = ["risks", "decisions", "milestones", "market-intel", "techdebt", "budget", "compliance", "team"];

function json(obj, status) {
  return new Response(JSON.stringify(obj, null, 2), {
    status: status || 200,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

function genId() {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

export default async (req, context) => {
  var url = new URL(req.url);
  var collection = url.searchParams.get("collection");

  if (!collection || ALLOWED_COLLECTIONS.indexOf(collection) === -1) {
    return json({ error: "缺少或不支援的 collection 參數（目前僅支援：" + ALLOWED_COLLECTIONS.join("、") + "）" }, 400);
  }

  var store = getStore("pm-governance");

  try {
    if (req.method === "GET") {
      var listResult = await store.list({ prefix: collection + "/" });
      var keys = listResult.blobs.map(function (b) { return b.key; }).sort().reverse();
      var items = (await Promise.all(keys.map(function (k) { return store.get(k, { type: "json" }); }))).filter(Boolean);
      return json({ items: items });
    }

    if (req.method === "POST") {
      var body = await req.json();
      var id = genId();
      var now = new Date().toISOString();
      var record = Object.assign({}, body, { id: id, createdAt: now, updatedAt: now });
      await store.setJSON(collection + "/" + id, record);
      return json({ item: record });
    }

    if (req.method === "PUT") {
      var updateBody = await req.json();
      if (!updateBody.id) return json({ error: "缺少 id，無法更新" }, 400);
      var existing = await store.get(collection + "/" + updateBody.id, { type: "json" });
      if (!existing) return json({ error: "找不到這筆資料，可能已被刪除" }, 404);
      var updated = Object.assign({}, existing, updateBody, { updatedAt: new Date().toISOString() });
      await store.setJSON(collection + "/" + updateBody.id, updated);
      return json({ item: updated });
    }

    if (req.method === "DELETE") {
      var delId = url.searchParams.get("id");
      if (!delId) return json({ error: "缺少 id，無法刪除" }, 400);
      await store.delete(collection + "/" + delId);
      return json({ ok: true });
    }

    return json({ error: "不支援的 HTTP 方法：" + req.method }, 405);
  } catch (err) {
    return json({ error: err && err.message ? err.message : String(err) }, 500);
  }
};

export const config = { path: "/.netlify/functions/pm-data" };
