import { oauthLogin, getUser, logout, handleAuthCallback } from '@netlify/identity';

const modal = () => document.querySelector('#loginModal');
const slot = () => document.querySelector('#googleLoginButton');
const hint = () => document.querySelector('#googleLoginHint');
const headerLogin = () => document.querySelector('.member-login');

function setHint(message, tone = '') {
  const el = hint();
  if (!el) return;
  el.textContent = message;
  el.dataset.tone = tone;
}

function openLogin() {
  const m = modal();
  if (!m) return;
  m.classList.add('open');
  m.setAttribute('aria-hidden', 'false');
  renderMemberState();
}

function closeLogin() {
  const m = modal();
  if (!m) return;
  m.classList.remove('open');
  m.setAttribute('aria-hidden', 'true');
}

async function renderMemberState() {
  const target = slot();
  if (!target) return;
  target.innerHTML = '';

  try {
    const user = await getUser();
    if (user) {
      const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email || '會員';
      target.innerHTML = `
        <div class="member-session">
          <div class="member-session-title">已登入澄思會員</div>
          <div class="member-session-name">${escapeHtml(name)}</div>
          <div class="member-session-email">${escapeHtml(user.email || '')}</div>
          <button type="button" class="btn ghost block" id="memberLogoutButton">登出會員</button>
        </div>`;
      document.querySelector('#memberLogoutButton')?.addEventListener('click', async () => {
        await logout();
        setHint('已安全登出。');
        await renderMemberState();
      });
      setHint('已透過 Netlify Identity 完成 Google 會員驗證。');
      updateHeader(true, name);
      return;
    }
  } catch (error) {
    console.error('Netlify Identity getUser error:', error);
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn primary block netlify-google-login';
  button.innerHTML = '<span class="google-g">G</span> 使用 Google 帳號登入';
  button.addEventListener('click', async () => {
    setHint('正在前往 Google 安全登入頁面…');
    try {
      await oauthLogin('google');
    } catch (error) {
      console.error('Netlify Identity Google OAuth error:', error);
      setHint('Google 登入未完成，請確認 Netlify Identity 已啟用 Google 外部登入。', 'error');
    }
  });
  target.appendChild(button);
  setHint('由 Netlify Identity 處理 Google OAuth；網站不會取得你的 Google 密碼。');
  updateHeader(false);
}

function updateHeader(loggedIn, name = '') {
  const button = headerLogin();
  if (!button) return;
  const old = button.querySelector('.member-login-label');
  if (old) old.remove();
  const label = document.createElement('span');
  label.className = 'member-login-label';
  label.textContent = loggedIn ? `會員：${name}` : '會員登入';
  button.appendChild(label);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;'
  }[c]));
}

window.openLogin = openLogin;
window.closeLogin = closeLogin;

async function initIdentity() {
  try {
    const callback = await handleAuthCallback();
    if (callback?.user) setHint('Google 登入成功，會員工作階段已建立。');
  } catch (error) {
    console.error('Netlify Identity callback error:', error);
    setHint('登入回傳處理失敗，請重新嘗試。', 'error');
  }
  await renderMemberState();
}

document.addEventListener('DOMContentLoaded', initIdentity);
