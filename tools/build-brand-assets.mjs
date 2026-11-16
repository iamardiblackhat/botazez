/** Deterministic brand layout: approved artwork stays intact; icons extend the wordmark. */
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { ImageResponse } from 'next/og.js';
import React from 'react';
import sharp from 'sharp';
const root = new URL('../', import.meta.url);
const file = path => new URL(path, root);
const ardi = await readFile(file('public/brand/ardi-sec-glass.webp'));
const ardiPng = await sharp(ardi).png().toBuffer();
const mark = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-labelledby="title"><title id="title">ARDI — Botazez by Omnelia SI</title><defs><linearGradient id="rim" x2="1" y2="1"><stop stop-color="#efffff"/><stop offset=".25" stop-color="#c7a0ff"/><stop offset=".6" stop-color="#57f1ef"/><stop offset="1" stop-color="#ffadd7"/></linearGradient><linearGradient id="glass" x2=".8" y2="1"><stop stop-color="#262439"/><stop offset=".5" stop-color="#09131c"/><stop offset="1" stop-color="#113a32"/></linearGradient></defs><rect x="6" y="6" width="500" height="500" rx="112" fill="url(#rim)"/><rect x="20" y="20" width="472" height="472" rx="100" fill="url(#glass)"/><image href="data:image/png;base64,${ardiPng.toString('base64')}" x="76" y="36" width="360" height="440" preserveAspectRatio="xMidYMid meet"/></svg>`);
await writeFile(file('public/brand/botazez-mark.svg'),mark);
for (const size of [16,32,48,180,192,512]) {
  await sharp(mark).resize(size,size).png().toFile(file(`public/brand/botazez-icon-${size}.png`).pathname);
}
const png = await readFile(file('public/brand/botazez-icon-48.png'));
const ico = Buffer.alloc(22 + png.length);
ico.writeUInt16LE(1,2); ico.writeUInt16LE(1,4); ico[6]=48; ico[7]=48;
ico.writeUInt16LE(1,10); ico.writeUInt16LE(32,12); ico.writeUInt32LE(png.length,14); ico.writeUInt32LE(22,18); png.copy(ico,22);
await writeFile(file('public/brand/botazez.ico'),ico);
for (const path of ['public/favicon.ico','src/app/favicon.ico']) await writeFile(file(path),ico);
const aliases = {
  'favicon-16x16.png':16, 'favicon-32x32.png':32, 'apple-touch-icon.png':180,
  'android-chrome-192x192.png':192, 'android-chrome-512x512.png':512,
  'icon-192.png':192, 'casaos-icon.png':512, 'osiris-icon.png':512, 'ardi-logo.png':512,
};
for (const [name,size] of Object.entries(aliases)) await copyFile(file(`public/brand/botazez-icon-${size}.png`),file(`public/${name}`));
const geist = await readFile(file('node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf'));
const zodiak = await readFile(file('public/brand/zodiak-light.ttf'));
const mascot = ardiPng;
const h = React.createElement;
const text = (content, style) => h('div',{style:{display:'flex',position:'absolute',...style}},content);
const image = new ImageResponse(h('div',{style:{width:'100%',height:'100%',display:'flex',background:'#060a12',color:'#edf4ff',fontFamily:'Geist',position:'relative'}},
 h('div',{style:{display:'flex',position:'absolute',top:18,left:18,width:1164,height:594,borderRadius:38,background:'linear-gradient(135deg,#eafcfc,#c7a0ff 20%,#57f1ef 60%,#ffadd7 90%,#efffff)',padding:2}},h('div',{style:{display:'flex',width:'100%',height:'100%',borderRadius:36,background:'linear-gradient(125deg,#251e37,#0c1420 48%,#123237)'}})),
 text('BOTAZEZ',{left:72,top:78,fontSize:48,letterSpacing:9,color:'#f2ce58'}),
 text('A world of',{left:72,top:177,fontSize:68,letterSpacing:-2}),
 text('intelligence.',{left:72,top:253,fontSize:68,letterSpacing:-2}),
 text('World map · Cameras · Public-source intelligence',{left:76,top:366,width:650,fontSize:21,color:'#c6d4e4'}),
 h('div',{style:{display:'flex',position:'absolute',left:76,top:434,alignItems:'baseline',gap:10,fontSize:22,color:'#c6d4e4'}},'by ',h('span',{style:{fontFamily:'Zodiak',fontStyle:'italic',fontSize:36,color:'#c7a0ff'}},'Omnelia'),h('span',{style:{fontFamily:'Zodiak',fontStyle:'italic',fontSize:36,color:'#57f1ef'}},'SI')),
 text('botazez.com',{left:76,top:537,fontSize:22,color:'#57f1ef',letterSpacing:1}),
 h('img',{src:`data:image/png;base64,${mascot.toString('base64')}`,alt:'ARDI — Botazez intelligence assistant',width:352,height:500,style:{position:'absolute',right:56,top:65,objectFit:'contain'}})
),{width:1200,height:630,fonts:[{name:'Geist',data:geist,weight:400,style:'normal'},{name:'Zodiak',data:zodiak,weight:300,style:'italic'}]});
const social = Buffer.from(await image.arrayBuffer());
await writeFile(file('public/brand/botazez-social-v3.png'),social);
await writeFile(file('public/og-image.png'),social);
await writeFile(file('public/brand/botazez-social-v2.png'),social);
console.log('Built Botazez icons and 1200×630 social preview from approved brand assets.');
