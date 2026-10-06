/* wenfeng.org Worker: OSS 静态代理 + /api/v1 证明签发（边缘过渡版）
 * 同账号于 wpcy.net Workers Paid。正式 Ed25519 签发仍属后续 M2。
 */
const UPSTREAM = 'https://wenfeng-org.oss-cn-guangzhou.aliyuncs.com';
const HOP = new Set(['host', 'connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'proxy-authorization', 'te', 'trailers', 'accept-encoding', 'cdn-loop']);

const ISSUER = {
  legalName: '文派（广州）科技有限公司',
  brand: '文风',
  product: 'wenfeng.org',
};
const USAGE_WORDS = {
  web: '网页嵌入',
  print: '印刷物料',
  embed: '软件内嵌',
  modify: '修改衍生',
  redistribute: '再分发',
};
const ATTEST_SPDX = new Set([
  'OFL-1.1', 'MIT', 'Apache-2.0', 'IPA-1.0', 'IPA',
  'CC0-1.0', 'CC-BY-4.0', 'CC-BY-SA-4.0',
  'GPL-2.0-with-font-exception',
  'GPL-2.0-or-later WITH Font-exception OR OFL-1.1',
  'MPlus-Bitmap-License',
]);
const LEDGER_KEY = 'ledger:records';
const BADGE_ICON_B64 = "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";

/* ---- QR (qrcode-generator, MIT) ---- */
const qrcode = (() => {
  const module = { exports: {} };
  const exports = module.exports;
  const define = undefined;
var qrcode=function(){var t=function(t,r){var e=t,n=g[r],o=null,i=0,a=null,u=[],f={},c=function(t,r){o=function(t){for(var r=new Array(t),e=0;e<t;e+=1){r[e]=new Array(t);for(var n=0;n<t;n+=1)r[e][n]=null}return r}(i=4*e+17),l(0,0),l(i-7,0),l(0,i-7),s(),h(),d(t,r),e>=7&&v(t),null==a&&(a=p(e,n,u)),w(a,r)},l=function(t,r){for(var e=-1;e<=7;e+=1)if(!(t+e<=-1||i<=t+e))for(var n=-1;n<=7;n+=1)r+n<=-1||i<=r+n||(o[t+e][r+n]=0<=e&&e<=6&&(0==n||6==n)||0<=n&&n<=6&&(0==e||6==e)||2<=e&&e<=4&&2<=n&&n<=4)},h=function(){for(var t=8;t<i-8;t+=1)null==o[t][6]&&(o[t][6]=t%2==0);for(var r=8;r<i-8;r+=1)null==o[6][r]&&(o[6][r]=r%2==0)},s=function(){for(var t=B.getPatternPosition(e),r=0;r<t.length;r+=1)for(var n=0;n<t.length;n+=1){var i=t[r],a=t[n];if(null==o[i][a])for(var u=-2;u<=2;u+=1)for(var f=-2;f<=2;f+=1)o[i+u][a+f]=-2==u||2==u||-2==f||2==f||0==u&&0==f}},v=function(t){for(var r=B.getBCHTypeNumber(e),n=0;n<18;n+=1){var a=!t&&1==(r>>n&1);o[Math.floor(n/3)][n%3+i-8-3]=a}for(n=0;n<18;n+=1){a=!t&&1==(r>>n&1);o[n%3+i-8-3][Math.floor(n/3)]=a}},d=function(t,r){for(var e=n<<3|r,a=B.getBCHTypeInfo(e),u=0;u<15;u+=1){var f=!t&&1==(a>>u&1);u<6?o[u][8]=f:u<8?o[u+1][8]=f:o[i-15+u][8]=f}for(u=0;u<15;u+=1){f=!t&&1==(a>>u&1);u<8?o[8][i-u-1]=f:u<9?o[8][15-u-1+1]=f:o[8][15-u-1]=f}o[i-8][8]=!t},w=function(t,r){for(var e=-1,n=i-1,a=7,u=0,f=B.getMaskFunction(r),c=i-1;c>0;c-=2)for(6==c&&(c-=1);;){for(var g=0;g<2;g+=1)if(null==o[n][c-g]){var l=!1;u<t.length&&(l=1==(t[u]>>>a&1)),f(n,c-g)&&(l=!l),o[n][c-g]=l,-1==(a-=1)&&(u+=1,a=7)}if((n+=e)<0||i<=n){n-=e,e=-e;break}}},p=function(t,r,e){for(var n=A.getRSBlocks(t,r),o=b(),i=0;i<e.length;i+=1){var a=e[i];o.put(a.getMode(),4),o.put(a.getLength(),B.getLengthInBits(a.getMode(),t)),a.write(o)}var u=0;for(i=0;i<n.length;i+=1)u+=n[i].dataCount;if(o.getLengthInBits()>8*u)throw"code length overflow. ("+o.getLengthInBits()+">"+8*u+")";for(o.getLengthInBits()+4<=8*u&&o.put(0,4);o.getLengthInBits()%8!=0;)o.putBit(!1);for(;!(o.getLengthInBits()>=8*u||(o.put(236,8),o.getLengthInBits()>=8*u));)o.put(17,8);return function(t,r){for(var e=0,n=0,o=0,i=new Array(r.length),a=new Array(r.length),u=0;u<r.length;u+=1){var f=r[u].dataCount,c=r[u].totalCount-f;n=Math.max(n,f),o=Math.max(o,c),i[u]=new Array(f);for(var g=0;g<i[u].length;g+=1)i[u][g]=255&t.getBuffer()[g+e];e+=f;var l=B.getErrorCorrectPolynomial(c),h=k(i[u],l.getLength()-1).mod(l);for(a[u]=new Array(l.getLength()-1),g=0;g<a[u].length;g+=1){var s=g+h.getLength()-a[u].length;a[u][g]=s>=0?h.getAt(s):0}}var v=0;for(g=0;g<r.length;g+=1)v+=r[g].totalCount;var d=new Array(v),w=0;for(g=0;g<n;g+=1)for(u=0;u<r.length;u+=1)g<i[u].length&&(d[w]=i[u][g],w+=1);for(g=0;g<o;g+=1)for(u=0;u<r.length;u+=1)g<a[u].length&&(d[w]=a[u][g],w+=1);return d}(o,n)};f.addData=function(t,r){var e=null;switch(r=r||"Byte"){case"Numeric":e=M(t);break;case"Alphanumeric":e=x(t);break;case"Byte":e=m(t);break;case"Kanji":e=L(t);break;default:throw"mode:"+r}u.push(e),a=null},f.isDark=function(t,r){if(t<0||i<=t||r<0||i<=r)throw t+","+r;return o[t][r]},f.getModuleCount=function(){return i},f.make=function(){if(e<1){for(var t=1;t<40;t++){for(var r=A.getRSBlocks(t,n),o=b(),i=0;i<u.length;i++){var a=u[i];o.put(a.getMode(),4),o.put(a.getLength(),B.getLengthInBits(a.getMode(),t)),a.write(o)}var g=0;for(i=0;i<r.length;i++)g+=r[i].dataCount;if(o.getLengthInBits()<=8*g)break}e=t}c(!1,function(){for(var t=0,r=0,e=0;e<8;e+=1){c(!0,e);var n=B.getLostPoint(f);(0==e||t>n)&&(t=n,r=e)}return r}())},f.createTableTag=function(t,r){t=t||2;var e="";e+='<table style="',e+=" border-width: 0px; border-style: none;",e+=" border-collapse: collapse;",e+=" padding: 0px; margin: "+(r=void 0===r?4*t:r)+"px;",e+='">',e+="<tbody>";for(var n=0;n<f.getModuleCount();n+=1){e+="<tr>";for(var o=0;o<f.getModuleCount();o+=1)e+='<td style="',e+=" border-width: 0px; border-style: none;",e+=" border-collapse: collapse;",e+=" padding: 0px; margin: 0px;",e+=" width: "+t+"px;",e+=" height: "+t+"px;",e+=" background-color: ",e+=f.isDark(n,o)?"#000000":"#ffffff",e+=";",e+='"/>';e+="</tr>"}return e+="</tbody>",e+="</table>"},f.createSvgTag=function(t,r,e,n){var o={};"object"==typeof arguments[0]&&(t=(o=arguments[0]).cellSize,r=o.margin,e=o.alt,n=o.title),t=t||2,r=void 0===r?4*t:r,(e="string"==typeof e?{text:e}:e||{}).text=e.text||null,e.id=e.text?e.id||"qrcode-description":null,(n="string"==typeof n?{text:n}:n||{}).text=n.text||null,n.id=n.text?n.id||"qrcode-title":null;var i,a,u,c,g=f.getModuleCount()*t+2*r,l="";for(c="l"+t+",0 0,"+t+" -"+t+",0 0,-"+t+"z ",l+='<svg version="1.1" xmlns="http://www.w3.org/2000/svg"',l+=o.scalable?"":' width="'+g+'px" height="'+g+'px"',l+=' viewBox="0 0 '+g+" "+g+'" ',l+=' preserveAspectRatio="xMinYMin meet"',l+=n.text||e.text?' role="img" aria-labelledby="'+y([n.id,e.id].join(" ").trim())+'"':"",l+=">",l+=n.text?'<title id="'+y(n.id)+'">'+y(n.text)+"</title>":"",l+=e.text?'<description id="'+y(e.id)+'">'+y(e.text)+"</description>":"",l+='<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>',l+='<path d="',a=0;a<f.getModuleCount();a+=1)for(u=a*t+r,i=0;i<f.getModuleCount();i+=1)f.isDark(a,i)&&(l+="M"+(i*t+r)+","+u+c);return l+='" stroke="transparent" fill="black"/>',l+="</svg>"},f.createDataURL=function(t,r){t=t||2,r=void 0===r?4*t:r;var e=f.getModuleCount()*t+2*r,n=r,o=e-r;return I(e,e,(function(r,e){if(n<=r&&r<o&&n<=e&&e<o){var i=Math.floor((r-n)/t),a=Math.floor((e-n)/t);return f.isDark(a,i)?0:1}return 1}))},f.createImgTag=function(t,r,e){t=t||2,r=void 0===r?4*t:r;var n=f.getModuleCount()*t+2*r,o="";return o+="<img",o+=' src="',o+=f.createDataURL(t,r),o+='"',o+=' width="',o+=n,o+='"',o+=' height="',o+=n,o+='"',e&&(o+=' alt="',o+=y(e),o+='"'),o+="/>"};var y=function(t){for(var r="",e=0;e<t.length;e+=1){var n=t.charAt(e);switch(n){case"<":r+="&lt;";break;case">":r+="&gt;";break;case"&":r+="&amp;";break;case'"':r+="&quot;";break;default:r+=n}}return r};return f.createASCII=function(t,r){if((t=t||1)<2)return function(t){t=void 0===t?2:t;var r,e,n,o,i,a=1*f.getModuleCount()+2*t,u=t,c=a-t,g={"██":"█","█ ":"▀"," █":"▄","  ":" "},l={"██":"▀","█ ":"▀"," █":" ","  ":" "},h="";for(r=0;r<a;r+=2){for(n=Math.floor((r-u)/1),o=Math.floor((r+1-u)/1),e=0;e<a;e+=1)i="█",u<=e&&e<c&&u<=r&&r<c&&f.isDark(n,Math.floor((e-u)/1))&&(i=" "),u<=e&&e<c&&u<=r+1&&r+1<c&&f.isDark(o,Math.floor((e-u)/1))?i+=" ":i+="█",h+=t<1&&r+1>=c?l[i]:g[i];h+="\n"}return a%2&&t>0?h.substring(0,h.length-a-1)+Array(a+1).join("▀"):h.substring(0,h.length-1)}(r);t-=1,r=void 0===r?2*t:r;var e,n,o,i,a=f.getModuleCount()*t+2*r,u=r,c=a-r,g=Array(t+1).join("██"),l=Array(t+1).join("  "),h="",s="";for(e=0;e<a;e+=1){for(o=Math.floor((e-u)/t),s="",n=0;n<a;n+=1)i=1,u<=n&&n<c&&u<=e&&e<c&&f.isDark(o,Math.floor((n-u)/t))&&(i=0),s+=i?g:l;for(o=0;o<t;o+=1)h+=s+"\n"}return h.substring(0,h.length-1)},f.renderTo2dContext=function(t,r){r=r||2;for(var e=f.getModuleCount(),n=0;n<e;n++)for(var o=0;o<e;o++)t.fillStyle=f.isDark(n,o)?"black":"white",t.fillRect(n*r,o*r,r,r)},f};t.stringToBytes=(t.stringToBytesFuncs={default:function(t){for(var r=[],e=0;e<t.length;e+=1){var n=t.charCodeAt(e);r.push(255&n)}return r}}).default,t.createStringToBytes=function(t,r){var e=function(){for(var e=S(t),n=function(){var t=e.read();if(-1==t)throw"eof";return t},o=0,i={};;){var a=e.read();if(-1==a)break;var u=n(),f=n()<<8|n();i[String.fromCharCode(a<<8|u)]=f,o+=1}if(o!=r)throw o+" != "+r;return i}(),n="?".charCodeAt(0);return function(t){for(var r=[],o=0;o<t.length;o+=1){var i=t.charCodeAt(o);if(i<128)r.push(i);else{var a=e[t.charAt(o)];"number"==typeof a?(255&a)==a?r.push(a):(r.push(a>>>8),r.push(255&a)):r.push(n)}}return r}};var r,e,n,o,i,a=1,u=2,f=4,c=8,g={L:1,M:0,Q:3,H:2},l=0,h=1,s=2,v=3,d=4,w=5,p=6,y=7,B=(r=[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],e=1335,n=7973,i=function(t){for(var r=0;0!=t;)r+=1,t>>>=1;return r},(o={}).getBCHTypeInfo=function(t){for(var r=t<<10;i(r)-i(e)>=0;)r^=e<<i(r)-i(e);return 21522^(t<<10|r)},o.getBCHTypeNumber=function(t){for(var r=t<<12;i(r)-i(n)>=0;)r^=n<<i(r)-i(n);return t<<12|r},o.getPatternPosition=function(t){return r[t-1]},o.getMaskFunction=function(t){switch(t){case l:return function(t,r){return(t+r)%2==0};case h:return function(t,r){return t%2==0};case s:return function(t,r){return r%3==0};case v:return function(t,r){return(t+r)%3==0};case d:return function(t,r){return(Math.floor(t/2)+Math.floor(r/3))%2==0};case w:return function(t,r){return t*r%2+t*r%3==0};case p:return function(t,r){return(t*r%2+t*r%3)%2==0};case y:return function(t,r){return(t*r%3+(t+r)%2)%2==0};default:throw"bad maskPattern:"+t}},o.getErrorCorrectPolynomial=function(t){for(var r=k([1],0),e=0;e<t;e+=1)r=r.multiply(k([1,C.gexp(e)],0));return r},o.getLengthInBits=function(t,r){if(1<=r&&r<10)switch(t){case a:return 10;case u:return 9;case f:case c:return 8;default:throw"mode:"+t}else if(r<27)switch(t){case a:return 12;case u:return 11;case f:return 16;case c:return 10;default:throw"mode:"+t}else{if(!(r<41))throw"type:"+r;switch(t){case a:return 14;case u:return 13;case f:return 16;case c:return 12;default:throw"mode:"+t}}},o.getLostPoint=function(t){for(var r=t.getModuleCount(),e=0,n=0;n<r;n+=1)for(var o=0;o<r;o+=1){for(var i=0,a=t.isDark(n,o),u=-1;u<=1;u+=1)if(!(n+u<0||r<=n+u))for(var f=-1;f<=1;f+=1)o+f<0||r<=o+f||0==u&&0==f||a==t.isDark(n+u,o+f)&&(i+=1);i>5&&(e+=3+i-5)}for(n=0;n<r-1;n+=1)for(o=0;o<r-1;o+=1){var c=0;t.isDark(n,o)&&(c+=1),t.isDark(n+1,o)&&(c+=1),t.isDark(n,o+1)&&(c+=1),t.isDark(n+1,o+1)&&(c+=1),0!=c&&4!=c||(e+=3)}for(n=0;n<r;n+=1)for(o=0;o<r-6;o+=1)t.isDark(n,o)&&!t.isDark(n,o+1)&&t.isDark(n,o+2)&&t.isDark(n,o+3)&&t.isDark(n,o+4)&&!t.isDark(n,o+5)&&t.isDark(n,o+6)&&(e+=40);for(o=0;o<r;o+=1)for(n=0;n<r-6;n+=1)t.isDark(n,o)&&!t.isDark(n+1,o)&&t.isDark(n+2,o)&&t.isDark(n+3,o)&&t.isDark(n+4,o)&&!t.isDark(n+5,o)&&t.isDark(n+6,o)&&(e+=40);var g=0;for(o=0;o<r;o+=1)for(n=0;n<r;n+=1)t.isDark(n,o)&&(g+=1);return e+=Math.abs(100*g/r/r-50)/5*10},o),C=function(){for(var t=new Array(256),r=new Array(256),e=0;e<8;e+=1)t[e]=1<<e;for(e=8;e<256;e+=1)t[e]=t[e-4]^t[e-5]^t[e-6]^t[e-8];for(e=0;e<255;e+=1)r[t[e]]=e;var n={glog:function(t){if(t<1)throw"glog("+t+")";return r[t]},gexp:function(r){for(;r<0;)r+=255;for(;r>=256;)r-=255;return t[r]}};return n}();function k(t,r){if(void 0===t.length)throw t.length+"/"+r;var e=function(){for(var e=0;e<t.length&&0==t[e];)e+=1;for(var n=new Array(t.length-e+r),o=0;o<t.length-e;o+=1)n[o]=t[o+e];return n}(),n={getAt:function(t){return e[t]},getLength:function(){return e.length},multiply:function(t){for(var r=new Array(n.getLength()+t.getLength()-1),e=0;e<n.getLength();e+=1)for(var o=0;o<t.getLength();o+=1)r[e+o]^=C.gexp(C.glog(n.getAt(e))+C.glog(t.getAt(o)));return k(r,0)},mod:function(t){if(n.getLength()-t.getLength()<0)return n;for(var r=C.glog(n.getAt(0))-C.glog(t.getAt(0)),e=new Array(n.getLength()),o=0;o<n.getLength();o+=1)e[o]=n.getAt(o);for(o=0;o<t.getLength();o+=1)e[o]^=C.gexp(C.glog(t.getAt(o))+r);return k(e,0).mod(t)}};return n}var A=function(){var t=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12,7,37,13],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]],r=function(t,r){var e={};return e.totalCount=t,e.dataCount=r,e},e={};return e.getRSBlocks=function(e,n){var o=function(r,e){switch(e){case g.L:return t[4*(r-1)+0];case g.M:return t[4*(r-1)+1];case g.Q:return t[4*(r-1)+2];case g.H:return t[4*(r-1)+3];default:return}}(e,n);if(void 0===o)throw"bad rs block @ typeNumber:"+e+"/errorCorrectionLevel:"+n;for(var i=o.length/3,a=[],u=0;u<i;u+=1)for(var f=o[3*u+0],c=o[3*u+1],l=o[3*u+2],h=0;h<f;h+=1)a.push(r(c,l));return a},e}(),b=function(){var t=[],r=0,e={getBuffer:function(){return t},getAt:function(r){var e=Math.floor(r/8);return 1==(t[e]>>>7-r%8&1)},put:function(t,r){for(var n=0;n<r;n+=1)e.putBit(1==(t>>>r-n-1&1))},getLengthInBits:function(){return r},putBit:function(e){var n=Math.floor(r/8);t.length<=n&&t.push(0),e&&(t[n]|=128>>>r%8),r+=1}};return e},M=function(t){var r=a,e=t,n={getMode:function(){return r},getLength:function(t){return e.length},write:function(t){for(var r=e,n=0;n+2<r.length;)t.put(o(r.substring(n,n+3)),10),n+=3;n<r.length&&(r.length-n==1?t.put(o(r.substring(n,n+1)),4):r.length-n==2&&t.put(o(r.substring(n,n+2)),7))}},o=function(t){for(var r=0,e=0;e<t.length;e+=1)r=10*r+i(t.charAt(e));return r},i=function(t){if("0"<=t&&t<="9")return t.charCodeAt(0)-"0".charCodeAt(0);throw"illegal char :"+t};return n},x=function(t){var r=u,e=t,n={getMode:function(){return r},getLength:function(t){return e.length},write:function(t){for(var r=e,n=0;n+1<r.length;)t.put(45*o(r.charAt(n))+o(r.charAt(n+1)),11),n+=2;n<r.length&&t.put(o(r.charAt(n)),6)}},o=function(t){if("0"<=t&&t<="9")return t.charCodeAt(0)-"0".charCodeAt(0);if("A"<=t&&t<="Z")return t.charCodeAt(0)-"A".charCodeAt(0)+10;switch(t){case" ":return 36;case"$":return 37;case"%":return 38;case"*":return 39;case"+":return 40;case"-":return 41;case".":return 42;case"/":return 43;case":":return 44;default:throw"illegal char :"+t}};return n},m=function(r){var e=f,n=t.stringToBytes(r),o={getMode:function(){return e},getLength:function(t){return n.length},write:function(t){for(var r=0;r<n.length;r+=1)t.put(n[r],8)}};return o},L=function(r){var e=c,n=t.stringToBytesFuncs.SJIS;if(!n)throw"sjis not supported.";!function(){var t=n("友");if(2!=t.length||38726!=(t[0]<<8|t[1]))throw"sjis not supported."}();var o=n(r),i={getMode:function(){return e},getLength:function(t){return~~(o.length/2)},write:function(t){for(var r=o,e=0;e+1<r.length;){var n=(255&r[e])<<8|255&r[e+1];if(33088<=n&&n<=40956)n-=33088;else{if(!(57408<=n&&n<=60351))throw"illegal char at "+(e+1)+"/"+n;n-=49472}n=192*(n>>>8&255)+(255&n),t.put(n,13),e+=2}if(e<r.length)throw"illegal char at "+(e+1)}};return i},D=function(){var t=[],r={writeByte:function(r){t.push(255&r)},writeShort:function(t){r.writeByte(t),r.writeByte(t>>>8)},writeBytes:function(t,e,n){e=e||0,n=n||t.length;for(var o=0;o<n;o+=1)r.writeByte(t[o+e])},writeString:function(t){for(var e=0;e<t.length;e+=1)r.writeByte(t.charCodeAt(e))},toByteArray:function(){return t},toString:function(){var r="";r+="[";for(var e=0;e<t.length;e+=1)e>0&&(r+=","),r+=t[e];return r+="]"}};return r},S=function(t){var r=t,e=0,n=0,o=0,i={read:function(){for(;o<8;){if(e>=r.length){if(0==o)return-1;throw"unexpected end of file./"+o}var t=r.charAt(e);if(e+=1,"="==t)return o=0,-1;t.match(/^\s$/)||(n=n<<6|a(t.charCodeAt(0)),o+=6)}var i=n>>>o-8&255;return o-=8,i}},a=function(t){if(65<=t&&t<=90)return t-65;if(97<=t&&t<=122)return t-97+26;if(48<=t&&t<=57)return t-48+52;if(43==t)return 62;if(47==t)return 63;throw"c:"+t};return i},I=function(t,r,e){for(var n=function(t,r){var e=t,n=r,o=new Array(t*r),i={setPixel:function(t,r,n){o[r*e+t]=n},write:function(t){t.writeString("GIF87a"),t.writeShort(e),t.writeShort(n),t.writeByte(128),t.writeByte(0),t.writeByte(0),t.writeByte(0),t.writeByte(0),t.writeByte(0),t.writeByte(255),t.writeByte(255),t.writeByte(255),t.writeString(","),t.writeShort(0),t.writeShort(0),t.writeShort(e),t.writeShort(n),t.writeByte(0);var r=a(2);t.writeByte(2);for(var o=0;r.length-o>255;)t.writeByte(255),t.writeBytes(r,o,255),o+=255;t.writeByte(r.length-o),t.writeBytes(r,o,r.length-o),t.writeByte(0),t.writeString(";")}},a=function(t){for(var r=1<<t,e=1+(1<<t),n=t+1,i=u(),a=0;a<r;a+=1)i.add(String.fromCharCode(a));i.add(String.fromCharCode(r)),i.add(String.fromCharCode(e));var f,c,g,l=D(),h=(f=l,c=0,g=0,{write:function(t,r){if(t>>>r!=0)throw"length over";for(;c+r>=8;)f.writeByte(255&(t<<c|g)),r-=8-c,t>>>=8-c,g=0,c=0;g|=t<<c,c+=r},flush:function(){c>0&&f.writeByte(g)}});h.write(r,n);var s=0,v=String.fromCharCode(o[s]);for(s+=1;s<o.length;){var d=String.fromCharCode(o[s]);s+=1,i.contains(v+d)?v+=d:(h.write(i.indexOf(v),n),i.size()<4095&&(i.size()==1<<n&&(n+=1),i.add(v+d)),v=d)}return h.write(i.indexOf(v),n),h.write(e,n),h.flush(),l.toByteArray()},u=function(){var t={},r=0,e={add:function(n){if(e.contains(n))throw"dup key:"+n;t[n]=r,r+=1},size:function(){return r},indexOf:function(r){return t[r]},contains:function(r){return void 0!==t[r]}};return e};return i}(t,r),o=0;o<r;o+=1)for(var i=0;i<t;i+=1)n.setPixel(i,o,e(i,o));var a=D();n.write(a);for(var u=function(){var t=0,r=0,e=0,n="",o={},i=function(t){n+=String.fromCharCode(a(63&t))},a=function(t){if(t<0);else{if(t<26)return 65+t;if(t<52)return t-26+97;if(t<62)return t-52+48;if(62==t)return 43;if(63==t)return 47}throw"n:"+t};return o.writeByte=function(n){for(t=t<<8|255&n,r+=8,e+=1;r>=6;)i(t>>>r-6),r-=6},o.flush=function(){if(r>0&&(i(t<<6-r),t=0,r=0),e%3!=0)for(var o=3-e%3,a=0;a<o;a+=1)n+="="},o.toString=function(){return n},o}(),f=a.toByteArray(),c=0;c<f.length;c+=1)u.writeByte(f[c]);return u.flush(),"data:image/gif;base64,"+u};return t}();qrcode.stringToBytesFuncs["UTF-8"]=function(t){return function(t){for(var r=[],e=0;e<t.length;e++){var n=t.charCodeAt(e);n<128?r.push(n):n<2048?r.push(192|n>>6,128|63&n):n<55296||n>=57344?r.push(224|n>>12,128|n>>6&63,128|63&n):(e++,n=65536+((1023&n)<<10|1023&t.charCodeAt(e)),r.push(240|n>>18,128|n>>12&63,128|n>>6&63,128|63&n))}return r}(t)},function(t){"function"==typeof define&&define.amd?define([],t):"object"==typeof exports&&(module.exports=t())}((function(){return qrcode}));
  return typeof module.exports === 'function' ? module.exports : (typeof qrcode === 'function' ? qrcode : module.exports);
})();

