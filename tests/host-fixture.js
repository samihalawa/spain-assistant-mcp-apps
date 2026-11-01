// Local SDK fixture, not proof of rendering inside ChatGPT or Claude.
import { AppBridge, PostMessageTransport } from '@modelcontextprotocol/ext-apps/app-bridge';
const slug = new URLSearchParams(location.search).get('slug');
if (!/^(licita-espana|ayudas-espana|boe-impact|borme-intelligence|catastro-pro|ine-evidence|spain-open-data)$/.test(slug)) throw Error('Unknown fixture product');
const frame = document.querySelector('iframe');
const bridge = new AppBridge(null, {name:'local-verification-host',version:'1.0.0'}, {openLinks:{},logging:{}});
window.deliver = async value => bridge.sendToolResult({content:[],structuredContent:value});
window.ready = false;
bridge.oninitialized = async () => {
 await bridge.sendToolInput({arguments:{}});
 window.ready=true;
};
await bridge.connect(new PostMessageTransport(frame.contentWindow, frame.contentWindow));
frame.src = '../public/dist/'+slug+'.html';
