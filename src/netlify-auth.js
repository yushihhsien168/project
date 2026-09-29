import { oauthLogin, getUser, logout, handleAuthCallback } from '@netlify/identity';

const modal = () => document.querySelector('#loginModal');
const slot = () => document.querySelector('#googleLoginButton');
const hint = () => document.querySelector('#googleLoginHint');
const headerLogin = () => document.querySelector('.member-login');
const JOURNEY_KEY = 'chengsi_journey';
let saveTimer = null;
let currentUser = null;

function setHint(message, tone = '') { const el = hint(); if (!el) return; el.textContent = message; el.dataset.tone = tone; }
function openLogin() { const m=modal(); if(!m)return; m.classList.add('open'); m.setAttribute('aria-hidden','false'); renderMemberState(); }
function closeLogin() { const m=modal(); if(!m)return; m.classList.remove('open'); m.setAttribute('aria-hidden','true'); }
function getLocalJourney(){ try{return {draft:JSON.parse(sessionStorage.getItem('journeyDraft')||'null'),state:JSON.parse(sessionStorage.getItem('journeyState')||'null')}}catch(_){return {draft:null,state:null}} }

async function saveJourneyToAccount(){
  if(!currentUser) return;
  const local=getLocalJourney();
  const payload={version:1,updatedAt:new Date().toISOString(),draft:local.draft,state:local.state};
  try{
    if(typeof currentUser.update==='function') currentUser=await currentUser.update({data:{[JOURNEY_KEY]:payload}});
    else console.warn('Netlify Identity user.update unavailable; local journey remains available.');
  }catch(error){ console.error('Journey account save failed:',error); setHint('會員已登入，但需求資料暫時無法同步到帳號；本次資料仍保留在目前工作階段。','error'); }
}
function scheduleJourneySave(){ if(!currentUser)return; clearTimeout(saveTimer); saveTimer=setTimeout(saveJourneyToAccount,700); }
function restoreJourneyFromAccount(user){
  const saved=user?.user_metadata?.[JOURNEY_KEY]; if(!saved)return false;
  try{
    if(!sessionStorage.getItem('journeyDraft')&&saved.draft) sessionStorage.setItem('journeyDraft',JSON.stringify(saved.draft));
    if(!sessionStorage.getItem('journeyState')&&saved.state) sessionStorage.setItem('journeyState',JSON.stringify(saved.state));
    window.dispatchEvent(new CustomEvent('journey:account-restored',{detail:saved})); return true;
  }catch(error){console.error('Journey account restore failed:',error);return false;}
}

async function renderMemberState(){
  const target=slot(); if(!target)return; target.innerHTML='';
  try{
    currentUser=await getUser();
    if(currentUser){
      restoreJourneyFromAccount(currentUser);
      const name=currentUser.user_metadata?.full_name||currentUser.user_metadata?.name||currentUser.email||'會員';
      target.innerHTML=`<div class="member-session"><div class="member-session-title">已登入澄思會員</div><div class="member-session-name">${escapeHtml(name)}</div><div class="member-session-email">${escapeHtml(currentUser.email||'')}</div><button type="button" class="btn primary block" id="saveJourneyButton">立即保存目前需求資料</button><button type="button" class="btn ghost block" id="memberLogoutButton">登出會員</button></div>`;
      document.querySelector('#saveJourneyButton')?.addEventListener('click',async()=>{setHint('正在保存 STEP 1～STEP 4 需求資料…');await saveJourneyToAccount();setHint('需求資料已保存到你的 Netlify Identity 會員帳號。');});
      document.querySelector('#memberLogoutButton')?.addEventListener('click',async()=>{await logout();currentUser=null;setHint('已安全登出。');updateHeader(false);await renderMemberState();});
      setHint('Google 會員已登入；STEP 1～STEP 4 需求資料可保存到你的會員帳號。'); updateHeader(true,name); return;
    }
  }catch(error){currentUser=null;console.error('Netlify Identity getUser error:',error);}
  const button=document.createElement('button'); button.type='button'; button.className='btn primary block netlify-google-login'; button.innerHTML='<span class="google-g">G</span> 使用 Google 帳號登入';
  button.addEventListener('click',async()=>{setHint('正在前往 Google 安全登入頁面…');try{await oauthLogin('google');}catch(error){console.error('Netlify Identity Google OAuth error:',error);setHint('Google 登入未完成，請確認 Netlify Identity → Registration → External providers 已啟用 Google。','error');}});
  target.appendChild(button); setHint('由 Netlify Identity 處理 Google OAuth；網站不會取得你的 Google 密碼。'); updateHeader(false);
}
function updateHeader(loggedIn,name=''){const button=headerLogin();if(!button)return;const label=button.querySelector('.member-login-label');if(label)label.textContent=loggedIn?`會員：${name}`:'會員登入';button.title=loggedIn?'會員已登入，點擊查看帳號與需求資料':'會員登入';}
function escapeHtml(value){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
window.openLogin=openLogin; window.closeLogin=closeLogin;
document.addEventListener('DOMContentLoaded',()=>{document.querySelector('#memberLoginButton')?.addEventListener('click',openLogin);document.querySelectorAll('[data-login-close]').forEach(el=>el.addEventListener('click',closeLogin));document.addEventListener('keydown',e=>{if(e.key==='Escape')closeLogin();});});
async function initIdentity(){try{const callback=await handleAuthCallback();if(callback?.user)setHint('Google 登入成功，會員工作階段已建立。');}catch(error){console.error('Netlify Identity callback error:',error);setHint('登入回傳處理失敗，請重新嘗試。','error');}await renderMemberState();}
window.addEventListener('journey:changed',scheduleJourneySave); window.addEventListener('beforeunload',()=>{if(currentUser)saveJourneyToAccount();});
document.addEventListener('DOMContentLoaded',()=>{initIdentity().catch(error=>{console.error('Netlify Identity initialization failed:',error);setHint('會員登入服務載入失敗，請確認 Netlify Identity 已啟用。','error');});});
