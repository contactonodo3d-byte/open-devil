const {defineConfig}=require('@playwright/test');
const launchOptions=process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{};
module.exports=defineConfig({
 webServer:{command:'python3 -m http.server 8765 --bind 127.0.0.1',url:'http://127.0.0.1:8765'},
 testDir:'./tests',testMatch:'*.spec.cjs',use:{headless:true},
 projects:[
  {name:'desktop',use:{browserName:'chromium',launchOptions,viewport:{width:1280,height:800}}},
  {name:'mobile',use:{browserName:'chromium',launchOptions,viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
  {name:'safari-menu',testMatch:'menu-overflow.spec.cjs',use:{browserName:'webkit',viewport:{width:390,height:700},isMobile:true,hasTouch:true}}
 ]
});