function apiHeaders(extra = {}) {
  return new Headers({
    'cache-control': 'no-store, no-cache, must-revalidate',
    'cdn-cache-control': 'no-store',
    'cloudflare-cdn-cache-control': 'no-store',
    ...extra,
  });
}

function jsonResponse(obj, status = 200, extra = {}) {
  const headers = apiHeaders({
    'content-type': 'application/json; charset=utf-8',
    ...extra,
  });
  return new Response(JSON.stringify(obj), { status, headers });
}

function svgResponse(svg, downloadName) {
  const headers = apiHeaders({
    'content-type': 'image/svg+xml; charset=utf-8',
  });
  if (downloadName) {
    headers.set('content-disposition', 'attachment; filename="' + downloadName + '"');
  }
  return new Response(svg, { status: 200, headers });
}

function todayCN() {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return fmt.format(new Date()); // YYYY-MM-DD
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function canonical(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}
// JSON.sort_keys deep:
function canonicalDeep(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalDeep).join(',') + ']';
  const keys = Object.keys(value).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalDeep(value[k])).join(',') + '}';
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256Hex(secret, text) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function catalogName(font) {
  return '文风·' + (font.name || '');
}

function resolveSpdx(font) {
  const recorded = (font.license || {}).spdx || null;
  if (recorded) return [recorded, 'recorded'];
  const name = (font.licenseName || '').trim();
  if (!name || name === '待核实') return [null, 'derived'];
  const lower = name.toLowerCase();
  if (name.includes('Open Font License') || name.startsWith('SIL') || lower.startsWith('ofl')) return ['OFL-1.1', 'derived'];
  if (name.startsWith('MIT') || ['mit', 'mit license', 'x11', '0bsd'].includes(lower)) return ['MIT', 'derived'];
  if (lower.includes('apache')) return ['Apache-2.0', 'derived'];
  if (name.startsWith('IPA') || lower.includes('ipa font')) return ['IPA', 'derived'];
  if (lower.includes('cc0') || lower.includes('creative commons zero')) return ['CC0-1.0', 'derived'];
  if ((lower.includes('cc by') || lower.includes('cc-by') || lower.includes('creative commons attribution')) && !lower.includes('nc')) {
    return [lower.includes('sa') ? 'CC-BY-SA-4.0' : 'CC-BY-4.0', 'derived'];
  }
  if (lower.startsWith('m+') || lower.includes('m plus')) return ['MPlus-Bitmap-License', 'derived'];
  if (lower.includes('gpl') && (lower.includes('font exception') || lower.includes('font-exception'))) {
    return ['GPL-2.0-with-font-exception', 'derived'];
  }
  return [null, 'derived'];
}

