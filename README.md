# 澄思 AI Studio — Netlify Identity + Google Member Login

這個版本不是「單一 HTML 直接開啟」的假登入頁，而是完整的 GitHub → Netlify 專案結構，會員登入採用 Netlify Identity 官方 authentication API，Google OAuth 由 Netlify Identity 管理。

## 專案結構

- `index.html`：網站主頁
- `src/netlify-auth.js`：Netlify Identity / Google OAuth 登入、callback、會員狀態與登出
- `package.json`：Vite 建置與 `@netlify/identity` 相依套件
- `netlify.toml`：Netlify 建置設定
- `.env.example`：提醒 OAuth 機密不放 GitHub
- `README.md`：GitHub / Netlify 設定說明

## GitHub → Netlify 部署

1. 把本專案全部內容上傳到 GitHub repository。
2. Netlify：**Add new project → Import an existing project**。
3. 選擇 GitHub repository。
4. Build command：`npm run build`
5. Publish directory：`dist`
6. Deploy。

Netlify 連接 Git repository 後，後續 push 可以自動觸發部署。

## 啟用 Netlify Identity + Google

部署完成後，在 Netlify 專案：

1. **Identity → Enable Identity**
2. **Identity → Registration → External providers → Add provider → Google**
3. 儲存設定。
4. 若要讓 Google 授權畫面顯示自己的品牌，可再設定 Netlify 的 branded external OAuth credentials。Client Secret 只能放 Netlify，不要放 GitHub。
5. 使用正式 Netlify HTTPS 網址測試 Google 登入。

本專案使用：

- `oauthLogin('google')`
- `handleAuthCallback()`
- `getUser()`
- `logout()`

登入後會員資訊由 Netlify Identity session 提供，不會在前端保存 Google 密碼或 Client Secret。

## 本機開發

```bash
npm install
npm run dev
```

實際 OAuth 登入請以已部署的 HTTPS Netlify 網站測試。

## GitHub 上傳範例

```bash
git init
git add .
git commit -m "feat: Netlify Identity Google member login"
git branch -M main
git remote add origin <YOUR_GITHUB_REPOSITORY_URL>
git push -u origin main
```

## 官方文件

Netlify Identity：
https://docs.netlify.com/manage/security/secure-access-to-sites/identity/get-started/

Google / External provider：
https://docs.netlify.com/manage/security/secure-access-to-sites/identity/registration-login/

Git → Netlify Continuous Deployment：
https://docs.netlify.com/build/git-workflows/overview/
