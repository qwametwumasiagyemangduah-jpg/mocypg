document.addEventListener('DOMContentLoaded',()=>{
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

  if('serviceWorker' in navigator && (location.protocol==='https:' || location.hostname==='localhost')){
    window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch((error)=>console.warn('Service worker registration failed:',error)));
  }
});