function canAttest(font) {
  if ((font.license || {}).textState !== 'full') return false;
  const [spdx] = resolveSpdx(font);
  return !!(spdx && ATTEST_SPDX.has(spdx));
}

function attestBlockReason(font) {
  if ((font.license || {}).textState !== 'full') return '许可原文尚未归档核验，暂不出证';
  const [spdx] = resolveSpdx(font);
  if (!spdx || !ATTEST_SPDX.has(spdx)) return '非标准开源协议。本站只提供授权原文下载，文派科技不出具证书';
  return '不出核验';
}

function conclusions(font) {
  const offer = font.offer || 'jump';
  const dist = font.distribution === true;
  const source = offer === 'source';
  return {
    embed: true,
    redistributeFiles: !!(source && dist),
    platformOffersSource: source,
  };
}

async function signPayload(payload, env) {
  const secret = env.ATTEST_HMAC_SECRET || '';
  const kid = env.ATTEST_HMAC_KID || 'wf-proto-1';
  const alg = env.ATTEST_HMAC_ALG || 'HMAC-SHA256';
  const body = { ...payload };
  delete body.signature;
  const digest = await hmacSha256Hex(secret, canonicalDeep(body));
  payload.signature = {
    alg,
    kid,
    value: digest,
    note: '原型密钥过渡签发；生产将换 Ed25519。',
  };
  return payload;
}

