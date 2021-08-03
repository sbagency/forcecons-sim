function cons(opt,cfg){
  
// opt.no    7
// opt.addr  0x43ba4ef922..
// opt.send  (m)=>{}
// opt.onbk  (no,bk)=>{}

// this.onmsg (m)=>{}
// this.rpc  (q)=>{}
  

var bk_prod_cnt=0;


var bks={}
var lvbks={}

var zbk //= bk0;
var lbk //= bk0;

var this0=this;

var no;
var addr;

var stoped=cfg.stoped;


no=opt.no;
addr=opt.addr;


this.no=no;
this.addr=addr;

this.lbk=()=>lbk;
this.fbk=()=>{
  let fbk0=lbk;
  let i=10;while(i>0){
    let bk=bks[fbk0.data.ph]
    if(!bk)return fbk0;
    fbk0=bk;
    i--;
  }
  return fbk0;
}
this.stoped=()=>stoped;

this.bks_len=()=>Object.keys(bks).length;
this.bks=bks


const takebk=(bk,lbk0)=>{
  
if(bks[bk.h]){console.log('bk already taken',bk.data.no,bk.h.substr(0,8));return false;}
bks[bk.h]=bk;
if(opt.onbk)opt.onbk(bk,this0);
return true
}


this.set_gbk=(gbk)=>{
zbk = gbk;
lbk = gbk;
if(!takebk(gbk)){ throw('error !takebk(gbk)');}
}


this.rpc = (qs)=>{
  let q=JSON.parse(qs)
  switch(q.what){
    case 'get_bk':{ // q.h
      return JSON.stringify(bks[q.h])
    }
  }
  return null
}

const verifyChain=(bk)=>{
  let bk0=bk
  if(lvbks[bk.h])return true
  for(let i=bk.data.no;i>0;i--){
   let pbk=bks[bk.data.ph]
   if(!pbk){
     console.log('error verifyChain !pbk',bk.data.ph)
     return false;
   }
   if(pbk.data.no+1!=bk.data.no){
     console.log('error verifyChain pbk.data.no+1!=bk.data.no',pbk.data.no,bk.data.no)
     return false;
   }
   bk=pbk
   if(lvbks[bk.h]) break;
  }
  lvbks[bk0.h]=bk0
  return true
}

const verifyChainDeep=(bk)=>{
  for(let i=bk.data.no;i>0;i--){
   let pbk=bks[bk.data.ph]
   if(!pbk)return false;
   if(pbk.data.no+1!=bk.data.no){
     console.log('error verifyChainDeep pbk.data.no+1!=bk.data.no',pbk.data.no,bk.data.no)
     return false;
   }
   bk=pbk
  }
  return true
}

const pause=(ms)=>{ return new Promise((resolve) => { setTimeout( () => { resolve(); }, ms); }); }
const now=()=>(new Date()).toISOString()

var oblock=0;

this.onmsg = async (ms)=>{

  let msg;
  
  try{  msg=JSON.parse(ms) } catch(e){ console.log(e); return;}
  
  if(msg.from && msg.from.addr==addr){ return;}
  

  switch(msg.what){
    case 'bk':{
     let bk=msg.bk
     
     if(!bk){console.log(no,'!bk',msg);return;}
     if(!bk.data){console.log(no,'!bk.data',msg);return;}
     if(!bk.data.no){console.log(no,'!bk.data.no',msg);return;}
     if(!bk.data.ph){console.log(no,'!bk.data.ph',msg);return;}
     if(!bk.h){console.log(no,'!bk.h',msg);return;}
     
     //if(bks[bk.h]){console.log(no,'bk already exists',bk);return;}
     if(bks[bk.h]){console.log(no,'bk exists',bk.data.no,bk.h.substr(0,8),'from:',bk.sender.no,msg.from.no);return;}
     
     let checkChain=(bk)=>{
       
      if(atk.power) return;
     
     if(bk.data.no>lbk.data.no){
       if(!verifyChain(bk)){
         console.log(no,'!verifyChain',bk.data.no)
         return
       }
       lbk=bk; if(opt.onlbk)opt.onlbk(lbk,this0);
       console.log(no,'lbk:',lbk.data.no,lbk.h.substr(0,8),'->',lbk.data.ph.substr(0,8),'from:',msg.from.no)
     }
     
     }
     
     if(!bks[bk.data.ph]){ // orphan bk
       console.log(no,'orphan bk',bk.data.no,bk.h.substr(0,8),'from:',msg.from.no);
       //if(opt.onlog)opt.onlog('orphan bk:'+bk.data.no+' '+bk.h.substr(0,8)+' from:'+msg.from.no,this0)

       if(oblock>0){console.log(no,'orphan bk already in process, ignore other orphans');return;}
       oblock++;
       let from_addr=msg.from.addr; let from_no=msg.from.no; let obk=bk;

       await pause(200);
       if(bks[bk.data.ph]){ // bk is not orphan after pause
        if(!takebk(bk)){ console.log('onmsg bk, error !takebk(bk)'); oblock--; return;}
        checkChain(bk)
        oblock--;
        console.log(no,'orphan bk is not orphan after a pause',obk.data.no,obk.h.substr(0,8),'from:',from_no)
        return;
       }

       const get_bks=async (h)=>{
        let q={what:'get_bk',h:h}
        //console.log('get_bks',q,from_addr.substr(0,8))
        try{ let rbk=JSON.parse(await opt.rpc(JSON.stringify(q),from_addr)); return rbk; }
        catch(e){ console.log(no,'get_bk rpc error',e);}
        return null;
       }
       
       let obks=[]; let gbk=obk; obks.push(gbk); let wdc=1000;
       
       while(!bks[gbk.data.ph]){
        wdc--;if(wdc==0){oblock--;console.log(no,'error getting orphan chain, wdc==0',e);return;}
        gbk=await get_bks(gbk.data.ph);
        //console.log(no,'gbk',gbk)
        if(!gbk || !gbk.data || !gbk.data.ph){oblock--;console.log(no,'error getting orphan chain !gbk');return;}
        obks.push(gbk);
       }
       
       console.log(no,'orphan bk, collected',obks.length)
       
       for(let i=obks.length-1;i>=0;i--){
         let xbk=obks[i]
        if(bks[xbk.h]){ console.log(no,'orphan bk, already taken',xbk); continue; }
        if(!takebk(xbk)){ console.log(no,'orphan bk, error !takebk(xbk)'); oblock--; return;}
        checkChain(xbk)
       }
         
       console.log(no,'orphan bk, finished',bk.data.no,bk.h.substr(0,8),'from:',msg.from.no);
       //if(opt.onlog)opt.onlog('orphan bk, finished '+bk.data.no+' '+bk.h.substr(0,8)+' from: '+msg.from.no,this0)
         
       oblock--;
       return;
     }

     
     if(!takebk(bk)){ console.log('onmsg bk, error !takebk(bk)'); return;}
     checkChain(bk)
     
      //if(opt.onlog)opt.onlog('bk:'+bk.data.no+' '+bk.h.substr(0,8)+'->'+bk.data.ph.substr(0,8)+
      //' from:'+msg.from.no+' '+msg.from.addr.substr(0,8),this0)

     
      break;
    }
    case 'ping':{
      break;
    }
  }
}


// cfg.bk_prod.p0

var bk_prod_p0 = 0.55;
var bk_prod_i0 = 2000;
var bk_prod_i1 = 3000;

this.set_bk_prod_p0=(p)=>{bk_prod_p0=p;}
this.set_bk_prod_i0=(i)=>{bk_prod_i0=i;}
this.set_bk_prod_i1=(i)=>{bk_prod_i1=i;}

this.set_bk_prod_p0_def=()=>{bk_prod_p0=0.55;}
this.set_bk_prod_i0_def=()=>{bk_prod_i0=1000;}
this.set_bk_prod_i1_def=()=>{bk_prod_i1=3000;}

var atk={}
var atk_cnt=0;
this.set_atk=(a)=>{atk=a;}

async function bk_prod() {
  
  if(Math.random()<bk_prod_p0){
  
  bk_prod_cnt++
  
  let lbk0=lbk
  
  let bk;
  
  if(atk.power){
    
  if(atk_cnt==0){lbk0=zbk}
   atk_cnt++
   bk={data:{no:lbk0.data.no+1,ph:lbk0.h,txs:{},nonce:opt.rndstr(8),timestamp:now(),mh:'0'},sigs:{}}
   bk.h=await opt.hash256(JSON.stringify(bk.data))
   bk.sender={no:no,addr:addr}

   if(!takebk(bk)){ throw('bk_prod, error !takebk(bk)'); }
  
   lbk=bk; if(opt.onlbk)opt.onlbk(lbk,this0);
   console.log(no,'lbk:',lbk.data.no,lbk.h.substr(0,8),'->',lbk.data.ph.substr(0,8))

  } else {
    atk_cnt=0;
  
   bk={data:{no:lbk0.data.no+1,ph:lbk0.h,txs:{},nonce:opt.rndstr(8),timestamp:now(),mh:'0'},sigs:{}}
  
   bk.h=await opt.hash256(JSON.stringify(bk.data))
   bk.sender={no:no,addr:addr}
  

   if(!takebk(bk)){ throw('bk_prod, error !takebk(bk)'); }
  
   if(bk.data.no>=lbk.data.no){
    lbk=bk; if(opt.onlbk)opt.onlbk(lbk,this0);
    console.log(no,'lbk:',lbk.data.no,lbk.h.substr(0,8),'->',lbk.data.ph.substr(0,8))
   }
  
  } // else

  opt.send(no,JSON.stringify({what:"bk",from:{no:no,addr:addr},bk:bk,nonce:bk_prod_cnt}),addr)
  
  } // rnd
  
  if(!stoped)setTimeout(bk_prod, bk_prod_i0+Math.floor(Math.random() * bk_prod_i1));
}


if(!stoped)setTimeout(bk_prod, bk_prod_i0+Math.floor(Math.random() * bk_prod_i1));



var pingcnt=0;

function ping_tick() {
  
  opt.send(no,JSON.stringify({what:"ping",from:{no:no,addr:addr},data:{zbk:zbk,lbk:lbk},nonce:pingcnt}),addr)
  
  pingcnt++

  if(!stoped)setTimeout(ping_tick, 3000+Math.floor(Math.random() * 1000));
}

//if(!stoped)setTimeout(ping_tick, 1000);


this.stop=()=>{
  stoped=true
  if(opt.onstop)opt.onstop(this0);
}

this.run=()=>{
  if(!stoped)return
  stoped=false
  setTimeout(bk_prod, 100);
  //setTimeout(ping_tick, 1000);
  if(opt.onrun)opt.onrun(this0);
}

this.check=()=>{
 //console.log('check',no)
 var checked={}
 for(let h of Object.keys(bks) ){
  let bk=bks[h]
  //console.log(bk)
  if(bk.data.no>0){
    let lno=bk.data.no
    let b0=bk
    while(b0.data.no>0){
      let pb=bks[b0.data.ph]
      if(!pb){console.log('check error !pb',b0);return;}
      if(checked[pb.h])break;
      if(!bks[pb.h]){console.log('check error !bks[pb.h]',b0,pb);return;}
      if(pb.data.no+1!=b0.data.no){console.log('check error pb.data.no+1!=b0.data.no',b0,pb);return;}
      b0=pb
    }
    checked[b0.h]=b0
  }
 }
 console.log('checked',no,'bks.length',Object.keys(bks).length)
 return true;
} // check


}  // cons




export { cons as ForceCons }