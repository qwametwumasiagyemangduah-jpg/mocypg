document.addEventListener('DOMContentLoaded',()=>{\n  // Time-aware welcome toast: homepage only, using Ghana local time.
  const pagePath = window.location.pathname.replace(/\/+$/, '') || '/';
  if (pagePath === '/' || pagePath === '/index.html') {
    try {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Accra',
        hour: '2-digit',
        hourCycle: 'h23'
      }).formatToParts(new Date());
      const hour = Number(parts.find(part => part.type === 'hour')?.value ?? 0);
      const greetingText = hour >= 5 && hour < 12 ? 'Good morning'
        : hour >= 12 && hour < 17 ? 'Good afternoon'
        : hour >= 17 && hour < 21 ? 'Good evening'
        : 'Welcome';
      const toast = document.createElement('aside');
      toast.className = 'welcome-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      const copy = document.createElement('span');
      copy.className = 'welcome-toast-copy';
      const heading = document.createElement('strong');
      heading.textContent = greetingText + '!';
      const message = document.createElement('small');
      message.textContent = 'Welcome to the Youth Parliament Ghana Ministry website.';
      const close = document.createElement('button');
      close.className = 'welcome-toast-close';
      close.type = 'button';
      close.setAttribute('aria-label', 'Dismiss welcome message');
      close.textContent = '×';
      copy.append(heading, message);
      toast.append(copy, close);
      document.body.appendChild(toast);
      let dismissed = false;
      const dismiss = () => {
        if (dismissed) return;
        dismissed = true;
        toast.classList.add('welcome-toast-hide');
        window.setTimeout(() => toast.remove(), 350);
      };
      close.addEventListener('click', dismiss);
      window.requestAnimationFrame(() => toast.classList.add('welcome-toast-visible'));
      window.setTimeout(dismiss, 8000);
    } catch (error) {
      // The welcome message must never prevent the rest of the site from loading.
    }
  }

  const b=document.querySelector('.menu'),n=document.querySelector('.top nav');
  if(b&&n)b.addEventListener('click',()=>{
    const o=n.classList.toggle('open');
    b.setAttribute('aria-expanded',String(o));
    b.textContent=o?'×':'☰';
  });

  // Add a visible install action to the existing site header.
  const header=document.querySelector('.top');
  if(header && !document.querySelector('.install-app')){
    const install=document.createElement('button');
    install.className='install-app';
    install.type='button';
    install.textContent='Install App';
    install.setAttribute('aria-label','Install the YPG Ministry app');
    const menu=header.querySelector('.menu');
    header.insertBefore(install, menu || header.querySelector('nav'));
    let installPrompt=null;
    window.addEventListener('beforeinstallprompt',(event)=>{
      event.preventDefault();
      installPrompt=event;
      install.hidden=false;
    });
    install.addEventListener('click',async()=>{
      if(installPrompt){
        installPrompt.prompt();
        await installPrompt.userChoice;
        installPrompt=null;
      } else if(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone){
        install.textContent='App Installed';
        install.disabled=true;
      } else {
        alert('To install this app, open your browser menu and choose “Install app” or “Add to Home screen”.');
      }
    });
  }

  // Make every site image clickable and open it in a lightweight viewer.
  const images = Array.from(document.querySelectorAll('img')).filter(img => !img.closest('.image-viewer'));
  if(images.length){
    const viewer=document.createElement('div');
    viewer.className='image-viewer';
    viewer.hidden=true;
    viewer.setAttribute('role','dialog');
    viewer.setAttribute('aria-modal','true');
    viewer.setAttribute('aria-label','Image preview');
    viewer.innerHTML='<button class="image-viewer-close" type="button" aria-label="Close image preview">×</button><img class="image-viewer-full" alt=""><p class="image-viewer-caption"></p>';
    document.body.appendChild(viewer);
    const full=viewer.querySelector('.image-viewer-full');
    const caption=viewer.querySelector('.image-viewer-caption');
    const close=()=>{viewer.hidden=true;full.removeAttribute('src');document.body.classList.remove('image-viewer-open');};
    viewer.querySelector('.image-viewer-close').addEventListener('click',close);
    viewer.addEventListener('click',event=>{if(event.target===viewer)close();});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!viewer.hidden)close();});
    images.forEach(img=>{
      img.classList.add('image-viewable');
      img.setAttribute('tabindex','0');
      img.setAttribute('role','button');
      img.setAttribute('aria-label',img.alt ? 'View image: '+img.alt : 'View image');
      const open=event=>{
        event.preventDefault();
        event.stopPropagation();
        full.src=img.currentSrc||img.src;
        full.alt=img.alt||'Image preview';
        caption.textContent=img.alt||'';
        viewer.hidden=false;
        document.body.classList.add('image-viewer-open');
        viewer.querySelector('.image-viewer-close').focus();
      };
      img.addEventListener('click',open);
      img.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){open(event);}});
    });
  }

  if('serviceWorker' in navigator && (location.protocol==='https:' || location.hostname==='localhost')){
    window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch((error)=>console.warn('Service worker registration failed:',error)));
  }

  // Make mobile navigation easier to use and close it after choosing a destination.
  if (n && b) {
    n.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      n.classList.remove('open');
      b.setAttribute('aria-expanded', 'false');
      b.textContent = '☰';
    }));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && n.classList.contains('open')) {
        n.classList.remove('open');
        b.setAttribute('aria-expanded', 'false');
        b.textContent = '☰';
        b.focus();
      }
    });
  }

  // Add a compact back-to-top control on long pages.
  if (!document.querySelector('.back-to-top')) {
    const topButton = document.createElement('button');
    topButton.className = 'back-to-top';
    topButton.type = 'button';
    topButton.textContent = '↑';
    topButton.setAttribute('aria-label', 'Back to top');
    topButton.title = 'Back to top';
    document.body.appendChild(topButton);
    const updateTopButton = () => topButton.classList.toggle('back-to-top-visible', window.scrollY > 500);
    window.addEventListener('scroll', updateTopButton, { passive: true });
    updateTopButton();
    topButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
  }

  // Search leadership profiles, with a fallback for browsers that do not support the hidden property consistently.
  const leadershipSearch = document.getElementById('leadership-search');
  const leadershipResults = document.getElementById('leadership-directory-results');
  const leadershipStatus = document.getElementById('leadership-search-status');
  if (leadershipSearch && leadershipResults && leadershipStatus) {
    const profiles = Array.from(leadershipResults.querySelectorAll('.person'));
    const normalize = value => (value || '').toLocaleLowerCase().replace(/\\s+/g, ' ').trim();
    const applyLeadershipFilter = () => {
      const query = normalize(leadershipSearch.value);
      let visible = 0;
      profiles.forEach(profile => {
        const matches = !query || normalize(profile.innerText || profile.textContent).includes(query);
        profile.hidden = !matches;
        profile.style.display = matches ? '' : 'none';
        if (matches) visible++;
      });
      leadershipStatus.textContent = !query
        ? 'Showing all leadership profiles.'
        : visible === 0
          ? 'No leadership profiles match “' + leadershipSearch.value.trim() + '”. Try another name or directorate.'
          : visible === 1 ? '1 leadership profile found.' : visible + ' leadership profiles found.';
    };
    leadershipSearch.addEventListener('input', applyLeadershipFilter);
    leadershipSearch.addEventListener('search', applyLeadershipFilter);
    applyLeadershipFilter();
  }



  const contactForm = document.getElementById('contact-email-form');
  if (contactForm) contactForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!contactForm.reportValidity()) return;
    const name = document.getElementById('contact-name').value.trim();
    const email = document.getElementById('contact-email').value.trim();
    const topic = document.getElementById('contact-topic').value;
    const message = document.getElementById('contact-message').value.trim();
    document.getElementById('contact-form-status').textContent = 'Opening your email app. Review the message and send it from there.';
    const body = 'Name: ' + name + (email ? '\\nEmail: ' + email : '') + '\\n\\n' + message;
    window.location.href = 'mailto:?subject=' + encodeURIComponent('[Ministry Enquiry] ' + topic) + '&body=' + encodeURIComponent(body);
  });
});