async function verifyPayload(payload, env) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return [false, 'not_object'];
  const got = (payload.signature || {}).value;
  if (!got) return [false, 'missing_signature'];
  const body = { ...payload };
  delete body.signature;
  const expect = await hmacSha256Hex(env.ATTEST_HMAC_SECRET || '', canonicalDeep(body));
  if (expect !== String(got)) return [false, 'mismatch'];
  return [true, 'ok'];
}

async function buildAttestation(font, holder, usage, uscc, env, issuedAt) {
  if (!canAttest(font)) return null;
  const [spdx, spdxSource] = resolveSpdx(font);
  if (!spdx) return null;
  const licMeta = font.license || {};
  const licenseHash = licMeta.textSha256 || null;
  const files = font.files || [];
  const archive = files.find((x) => x.kind === 'archive' && x.href);
  const href = (archive && archive.href) || '';
  const hrefDigest = href ? await sha256Hex('href:' + href) : null;
  const now = issuedAt || todayCN();
  const holderS = (holder || '').trim() || null;
  const usccS = (uscc || '').trim() || null;
  const usageList = (usage || []).map((u) => USAGE_WORDS[u]).filter(Boolean);
  const unsigned = {
    type: 'wenfeng.attestation.v1',
    title: '文风字体授权证明',
    catalogName: catalogName(font),
    originalName: font.name,
    originalEn: font.en || null,
    norm: String(font.norm || '').toLowerCase(),
    foundry: font.foundry || null,
    usage: usageList.length ? usageList : null,
    holder: holderS,
    uscc: usccS,
    gitCommit: (font.mirror || {}).headSha || null,
    upstreamUrl: (font.mirror || {}).upstream || null,
    mirrorUrl: (font.mirror || {}).feicode || null,
    issuer: ISSUER,
    license: {
      spdx,
      spdxSource,
      name: font.licenseName || '',
      url: '/license/' + String(font.norm || '').toLowerCase(),
      textKind: null,
      rfn: licMeta.rfn || null,
      origin: licMeta.origin || null,
      sha256: licenseHash,
      textSha256Source: licenseHash ? 'recorded' : 'absent',
      evidence: null,
    },
    conclusions: conclusions(font),
    files: {
      archiveHref: href || null,
      hrefSha256: hrefDigest,
      note: '原型用下载地址摘要，生产换成原件 sha256',
    },
    not: [
      '本证明是开源许可的核验记录，授权以著作权人发布的许可原文为准。',
      '著作权归原作者或厂商。文派（广州）科技有限公司负责核对与出具本证明。',
      '「文风·」是本站收录名。字体文件内的 name 表、协议中的保留名，均沿用原名。',
      '使用范围以许可原文为准。核验按原文条款记录。',
    ],
    issuedAt: now,
    prototype: true,
  };
  const seed = canonicalDeep(unsigned);
  const serial = 'WF-' + now.replace(/-/g, '') + '-' + (await sha256Hex(seed)).slice(0, 10).toUpperCase();
  unsigned.serial = serial;
  unsigned.verifyUrl = '/attest/' + unsigned.norm + '/';
  unsigned.checkUrl = '/attest/verify';
  return signPayload(unsigned, env);
}

