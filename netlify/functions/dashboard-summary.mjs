import { getStore } from "@netlify/blobs";

var PROJECT_ORDER = ["stratedge", "aiops", "hrmatch", "career", "lifecompass", "omniastro"];
var PROJECT_NAMES = {
  stratedge: "策引 AI｜Strat Edge",
  aiops: "AIOps 智慧巡檢通報平台",
  hrmatch: "人資媒合決策系統",
  career: "職透",
  lifecompass: "人生羅盤 LifeCompass",
  omniastro: "真命盤"
};

function json(obj, status) {
  return new Response(JSON.stringify(obj, null, 2), {
    status: status || 200,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

export default async (req, context) => {
  try {
    var siteStore = getStore("portfolio-tracker");
    var pmStore = getStore("pm-governance");

    // 讀取「上一次 check-sites 執行後」留下的快照，不主動重新連線六個網站，
    // 這樣打開儀表板不會每次都花 5-15 秒去抓六個網站
    var snapshot = (await siteStore.get("last-snapshot", { type: "json" })) || { results: [] };

    var riskList = await listCollection(pmStore, "risks");
    var decisionList = await listCollection(pmStore, "decisions");
    var milestoneList = await listCollection(pmStore, "milestones");
    var techdebtList = await listCollection(pmStore, "techdebt");
    var budgetList = await listCollection(pmStore, "budget");
    var complianceList = await listCollection(pmStore, "compliance");

    var today = new Date().toISOString().slice(0, 10);
    var in30Days = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);

    var summary = PROJECT_ORDER.map(function (id) {
      var site = snapshot.results.find(function (r) { return r.id === id; });
      var risksForProject = riskList.filter(function (r) { return r.projectId === id && r.status !== "已結案"; });
      var openDecisions = decisionList.filter(function (d) { return d.projectId === id && d.status === "待裁示"; });

      var highRisks = risksForProject.filter(function (r) {
        return (Number(r.likelihood) || 0) * (Number(r.impact) || 0) >= 15;
      });

      var overdueMilestones = milestoneList.filter(function (m) {
        return m.projectId === id && m.status !== "已完成" && m.plannedDate && m.plannedDate < today;
      });

      var highTechDebt = techdebtList.filter(function (t) {
        return t.projectId === id && t.status !== "已解決" && t.severity === "高";
      });

      var overBudget = budgetList.filter(function (b) {
        return b.projectId === id && Number(b.actualAmount) > Number(b.budgetAmount) && Number(b.budgetAmount) > 0;
      });

      var complianceAlerts = complianceList.filter(function (c) {
        return c.projectId === id && (c.status === "不符合" || (c.certExpiryDate && c.certExpiryDate <= in30Days));
      });

      // 燈號邏輯：網站異常／高風險／逾期里程碑／高嚴重度技術債／預算超支／法遵不符或即將到期 → 紅燈；
      // 待裁示事項／一般風險 → 黃燈；其餘 → 綠燈
      var light = "green";
      if (!site || site.ok === false || highRisks.length > 0 || overdueMilestones.length > 0 ||
          highTechDebt.length > 0 || overBudget.length > 0 || complianceAlerts.length > 0) light = "red";
      else if (openDecisions.length > 0 || risksForProject.length > 0) light = "yellow";

      return {
        id: id,
        name: PROJECT_NAMES[id],
        light: light,
        siteOk: site ? site.ok : null,
        siteVersion: site ? site.version : null,
        siteCheckedAt: snapshot.checkedAt || null,
        openRiskCount: risksForProject.length,
        highRiskCount: highRisks.length,
        openDecisionCount: openDecisions.length,
        overdueMilestoneCount: overdueMilestones.length,
        highTechDebtCount: highTechDebt.length,
        overBudgetCount: overBudget.length,
        complianceAlertCount: complianceAlerts.length
      };
    });

    return json({ generatedAt: new Date().toISOString(), projects: summary });
  } catch (err) {
    return json({ error: err && err.message ? err.message : String(err) }, 500);
  }
};

async function listCollection(store, collection) {
  var listResult = await store.list({ prefix: collection + "/" });
  var keys = listResult.blobs.map(function (b) { return b.key; });
  var items = await Promise.all(keys.map(function (k) { return store.get(k, { type: "json" }); }));
  return items.filter(Boolean);
}

export const config = { path: "/.netlify/functions/dashboard-summary" };
