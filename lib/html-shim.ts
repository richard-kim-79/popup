// ============================================================
// HTML 호환 shim — 샌드박스 srcDoc(opaque origin)에서 AI 페이지 인터랙션 복구
// ============================================================
// 뷰어는 업로드 HTML을 <iframe srcDoc sandbox="allow-scripts ...">(allow-same-origin 없음)
// 으로 렌더한다. 그 결과:
//  1) document URL이 about:srcdoc → "#섹션" 앵커 점프가 스크롤되지 않음
//  2) opaque origin이라 localStorage/sessionStorage/document.cookie 접근이 throw →
//     초반에 스토리지를 건드리는 스크립트가 멈춰 그 뒤 JS(애니메이션·탭 등)가 전부 죽음
// 이 shim을 사용자 스크립트보다 먼저 실행시켜 둘 다 우회한다. (보안 모델은 그대로)

// 주의: 이 문자열 안에 "</script>" 나 백틱(`)을 넣지 말 것 — 파싱이 깨진다.
const SHIM_JS = `
(function(){
  // 1) opaque-origin에서 throw하는 스토리지를 인메모리 스텁으로 대체
  function memStore(){
    var m = Object.create(null);
    var api = {
      getItem:function(k){k=String(k);return Object.prototype.hasOwnProperty.call(m,k)?m[k]:null;},
      setItem:function(k,v){m[String(k)]=String(v);},
      removeItem:function(k){delete m[String(k)];},
      clear:function(){ Object.keys(m).forEach(function(k){delete m[k];}); },
      key:function(i){return Object.keys(m)[i]||null;}
    };
    Object.defineProperty(api,'length',{get:function(){return Object.keys(m).length;}});
    return api;
  }
  ['localStorage','sessionStorage'].forEach(function(name){
    var ok=false;
    try{ var s=window[name]; if(s){ void s.length; ok=true; } }catch(e){ ok=false; }
    if(!ok){
      try{ Object.defineProperty(window,name,{value:memStore(),configurable:true}); }catch(e){}
    }
  });
  // 2) document.cookie — set이 throw하면 인메모리 stub
  try{ document.cookie='__pc=1'; }
  catch(e){
    try{
      var ck='';
      Object.defineProperty(document,'cookie',{configurable:true,
        get:function(){return ck;},
        set:function(v){var p=String(v).split(';')[0]; ck=ck?ck+'; '+p:p;}
      });
    }catch(e2){}
  }
  // 3) 앵커 스무스 스크롤 (about:srcdoc 해시 이동 우회)
  function scrollToHash(hash){
    if(!hash||hash==='#') return false;
    var id; try{ id=decodeURIComponent(hash.slice(1)); }catch(e){ id=hash.slice(1); }
    var el=document.getElementById(id);
    if(!el){ try{ el=document.querySelector('[name="'+id.replace(/"/g,'\\\\"')+'"]'); }catch(e){} }
    if(el){ el.scrollIntoView({behavior:'smooth',block:'start'}); return true; }
    return false;
  }
  document.addEventListener('click',function(e){
    if(e.defaultPrevented) return;
    var t=e.target;
    var a=(t&&t.closest)?t.closest('a[href^="#"]'):null;
    if(!a) return;
    var href=a.getAttribute('href');
    if(!href||href==='#') return;
    if(scrollToHash(href)) e.preventDefault();
  },false);
  window.addEventListener('load',function(){
    if(location.hash){ setTimeout(function(){ scrollToHash(location.hash); },60); }
  });
})();
`

const SHIM = `<script>${SHIM_JS}</script>`

/**
 * 사용자 HTML의 가장 앞 스크립트보다 먼저 실행되도록 shim <script>를 주입.
 * <head> 직후 → 없으면 <html> 직후 → 없으면 맨 앞.
 */
export function injectHtmlShim(html: string): string {
  const tag = `\n${SHIM}\n`
  const headOpen = /<head[^>]*>/i
  if (headOpen.test(html)) return html.replace(headOpen, (m) => m + tag)
  const htmlOpen = /<html[^>]*>/i
  if (htmlOpen.test(html)) return html.replace(htmlOpen, (m) => m + tag)
  return tag + html
}