async function loadSamples(env) {
  const url = UPSTREAM + '/samples.json';
  const cache = caches.default;
  let res = await cache.match(url);
  if (!res) {
    res = await fetch(url, { cf: { cacheTtl: 300, cacheEverything: true } });
    if (res.ok) {
      const copy = res.clone();
      const headers = new Headers(copy.headers);
      headers.set('cache-control', 'public, max-age=300');
      await cache.put(url, new Response(copy.body, { status: copy.status, headers }));
    }
  }
  if (!res.ok) throw new Error('samples_unavailable');
  return res.json();
}

async function loadLedger(env) {
  if (!env.ATTEST_KV) return [];
  const raw = await env.ATTEST_KV.get(LEDGER_KEY, 'json');
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return raw.records || [];
}

async function saveLedger(env, rows) {
  if (!env.ATTEST_KV) return;
  await env.ATTEST_KV.put(LEDGER_KEY, JSON.stringify({
    generated: todayCN(),
    records: rows,
  }));
}

async function recordLedger(env, cert) {
  const serial = cert && cert.serial;
  if (!serial || !env.ATTEST_KV) return;
  const rows = await loadLedger(env);
  if (rows.some((r) => r.serial === serial)) return;
  rows.unshift({
    serial,
    norm: cert.norm,
    catalogName: cert.catalogName,
    issuedAt: cert.issuedAt,
    holder: cert.holder,
    spdx: (cert.license || {}).spdx,
    usage: cert.usage,
    uscc: cert.uscc,
    licenseHash: ((cert.license || {}).sha256 || '').slice(0, 8).toUpperCase() || null,
  });
  await saveLedger(env, rows);
}

