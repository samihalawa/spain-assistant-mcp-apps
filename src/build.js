import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { PRODUCTS } from "./registry.js";
const dir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const template=readFileSync(resolve(dir,"public/widget.html"),"utf8");
const buildDir=resolve(dir,"public/dist");mkdirSync(buildDir,{recursive:true});
for(const p of PRODUCTS){
 const script=readFileSync(resolve(dir,"src/widget.js"),"utf8").replaceAll("__PRODUCT_SLUG__",p.slug);
 const bundled=await build({stdin:{contents:script,resolveDir:dir,sourcefile:"widget-entry.js",loader:"js"},bundle:true,write:false,format:"iife",minify:true,platform:"browser",target:["es2022"],logLevel:"silent"});
 const html=template.replace("/*__BUNDLE__*/",()=>bundled.outputFiles[0].text.replaceAll("</script","<\\/script"));
 if(html.includes("/*__BUNDLE__*/")) throw new Error("Unreplaced marker");
 writeFileSync(resolve(buildDir,p.slug+".html"),html);
 console.log(p.slug,html.length+" bytes");
}
