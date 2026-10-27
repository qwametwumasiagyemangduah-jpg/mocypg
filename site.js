document.addEventListener('DOMContentLoaded',()=>{

  // Show the time-aware welcome toast on the homepage only.
  if (location.pathname === '/' || location.pathname.endsWith('/index.html')) {
  try {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Accra' }));
    const hour = now.getHours();
    const greetingText = hour >= 5 && hour < 12 ? 'Good morning'
      : hour >= 12 && hour < 17 ? 'Good afternoon'
      : hour >= 17 && hour < 21 ? 'Good evening'
      : 'Welcome';
    const toast = document.createElement('aside');
    toast.className = 'welcome-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = '<span class="welcome-toast-copy"><strong>' + greetingText + '!</strong><small>Welcome to the Youth Parliament Ghana Ministry website.</small></span><button class="welcome-toast-close" type="button" aria-label="Dismiss welcome message">×</button>';
    document.body.appendChild(toast);
    const dismiss = () => {
      toast.classList.add('welcome-toast-hide');
      window.setTimeout(() => toast.remove(), 350);
    };
    toast.querySelector('.welcome-toast-close').addEventListener('click', dismiss);
    window.setTimeout(() => toast.classList.add('welcome-toast-visible'), 120);
    window.setTimeout(dismiss, 6500);
  } catch (error) { /* A welcome message should never block the website. */ }
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