/* Global site search: indexes the published public pages in the browser. */
document.addEventListener('DOMContentLoaded',()=>{
  const pages=[
    ['Home','index.html'],['About the Ministry','about.html'],['Leadership','leadership.html'],
    ['Departments','departments.html'],['Programmes','programmes.html'],['Newsroom','newsroom.html'],
    ['Launch and Swearing-In','launch.html'],['Publications','publications.html'],
    ['Gallery','gallery.html'],['Digital Citizenship Programme','digital-citizenship.html'],['Contact','contact.html']
  ];
  const normalize=s=>(s||'').toLocaleLowerCase().replace(/\s+/g,' ').trim();
  let indexPromise;
  const buildIndex=()=>indexPromise||(indexPromise=Promise.all(pages.map(async([label,url])=>{
    try{
      const response=await fetch(url,{credentials:'same-origin'});
      if(!response.ok) return null;
      const html=await response.text();
      const doc=new DOMParser().parseFromString(html,'text/html');
      const main=doc.querySelector('main')||doc.body;
      main.querySelectorAll('script,style,nav,footer,button,form').forEach(el=>el.remove());
      const title=doc.querySelector('title')?.textContent.trim()||label;
      const text=(main.innerText||main.textContent||'').replace(/\s+/g,' ').trim();
      return {label,url,title,text,haystack:normalize(title+' '+label+' '+text)};
    }catch(_){return null;}
  })).then(items=>items.filter(Boolean)));
  const render=(query,results,status)=>{
    const q=normalize(query);
    if(!q){status.textContent='Enter a search term to explore the website.';results.replaceChildren();return;}
    status.textContent='Searching published ministry pages…';
    buildIndex().then(index=>{
      const terms=q.split(' ').filter(Boolean);
      const matches=index.map(page=>({...page,score:terms.reduce((n,term)=>n+(page.haystack.includes(term)?1:0),0)}))
        .filter(page=>page.score>0).sort((a,b)=>b.score-a.score);
      results.replaceChildren();
      matches.forEach(page=>{
        const card=document.createElement('a');card.className='site-search-result';card.href=page.url;
        const label=document.createElement('small');label.textContent=page.label;
        const title=document.createElement('strong');title.textContent=page.title;
        const excerpt=document.createElement('p');const first=terms.map(t=>page.text.toLocaleLowerCase().indexOf(t)).filter(i=>i>=0).sort((a,b)=>a-b)[0]||0;
        excerpt.textContent=(first>90?'…':'')+page.text.slice(Math.max(0,first-70),Math.min(page.text.length,first+220))+(first+220<page.text.length?'…':'');
        card.append(label,title,excerpt);results.append(card);
      });
      status.textContent=matches.length?matches.length+' relevant page'+(matches.length===1?'':'s')+' found.':'No results found. Try a different name or keyword.';
    }).catch(()=>{status.textContent='Search is temporarily unavailable. Please try again.';});
  };
  const form=document.getElementById('site-search-form');
  if(form){
    const input=document.getElementById('site-search-input'),results=document.getElementById('site-search-results'),status=document.getElementById('site-search-status');
    const params=new URLSearchParams(location.search);if(params.has('q')){input.value=params.get('q');render(input.value,results,status);}
    form.addEventListener('submit',event=>{event.preventDefault();render(input.value,results,status);const url=new URL(location.href);url.searchParams.set('q',input.value.trim());history.replaceState({},'',url);});
    input.addEventListener('input',()=>{if(!input.value.trim()){results.replaceChildren();status.textContent='Enter a search term to explore the website.';}});
  }
  const nav=document.querySelector('.top nav'),header=document.querySelector('.top');
  if(nav&&!nav.querySelector('a[href="gallery.html"]')){
    const link=document.createElement('a');link.href='gallery.html';link.textContent='Gallery';
    const contact=nav.querySelector('a[href="contact.html"]');nav.insertBefore(link,contact||null);
  }
  if(header&&!header.querySelector('.site-search-trigger')){
    const button=document.createElement('button');button.type='button';button.className='site-search-trigger';button.setAttribute('aria-label','Search the ministry website');button.innerHTML='<span aria-hidden="true">⌕</span> Search';
    button.addEventListener('click',()=>{location.href='search.html';});
    const menu=header.querySelector('.menu');header.insertBefore(button,menu||nav||null);
  }
});


