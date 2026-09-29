import { oauthLogin, getUser, logout, handleAuthCallback, updateUser } from 'https://esm.sh/@netlify/identity@2.0.0';

const modal = () => document.querySelector('#loginModal');
const slot = () => document.querySelector('#googleLoginButton');
const hint = () => document.querySelector('#googleLoginHint');
const headerLogin = () => document.querySelector('.member-login');
const JOURNEY_KEY = 'chengsi_journey';
let saveTimer = null;
let currentUser = null;

function setHint(message, tone = '') { const el = hint(); if (!el) return; el.textContent = ''; el.dataset.tone = ''; }
async function openLogin() {
  try {
    currentUser = await getUser();
    if (currentUser) {
      const m = modal();
      if (!m) return;
      m.classList.add('open');
      m.setAttribute('aria-hidden','false');
      renderMemberState();
      return;
    }
    // 未登入：直接進入 Netlify Identity 的 Google OAuth，不開任何中間登入視窗。
    oauthLogin('google');
  } catch (error) {
    // 技術錯誤只進 Console，不在使用者介面顯示後台資訊。
    console.error('Google OAuth start failed:', error);
  }
}
function closeLogin() { const m=modal(); if(!m)return; m.classList.remove('open'); m.setAttribute('aria-hidden','true'); }
function getLocalJourney(){ try{return {draft:JSON.parse(sessionStorage.getItem('journeyDraft')||'null'),state:JSON.parse(sessionStorage.getItem('journeyState')||'null')}}catch(_){return {draft:null,state:null}} }

async function saveJourneyToAccount(){
  if(!currentUser) return;
  const local=getLocalJourney();
  const payload={version:1,updatedAt:new Date().toISOString(),draft:local.draft,state:local.state};
  try{
    currentUser=await updateUser({data:{[JOURNEY_KEY]:payload}});
  }catch(error){ console.error('Journey account save failed:',error); setHint('會員已登入，但需求資料暫時無法同步到帳號；本次資料仍保留在目前工作階段。','error'); }
}
function scheduleJourneySave(){ if(!currentUser)return; clearTimeout(saveTimer); saveTimer=setTimeout(saveJourneyToAccount,700); }
function restoreJourneyFromAccount(user){
  const saved=user?.userMetadata?.[JOURNEY_KEY]; if(!saved)return false;
  try{
    if(!sessionStorage.getItem('journeyDraft')&&saved.draft) sessionStorage.setItem('journeyDraft',JSON.stringify(saved.draft));
    if(!sessionStorage.getItem('journeyState')&&saved.state) sessionStorage.setItem('journeyState',JSON.stringify(saved.state));
    window.dispatchEvent(new CustomEvent('journey:account-restored',{detail:saved})); return true;
  }catch(error){console.error('Journey account restore failed:',error);return false;}
}

async function renderMemberState(){
  const target=slot();
  try{
    currentUser=await getUser();
    if(currentUser){
      restoreJourneyFromAccount(currentUser);
      if(target){
        target.innerHTML=`<div class="member-session"><div class="member-session-title">已登入澄思會員</div><div class="member-session-name">${escapeHtml(currentUser.userMetadata?.full_name||currentUser.userMetadata?.name||currentUser.name||currentUser.email||'會員')}</div><div class="member-session-email">${escapeHtml(currentUser.email||'')}</div><button type="button" class="btn primary block" id="saveJourneyButton">立即保存目前需求資料</button><button type="button" class="btn ghost block" id="memberLogoutButton">登出會員</button></div>`;
        document.querySelector('#saveJourneyButton')?.addEventListener('click',async()=>{await saveJourneyToAccount();});
        document.querySelector('#memberLogoutButton')?.addEventListener('click',async()=>{await logout();currentUser=null;closeLogin();updateHeader(false);});
      }
      updateHeader(true,currentUser.userMetadata?.full_name||currentUser.userMetadata?.name||currentUser.name||currentUser.email||'會員');
      return;
    }
  }catch(error){currentUser=null;console.error('Netlify Identity getUser error:',error);}
  if(target) target.innerHTML='';
  updateHeader(false);
}
function updateHeader(loggedIn,name=''){const button=headerLogin();if(!button)return;const label=button.querySelector('.member-login-label');if(label)label.textContent=loggedIn?`會員：${name}`:'會員登入';button.title=loggedIn?'會員已登入，點擊查看帳號與需求資料':'會員登入';}
function escapeHtml(value){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
window.openLogin=openLogin; window.closeLogin=closeLogin;
document.addEventListener('DOMContentLoaded',()=>{document.querySelectorAll('[data-login-close]').forEach(el=>el.addEventListener('click',closeLogin));document.addEventListener('keydown',e=>{if(e.key==='Escape')closeLogin();});});
async function initIdentity(){try{const callback=await handleAuthCallback();}catch(error){console.error('Netlify Identity callback error:',error);}await renderMemberState();}
window.addEventListener('journey:changed',scheduleJourneySave); window.addEventListener('beforeunload',()=>{if(currentUser)saveJourneyToAccount();});
document.addEventListener('DOMContentLoaded',()=>{initIdentity().catch(error=>{console.error('Netlify Identity initialization failed:',error);setHint('');});});
