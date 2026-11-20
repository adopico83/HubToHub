// Aplica el tema (claro/oscuro) antes de pintar, para evitar el parpadeo. Va en un fichero propio para poder usar una CSP sin scripts en línea.
try{var d=document.documentElement,m=localStorage.tema||'auto';d.dataset.tema=(m==='oscuro'||(m==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches))?'oscuro':'claro'}catch(e){}