/* Accessible light/dark appearance control, shared across every page. */
document.addEventListener('DOMContentLoaded',()=>{
  const header=document.querySelector('.top');
  if(!header || header.querySelector('.theme-toggle')) return;
  let saved='light';
  try{saved=localStorage.getItem('ypg-theme')||'light';}catch(_){}
  const applyTheme=theme=>{
    const dark=theme==='dark';
    document.documentElement.dataset.theme=dark?'dark':'light';
    const button=header.querySelector('.theme-toggle');
    if(button){
      button.textContent=dark?'☀ Light':'☾ Dark';
      button.setAttribute('aria-label',dark?'Switch to light theme':'Switch to dark theme');
      button.setAttribute('aria-pressed',String(dark));
    }
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.setAttribute('content',dark?'#101820':'#071b3a');
  };
  const toggle=document.createElement('button');
  toggle.type='button';
  toggle.className='theme-toggle';
  toggle.addEventListener('click',()=>{
    const next=document.documentElement.dataset.theme==='dark'?'light':'dark';
    applyTheme(next);
    try{localStorage.setItem('ypg-theme',next);}catch(_){}
  });
  const install=header.querySelector('.install-app');
  header.insertBefore(toggle,install||header.querySelector('.menu')||header.querySelector('nav'));
  applyTheme(saved);
});
