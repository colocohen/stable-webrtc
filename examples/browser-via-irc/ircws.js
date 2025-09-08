(function (root){
  function Emitter(){ this._ev={}; }
  Emitter.prototype.on=function(n,f){ (this._ev[n]=this._ev[n]||[]).push(f); return this; };
  Emitter.prototype.off=function(n,f){ var a=this._ev[n]||[]; for(var i=0;i<a.length;i++){ if(a[i]===f){ a.splice(i,1); i--; } } return this; };
  Emitter.prototype.once=function(n,f){ var s=this; function w(){ s.off(n,w); f.apply(null,arguments);} this.on(n,w); return this; };
  Emitter.prototype.emit=function(n){ var a=this._ev[n]||[], args=[]; for(var i=1;i<arguments.length;i++) args.push(arguments[i]); for(var j=0;j<a.length;j++){ try{ a[j].apply(null,args);}catch(e){} } };

  var enc = new TextEncoder();
  var dec = new TextDecoder("utf-8");
  function now(){ return Date.now?Date.now():(new Date()).getTime(); }

  // Parser לשורת IRC יחידה (ללא CRLF)
  function parseIrcLine(line){
    var msg={tags:null,prefix:null,command:null,params:[]}, i=0, n=line.length;
    if(i<n && line.charCodeAt(i)===64){ i++; var end=line.indexOf(' ',i); if(end===-1) end=n;
      var raw=line.substring(i,end); i=end+1; var tags={}, parts=raw.split(';');
      for(var t=0;t<parts.length;t++){ var kv=parts[t].split('='); var k=kv[0], v=kv.length>1?kv.slice(1).join('='):''; 
        v=v.replace(/\\:/g,';').replace(/\\s/g,' ').replace(/\\\\/g,'\\').replace(/\\r/g,'\r').replace(/\\n/g,'\n'); tags[k]=v; }
      msg.tags=tags;
    }
    if(i<n && line.charCodeAt(i)===58){ i++; var end2=line.indexOf(' ',i); if(end2===-1) end2=n; msg.prefix=line.substring(i,end2); i=end2+1; }
    var startCmd=i; while(i<n && line.charCodeAt(i)!==32) i++; msg.command=line.substring(startCmd,i); if(i<n && line.charCodeAt(i)===32) i++;
    while(i<n){
      if(line.charCodeAt(i)===58){ msg.params.push(line.substring(i+1)); break; }
      var pStart=i; while(i<n && line.charCodeAt(i)!==32) i++; msg.params.push(line.substring(pStart,i)); if(i<n && line.charCodeAt(i)===32) i++;
    }
    return msg;
  }

  // בונה שורת IRC ללא CRLF (נוסיף CRLF רק במצב legacy אם נצטרך)
  function buildIrcTextLine(cmd, params){
    var s=cmd, i, p;
    params=params||[];
    for(i=0;i<params.length;i++){
      p=params[i];
      if(i===params.length-1 && (p.indexOf(' ')!==-1 || p==='' || p.charCodeAt(0)===58)) s+=' :'+p;
      else s+=' '+p;
    }
    return s; // בלי \r\n
  }

  function IrcWS(){
    var api=new Emitter(), ws=null, url=null;
    var subprotocols=['text.ircv3.net','binary.ircv3.net']; // לפי התקן
    var _sendQ=[], _floodDelayMs=300, _lastSentAt=0, _sendTimer=null, _pingTimer=null;
    var _proto=''; // מה שהוסכם מול השרת
    var state='idle';

    function scheduleSend(){
      if(_sendTimer) return;
      _sendTimer=setInterval(function(){
        if(_sendQ.length===0) return;
        if(now()-_lastSentAt < _floodDelayMs) return;
        var line=_sendQ.shift(); // כאן line = ללא CRLF
        if(ws && ws.readyState===1){
          try{
            if(_proto==='binary.ircv3.net'){ ws.send(enc.encode(line)); } // Binary frame: בדיוק שורה אחת
            else { ws.send(line); } // Text frame או legacy ללא סאב-פרוטוקול
            _lastSentAt=now();
          }catch(e){}
        }
      },25);
    }
    function stopSendTimer(){ if(_sendTimer){ clearInterval(_sendTimer); _sendTimer=null; } }
    function enqueue(lineNoCrlf){ _sendQ.push(lineNoCrlf); scheduleSend(); }

    // נתב הודעות נכנסות
    function route(msg){
      var cmd=msg.command, n=parseInt(cmd,10);
      if(cmd==='PING'){ api.raw('PONG',[msg.params.length?msg.params[msg.params.length-1]:'']); api.emit('ping',msg); return; }
      if(cmd==='PONG'){ api.emit('pong',msg); return; }
      if(!isNaN(n)){
        api.emit('numeric',n,msg);
        if(n===1){ api.emit('welcome',msg); }
        else if(n===353){ var chan=msg.params[2]||'', list=(msg.params[3]||'').split(' '); api.emit('names',chan,list,msg); }
        else if(n===366){ var chan2=msg.params[1]||''; api.emit('endofnames',chan2,msg); }
        return;
      }
      if(cmd==='PRIVMSG'){ api.emit('privmsg', msg.prefix||'', msg.params[0]||'', msg.params[1]||'', msg); return; }
      if(cmd==='NOTICE'){ api.emit('notice', msg.prefix||'', msg.params[0]||'', msg.params[1]||'', msg); return; }
      if(cmd==='JOIN'){ api.emit('join', msg.prefix||'', msg.params[0]||'', msg); return; }
      if(cmd==='PART'){ api.emit('part', msg.prefix||'', msg.params[0]||'', msg.params[1]||'', msg); return; }
      if(cmd==='NICK'){ api.emit('nick', msg.prefix||'', msg.params[0]||'', msg); return; }
      if(cmd==='QUIT'){ api.emit('quit', msg.prefix||'', msg.params[0]||'', msg); return; }
      api.emit('message',msg);
    }

    api.connect=function(serverUrl, opts){
      if(state!=='idle' && state!=='closed'){ try{ api.close(); }catch(e){} }
      url=serverUrl; opts=opts||{};
      if(opts.subprotocols && opts.subprotocols.length>0) subprotocols=opts.subprotocols;
      if(typeof opts.floodDelayMs==='number') _floodDelayMs=opts.floodDelayMs;

      _sendQ=[]; stopSendTimer();

      try{ ws=new WebSocket(url, subprotocols); }catch(e){ api.emit('error',e); return; }
      state='connecting'; ws.binaryType='arraybuffer';

      ws.onopen=function(){
        state='open'; _proto = ws.protocol || '';
        api.emit('open', _proto);

        // שליחת פרטי רישום – ללא CRLF, Frame=שורה
        if(opts.pass){ api.pass(opts.pass); }
        if(opts.nick){ api.nick(opts.nick); }
        var u=opts.user || (opts.nick||'guest'); var r=opts.realname || u;
        api.user(u,'0',r);

        // keepalive ping
        var keep=(typeof opts.keepaliveSec==='number' && opts.keepaliveSec>0)?opts.keepaliveSec:60;
        if(_pingTimer) clearInterval(_pingTimer);
        _pingTimer=setInterval(function(){ api.raw('PING',[String(Math.floor(Math.random()*1e9))]); }, keep*1000);

        api.emit('ready');
      };

      ws.onmessage=function(ev){
        // לפי התקן: כל Frame = שורת IRC בודדת, בלי CR/LF
        var lineStr;
        if(typeof ev.data==='string'){ lineStr = ev.data; }
        else { // binary
          try{ lineStr = dec.decode(new Uint8Array(ev.data)); }catch(e){ return; }
        }
        if(!lineStr) return;
        var msg = parseIrcLine(lineStr);
        api.emit('raw', msg);
        route(msg);
      };

      ws.onerror=function(err){ api.emit('ws_error',err); };
      ws.onclose=function(ev){
        state='closed'; stopSendTimer(); if(_pingTimer){ clearInterval(_pingTimer); _pingTimer=null; }
        api.emit('close',ev);
      };
    };

    api.close=function(){ if(ws){ try{ ws.close(); }catch(e){} } };

    api.raw=function(command, params){
      var lineNoCrlf = buildIrcTextLine(command, params||[]);
      // console.log('>>>', lineNoCrlf);
      enqueue(lineNoCrlf);
    };

    // Helpers
    api.pass=function(p){ api.raw('PASS',[p]); };
    api.nick=function(n){ api.raw('NICK',[n]); };
    api.user=function(user,mode,realname){ api.raw('USER',[user,mode||'0','*',realname||user]); };
    api.join=function(chan){ api.raw('JOIN',[chan]); };
    api.part=function(chan,msg){ api.raw('PART', msg?[chan,msg]:[chan]); };
    api.privmsg=function(target,text){ api.raw('PRIVMSG',[target,text]); };
    api.notice=function(target,text){ api.raw('NOTICE',[target,text]); };
    api.quit=function(msg){ api.raw('QUIT',[msg||'Bye']); };

    api.names=function(chan){ api.raw('NAMES',[chan]); };
    api.state=function(){ return state; };
    api.socketProtocol=function(){ return _proto; };
    api.setFloodDelay=function(ms){ _floodDelayMs=ms|0; };

    return api;
  }

  root.IrcWS={ create:IrcWS };
})(this);