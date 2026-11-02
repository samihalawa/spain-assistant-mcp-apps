import {readFileSync} from 'node:fs';
export const POLICY_TYPES=Object.freeze({privacy:'Privacidad',terms:'Condiciones',support:'Soporte'});
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function inline(value){
 const tokens=/`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;
 let output='',last=0;
 for(const match of value.matchAll(tokens)){
  output+=escape(value.slice(last,match.index));
  if(match[1]!==undefined)output+='<code>'+escape(match[1])+'</code>';
  else if(match[2]!==undefined){const href=match[3];output+=/^(https?:\/\/|mailto:)/i.test(href)?`<a href="${escape(href)}">${escape(match[2])}</a>`:escape(match[0]);}
  else output+='<strong>'+escape(match[4])+'</strong>';
  last=match.index+match[0].length;
 }
 return output+escape(value.slice(last));
}
export function renderMarkdown(markdown){
 const lines=String(markdown).replace(/\r\n/g,'\n').split('\n');
 const output=[];let paragraph=[],list=[],code=null;
 const flushParagraph=()=>{if(paragraph.length){output.push('<p>'+inline(paragraph.join(' '))+'</p>');paragraph=[];}};
 const flushList=()=>{if(list.length){output.push('<ul>'+list.map(text=>'<li>'+inline(text)+'</li>').join('')+'</ul>');list=[];}};
 for(const line of lines){
  if(line.trim().startsWith('```')){flushParagraph();flushList();if(code===null)code=[];else{output.push('<pre><code>'+escape(code.join('\n'))+'</code></pre>');code=null;}continue;}
  if(code!==null){code.push(line);continue;}
  if(!line.trim()){flushParagraph();flushList();continue;}
  const heading=/^(#{1,6})\s+(.+)$/.exec(line);
  if(heading){flushParagraph();flushList();const level=Math.min(heading[1].length+1,6);output.push(`<h${level}>${inline(heading[2])}</h${level}>`);continue;}
  const item=/^\s*[-*]\s+(.+)$/.exec(line);
  if(item){flushParagraph();list.push(item[1]);continue;}
  flushList();paragraph.push(line.trim());
 }
 flushParagraph();flushList();if(code!==null)output.push('<pre><code>'+escape(code.join('\n'))+'</code></pre>');return output.join('\n');
}
export function policyDocument(slug,type){return readFileSync(new URL(`../public/policies/${slug}/${type}.md`,import.meta.url),'utf8');}
