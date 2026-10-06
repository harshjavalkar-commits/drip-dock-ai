import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({headless:true,...(process.env.DRIPDOCK_CHROMIUM_PATH ? {executablePath:process.env.DRIPDOCK_CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']} : {})});
try {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  let signupCalls=0, signInCalls=0, signupFails=true;
  await page.route('https://**.supabase.co/**', async route=>{
    const path=new URL(route.request().url()).pathname;
    if(path.endsWith('/signup')) {
      signupCalls++;
      return route.fulfill({status:signupFails?400:200,contentType:'application/json',body:JSON.stringify(signupFails ? {msg:'Signup is temporarily unavailable',code:'test_error'} : {user:{id:'test-user',email:'signup@example.test'},session:null})});
    }
    if(path.endsWith('/token')) {
      signInCalls++;
      return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({msg:'Invalid login credentials'})});
    }
    return route.fulfill({status:200,contentType:'application/json',body:'{}'});
  });
  await page.goto(`${process.env.DRIPDOCK_TEST_URL||'http://127.0.0.1:5173'}/auth`);
  await page.waitForLoadState("networkidle");
  await page.getByRole('button',{name:"Don't have an account? Create one"}).click();
  await page.getByLabel("Name",{exact:true}).waitFor();
  await page.getByRole('button',{name:'Create account',exact:true}).click();
  await page.getByRole('alert').waitFor();
  assert.match(await page.getByRole('alert').innerText(),/valid email/);
  assert.equal(signupCalls,0);
  await page.getByLabel('Email',{exact:true}).fill('signup@example.test');
  await page.getByLabel('Password',{exact:true}).fill('short');
  await page.getByRole('button',{name:'Create account',exact:true}).click();
  assert.match(await page.getByRole('alert').innerText(),/8 characters/);
  assert.equal(signupCalls,0);
  await page.getByLabel('Password',{exact:true}).fill('test-password-123');
  await page.getByRole('button',{name:'Create account',exact:true}).click();
  await page.getByText('Signup is temporarily unavailable',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Create account',exact:true}).isEnabled(),true);
  signupFails=false;
  await page.getByRole('button',{name:'Create account',exact:true}).click();
  await page.getByText(/Check your inbox and spam folder/).waitFor();
  assert.equal(signupCalls,2);
  await page.getByRole('button',{name:'Already have an account? Sign in'}).click();
  await page.getByLabel('Password',{exact:true}).fill('short');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.getByText('Invalid login credentials',{exact:true}).waitFor();
  assert.equal(signInCalls,1,'existing shorter passwords must reach sign-in');
  console.log('PASS: visible validation, signup password rules, API error recovery, confirmation state and legacy password sign-in. All auth requests mocked.');
} finally { await browser.close(); }
