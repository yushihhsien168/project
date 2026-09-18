/*!
 * assets/auth.js
 * 共用登入邏輯：Netlify Identity（Google 登入）
 * 1) __initAdminGuard()  ── 後台頁面（admin.html / governance.html / analytics.html）進場守門
 *    未登入 → 自動彈出 Google 登入視窗
 *    已登入但非管理者信箱 → 顯示無權限提示並跳轉回作品集首頁
 *    已登入且為管理者信箱 → 放行，移除遮罩
 * 2) __openSuggestionMail() ── 首頁「建議信箱」按鈕
 *    未登入 → 先跳出登入視窗，登入成功後才開啟 Gmail 撰寫視窗
 *    已登入 → 直接開啟 Gmail 撰寫視窗（主旨已帶入）
 *
 * 使用前提：Netlify 後台 Site settings → Identity 需先啟用，
 * 並在 External providers 開啟 Google 登入；
 * 管理者名單僅開放 felix670131@gmail.com。
 */
(function () {
  "use strict";

  var ADMIN_EMAIL = "felix670131@gmail.com";
  var GMAIL_TO = "project0983487908@gmail.com";
  var GMAIL_SUBJECT = "專案規劃需求建議";

  function isAdmin(user) {
    return !!(user && user.email && user.email.toLowerCase() === ADMIN_EMAIL);
  }

  function openGmailCompose() {
    var url =
      "https://mail.google.com/mail/?view=cm&fs=1&to=" +
      encodeURIComponent(GMAIL_TO) +
      "&su=" +
      encodeURIComponent(GMAIL_SUBJECT);
    window.open(url, "_blank", "noopener");
  }

  // ---------------------------------------------------------------
  // 建議信箱：任何訪客皆可使用，但需先以 Google 帳號登入
  // ---------------------------------------------------------------
  window.__openSuggestionMail = function () {
    if (!window.netlifyIdentity) {
      alert("登入服務載入中，請稍候再試一次。");
      return;
    }
    var user = netlifyIdentity.currentUser();
    if (user) {
      openGmailCompose();
      return;
    }
    netlifyIdentity.open("login");
    netlifyIdentity.once("login", function () {
      netlifyIdentity.close();
      openGmailCompose();
    });
  };

  // ---------------------------------------------------------------
  // 後台守門：僅 ADMIN_EMAIL 可進入，其餘一律跳回作品集首頁
  // ---------------------------------------------------------------
  window.__initAdminGuard = function (opts) {
    opts = opts || {};
    var redirectTo = opts.redirectTo || "index.html";
    var checked = false;

    var overlay = document.createElement("div");
    overlay.id = "admin-guard-overlay";
    overlay.style.cssText =
      "position:fixed;inset:0;background:#0c0f14;color:#e7ecf2;" +
      "display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;" +
      "font-family:'Noto Sans TC','Microsoft JhengHei',sans-serif;z-index:99999;text-align:center;padding:24px;";
    overlay.innerHTML =
      '<div style="font-size:1.15rem;font-weight:500;">🔒 此頁面僅限管理者存取</div>' +
      '<div style="font-size:.85rem;color:#8b96a8;">請使用 Google 帳號登入以驗證身分…</div>';
    document.documentElement.appendChild(overlay);

    function denyAccess(msg) {
      overlay.innerHTML =
        '<div style="font-size:1.15rem;font-weight:500;">🚫 ' +
        (msg || "您沒有存取權限") +
        "</div>" +
        '<div style="font-size:.85rem;color:#8b96a8;">3 秒後將自動跳轉回作品集首頁…</div>';
      setTimeout(function () {
        window.location.href = redirectTo;
      }, 3000);
    }

    function grantAccess(user) {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      document.documentElement.setAttribute("data-admin-user", user.email);
      var badges = document.querySelectorAll("[data-admin-email]");
      for (var i = 0; i < badges.length; i++) badges[i].textContent = user.email;
    }

    function checkUser(user) {
      if (checked) return; // 避免 init/login 事件重複觸發
      checked = true;
      if (isAdmin(user)) {
        grantAccess(user);
      } else {
        denyAccess("此 Google 帳號沒有管理者權限");
        if (window.netlifyIdentity) {
          setTimeout(function () {
            netlifyIdentity.logout();
          }, 200);
        }
      }
    }

    if (!window.netlifyIdentity) {
      denyAccess("登入服務無法載入，請確認網路連線");
      return;
    }

    netlifyIdentity.on("init", function (user) {
      if (user) {
        checkUser(user);
      } else {
        netlifyIdentity.open("login");
      }
    });
    netlifyIdentity.on("login", function (user) {
      checkUser(user);
    });
    netlifyIdentity.on("logout", function () {
      window.location.href = redirectTo;
    });

    netlifyIdentity.init();

    // 保險：若 widget 早於本段程式載入完成，init 事件可能已錯過
    setTimeout(function () {
      var u = netlifyIdentity.currentUser();
      if (u && !checked) checkUser(u);
      else if (!u && !checked) netlifyIdentity.open("login");
    }, 900);
  };

  // 後台頁面共用的「登出」按鈕可直接呼叫這個
  window.__adminLogout = function () {
    if (window.netlifyIdentity) netlifyIdentity.logout();
  };
})();
