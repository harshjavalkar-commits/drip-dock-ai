import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

// Run against the local dev server. Every Supabase request is mocked: no live data is touched.
const base = process.env.DRIPDOCK_TEST_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ headless: true, ...(process.env.DRIPDOCK_CHROMIUM_PATH ? { executablePath: process.env.DRIPDOCK_CHROMIUM_PATH, args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] } : {}) });
const context = await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
const page = await context.newPage();
const errors=[]; page.on('pageerror',error=>errors.push(error.message));
const userId='11111111-1111-4111-8111-111111111111';
const user={id:userId,aud:'authenticated',role:'authenticated',email:'preview@example.test',created_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{}};
const token=`${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub:userId,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url')}.test`;
await context.addInitScript(({user,token})=>{
  localStorage.setItem('sb-sdkkoovlyrcwtuagftnj-auth-token',JSON.stringify({access_token:token,refresh_token:'test-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}));
  sessionStorage.setItem('dripdock:doors','1');
},{user,token});
let items=[['Oxford shirt','Shirts'],['Navy trousers','Trousers'],['White sneakers','Sneakers'],['Silver watch','Watches'],['Weekend tee','T-Shirts'],['Blue jeans','Jeans'],['Leather bag','Bags']].map(([name,category],i)=>({id:`piece-${i}`,user_id:userId,name,category,image_url:`${userId}/${i}/sticker.png`,extracted_image_url:`${userId}/${i}/sticker.png`,original_image_url:`${userId}/${i}/original.png`,occasions:[],seasons:[],favorite:false,wear_count:0,created_at:new Date().toISOString()}));
let saved=[];let uploads=0;let failWardrobe=false;
// A synthetic transparent garment fixture. This is test data, never shipped in the UI.
await page.goto(base);
const png=Buffer.from(await page.evaluate(()=>{
 const c=document.createElement('canvas');c.width=300;c.height=360;const x=c.getContext('2d');x.fillStyle='#384454';x.beginPath();x.moveTo(90,40);x.lineTo(210,40);x.lineTo(275,100);x.lineTo(230,150);x.lineTo(210,130);x.lineTo(210,320);x.lineTo(90,320);x.lineTo(90,130);x.lineTo(70,150);x.lineTo(25,100);x.closePath();x.fill();return c.toDataURL().split(',')[1];
}),'base64');
await context.route('https://**.supabase.co/**',async route=>{
 const request=route.request();const url=new URL(request.url());let body={};
 const json=(value,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
 if(url.pathname.includes('/auth/v1/user'))return json(user);
 if(url.pathname.includes('/auth/v1/token'))return json({access_token:token,refresh_token:'test-refresh',expires_in:3600,user});
 if(request.method()==='POST' && url.pathname.includes('/storage/v1/object/sign/'))return json({signedURL:'/object/sign/wardrobe/test.png?token=fixture'});
 if(url.pathname.includes('/storage/v1/object/')){
  if(request.method()==='POST'){uploads++;return json({Key:'test'});}
  if(request.method()==='DELETE')return json([]);
  return route.fulfill({status:200,contentType:'image/png',body:png});
 }
 if(request.postData()){try{body=JSON.parse(request.postData());}catch{}}
 if(url.pathname.includes('/rest/v1/clothing_items')){
  if(request.method()==='POST'){const row={...body,id:`new-${items.length}`,created_at:new Date().toISOString()};items.push(row);return json(row,201);}
  if(failWardrobe)return json({message:'test failure'},500);
  return json(items);
 }
 if(url.pathname.includes('/rest/v1/outfits')){
  if(request.method()==='POST'){saved.push({...body,id:`look-${saved.length}`});return json(null,201);}
  return json(saved);
 }
 if(url.pathname.includes('/rest/v1/mini_you_profiles'))return json(null);
 if(url.pathname.includes('/rest/v1/profiles'))return json({display_name:'Preview'});
 return json([]);
});
await page.goto(`${base}/looks`);
await page.getByRole('button',{name:'Select Oxford shirt',exact:true}).waitFor();
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'mobile overflow');
await page.getByRole('button',{name:'Select Oxford shirt',exact:true}).click();
await page.getByRole('button',{name:'Select Navy trousers',exact:true}).click();
await page.getByRole('button',{name:'Select White sneakers',exact:true}).click();
await page.getByRole('button',{name:'Keep Oxford shirt during shuffle',exact:true}).click();
await page.getByRole('button',{name:'Remix my pieces',exact:true}).click();
assert.equal(await page.getByRole('button',{name:'Select Oxford shirt',exact:true}).getAttribute('aria-pressed'),'true');
await page.getByLabel('Name your edit').fill('The weekend edit');
await page.getByRole('button',{name:'Blush theme',exact:true}).click();
await page.getByRole('button',{name:'Save look',exact:true}).click();
await page.getByRole('button',{name:'Saved',exact:true}).waitFor();
assert.equal(saved.length,1);assert.equal(saved[0].explanation,'DripDock studio · blush');
await page.getByRole('button',{name:'Share look',exact:true}).click();
await page.getByRole('dialog').waitFor();
await page.getByAltText('Your exported outfit card').waitFor();
assert.deepEqual(await page.getByAltText('Your exported outfit card').evaluate(image=>({width:image.naturalWidth,height:image.naturalHeight})),{width:1080,height:1350});
const output=process.env.DRIPDOCK_TEST_ARTIFACTS||'/tmp/dripdock-test-artifacts';await mkdir(output,{recursive:true});
await page.screenshot({path:`${output}/mobile-share.png`});
await page.getByRole('button',{name:'Close',exact:true}).click();
await page.getByRole('dialog').waitFor({state:'hidden'});
await page.screenshot({path:`${output}/mobile-looks.png`,fullPage:true});
await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:`${output}/desktop-looks.png`,fullPage:true});
await page.setViewportSize({width:390,height:844});
await page.goto(`${base}/upload`);
await page.getByRole('button',{name:/Choose photos/}).waitFor();
await page.screenshot({path:`${output}/mobile-import.png`,fullPage:true});
await page.locator('input[aria-label="Choose garment photos"]').setInputFiles([{name:'shirt.png',mimeType:'image/png',buffer:png},{name:'shirt-2.png',mimeType:'image/png',buffer:png}]);
await page.getByRole('button',{name:'Add to my wardrobe',exact:true}).waitFor();
await page.waitForFunction(()=>document.querySelector('canvas')?.width===300);
const alpha=()=>page.locator('canvas').evaluate(c=>c.getContext('2d').getImageData(0,0,1,1).data[3]);
assert.equal(await alpha(),0,'transparent input should stay transparent');
await page.getByRole('button',{name:'Lift plain backdrop',exact:true}).click();
await page.getByRole('button',{name:'Undo image edit',exact:true}).click();
assert.equal(await alpha(),0,'undo should preserve original transparency');
await page.getByLabel('Name',{exact:true}).fill('My test shirt');
await page.getByLabel('Category',{exact:true}).selectOption('Shirts');
await page.getByRole('button',{name:'Add to my wardrobe',exact:true}).click();
await page.getByText('1 piece added. Your next look is waiting.').waitFor();
assert.equal(uploads,2,'original and sticker stored separately');
assert.equal(items.at(-1).category,'Shirts');
assert.notEqual(items.at(-1).original_image_url,items.at(-1).extracted_image_url);
await page.getByRole('button',{name:'Skip this photo',exact:true}).click();
await page.getByRole('button',{name:/Choose photos/}).waitFor();
assert.equal(errors.length,0,errors.join('\n'));
// Pure selection invariants through Vite's module loader.
const invariants=await page.evaluate(async()=>{
 const {remixLook,toggleLookItem,lookLayout}=await import('/src/lib/lookbook.ts');
 const items=[{id:'top',category:'Shirts'},{id:'bottom',category:'Jeans'},{id:'shoe',category:'Shoes'}];
 return {remix:remixLook(items,['deleted','top','top'],()=>0),limit:toggleLookItem(['1','2','3','4','5','6'],'7').length,layout:lookLayout(6).length};
});assert.deepEqual(invariants,{remix:['top','bottom','shoe'],limit:6,layout:6});
console.log('PASS: mobile layout, piece selection, locked shuffle, save persistence, PNG export, batch import, alpha preservation, undo, original separation, selection invariants.');
await browser.close();
