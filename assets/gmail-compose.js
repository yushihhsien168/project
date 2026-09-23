/* Gmail 網頁版聯絡入口
 * 將所有 mailto: 連結統一轉為 Gmail 瀏覽器版撰寫視窗，
 * 並保留收件者、CC、BCC、主旨、內文，避免使用者重填。
 */
(function () {
  "use strict";

  var GMAIL_COMPOSE = "https://mail.google.com/mail/?view=cm&fs=1";

  function openGmailFromMailto(href) {
    try {
      var raw = String(href || "");
      if (!/^mailto:/i.test(raw)) return false;

      var parts = raw.replace(/^mailto:/i, "").split("?");
      var to = decodeURIComponent(parts[0] || "");
      var params = new URLSearchParams(parts[1] || "");
      var query = new URLSearchParams();

      if (to) query.set("to", to);

      ["cc", "bcc"].forEach(function (key) {
        var value = params.get(key);
        if (value) query.set(key, value);
      });

      var subject = params.get("subject");
      if (subject) {
        // 舊有「公鑑 / FairView」相關主旨統一改成新的聯絡主旨。
        if (/公鑑|fairview/i.test(subject)) {
          subject = "澄思 AI Studio. 專案需求與建議";
        }
        query.set("su", subject);
      }

      var body = params.get("body");
      if (body) query.set("body", body);

      window.open(GMAIL_COMPOSE + "&" + query.toString(), "_blank", "noopener,noreferrer");
      return true;
    } catch (error) {
      console.error("[Gmail Compose] 無法處理 email 連結：", error);
      return false;
    }
  }

  function handleEmailClick(event) {
    var link = event.target && event.target.closest
      ? event.target.closest("a[href]")
      : null;
    if (!link) return;

    var href = link.getAttribute("href") || "";
    if (!/^mailto:/i.test(href)) return;

    if (openGmailFromMailto(href)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  document.addEventListener("click", handleEmailClick, true);

  // 供其他按鈕／程式碼直接呼叫。
  window.__openGmailCompose = function (options) {
    options = options || {};
    var query = new URLSearchParams();

    if (options.to) query.set("to", options.to);
    if (options.cc) query.set("cc", options.cc);
    if (options.bcc) query.set("bcc", options.bcc);

    var subject = options.subject || "澄思 AI Studio. 專案需求與建議";
    if (/公鑑|fairview/i.test(subject)) {
      subject = "澄思 AI Studio. 專案需求與建議";
    }
    query.set("su", subject);

    if (options.body) query.set("body", options.body);

    window.open(GMAIL_COMPOSE + "&" + query.toString(), "_blank", "noopener,noreferrer");
  };
})();
