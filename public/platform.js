'use strict';
const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
const search=document.querySelector('#catalog-search');
const platform=document.querySelector('#platform-filter');
const rows=[...document.querySelectorAll('.plugin-row')];
function filter(){if(!search)return;const term=normalize(search.value.trim());const selected=platform.value;let count=0;for(const row of rows){const visible=normalize(row.dataset.search).includes(term)&&(selected==='all'||row.dataset.platforms.split(' ').includes(selected));row.hidden=!visible;if(visible)count++;}document.querySelector('#result-count').textContent=`${count} ${count===1?'plugin':'plugins'}`;document.querySelector('#empty-search').hidden=count!==0;document.querySelector('.plugin-list').hidden=count===0;}
search?.addEventListener('input',filter);platform?.addEventListener('change',filter);
document.querySelector('#clear-search')?.addEventListener('click',()=>{search.value='';platform.value='all';filter();search.focus();});
const tabs=[...document.querySelectorAll('[data-install-tab]')];
function activate(tab,focus=false){for(const item of tabs){const active=item===tab;item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;document.getElementById(item.getAttribute('aria-controls')).hidden=!active;}if(focus)tab.focus();}
tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>activate(tab));tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(index+1)%tabs.length;else if(event.key==='ArrowLeft')next=(index-1+tabs.length)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();activate(tabs[next],true);});});
document.querySelectorAll('[data-copy-text]').forEach(button=>button.addEventListener('click',async()=>{const text=button.dataset.copyText;const message=button.closest('.command-block').nextElementSibling;try{await navigator.clipboard.writeText(text);message.textContent='Copiado al portapapeles.';}catch{const code=button.closest('.command-block').querySelector('code');const range=document.createRange();range.selectNodeContents(code);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);message.textContent='Texto seleccionado. Cópialo con el teclado o el menú de tu dispositivo.';}}));