function badgeTextW(text, size) {
  let w = 0;
  for (const ch of text || '') {
    const o = ch.codePointAt(0);
    w += (o > 0x2e80 || '·—…'.includes(ch)) ? size * 0.96 : size * 0.55;
  }
  return w;
}

function badgeFaceName(catalog) {
  let name = (catalog || '').trim() || '文风字体';
  if (name.startsWith('文风·')) return name.slice(3);
  if (name.startsWith('文风')) return name.slice(2).replace(/^[·\s]+/, '') || name;
  return name;
}

function badgeFitText(text, size, maxW) {
  const raw = text || '';
  if (badgeTextW(raw, size) <= maxW) return raw;
  let out = '';
  const ell = '…';
  const ellW = badgeTextW(ell, size);
  for (const ch of raw) {
    if (badgeTextW(out + ch, size) + ellW > maxW) return out + ell;
    out += ch;
  }
  return out;
}

function normalizeBadgeVariant(variant) {
  let v = (variant || 'plaque').trim().toLowerCase();
  if (v === 'slim') return 'slim-ink';
  if (['plaque', 'dark', 'slim-ink', 'slim-paper'].includes(v)) return v;
  return 'plaque';
}

function renderBadgeSvg(catalog, variant, spdx) {
  const v = normalizeBadgeVariant(variant);
  const full = catalog || '文风字体';
  const face = badgeFaceName(full);
  const tag = (spdx || '').trim();
  const label = esc(full);
  const title = tag ? full + ' · ' + tag : full;
  const titleEsc = esc(title);
  const ink = '#26200f', paper = '#fcf9f1', gold = '#d9c07a';
  const head = '授权证明';
  const aria = tag ? label + ' ' + head + ' · ' + esc(tag) : label + ' ' + head;
  const style = 'text{font-family:PingFang SC,Microsoft YaHei,sans-serif}';

  if (v === 'slim-ink' || v === 'slim-paper') {
    const dark = v === 'slim-ink';
    const rightLabel = tag || 'ATTEST';
    const h = 28, icon = 16, iconPad = 7, gap = 9;
    const leftFs = 11, rightFs = 10, tracking = 1, leftEnd = 14, rightPad = 14;
    const textW = badgeTextW(head, leftFs) + tracking * Math.max(0, head.length - 1) + 4;
    const leftW = Math.floor(iconPad + icon + gap + textW + leftEnd);
    const rightW = Math.floor(Math.max(72, rightPad * 2 + badgeTextW(rightLabel, rightFs) + 6));
    const w = leftW + rightW;
    const leftBg = dark ? ink : '#efece4';
    const leftFg = dark ? paper : ink;
    const rightBg = dark ? '#3d3628' : '#e0d9cc';
    const rightFg = dark ? gold : '#5c4f3a';
    const ty = h * 0.5 + leftFs * 0.34;
    const iconY = (h - icon) / 2;
    const textX = iconPad + icon + gap;
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
      'width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + aria + '">' +
      '<title>' + titleEsc + '</title><style>' + style + '</style>' +
      '<defs><clipPath id="b"><rect width="' + w + '" height="' + h + '" rx="6"/></clipPath></defs>' +
      '<g clip-path="url(#b)">' +
      '<rect width="' + w + '" height="' + h + '" fill="' + leftBg + '"/>' +
      '<rect x="' + leftW + '" width="' + rightW + '" height="' + h + '" fill="' + rightBg + '"/>' +
      '</g>' +
      '<image x="' + iconPad + '" y="' + iconY + '" width="' + icon + '" height="' + icon + '" ' +
      'xlink:href="data:image/png;base64,' + BADGE_ICON_B64 + '"/>' +
      '<text x="' + textX + '" y="' + ty + '" font-size="' + leftFs + '" letter-spacing="' + tracking + '" fill="' + leftFg + '">' + head + '</text>' +
      '<text x="' + (leftW + rightPad) + '" y="' + ty + '" font-family="ui-monospace,Menlo,monospace" font-size="' + rightFs + '" fill="' + rightFg + '">' + esc(rightLabel) + '</text></svg>'
    );
  }

  const h = 52, icon = 24, iconX = 12, textX = 44, padR = 14, maxText = 120;
  let line2;
  if (tag) {
    const tagBit = ' · ' + tag;
    const name = badgeFitText(face, 8.5, Math.max(24, maxText - badgeTextW(tagBit, 8.5)));
    line2 = name ? name + tagBit : tag;
  } else {
    line2 = badgeFitText(face, 8.5, maxText);
  }
  const titleW = badgeTextW(head, 13) + 8;
  const subW = badgeTextW(line2, 8.5);
  const w = Math.floor(Math.max(158, Math.min(200, textX + Math.max(titleW, subW) + padR)));
  const iconY = (h - icon) / 2;
  const titleY = 22.5, subY = 40;
  if (v === 'dark') {
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
      'width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + aria + '">' +
      '<title>' + titleEsc + '</title><style>' + style + '</style>' +
      '<rect x="0.75" y="0.75" width="' + (w - 1.5) + '" height="' + (h - 1.5) + '" rx="8" fill="' + ink + '" stroke="#4a4334" stroke-width="1.4"/>' +
      '<image x="' + iconX + '" y="' + iconY + '" width="' + icon + '" height="' + icon + '" xlink:href="data:image/png;base64,' + BADGE_ICON_B64 + '"/>' +
      '<text x="' + textX + '" y="' + titleY + '" font-size="13" letter-spacing="2" fill="' + paper + '">' + head + '</text>' +
      '<text x="' + textX + '" y="' + subY + '" font-size="8.5" fill="#c4b89a">' + esc(line2) + '</text></svg>'
    );
  }
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
    'width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + aria + '">' +
    '<title>' + titleEsc + '</title><style>' + style + '</style>' +
    '<rect x="0.75" y="0.75" width="' + (w - 1.5) + '" height="' + (h - 1.5) + '" rx="8" fill="' + paper + '" stroke="' + gold + '" stroke-width="1.4"/>' +
    '<image x="' + iconX + '" y="' + iconY + '" width="' + icon + '" height="' + icon + '" xlink:href="data:image/png;base64,' + BADGE_ICON_B64 + '"/>' +
    '<text x="' + textX + '" y="' + titleY + '" font-size="13" letter-spacing="2" fill="' + ink + '">' + head + '</text>' +
    '<text x="' + textX + '" y="' + subY + '" font-size="8.5" fill="#6b5b45">' + esc(line2) + '</text></svg>'
  );
}

