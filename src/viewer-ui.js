export function createViewerUI({onLayoutChange,paintIcons,placeCount=10}){
 const body=document.body,compact=matchMedia('(max-width:700px), (max-height:560px)');
 const toggle=document.querySelector('#immersive-toggle'),drawerToggle=document.querySelector('#explore-toggle'),content=document.querySelector('#explore-content'),backdrop=document.querySelector('#explore-backdrop');
 let immersive=false,drawerOpen=false,hasSelection=false;
 const get=s=>document.querySelector(s);
 const immersiveHidden=['.brand','.edition','#reference-button','.intro','.place-card','.bottom-area','.scene-markers'];
 const modalBackground=['#world','header','.intro','.time-panel','.view-tools','.place-card','.scene-markers'];
 function sync(){
  body.classList.toggle('is-immersive',immersive);body.classList.toggle('drawer-open',drawerOpen);body.classList.toggle('has-selection',hasSelection);
  for(const selector of new Set([...immersiveHidden,...modalBackground])){
   const el=get(selector);if(!el)continue;
   const hidden=immersive&&immersiveHidden.includes(selector)||(hasSelection&&selector==='.intro')||(drawerOpen&&modalBackground.includes(selector));
   el.inert=hidden;if(hidden)el.setAttribute('aria-hidden','true');else el.removeAttribute('aria-hidden');
  }
  content.inert=immersive||(compact.matches&&!drawerOpen);
  drawerToggle.setAttribute('aria-expanded',String(drawerOpen));drawerToggle.inert=drawerOpen;
  backdrop.hidden=!drawerOpen;
  if(drawerOpen){content.setAttribute('role','dialog');content.setAttribute('aria-modal','true');content.setAttribute('aria-labelledby','explore-title');}
  else{content.removeAttribute('role');content.removeAttribute('aria-modal');content.removeAttribute('aria-labelledby');}
 }
 function closeDrawer({restoreFocus=true}={}){
  if(!drawerOpen)return;
  drawerOpen=false;sync();if(restoreFocus&&compact.matches)drawerToggle.focus({preventScroll:true});
 }
 function openDrawer(){
  if(!compact.matches||immersive)return;
  drawerOpen=true;sync();const selected=content.querySelector('.destination.active');(selected||get('#explore-close')).focus({preventScroll:true});if(selected)selected.scrollIntoView({block:'nearest'});
 }
 function setImmersive(value){
  closeDrawer({restoreFocus:false});immersive=value;sync();
  toggle.setAttribute('aria-pressed',String(immersive));toggle.title=immersive?'退出沉浸查看（Esc）':'收起界面，沉浸看岛';
  toggle.innerHTML=`<i data-lucide="${immersive?'shrink':'expand'}"></i><span>${immersive?'退出沉浸':'沉浸查看'}</span>`;paintIcons();
  toggle.focus({preventScroll:true});onLayoutChange();
 }
 toggle.addEventListener('click',()=>setImmersive(!immersive));
 drawerToggle.addEventListener('click',openDrawer);get('#explore-close').addEventListener('click',()=>closeDrawer());backdrop.addEventListener('click',()=>closeDrawer());
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!get('#reference-dialog').open){
   if(drawerOpen){event.preventDefault();closeDrawer();}
   else if(immersive){event.preventDefault();setImmersive(false);}
  }
  if(event.key==='Tab'&&drawerOpen){
   const buttons=[...content.querySelectorAll('button:not([disabled]),a[href]')].filter(el=>el.getClientRects().length);
   const first=buttons[0],last=buttons.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
 });
 compact.addEventListener('change',()=>{closeDrawer({restoreFocus:false});sync();onLayoutChange();});
 function safeViewport(){
  const w=innerWidth,h=innerHeight,pad=compact.matches?14:22;
  const rect=selector=>{const el=get(selector);return el&&getComputedStyle(el).display!=='none'?el.getBoundingClientRect():null};
  let left=pad,right=w-pad,top=pad,bottom=h-pad;
  const header=rect(immersive?'#immersive-toggle':'header'),time=rect('.time-panel'),tools=rect('.view-tools');
  if(header)top=Math.max(top,header.bottom+pad);
  if(time)top=Math.max(top,time.bottom+pad);
  if(tools)right=Math.min(right,tools.left-pad);
  if(!immersive){
   const card=rect('.place-card');
   if(compact.matches){const nav=rect('#explore-toggle');if(nav)bottom=Math.min(bottom,nav.top-pad);if(card)bottom=Math.min(bottom,card.top-pad);}
   else{const nav=rect('.bottom-area');if(nav)bottom=Math.min(bottom,nav.top-pad);if(card)left=Math.max(left,card.right+pad);if(!hasSelection){const intro=rect('.intro');if(intro)left=Math.max(left,intro.right+pad);}}
  }
  // Keep a useful framing region even in a very short landscape window.
  if(right-left<w*.40)left=Math.max(pad,right-w*.40);
  if(bottom-top<h*.30)top=Math.max(pad,bottom-h*.30);
  return{x:left,y:top,width:Math.max(1,right-left),height:Math.max(1,bottom-top)};
 }
 sync();
 return{get immersive(){return immersive},get compact(){return compact.matches},safeViewport,
  selectPlace(name){hasSelection=true;closeDrawer({restoreFocus:false});get('#drawer-summary').textContent=name;sync();if(compact.matches)get('#world').focus({preventScroll:true});},
  home(){hasSelection=false;closeDrawer({restoreFocus:false});get('#drawer-summary').textContent=`${placeCount} 个目的地`;sync();},
 };
}