function renderQrSvg(text) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  const cell = 4;
  const size = count * cell;
  let rects = '';
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) {
        rects += '<rect x="' + (c * cell) + '" y="' + (r * cell) + '" width="' + cell + '" height="' + cell + '"/>';
      }
    }
  }
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" shape-rendering="crispEdges">' +
    '<rect width="100%" height="100%" fill="#fff"/>' +
    '<g fill="#000">' + rects + '</g></svg>'
  );
}

async function handleApi(request, env, url) {
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const method = request.method.toUpperCase();

  if (path === '/api/v1' || path === '/api/v1/') {
    return jsonResponse({
      comment: 'wenfeng.org 证明与目录 API（Cloudflare Worker 边缘过渡版）。',
      endpoints: [
        'GET /api/v1/certs',
        'GET /api/v1/certs/{norm}',
        'GET /api/v1/certs/issued',
        'POST /api/v1/certs/verify',
        'GET /api/v1/certs/lookup',
        'GET /api/v1/certs/badge',
        'GET /api/v1/certs/qr',
      ],
    });
  }

  if (path === '/api/v1/certs/qr') {
    const serial = (url.searchParams.get('s') || '').trim();
    const target = 'https://wenfeng.org/v' + (serial ? '?s=' + encodeURIComponent(serial) : '');
    return svgResponse(renderQrSvg(target));
  }

  if (path === '/api/v1/certs/badge' || path.startsWith('/badge/')) {
    let serial = (url.searchParams.get('s') || '').trim().toUpperCase();
    let variant = url.searchParams.get('v') || 'plaque';
    if (path.startsWith('/badge/')) {
      const m = path.match(/^\/badge\/([^/?#]+?)(?:\.svg)?$/i);
      if (m) serial = decodeURIComponent(m[1]).replace(/\.svg$/i, '').toUpperCase();
    }
    const wantDl = ['1', 'true', 'yes'].includes((url.searchParams.get('download') || '').toLowerCase());
    const rows = await loadLedger(env);
    const hit = rows.find((r) => r.serial === serial);
    if (!hit) return jsonResponse({ error: 'not_found' }, 404);
    const svg = renderBadgeSvg(hit.catalogName || '', variant, hit.spdx || '');
    const fname = 'wenfeng-badge-' + serial.toLowerCase() + '-' + normalizeBadgeVariant(variant) + '.svg';
    return svgResponse(svg, wantDl ? fname : null);
  }

  if (path === '/api/v1/certs/lookup') {
    const serial = (url.searchParams.get('s') || '').trim().toUpperCase();
    const holder = (url.searchParams.get('holder') || '').trim();
    if (!serial || !holder) return jsonResponse({ error: 'need_serial_and_holder' }, 400);
    const rows = await loadLedger(env);
    const hit = rows.find((r) => r.serial === serial);
    if (!hit) return jsonResponse({ error: 'not_found' }, 404);
    const want = (hit.holder || '').trim();
    const got = holder.trim();
    if (want) {
      if (got !== want) return jsonResponse({ error: 'holder_mismatch' }, 403);
    } else if (got && got !== '通用核验记录') {
      return jsonResponse({ error: 'holder_mismatch' }, 403);
    }
    return jsonResponse({
      serial: hit.serial,
      norm: hit.norm,
      catalogName: hit.catalogName,
      holder: hit.holder,
      spdx: hit.spdx,
      usage: hit.usage,
      issuedAt: hit.issuedAt,
      downloads: Number(hit.downloads || 0),
      href: '/attest/' + hit.norm + '/',
    });
  }

  if (path === '/api/v1/certs/issued') {
    const rows = await loadLedger(env);
    return jsonResponse({ issuer: ISSUER, count: rows.length, records: rows });
  }

  if (path === '/api/v1/certs/verify') {
    if (method === 'GET' || method === 'HEAD') {
      return jsonResponse({ error: 'method_not_allowed', hint: 'POST JSON attestation to /api/v1/certs/verify' }, 405);
    }
    if (method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405);
    const raw = await request.text();
    if (raw.length > 200000) return jsonResponse({ valid: false, error: 'too_large' }, 413);
    let payload;
    try { payload = JSON.parse(raw || '{}'); } catch (e) {
      return jsonResponse({ valid: false, error: 'invalid_json' }, 400);
    }
    const [ok, reason] = await verifyPayload(payload, env);
    return jsonResponse({
      valid: ok,
      reason,
      serial: payload && payload.serial,
      catalogName: payload && payload.catalogName,
      issuer: ok ? ISSUER : null,
    }, ok ? 200 : 400);
  }

  const pdfM = path.match(/^\/api\/v1\/certs\/([^/]+)\/pdf$/);
  if (pdfM) {
    return jsonResponse({
      error: 'pdf_not_available',
      message: '边缘签发第一期请用页内打印。PDF 矢量导出后续开放。',
      norm: decodeURIComponent(pdfM[1]).toLowerCase(),
    }, 501);
  }

  const certM = path.match(/^\/api\/v1\/certs(?:\/([^/]+))?$/);
  if (certM) {
    if (method !== 'GET' && method !== 'HEAD') return jsonResponse({ error: 'method_not_allowed' }, 405);
    let data;
    try { data = await loadSamples(env); } catch (e) {
      return jsonResponse({ error: 'samples_unavailable' }, 503);
    }
    const fonts = data.fonts || [];
    const holder = url.searchParams.get('holder') || '';
    const uscc = url.searchParams.get('uscc') || '';
    const usage = (url.searchParams.get('usage') || '').split(',').filter(Boolean);
    const norm = certM[1] ? decodeURIComponent(certM[1]) : null;

    if (!norm) {
      const rows = [];
      for (const font of fonts) {
        const cert = await buildAttestation(font, null, null, null, env);
        if (!cert) continue;
        rows.push({
          norm: cert.norm,
          catalogName: cert.catalogName,
          originalName: cert.originalName,
          serial: cert.serial,
          spdx: cert.license.spdx,
          platformOffersSource: cert.conclusions.platformOffersSource,
          redistributeFiles: cert.conclusions.redistributeFiles,
          href: '/attest/' + cert.norm + '/',
        });
      }
      return jsonResponse({
        issuer: ISSUER,
        naming: '文风·{原名}',
        policy: 'standard-oss-only',
        count: rows.length,
        certs: rows,
      });
    }

    const hit = fonts.find((f) => String(f.norm || '').toLowerCase() === norm.toLowerCase());
    if (!hit) return jsonResponse({ error: 'not_found', norm: norm.toLowerCase() }, 404);
    const cert = await buildAttestation(hit, holder, usage, uscc, env);
    if (!cert) {
      return jsonResponse({ error: 'not_attestable', norm, reason: attestBlockReason(hit) }, 409);
    }
    await recordLedger(env, cert);
    return jsonResponse(cert);
  }

  return jsonResponse({ error: 'not_found', path }, 404);
}

async function proxyOss(request, url) {
  let p = url.pathname;
  if (p === '/') {
    p = '/index.html';
  } else if (!/\.[a-z0-9]+$/i.test(p)) {
    p = p.replace(/\/+$/, '') + '/index.html';
  }
  const h = new Headers();
  for (const [k, v] of request.headers) {
    if (!HOP.has(k.toLowerCase())) h.set(k, v);
  }
  const init = { method: request.method, headers: h, cf: { cacheEverything: true } };
  if (request.method !== 'GET' && request.method !== 'HEAD') init.body = request.body;
  const r = await fetch(UPSTREAM + p + url.search, init);
  const rh = new Headers(r.headers);
  rh.delete('content-disposition');
  rh.delete('x-oss-force-download');
  return new Response(r.body, { status: r.status, headers: rh });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;
    if (p.startsWith('/api/v1') || p.startsWith('/badge/')) {
      try {
        return await handleApi(request, env, url);
      } catch (err) {
        return jsonResponse({ error: 'internal', message: String(err && err.message || err) }, 500);
      }
    }
    return proxyOss(request, url);
  },
};
