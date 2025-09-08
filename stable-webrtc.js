/*
 * stable-webrtc: A production-grade WebRTC library for Node.js & Browsers
 * Copyright 2025 colocohen
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * This file is part of the open-source project hosted at:
 *     https://github.com/colocohen/stable-webrtc
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 */


(function (root, factory){
  if (typeof module === 'object' && module.exports){
    module.exports = factory();
  } else {
    root.StableWebRTC = factory();
  }
}(this, function(){


  var diff_match_patch=function(){this.Diff_Timeout=1;this.Diff_EditCost=4;this.Match_Threshold=.5;this.Match_Distance=1E3;this.Patch_DeleteThreshold=.5;this.Patch_Margin=4;this.Match_MaxBits=32},DIFF_DELETE=-1,DIFF_INSERT=1,DIFF_EQUAL=0;diff_match_patch.Diff=function(a,b){this[0]=a;this[1]=b};diff_match_patch.Diff.prototype.length=2;diff_match_patch.Diff.prototype.toString=function(){return this[0]+","+this[1]};diff_match_patch.prototype.diff_main=function(a,b,c,d){"undefined"==typeof d&&(d=0>=this.Diff_Timeout?Number.MAX_VALUE:(new Date).getTime()+1E3*this.Diff_Timeout);if(null==a||null==b)throw Error("Null input. (diff_main)");if(a==b)return a?[new diff_match_patch.Diff(DIFF_EQUAL,a)]:[];"undefined"==typeof c&&(c=!0);var e=c,f=this.diff_commonPrefix(a,b);c=a.substring(0,f);a=a.substring(f);b=b.substring(f);f=this.diff_commonSuffix(a,b);var g=a.substring(a.length-f);a=a.substring(0,a.length-f);b=b.substring(0,b.length-f);a=this.diff_compute_(a,b,e,d);c&&a.unshift(new diff_match_patch.Diff(DIFF_EQUAL,c));g&&a.push(new diff_match_patch.Diff(DIFF_EQUAL,g));this.diff_cleanupMerge(a);return a};diff_match_patch.prototype.diff_compute_=function(a,b,c,d){if(!a)return[new diff_match_patch.Diff(DIFF_INSERT,b)];if(!b)return[new diff_match_patch.Diff(DIFF_DELETE,a)];var e=a.length>b.length?a:b,f=a.length>b.length?b:a,g=e.indexOf(f);return-1!=g?(c=[new diff_match_patch.Diff(DIFF_INSERT,e.substring(0,g)),new diff_match_patch.Diff(DIFF_EQUAL,f),new diff_match_patch.Diff(DIFF_INSERT,e.substring(g+f.length))],a.length>b.length&&(c[0][0]=c[2][0]=DIFF_DELETE),c):1==f.length?[new diff_match_patch.Diff(DIFF_DELETE,a),new diff_match_patch.Diff(DIFF_INSERT,b)]:(e=this.diff_halfMatch_(a,b))?(b=e[1],f=e[3],a=e[4],e=this.diff_main(e[0],e[2],c,d),c=this.diff_main(b,f,c,d),e.concat([new diff_match_patch.Diff(DIFF_EQUAL,a)],c)):c&&100<a.length&&100<b.length?this.diff_lineMode_(a,b,d):this.diff_bisect_(a,b,d)};diff_match_patch.prototype.diff_lineMode_=function(a,b,c){var d=this.diff_linesToChars_(a,b);a=d.chars1;b=d.chars2;d=d.lineArray;a=this.diff_main(a,b,!1,c);this.diff_charsToLines_(a,d);this.diff_cleanupSemantic(a);a.push(new diff_match_patch.Diff(DIFF_EQUAL,""));for(var e=d=b=0,f="",g="";b<a.length;){switch(a[b][0]){case DIFF_INSERT:e++;g+=a[b][1];break;case DIFF_DELETE:d++;f+=a[b][1];break;case DIFF_EQUAL:if(1<=d&&1<=e){a.splice(b-d-e,d+e);b=b-d-e;d=this.diff_main(f,g,!1,c);for(e=d.length-1;0<=e;e--)a.splice(b,0,d[e]);b+=d.length}d=e=0;g=f=""}b++}a.pop();return a}; 
  diff_match_patch.prototype.diff_bisect_=function(a,b,c){for(var d=a.length,e=b.length,f=Math.ceil((d+e)/2),g=2*f,h=Array(g),l=Array(g),k=0;k<g;k++)h[k]=-1,l[k]=-1;h[f+1]=0;l[f+1]=0;k=d-e;for(var m=0!=k%2,p=0,x=0,w=0,q=0,t=0;t<f&&!((new Date).getTime()>c);t++){for(var v=-t+p;v<=t-x;v+=2){var n=f+v;var r=v==-t||v!=t&&h[n-1]<h[n+1]?h[n+1]:h[n-1]+1;for(var y=r-v;r<d&&y<e&&a.charAt(r)==b.charAt(y);)r++,y++;h[n]=r;if(r>d)x+=2;else if(y>e)p+=2;else if(m&&(n=f+k-v,0<=n&&n<g&&-1!=l[n])){var u=d-l[n];if(r>=u)return this.diff_bisectSplit_(a,b,r,y,c)}}for(v=-t+w;v<=t-q;v+=2){n=f+v;u=v==-t||v!=t&&l[n-1]<l[n+1]?l[n+1]:l[n-1]+1;for(r=u-v;u<d&&r<e&&a.charAt(d-u-1)==b.charAt(e-r-1);)u++,r++;l[n]=u;if(u>d)q+=2;else if(r>e)w+=2;else if(!m&&(n=f+k-v,0<=n&&n<g&&-1!=h[n]&&(r=h[n],y=f+r-n,u=d-u,r>=u)))return this.diff_bisectSplit_(a,b,r,y,c)}}return[new diff_match_patch.Diff(DIFF_DELETE,a),new diff_match_patch.Diff(DIFF_INSERT,b)]};
  diff_match_patch.prototype.diff_bisectSplit_=function(a,b,c,d,e){var f=a.substring(0,c),g=b.substring(0,d);a=a.substring(c);b=b.substring(d);f=this.diff_main(f,g,!1,e);e=this.diff_main(a,b,!1,e);return f.concat(e)};
  diff_match_patch.prototype.diff_linesToChars_=function(a,b){function c(a){for(var b="",c=0,g=-1,h=d.length;g<a.length-1;){g=a.indexOf("\n",c);-1==g&&(g=a.length-1);var l=a.substring(c,g+1);(e.hasOwnProperty?e.hasOwnProperty(l):void 0!==e[l])?b+=String.fromCharCode(e[l]):(h==f&&(l=a.substring(c),g=a.length),b+=String.fromCharCode(h),e[l]=h,d[h++]=l);c=g+1}return b}var d=[],e={};d[0]="";var f=4E4,g=c(a);f=65535;var h=c(b);return{chars1:g,chars2:h,lineArray:d}};
  diff_match_patch.prototype.diff_charsToLines_=function(a,b){for(var c=0;c<a.length;c++){for(var d=a[c][1],e=[],f=0;f<d.length;f++)e[f]=b[d.charCodeAt(f)];a[c][1]=e.join("")}};diff_match_patch.prototype.diff_commonPrefix=function(a,b){if(!a||!b||a.charAt(0)!=b.charAt(0))return 0;for(var c=0,d=Math.min(a.length,b.length),e=d,f=0;c<e;)a.substring(f,e)==b.substring(f,e)?f=c=e:d=e,e=Math.floor((d-c)/2+c);return e};
  diff_match_patch.prototype.diff_commonSuffix=function(a,b){if(!a||!b||a.charAt(a.length-1)!=b.charAt(b.length-1))return 0;for(var c=0,d=Math.min(a.length,b.length),e=d,f=0;c<e;)a.substring(a.length-e,a.length-f)==b.substring(b.length-e,b.length-f)?f=c=e:d=e,e=Math.floor((d-c)/2+c);return e};
  diff_match_patch.prototype.diff_commonOverlap_=function(a,b){var c=a.length,d=b.length;if(0==c||0==d)return 0;c>d?a=a.substring(c-d):c<d&&(b=b.substring(0,c));c=Math.min(c,d);if(a==b)return c;d=0;for(var e=1;;){var f=a.substring(c-e);f=b.indexOf(f);if(-1==f)return d;e+=f;if(0==f||a.substring(c-e)==b.substring(0,e))d=e,e++}};
  diff_match_patch.prototype.diff_halfMatch_=function(a,b){function c(a,b,c){for(var d=a.substring(c,c+Math.floor(a.length/4)),e=-1,g="",h,k,l,m;-1!=(e=b.indexOf(d,e+1));){var p=f.diff_commonPrefix(a.substring(c),b.substring(e)),u=f.diff_commonSuffix(a.substring(0,c),b.substring(0,e));g.length<u+p&&(g=b.substring(e-u,e)+b.substring(e,e+p),h=a.substring(0,c-u),k=a.substring(c+p),l=b.substring(0,e-u),m=b.substring(e+p))}return 2*g.length>=a.length?[h,k,l,m,g]:null}if(0>=this.Diff_Timeout)return null;var d=a.length>b.length?a:b,e=a.length>b.length?b:a;if(4>d.length||2*e.length<d.length)return null;var f=this,g=c(d,e,Math.ceil(d.length/4));d=c(d,e,Math.ceil(d.length/2));if(g||d)g=d?g?g[4].length>d[4].length?g:d:d:g;else return null;if(a.length>b.length){d=g[0];e=g[1];var h=g[2];var l=g[3]}else h=g[0],l=g[1],d=g[2],e=g[3];return[d,e,h,l,g[4]]};
  diff_match_patch.prototype.diff_cleanupSemantic=function(a){for(var b=!1,c=[],d=0,e=null,f=0,g=0,h=0,l=0,k=0;f<a.length;)a[f][0]==DIFF_EQUAL?(c[d++]=f,g=l,h=k,k=l=0,e=a[f][1]):(a[f][0]==DIFF_INSERT?l+=a[f][1].length:k+=a[f][1].length,e&&e.length<=Math.max(g,h)&&e.length<=Math.max(l,k)&&(a.splice(c[d-1],0,new diff_match_patch.Diff(DIFF_DELETE,e)),a[c[d-1]+1][0]=DIFF_INSERT,d--,d--,f=0<d?c[d-1]:-1,k=l=h=g=0,e=null,b=!0)),f++;b&&this.diff_cleanupMerge(a);this.diff_cleanupSemanticLossless(a);for(f=1;f<a.length;){if(a[f-1][0]==DIFF_DELETE&&a[f][0]==DIFF_INSERT){b=a[f-1][1];c=a[f][1];d=this.diff_commonOverlap_(b,c);e=this.diff_commonOverlap_(c,b);if(d>=e){if(d>=b.length/2||d>=c.length/2)a.splice(f,0,new diff_match_patch.Diff(DIFF_EQUAL,c.substring(0,d))),a[f-1][1]=b.substring(0,b.length-d),a[f+1][1]=c.substring(d),f++}else if(e>=b.length/2||e>=c.length/2)a.splice(f,0,new diff_match_patch.Diff(DIFF_EQUAL,b.substring(0,e))),a[f-1][0]=DIFF_INSERT,a[f-1][1]=c.substring(0,c.length-e),a[f+1][0]=DIFF_DELETE,a[f+1][1]=b.substring(e),f++;f++}f++}};
  diff_match_patch.prototype.diff_cleanupSemanticLossless=function(a){function b(a,b){if(!a||!b)return 6;var c=a.charAt(a.length-1),d=b.charAt(0),e=c.match(diff_match_patch.nonAlphaNumericRegex_),f=d.match(diff_match_patch.nonAlphaNumericRegex_),g=e&&c.match(diff_match_patch.whitespaceRegex_),h=f&&d.match(diff_match_patch.whitespaceRegex_);c=g&&c.match(diff_match_patch.linebreakRegex_);d=h&&d.match(diff_match_patch.linebreakRegex_);var k=c&&a.match(diff_match_patch.blanklineEndRegex_),l=d&&b.match(diff_match_patch.blanklineStartRegex_);
  return k||l?5:c||d?4:e&&!g&&h?3:g||h?2:e||f?1:0}for(var c=1;c<a.length-1;){if(a[c-1][0]==DIFF_EQUAL&&a[c+1][0]==DIFF_EQUAL){var d=a[c-1][1],e=a[c][1],f=a[c+1][1],g=this.diff_commonSuffix(d,e);if(g){var h=e.substring(e.length-g);d=d.substring(0,d.length-g);e=h+e.substring(0,e.length-g);f=h+f}g=d;h=e;for(var l=f,k=b(d,e)+b(e,f);e.charAt(0)===f.charAt(0);){d+=e.charAt(0);e=e.substring(1)+f.charAt(0);f=f.substring(1);var m=b(d,e)+b(e,f);m>=k&&(k=m,g=d,h=e,l=f)}a[c-1][1]!=g&&(g?a[c-1][1]=g:(a.splice(c-1,1),c--),a[c][1]=h,l?a[c+1][1]=l:(a.splice(c+1,1),c--))}c++}};diff_match_patch.nonAlphaNumericRegex_=/[^a-zA-Z0-9]/;diff_match_patch.whitespaceRegex_=/\s/;diff_match_patch.linebreakRegex_=/[\r\n]/;diff_match_patch.blanklineEndRegex_=/\n\r?\n$/;diff_match_patch.blanklineStartRegex_=/^\r?\n\r?\n/;
  diff_match_patch.prototype.diff_cleanupEfficiency=function(a){for(var b=!1,c=[],d=0,e=null,f=0,g=!1,h=!1,l=!1,k=!1;f<a.length;)a[f][0]==DIFF_EQUAL?(a[f][1].length<this.Diff_EditCost&&(l||k)?(c[d++]=f,g=l,h=k,e=a[f][1]):(d=0,e=null),l=k=!1):(a[f][0]==DIFF_DELETE?k=!0:l=!0,e&&(g&&h&&l&&k||e.length<this.Diff_EditCost/2&&3==g+h+l+k)&&(a.splice(c[d-1],0,new diff_match_patch.Diff(DIFF_DELETE,e)),a[c[d-1]+1][0]=DIFF_INSERT,d--,e=null,g&&h?(l=k=!0,d=0):(d--,f=0<d?c[d-1]:-1,l=k=!1),b=!0)),f++;b&&this.diff_cleanupMerge(a)};
  diff_match_patch.prototype.diff_cleanupMerge=function(a){a.push(new diff_match_patch.Diff(DIFF_EQUAL,""));for(var b=0,c=0,d=0,e="",f="",g;b<a.length;)switch(a[b][0]){case DIFF_INSERT:d++;f+=a[b][1];b++;break;case DIFF_DELETE:c++;e+=a[b][1];b++;break;case DIFF_EQUAL:1<c+d?(0!==c&&0!==d&&(g=this.diff_commonPrefix(f,e),0!==g&&(0<b-c-d&&a[b-c-d-1][0]==DIFF_EQUAL?a[b-c-d-1][1]+=f.substring(0,g):(a.splice(0,0,new diff_match_patch.Diff(DIFF_EQUAL,f.substring(0,g))),b++),f=f.substring(g),e=e.substring(g)),g=this.diff_commonSuffix(f,e),0!==g&&(a[b][1]=f.substring(f.length-g)+a[b][1],f=f.substring(0,f.length-g),e=e.substring(0,e.length-g))),b-=c+d,a.splice(b,c+d),e.length&&(a.splice(b,0,new diff_match_patch.Diff(DIFF_DELETE,e)),b++),f.length&&(a.splice(b,0,new diff_match_patch.Diff(DIFF_INSERT,f)),b++),b++):0!==b&&a[b-1][0]==DIFF_EQUAL?(a[b-1][1]+=a[b][1],a.splice(b,1)):b++,c=d=0,f=e=""}""===a[a.length-1][1]&&a.pop();c=!1;for(b=1;b<a.length-1;)a[b-1][0]==DIFF_EQUAL&&a[b+1][0]==DIFF_EQUAL&&(a[b][1].substring(a[b][1].length-a[b-1][1].length)==a[b-1][1]?(a[b][1]=a[b-1][1]+a[b][1].substring(0,a[b][1].length-a[b-1][1].length),a[b+1][1]=a[b-1][1]+a[b+1][1],a.splice(b-1,1),c=!0):a[b][1].substring(0,a[b+1][1].length)==a[b+1][1]&&(a[b-1][1]+=a[b+1][1],a[b][1]=a[b][1].substring(a[b+1][1].length)+a[b+1][1],a.splice(b+1,1),c=!0)),b++;c&&this.diff_cleanupMerge(a)};
  diff_match_patch.prototype.diff_xIndex=function(a,b){var c=0,d=0,e=0,f=0,g;for(g=0;g<a.length;g++){a[g][0]!==DIFF_INSERT&&(c+=a[g][1].length);a[g][0]!==DIFF_DELETE&&(d+=a[g][1].length);if(c>b)break;e=c;f=d}return a.length!=g&&a[g][0]===DIFF_DELETE?f:f+(b-e)};
  diff_match_patch.prototype.diff_prettyHtml=function(a){for(var b=[],c=/&/g,d=/</g,e=/>/g,f=/\n/g,g=0;g<a.length;g++){var h=a[g][0],l=a[g][1].replace(c,"&amp;").replace(d,"&lt;").replace(e,"&gt;").replace(f,"&para;<br>");switch(h){case DIFF_INSERT:b[g]='<ins style="background:#e6ffe6;">'+l+"</ins>";break;case DIFF_DELETE:b[g]='<del style="background:#ffe6e6;">'+l+"</del>";break;case DIFF_EQUAL:b[g]="<span>"+l+"</span>"}}return b.join("")};
  diff_match_patch.prototype.diff_text1=function(a){for(var b=[],c=0;c<a.length;c++)a[c][0]!==DIFF_INSERT&&(b[c]=a[c][1]);return b.join("")};diff_match_patch.prototype.diff_text2=function(a){for(var b=[],c=0;c<a.length;c++)a[c][0]!==DIFF_DELETE&&(b[c]=a[c][1]);return b.join("")};
  diff_match_patch.prototype.diff_levenshtein=function(a){for(var b=0,c=0,d=0,e=0;e<a.length;e++){var f=a[e][1];switch(a[e][0]){case DIFF_INSERT:c+=f.length;break;case DIFF_DELETE:d+=f.length;break;case DIFF_EQUAL:b+=Math.max(c,d),d=c=0}}return b+=Math.max(c,d)};
  diff_match_patch.prototype.diff_toDelta=function(a){for(var b=[],c=0;c<a.length;c++)switch(a[c][0]){case DIFF_INSERT:b[c]="+"+encodeURI(a[c][1]);break;case DIFF_DELETE:b[c]="-"+a[c][1].length;break;case DIFF_EQUAL:b[c]="="+a[c][1].length}return b.join("\t").replace(/%20/g," ")};
  diff_match_patch.prototype.diff_fromDelta=function(a,b){for(var c=[],d=0,e=0,f=b.split(/\t/g),g=0;g<f.length;g++){var h=f[g].substring(1);switch(f[g].charAt(0)){case "+":try{c[d++]=new diff_match_patch.Diff(DIFF_INSERT,decodeURI(h))}catch(k){throw Error("Illegal escape in diff_fromDelta: "+h);}break;case "-":case "=":var l=parseInt(h,10);if(isNaN(l)||0>l)throw Error("Invalid number in diff_fromDelta: "+h);h=a.substring(e,e+=l);"="==f[g].charAt(0)?c[d++]=new diff_match_patch.Diff(DIFF_EQUAL,h):c[d++]=new diff_match_patch.Diff(DIFF_DELETE,h);break;default:if(f[g])throw Error("Invalid diff operation in diff_fromDelta: "+f[g]);}}if(e!=a.length)throw Error("Delta length ("+e+") does not equal source text length ("+a.length+").");return c};diff_match_patch.prototype.match_main=function(a,b,c){if(null==a||null==b||null==c)throw Error("Null input. (match_main)");c=Math.max(0,Math.min(c,a.length));return a==b?0:a.length?a.substring(c,c+b.length)==b?c:this.match_bitap_(a,b,c):-1};
  diff_match_patch.prototype.match_bitap_=function(a,b,c){function d(a,d){var e=a/b.length,g=Math.abs(c-d);return f.Match_Distance?e+g/f.Match_Distance:g?1:e}if(b.length>this.Match_MaxBits)throw Error("Pattern too long for this browser.");var e=this.match_alphabet_(b),f=this,g=this.Match_Threshold,h=a.indexOf(b,c);-1!=h&&(g=Math.min(d(0,h),g),h=a.lastIndexOf(b,c+b.length),-1!=h&&(g=Math.min(d(0,h),g)));var l=1<<b.length-1;h=-1;for(var k,m,p=b.length+a.length,x,w=0;w<b.length;w++){k=0;for(m=p;k<m;)d(w,c+m)<=g?k=m:p=m,m=Math.floor((p-k)/2+k);p=m;k=Math.max(1,c-m+1);var q=Math.min(c+m,a.length)+b.length;m=Array(q+2);for(m[q+1]=(1<<w)-1;q>=k;q--){var t=e[a.charAt(q-1)];m[q]=0===w?(m[q+1]<<1|1)&t:(m[q+1]<<1|1)&t|(x[q+1]|x[q])<<1|1|x[q+1];if(m[q]&l&&(t=d(w,q-1),t<=g))if(g=t,h=q-1,h>c)k=Math.max(1,2*c-h);else break}if(d(w+1,c)>g)break;x=m}return h};
  diff_match_patch.prototype.match_alphabet_=function(a){for(var b={},c=0;c<a.length;c++)b[a.charAt(c)]=0;for(c=0;c<a.length;c++)b[a.charAt(c)]|=1<<a.length-c-1;return b};
  diff_match_patch.prototype.patch_addContext_=function(a,b){if(0!=b.length){if(null===a.start2)throw Error("patch not initialized");for(var c=b.substring(a.start2,a.start2+a.length1),d=0;b.indexOf(c)!=b.lastIndexOf(c)&&c.length<this.Match_MaxBits-this.Patch_Margin-this.Patch_Margin;)d+=this.Patch_Margin,c=b.substring(a.start2-d,a.start2+a.length1+d);d+=this.Patch_Margin;(c=b.substring(a.start2-d,a.start2))&&a.diffs.unshift(new diff_match_patch.Diff(DIFF_EQUAL,c));(d=b.substring(a.start2+a.length1,a.start2+a.length1+d))&&a.diffs.push(new diff_match_patch.Diff(DIFF_EQUAL,d));a.start1-=c.length;a.start2-=c.length;a.length1+=c.length+d.length;a.length2+=c.length+d.length}};
  diff_match_patch.prototype.patch_make=function(a,b,c){if("string"==typeof a&&"string"==typeof b&&"undefined"==typeof c){var d=a;b=this.diff_main(d,b,!0);2<b.length&&(this.diff_cleanupSemantic(b),this.diff_cleanupEfficiency(b))}else if(a&&"object"==typeof a&&"undefined"==typeof b&&"undefined"==typeof c)b=a,d=this.diff_text1(b);else if("string"==typeof a&&b&&"object"==typeof b&&"undefined"==typeof c)d=a;else if("string"==typeof a&&"string"==typeof b&&c&&"object"==typeof c)d=a,b=c;else throw Error("Unknown call format to patch_make.");if(0===b.length)return[];c=[];a=new diff_match_patch.patch_obj;for(var e=0,f=0,g=0,h=d,l=0;l<b.length;l++){var k=b[l][0],m=b[l][1];e||k===DIFF_EQUAL||(a.start1=f,a.start2=g);switch(k){case DIFF_INSERT:a.diffs[e++]=b[l];a.length2+=m.length;d=d.substring(0,g)+m+d.substring(g);break;case DIFF_DELETE:a.length1+=m.length;a.diffs[e++]=b[l];d=d.substring(0,g)+d.substring(g+m.length);break;case DIFF_EQUAL:m.length<=2*this.Patch_Margin&&e&&b.length!=l+1?(a.diffs[e++]=b[l],a.length1+=m.length,a.length2+=m.length):m.length>=2*this.Patch_Margin&&e&&(this.patch_addContext_(a,h),c.push(a),a=new diff_match_patch.patch_obj,e=0,h=d,f=g)}k!==DIFF_INSERT&&(f+=m.length);k!==DIFF_DELETE&&(g+=m.length)}e&&(this.patch_addContext_(a,h),c.push(a));return c};
  diff_match_patch.prototype.patch_deepCopy=function(a){for(var b=[],c=0;c<a.length;c++){var d=a[c],e=new diff_match_patch.patch_obj;e.diffs=[];for(var f=0;f<d.diffs.length;f++)e.diffs[f]=new diff_match_patch.Diff(d.diffs[f][0],d.diffs[f][1]);e.start1=d.start1;e.start2=d.start2;e.length1=d.length1;e.length2=d.length2;b[c]=e}return b};
  diff_match_patch.prototype.patch_apply=function(a,b){if(0==a.length)return[b,[]];a=this.patch_deepCopy(a);var c=this.patch_addPadding(a);b=c+b+c;this.patch_splitMax(a);for(var d=0,e=[],f=0;f<a.length;f++){var g=a[f].start2+d,h=this.diff_text1(a[f].diffs),l=-1;if(h.length>this.Match_MaxBits){var k=this.match_main(b,h.substring(0,this.Match_MaxBits),g);-1!=k&&(l=this.match_main(b,h.substring(h.length-this.Match_MaxBits),g+h.length-this.Match_MaxBits),-1==l||k>=l)&&(k=-1)}else k=this.match_main(b,h,g);if(-1==k)e[f]=!1,d-=a[f].length2-a[f].length1;else if(e[f]=!0,d=k-g,g=-1==l?b.substring(k,k+h.length):b.substring(k,l+this.Match_MaxBits),h==g)b=b.substring(0,k)+this.diff_text2(a[f].diffs)+b.substring(k+h.length);else if(g=this.diff_main(h,g,!1),h.length>this.Match_MaxBits&&this.diff_levenshtein(g)/h.length>this.Patch_DeleteThreshold)e[f]=!1;else{this.diff_cleanupSemanticLossless(g);h=0;var m;for(l=0;l<a[f].diffs.length;l++){var p=a[f].diffs[l];p[0]!==DIFF_EQUAL&&(m=this.diff_xIndex(g,h));p[0]===DIFF_INSERT?b=b.substring(0,k+m)+p[1]+b.substring(k+m):p[0]===DIFF_DELETE&&(b=b.substring(0,k+m)+b.substring(k+this.diff_xIndex(g,h+p[1].length)));p[0]!==DIFF_DELETE&&(h+=p[1].length)}}}b=b.substring(c.length,b.length-c.length);return[b,e]};
  diff_match_patch.prototype.patch_addPadding=function(a){for(var b=this.Patch_Margin,c="",d=1;d<=b;d++)c+=String.fromCharCode(d);for(d=0;d<a.length;d++)a[d].start1+=b,a[d].start2+=b;d=a[0];var e=d.diffs;if(0==e.length||e[0][0]!=DIFF_EQUAL)e.unshift(new diff_match_patch.Diff(DIFF_EQUAL,c)),d.start1-=b,d.start2-=b,d.length1+=b,d.length2+=b;else if(b>e[0][1].length){var f=b-e[0][1].length;e[0][1]=c.substring(e[0][1].length)+e[0][1];d.start1-=f;d.start2-=f;d.length1+=f;d.length2+=f}d=a[a.length-1];e=d.diffs;0==e.length||e[e.length-1][0]!=DIFF_EQUAL?(e.push(new diff_match_patch.Diff(DIFF_EQUAL,c)),d.length1+=b,d.length2+=b):b>e[e.length-1][1].length&&(f=b-e[e.length-1][1].length,e[e.length-1][1]+=c.substring(0,f),d.length1+=f,d.length2+=f);return c};
  diff_match_patch.prototype.patch_splitMax=function(a){for(var b=this.Match_MaxBits,c=0;c<a.length;c++)if(!(a[c].length1<=b)){var d=a[c];a.splice(c--,1);for(var e=d.start1,f=d.start2,g="";0!==d.diffs.length;){var h=new diff_match_patch.patch_obj,l=!0;h.start1=e-g.length;h.start2=f-g.length;""!==g&&(h.length1=h.length2=g.length,h.diffs.push(new diff_match_patch.Diff(DIFF_EQUAL,g)));for(;0!==d.diffs.length&&h.length1<b-this.Patch_Margin;){g=d.diffs[0][0];var k=d.diffs[0][1];g===DIFF_INSERT?(h.length2+=k.length,f+=k.length,h.diffs.push(d.diffs.shift()),l=!1):g===DIFF_DELETE&&1==h.diffs.length&&h.diffs[0][0]==DIFF_EQUAL&&k.length>2*b?(h.length1+=k.length,e+=k.length,l=!1,h.diffs.push(new diff_match_patch.Diff(g,k)),d.diffs.shift()):(k=k.substring(0,b-h.length1-this.Patch_Margin),h.length1+=k.length,e+=k.length,g===DIFF_EQUAL?(h.length2+=k.length,f+=k.length):l=!1,h.diffs.push(new diff_match_patch.Diff(g,k)),k==d.diffs[0][1]?d.diffs.shift():d.diffs[0][1]=d.diffs[0][1].substring(k.length))}g=this.diff_text2(h.diffs);g=g.substring(g.length-this.Patch_Margin);k=this.diff_text1(d.diffs).substring(0,this.Patch_Margin);""!==k&&(h.length1+=k.length,h.length2+=k.length,0!==h.diffs.length&&h.diffs[h.diffs.length-1][0]===DIFF_EQUAL?h.diffs[h.diffs.length-1][1]+=k:h.diffs.push(new diff_match_patch.Diff(DIFF_EQUAL,k)));l||a.splice(++c,0,h)}}};diff_match_patch.prototype.patch_toText=function(a){for(var b=[],c=0;c<a.length;c++)b[c]=a[c];return b.join("")};
  diff_match_patch.prototype.patch_fromText=function(a){var b=[];if(!a)return b;a=a.split("\n");for(var c=0,d=/^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@$/;c<a.length;){var e=a[c].match(d);if(!e)throw Error("Invalid patch string: "+a[c]);var f=new diff_match_patch.patch_obj;b.push(f);f.start1=parseInt(e[1],10);""===e[2]?(f.start1--,f.length1=1):"0"==e[2]?f.length1=0:(f.start1--,f.length1=parseInt(e[2],10));f.start2=parseInt(e[3],10);""===e[4]?(f.start2--,f.length2=1):"0"==e[4]?f.length2=0:(f.start2--,f.length2=parseInt(e[4],10));for(c++;c<a.length;){e=a[c].charAt(0);try{var g=decodeURI(a[c].substring(1))}catch(h){throw Error("Illegal escape in patch_fromText: "+g);}if("-"==e)f.diffs.push(new diff_match_patch.Diff(DIFF_DELETE,g));else if("+"==e)f.diffs.push(new diff_match_patch.Diff(DIFF_INSERT,g));else if(" "==e)f.diffs.push(new diff_match_patch.Diff(DIFF_EQUAL,g));else if("@"==e)break;else if(""!==e)throw Error('Invalid patch mode "'+e+'" in: '+g);c++}}return b};diff_match_patch.patch_obj=function(){this.diffs=[];this.start2=this.start1=null;this.length2=this.length1=0};diff_match_patch.patch_obj.prototype.toString=function(){for(var a=["@@ -"+(0===this.length1?this.start1+",0":1==this.length1?this.start1+1:this.start1+1+","+this.length1)+" +"+(0===this.length2?this.start2+",0":1==this.length2?this.start2+1:this.start2+1+","+this.length2)+" @@\n"],b,c=0;c<this.diffs.length;c++){switch(this.diffs[c][0]){case DIFF_INSERT:b="+";break;case DIFF_DELETE:b="-";break;case DIFF_EQUAL:b=" "}a[c+1]=b+encodeURI(this.diffs[c][1])+"\n"}return a.join("").replace(/%20/g," ")};this.diff_match_patch=diff_match_patch;this.DIFF_DELETE=DIFF_DELETE;this.DIFF_INSERT=DIFF_INSERT;this.DIFF_EQUAL=DIFF_EQUAL;

var dmp = new diff_match_patch();

  // פונקציית דחיסה — מקבלת טקסט ישן וחדש, מחזירה patch בפורמט טקסט
  function compress_mp(old_str, new_str) {
      var diffs = dmp.diff_main(old_str, new_str);
      dmp.diff_cleanupEfficiency(diffs);
      var patches = dmp.patch_make(old_str, diffs);
      var patch_text = dmp.patch_toText(patches);
      return patch_text;
  }

  // פונקציית פענוח — מקבלת טקסט ישן וה־patch, מחזירה את הטקסט החדש
  function decompress_mp(old_str, data) {
      var patches = dmp.patch_fromText(data);
      var results = dmp.patch_apply(patches, old_str);
      return results[0]; // התוצאה החדשה
  }

  var _zlib = null;
  function getZlib(){
    if (!_zlib && typeof require !== 'undefined'){
      try { _zlib = require('zlib'); }
      catch(e){ _zlib = null; }
    }
    return _zlib;
  }
  function compress_deflate(text, callback){
    // קלט תמיד ל-Uint8Array
    var inputU8 = (text instanceof Uint8Array)
      ? text
      : new TextEncoder().encode(text);

    // --- דפדפן ---
    if (typeof CompressionStream !== 'undefined' && typeof Response !== 'undefined'){
      try {
        var cs = new CompressionStream('deflate');
        // מזרים נכון: Response(body)->pipeThrough(cs)->Response(...)
        var stream = new Response(inputU8).body.pipeThrough(cs);
        new Response(stream).arrayBuffer()
          .then(function(buf){ callback(new Uint8Array(buf)); })
          .catch(function(){ callback(null); });
        return;
      } catch(e) { /* ננסה Node בהמשך */ }
    }

    // --- Node.js ---
    var zlib = (typeof getZlib === 'function') ? getZlib() : null;
    if (zlib && zlib.deflate){
      zlib.deflate(Buffer.from(inputU8), { level: 9 }, function(err, result){
        if (err) callback(null);
        else callback(new Uint8Array(result));
      });
      return;
    }

    callback(null);
  }

  function decompress_deflate(u8, callback){
    // נרמל לכל מקרה ל-Uint8Array
    var input = (u8 instanceof Uint8Array) ? u8
              : (u8 && u8.buffer != null && u8.byteLength != null)
                ? new Uint8Array(u8.buffer, u8.byteOffset || 0, u8.byteLength)
                : new Uint8Array(u8 || 0);

    // --- דפדפן ---
    if (typeof DecompressionStream !== 'undefined' && typeof Response !== 'undefined'){
      try {
        var ds = new DecompressionStream('deflate');
        var stream = new Response(input).body.pipeThrough(ds);
        new Response(stream).arrayBuffer()
          .then(function(buf){ callback(new TextDecoder().decode(buf)); })
          .catch(function(){ callback(null); });
        return;
      } catch(e) { /* ננסה Node בהמשך */ }
    }

    // --- Node.js ---
    var zlib = (typeof getZlib === 'function') ? getZlib() : null;
    if (zlib && zlib.inflate){
      zlib.inflate(Buffer.from(input), function(err, result){
        if (err) callback(null);
        else callback(result.toString('utf8'));
      });
      return;
    }

    callback(null);
  }


  function isTypedArray(x){
    return x && typeof x.byteLength === 'number' && typeof x.BYTES_PER_ELEMENT === 'number' && x.buffer instanceof ArrayBuffer;
  }
  function toU8(x){
    if (x == null) return new Uint8Array(0);
    if (x instanceof Uint8Array) return x;
    if (x instanceof ArrayBuffer) return new Uint8Array(x);
    if (ArrayBuffer.isView(x)) return new Uint8Array(x.buffer, x.byteOffset||0, x.byteLength||0);
    if (typeof x === 'string') return new TextEncoder().encode(x);
    // כל דבר אחר – נהפוך למחרוזת
    return new TextEncoder().encode(String(x));
  }

  function writeU64_LE(dv, offset, val){
    // תומך במספרים עד 2^53-1 (JS safe int). עבור BigInt – הרחב בהתאם.
    var lo = Number(val & 0xFFFFFFFF);
    var hi = Number((val / 0x100000000) >>> 0);
    dv.setUint32(offset, lo >>> 0, true);
    dv.setUint32(offset + 4, hi >>> 0, true);
  }

  var MAX_SAFE_U64 = 9007199254740991n; // 2^53 - 1


  function readU64_LE(dv, offset){
    var lo = dv.getUint32(offset,     true);
    var hi = dv.getUint32(offset + 4, true);
    var big = (BigInt(hi) << 32n) | BigInt(lo);
    // מחזיר Number כשבטוח, אחרת BigInt
    return (big <= MAX_SAFE_U64) ? Number(big) : big;
  }

  function build_structure(arr_format, arr_data){
    var i, fixed_bytes = 0;

    // חישוב אורך חלק קבוע
    for (i = 0; i < arr_format.length; i++){
      var bits = (arr_format[i] >>> 0);
      if (bits !== 8 && bits !== 16 && bits !== 32 && bits !== 64){
        throw new Error('build_structure: unsupported fixed field size: ' + bits);
      }
      fixed_bytes += bits / 8;
    }

    // חישוב אורך חלקים משתנים
    var var_bytes = 0;
    for (i = arr_format.length; i < arr_data.length; i++){
      var_bytes += toU8(arr_data[i]).byteLength;
    }

    var total_bytes = fixed_bytes + var_bytes;
    var out = new Uint8Array(total_bytes);
    var dv  = new DataView(out.buffer);

    var offset = 0;

    // כתיבת השדות הקבועים
    for (i = 0; i < arr_format.length; i++){
      var bits = arr_format[i] >>> 0;
      var val  = (arr_data[i] == null) ? 0 : arr_data[i];

      if (bits === 8){
        dv.setUint8(offset, (val === true) ? 1 : (val === false) ? 0 : ((val >>> 0) & 0xFF));
      } else if (bits === 16){
        dv.setUint16(offset, val >>> 0, true);
      } else if (bits === 32){
        dv.setUint32(offset, val >>> 0, true);
      } else if (bits === 64){
        writeU64_LE(dv, offset, val);
      }
      offset += bits / 8;
    }

    // כתיבת השדות המשתנים (מומר אוטומטית לבייטים)
    for (; i < arr_data.length; i++){
      var u8 = toU8(arr_data[i]);           // מובטח Uint8Array
      var n  = u8.byteLength;               // השתמש תמיד ב-byteLength
      if (n > 0) out.set(u8, offset);
      offset += n;
    }

    return out;
  }

  function read_structure(arr_format, uint8buffer, callback){
    var u8 = isTypedArray(uint8buffer) ? new Uint8Array(uint8buffer) :
            (uint8buffer instanceof ArrayBuffer ? new Uint8Array(uint8buffer) : new Uint8Array(0));
    var dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);

    var arr_result = [];
    var offset = 0;

    // קורא את השדות הקבועים
    for (var i=0; i<arr_format.length; i++){
      var bits = arr_format[i]>>>0;
      var need = bits/8;
      if (offset + need > u8.byteLength){ arr_result.push(null); continue; }

      if (bits === 8){
        arr_result.push(Number(dv.getUint8(offset)));
      } else if (bits === 16){
        arr_result.push(Number(dv.getUint16(offset, true)));
      } else if (bits === 32){
        arr_result.push(Number(dv.getUint32(offset, true)));
      } else if (bits === 64){
        // מחזיר Number כשאפשר, אחרת BigInt
        arr_result.push(readU64_LE(dv, offset));
      } else {
        arr_result.push(null);
      }
      offset += need;
    }

    // הזנב (אם קיים) – מחזירים כ-Uint8Array
    if (offset < u8.byteLength){
      arr_result.push(new Uint8Array(u8.buffer, u8.byteOffset + offset, u8.byteLength - offset));
    } else {
      arr_result.push(new Uint8Array(0));
    }

    while (arr_result.length < arr_format.length) arr_result.push(null);

    if (typeof callback === 'function') return callback.apply(null, arr_result);
    return arr_result;
  }

  // ==== 2) “varint” length-prefixed (u32 LE) או fixed-size ====
  function build_varint(fixed_size_bits, arr_data){
    var fixed_size = (fixed_size_bits && fixed_size_bits>0) ? (fixed_size_bits>>>0)/8 : 0;
    var i;

    if (fixed_size){
      var total = fixed_size * arr_data.length;
      var out = new Uint8Array(total);
      var off = 0;
      for (i=0; i<arr_data.length; i++){
        var u8 = toU8(arr_data[i]); // המרה אוטומטית לטקסט
        var copy = Math.min(u8.length, fixed_size);
        if (copy>0) out.set(u8.subarray(0, copy), off);
        off += fixed_size;
      }
      return out;
    } else {
      var total_bytes = 0;
      var parts = new Array(arr_data.length);
      for (i=0; i<arr_data.length; i++){
        parts[i] = toU8(arr_data[i]);
        total_bytes += 4 + parts[i].length;
      }
      var out = new Uint8Array(total_bytes);
      var dv  = new DataView(out.buffer);
      var off = 0;
      for (i=0; i<parts.length; i++){
        dv.setUint32(off, parts[i].length>>>0, true);
        out.set(parts[i], off+4);
        off += 4 + parts[i].length;
      }
      return out;
    }
  }

  function read_varint(fixed_size_bits, uint8buffer){
    var u8 = isTypedArray(uint8buffer) ? new Uint8Array(uint8buffer) :
            (uint8buffer instanceof ArrayBuffer ? new Uint8Array(uint8buffer) : new Uint8Array(0));
    var out = [];
    if (u8.length === 0) return out;

    var fixed_size = (fixed_size_bits && fixed_size_bits>0) ? (fixed_size_bits>>>0)/8 : 0;

    if (fixed_size){
      var off=0;
      while (off < u8.length){
        var end = Math.min(off + fixed_size, u8.length);
        out.push(u8.subarray(off, end));
        off = end;
      }
      return out;
    } else {
      var dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
      var off=0;
      while (off + 4 <= u8.length){
        var len = dv.getUint32(off, true)>>>0;
        off += 4;
        var end = Math.min(off + len, u8.length);
        out.push(u8.subarray(off, end));
        off = end;
      }
      return out;
    }
  }


  // ===== עזרים קלים =====
  function u8cat(arrs){
    var i, total=0;
    for(i=0;i<arrs.length;i++){ if (arrs[i]) total += arrs[i].length; }
    var out = new Uint8Array(total), off=0;
    for(i=0;i<arrs.length;i++){ if (!arrs[i]) continue; out.set(arrs[i], off); off += arrs[i].length; }
    return out;
  }

  function parseIPv6Word(w){
    var n = parseInt(w||'0',16)>>>0;
    return [(n>>>8)&0xFF, n&0xFF];
  }
  function ipv6ToBytes(str){
    // תומך ב-:: ובמילים חסרות
    var s = str || '';
    var pct = s.indexOf('%'); // הסרת scope-id אם נשאר מהפרסר
    if (pct>=0) s = s.slice(0,pct);
    var parts = s.split('::');
    var head = parts[0] ? parts[0].split(':') : [];
    var tail = parts[1] ? parts[1].split(':') : [];
    var missing = 8 - (head.length + tail.length);
    var bytes = [], i;
    for(i=0;i<head.length;i++){ bytes = bytes.concat(parseIPv6Word(head[i])); }
    for(i=0;i<missing;i++){ bytes.push(0,0); }
    for(i=0;i<tail.length;i++){ bytes = bytes.concat(parseIPv6Word(tail[i])); }
    return new Uint8Array(bytes);
  }
  function ipv4ToBytes(str){
    var p = (str||'').split('.');
    var out = new Uint8Array(4);
    out[0]=p[0]|0; out[1]=p[1]|0; out[2]=p[2]|0; out[3]=p[3]|0;
    return out;
  }
  function ipToBytes(str, family){
    if (family===6) return ipv6ToBytes(str);
    if (family===4) return ipv4ToBytes(str);
    return null;
  }

  // ===== מיפוי מחרוזות לאינומים נומריים (למקרה שהפרסר לא החזיר *Num) =====
  function mapTransportNum(s){ return (s && s.toLowerCase()==='tcp') ? 1 : 0; } // udp=0
  function mapTypeNum(s){
    var a=(s||'').toLowerCase();
    return a==='host'?0 : a==='srflx'?1 : a==='prflx'?2 : 3; // relay=3
  }
  function mapTcpTypeNum(s){
    var a=(s||'').toLowerCase();
    return a==='active'?0 : a==='passive'?1 : 2; // so=2
  }

  function encode_candidate_binary(p, sdpMid, sdpMLineIndex, usernameFragment){
    if (!p) return new Uint8Array(0);

    // --- נרמול ערכים מהפרסר (עם דיפולטים בטוחים) ---
    var component = (p.component_id!=null) ? (p.component_id|0) :
                    (p.component!=null) ? (p.component|0) : 1;

    var trNum = (p.transportNum!=null) ? (p.transportNum|0) : mapTransportNum(p.transport);
    var tyNum = (p.typeNum!=null) ? (p.typeNum|0) :
                (p.candTypeNum!=null) ? (p.candTypeNum|0) : mapTypeNum(p.type||p.candType);

    var priority = (p.priority>>>0) || 0;

    var ipFamily = (p.ipFamily!=null) ? p.ipFamily|0 :
                  (p.isMdns ? 0 : ((p.ip&&p.ip.indexOf(':')>=0)?6:4));
    var isAddrString = (ipFamily===0) ? 1 : 0; // mDNS / כתובת שאינה IP

    var port = (p.port>>>0) || 0;

    var hasRel = !!p.hasRel;
    var relIsString = (hasRel && p.relIsMdns) ? 1 : 0;
    var relFamily = (p.relIpFamily|0) || 0;
    var relPort = hasRel ? ((p.relPort>>>0)||0) : 0;

    var hasTcpType = !!p.hasTcpType;
    var tcpType = hasTcpType ? ((p.tcpType!=null)?(p.tcpType|0):mapTcpTypeNum(p.tcpTypeStr)) : 0;

    var hasGen = (p.generation!=null);
    var generation = hasGen ? (p.generation|0) : 0;

    var hasNetCost = (p.networkCost!=null);
    var netCost = hasNetCost ? (p.networkCost>>>0) : 0;

    var foundationIsNumber = !!p.foundationIsNumeric;
    var foundationU32 = foundationIsNumber ? (p.foundationU32>>>0) : 0;
    var foundationStr = foundationIsNumber ? null : (p.foundation||'');

    var mline = (sdpMLineIndex==null) ? (p.mlineIndex|0) : (sdpMLineIndex|0);
    if (!(mline>=0 && mline<=255)) mline = 0;

    var midStr = (sdpMid!=null) ? (''+sdpMid) : (p.sdpMid!=null?(''+p.sdpMid):'');
    var ufragStr = (usernameFragment!=null) ? (''+usernameFragment) :
                  (p.ufrag!=null?(''+p.ufrag):'');

    // --- דגלים (2 בתים header) ---
    // byte0:
    // bits 0..1 = transport (0 udp,1 tcp)
    // bits 2..3 = type (0 host,1 srflx,2 prflx,3 relay)
    // bit    4  = isIPv6
    // bit    5  = hasRel
    // bit    6  = addrIsString (mDNS/לא-IP)
    // bit    7  = relIsString  (כשיש rel)
    var header0 =
      ((trNum & 0x03)) |
      ((tyNum & 0x03) << 2) |
      (((ipFamily===6)?1:0) << 4) |
      ((hasRel?1:0) << 5) |
      ((isAddrString?1:0) << 6) |
      (((hasRel&&relIsString)?1:0) << 7);

    // byte1:
    // bit 0 = hasGen
    // bit 1 = hasNetCost
    // bit 2 = hasTcpType
    // bit 3 = foundationIsNumber
    // bit 4 = hasMid (שליחת sdpMid כמחרוזת)
    // bit 5 = hasUfrag
    // bits 6..7 reserved
    var hasMid = (midStr && midStr.length>0) ? 1 : 0;
    var hasUfrag = (ufragStr && ufragStr.length>0) ? 1 : 0;

    var header1 =
      ((hasGen?1:0)) |
      ((hasNetCost?1:0) << 1) |
      ((hasTcpType?1:0) << 2) |
      ((foundationIsNumber?1:0) << 3) |
      ((hasMid?1:0) << 4) |
      ((hasUfrag?1:0) << 5);

    var headers = build_structure([8,8],[header0, header1]);

    // --- ליבה קבועה ---
    // מבנה: component(8), mline(8), priority(32), port(16)
    // אופציונלי: tcpType(8), generation(8), netCost(16), foundationU32(32)
    var fmt = [8,8,32,16];
    var vals = [(component&0xFF), (mline&0xFF), (priority>>>0), (port>>>0)];

    if (hasTcpType){ fmt.push(8);  vals.push(tcpType&0xFF); }
    if (hasGen){     fmt.push(8);  vals.push(generation&0xFF); }
    if (hasNetCost){ fmt.push(16); vals.push(netCost&0xFFFF); }
    if (foundationIsNumber){ fmt.push(32); vals.push(foundationU32>>>0); }

    var fixedCore = build_structure(fmt, vals);

    // --- חלקי IP בינאריים (אם אינם מחרוזת) + relPort ---
    var binParts = [];

    // כתובת עיקרית
    if (!isAddrString){
      var ipBytes = ipToBytes(p.ip, ipFamily);
      if (ipBytes) binParts.push(ipBytes);
    }

    // related
    if (hasRel){
      if (!relIsString){
        var relBytes = ipToBytes(p.relIp, relFamily);
        if (relBytes) binParts.push(relBytes);
      }
      // rport תמיד יישלח (גם אם relIsString), כדי לשמור על עקביות
      var rportU8 = new Uint8Array(2);
      new DataView(rportU8.buffer).setUint16(0, relPort>>>0, true);
      binParts.push(rportU8);
    }

    // --- חלקים משתנים כ-blob אחד עם build_varint (Uint32 length + bytes כל פריט) ---
    // נשדר רק מה שצריך לפי דגלים:
    var varList = [];
    if (!foundationIsNumber) varList.push(foundationStr||'');
    if (isAddrString)        varList.push(p.ip||'');            // mDNS/לא-IP
    if (hasRel && relIsString) varList.push(p.relIp||'');       // mDNS/לא-IP ל-rel
    if (hasMid)              varList.push(midStr||'');
    if (hasUfrag)            varList.push(ufragStr||'');

    var stringsBlob = (varList.length>0) ? build_varint(0, varList) : new Uint8Array(0);

    // --- סגירה ---
    return u8cat([headers, fixedCore].concat(binParts).concat([stringsBlob]));
  }

  function decode_candidate_binary(u8){
    if (!u8 || u8.length < 2) return null;
    u8 = isTypedArray(u8) ? new Uint8Array(u8) :
        (u8 instanceof ArrayBuffer ? new Uint8Array(u8) : new Uint8Array(0));

    // --- קריאת headers ---
    var headers = read_structure([8,8], u8);
    var header0 = headers[0]|0;
    var header1 = headers[1]|0;
    var rest    = headers[2]; // שאר המערך (הזנב)

    // פענוח דגלים
    var transportNum =  header0       & 0x03;
    var candTypeNum  = (header0 >> 2) & 0x03;
    var isIPv6       = (header0 >> 4) & 0x01;
    var hasRel       = (header0 >> 5) & 0x01;
    var addrIsString = (header0 >> 6) & 0x01;
    var relIsString  = (header0 >> 7) & 0x01;

    var hasGen       =  header1       & 0x01;
    var hasNetCost   = (header1 >> 1) & 0x01;
    var hasTcpType   = (header1 >> 2) & 0x01;
    var foundationIsNumber = (header1 >> 3) & 0x01;
    var hasMid       = (header1 >> 4) & 0x01;
    var hasUfrag     = (header1 >> 5) & 0x01;

    // --- fixed core ---
    var fmt = [8,8,32,16]; // component, mline, priority, port
    if (hasTcpType) fmt.push(8);
    if (hasGen)     fmt.push(8);
    if (hasNetCost) fmt.push(16);
    if (foundationIsNumber) fmt.push(32);

    var fixed = read_structure(fmt, rest);
    var component = fixed[0]|0;
    var mline     = fixed[1]|0;
    var priority  = fixed[2]>>>0;
    var port      = fixed[3]>>>0;

    var idx=4;
    var tcpType=0, generation=null, netCost=null, foundationU32=null;
    if (hasTcpType){ tcpType = fixed[idx++]|0; }
    if (hasGen){     generation = fixed[idx++]|0; }
    if (hasNetCost){ netCost = fixed[idx++]>>>0; }
    if (foundationIsNumber){ foundationU32 = fixed[idx++]>>>0; }

    var tail = fixed[fmt.length]; // ההמשך (IP bytes + varint strings)

    var off=0;
    var ip=null, relIp=null, relPort=0;
    if (!addrIsString){
      var ipLen = isIPv6?16:4;
      ip = new Uint8Array(tail.buffer, tail.byteOffset+off, ipLen);
      off += ipLen;
    }
    if (hasRel){
      if (!relIsString){
        var relLen = isIPv6?16:4; // NOTE: כאן מניחים ש־rel באותה משפחה; אפשר להוסיף דגל נפרד אם תרצה
        relIp = new Uint8Array(tail.buffer, tail.byteOffset+off, relLen);
        off += relLen;
      }
      relPort = new DataView(tail.buffer, tail.byteOffset+off, 2).getUint16(0,true);
      off += 2;
    }
    var stringsBlob = new Uint8Array(tail.buffer, tail.byteOffset+off, tail.byteLength-off);

    // --- קריאת המחרוזות (foundation/string-ip/mid/ufrag...) ---
    var strParts = read_varint(0, stringsBlob).map(function(u){ return String.fromCharCode.apply(null, u); });

    var strIdx=0;
    var foundation = null;
    if (!foundationIsNumber){ foundation = strParts[strIdx++]||null; }
    if (addrIsString){ ip = strParts[strIdx++]||null; }
    if (hasRel && relIsString){ relIp = strParts[strIdx++]||null; }
    var midStr = hasMid ? (strParts[strIdx++]||null) : null;
    var ufragStr = hasUfrag ? (strParts[strIdx++]||null) : null;

    // --- נבנה חזרה לאובייקט קריא ---
    // מיפוי enums
    var transport = (transportNum===1)?'tcp':'udp';
    var typeStr = ['host','srflx','prflx','relay'][candTypeNum] || 'host';
    var tcpTypeStr = hasTcpType ? (tcpType===0?'active':tcpType===1?'passive':'so') : null;

    // IP להציג כטקסט אם זה לא mDNS
    function bytesToIp(u8){
      if (!u8) return null;
      if (u8.length===4) return u8[0]+"."+u8[1]+"."+u8[2]+"."+u8[3];
      if (u8.length===16){
        var out=[];
        for(var i=0;i<16;i+=2){
          var word=(u8[i]<<8)|u8[i+1];
          out.push(word.toString(16));
        }
        return out.join(':').replace(/(:0)+:/,'::'); // פשטני, מספיק להצגה
      }
      return null;
    }

    var ipStr = (addrIsString?ip:bytesToIp(ip)) || null;
    var relIpStr = (!hasRel)?null : (relIsString?relIp:bytesToIp(relIp));

    return {
      foundation: foundationIsNumber?(""+foundationU32):foundation,
      foundationU32: foundationU32,
      component_id: component,
      transport: transport,
      transportNum: transportNum,
      priority: priority,
      address: ipStr,
      port: port,
      type: typeStr,
      typeNum: candTypeNum,
      relatedAddress: relIpStr,
      relatedPort: relPort,
      tcptype: tcpTypeStr,
      generation: generation,
      network_cost: netCost,
      sdpMid: midStr,
      sdpMLineIndex: mline,
      ufrag: ufragStr
    };
  }

  function stringify_candidate_line(dec){
  var foundation = (dec.foundation != null) ? String(dec.foundation) : '0';
  var component  = (dec.component_id != null) ? (dec.component_id|0) : 1;
  var transport  = (dec.transport || 'udp').toUpperCase(); // "UDP"/"TCP"
  var priority   = (dec.priority>>>0) || 0;
  var address    = dec.address || '0.0.0.0';
  var port       = (dec.port>>>0) || 0;
  var type       = (dec.type || 'host').toLowerCase();

  var parts = [
    'candidate:' + foundation,
    String(component),
    transport,
    String(priority),
    address,
    String(port),
    'typ',
    type
  ];

  // --- תיקון: ל-srflx חובה raddr/rport גם אם אין לנו ערך אמיתי ---
  if (type === 'srflx'){
    var raddr = dec.relatedAddress || '0.0.0.0';
    var rport = (dec.relatedPort != null) ? (dec.relatedPort>>>0) : 0;
    parts.push('raddr', raddr, 'rport', String(rport));
  } else {
    // לשאר הסוגים: נצרף רק אם יש
    if (dec.relatedAddress && dec.relatedPort != null){
      parts.push('raddr', dec.relatedAddress, 'rport', String(dec.relatedPort>>>0));
    }
  }

  if (transport === 'TCP' && dec.tcptype){
    parts.push('tcptype', dec.tcptype);
  }
  if (dec.generation != null){
    parts.push('generation', String(dec.generation|0));
  }
  if (dec.network_id != null){
    parts.push('network-id', String(dec.network_id|0));
  }
  if (dec.network_cost != null){
    parts.push('network-cost', String(dec.network_cost>>>0));
  }
  return parts.join(' ');
}

  // בונה אובייקט RTCIceCandidateInit מלא לשימוש ישיר ב-addIceCandidate
  function to_RTCIceCandidateInit_from_decoded(dec){
    if (!dec) return null;

    var candidateLine = stringify_candidate_line(dec);

    // שמות מטא: sdpMid / sdpMLineIndex / usernameFragment
    // decode_candidate_binary כבר החזיר אם היו משודרים; אחרת תשלים בעצמך מבחוץ אם צריך
    var out = {
      candidate: candidateLine,
      sdpMid: (dec.sdpMid != null) ? String(dec.sdpMid) : null,
      sdpMLineIndex: (dec.sdpMLineIndex != null) ? (dec.sdpMLineIndex|0) : 0,
      usernameFragment: dec.ufrag || null
    };

    // ניקוי שדות null לפי רצונך (לא חובה; addIceCandidate מסתדר גם עם null/undefined)
    // אפשר להשאיר ככה.

    return out;
}

  function murmurhash3_str(text) {
    var key = String(text);
    var remainder = key.length & 3; // % 4
    var bytes = key.length - remainder;
    var h1 = 0;               // seed=0
    var c1 = 0xcc9e2d51;
    var c2 = 0x1b873593;
    var i = 0, k1 = 0;

    while (i < bytes) {
      k1 = (key.charCodeAt(i) & 0xff) |
          ((key.charCodeAt(++i) & 0xff) << 8) |
          ((key.charCodeAt(++i) & 0xff) << 16) |
          ((key.charCodeAt(++i) & 0xff) << 24);
      ++i;

      k1 = (((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = (((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;

      h1 ^= k1;
      h1 = (h1 << 13) | (h1 >>> 19);
      var h1b = (((h1 & 0xffff) * 5) + ((((h1 >>> 16) * 5) & 0xffff) << 16)) & 0xffffffff;
      h1 = (((h1b & 0xffff) + 0x6b64) + ((((h1b >>> 16) + 0xe654) & 0xffff) << 16));
    }

    k1 = 0;
    if (remainder === 3) {
      k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
    }
    if (remainder >= 2) {
      k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
    }
    if (remainder >= 1) {
      k1 ^= (key.charCodeAt(i) & 0xff);
      k1 = (((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = (((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;
      h1 ^= k1;
    }

    h1 ^= key.length;

    // fmix32
    h1 ^= h1 >>> 16;
    h1 = (((h1 & 0xffff) * 0x85ebca6b) + ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16)) & 0xffffffff;
    h1 ^= h1 >>> 13;
    h1 = (((h1 & 0xffff) * 0xc2b2ae35) + ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16)) & 0xffffffff;
    h1 ^= h1 >>> 16;

    return h1 >>> 0; // הופך ל-unsigned (0..4294967295)
  }

  function murmurhash3_data(key) {
    var remainder = key.length & 3; // % 4
    var bytes = key.length - remainder;
    var h1 = 0;               // seed=0
    var c1 = 0xcc9e2d51;
    var c2 = 0x1b873593;
    var i = 0, k1 = 0;

    while (i < bytes) {
      k1 = (key[i] & 0xff) |
          ((key[++i] & 0xff) << 8) |
          ((key[++i] & 0xff) << 16) |
          ((key[++i] & 0xff) << 24);
      ++i;

      k1 = (((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = (((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;

      h1 ^= k1;
      h1 = (h1 << 13) | (h1 >>> 19);
      var h1b = (((h1 & 0xffff) * 5) + ((((h1 >>> 16) * 5) & 0xffff) << 16)) & 0xffffffff;
      h1 = (((h1b & 0xffff) + 0x6b64) + ((((h1b >>> 16) + 0xe654) & 0xffff) << 16));
    }

    k1 = 0;
    if (remainder === 3) {
      k1 ^= (key[i + 2] & 0xff) << 16;
    }
    if (remainder >= 2) {
      k1 ^= (key[i + 1] & 0xff) << 8;
    }
    if (remainder >= 1) {
      k1 ^= (key[i] & 0xff);
      k1 = (((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = (((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;
      h1 ^= k1;
    }

    h1 ^= key.length;

    // fmix32
    h1 ^= h1 >>> 16;
    h1 = (((h1 & 0xffff) * 0x85ebca6b) + ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16)) & 0xffffffff;
    h1 ^= h1 >>> 13;
    h1 = (((h1 & 0xffff) * 0xc2b2ae35) + ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16)) & 0xffffffff;
    h1 ^= h1 >>> 16;

    return h1 >>> 0; // unsigned 32bit
  }




  // --------- Emitter פשוט ----------
  function Emitter(){
    var listeners = {};
    return {
      on: function(name, fn){ (listeners[name] = listeners[name] || []).push(fn); },
      emit: function(name){
        var args = Array.prototype.slice.call(arguments, 1);
        var arr = listeners[name] || [];
        for (var i=0;i<arr.length;i++){ try{ arr[i].apply(null, args); }catch(e){} }
      }
    };
  }


  function isMediaStream(x) {
    try {
      if (typeof MediaStream !== "undefined" && x instanceof MediaStream) {
        return true;
      }
    } catch (e) {}
    return !!x && typeof x.getTracks === "function";
  }

  function isMediaStreamTrack(x) {
    try {
      if (typeof MediaStreamTrack !== "undefined" && x instanceof MediaStreamTrack) {
        return true;
      }
    } catch (e) {}
    return !!x && typeof x.stop === "function" && typeof x.kind === "string";
  }

  function isTrackEqual(a, b) {
    if (!a && !b) return true;
    if (!a || !b) return false;
    if (a === b) return true;

    var aHasId = (typeof a.id === 'string' && a.id.trim() !== '');
    var bHasId = (typeof b.id === 'string' && b.id.trim() !== '');

    if (aHasId && bHasId && a.id === b.id) {
      return true;
    }

    return false;
  }


  function is_ipv6_addr(addr) { return addr && addr.indexOf(':') !== -1; }

  function strip_brackets(a) {
    if (!a) return a;
    if (a.charAt(0) === '[' && a.charAt(a.length - 1) === ']') return a.substring(1, a.length - 1);
    return a;
  }

  function is_private_ipv4(a) {
    var parts = a.split('.');
    if (parts.length !== 4) return true;
    var p0 = Number(parts[0]), p1 = Number(parts[1]);
    if (p0 === 10) return true;
    if (p0 === 172 && p1 >= 16 && p1 <= 31) return true;
    if (p0 === 192 && p1 === 168) return true;
    if (p0 === 169 && p1 === 254) return true; // link-local
    return false;
  }

  function is_private_ipv6(a) {
    a = a.toLowerCase();
    if (a.indexOf('::1') === 0) return true;
    if (a.indexOf('fe80:') === 0) return true; // link-local
    if (a.indexOf('fc00:') === 0 || a.indexOf('fd00:') === 0) return true; // unique-local
    return false;
  }

  function is_ip(a) {
    if (!a || a === '0.0.0.0' || a === '::' || a === '[::]' || a === '::1' || a === '[::1]') return false;
    if (a.indexOf('.local') !== -1) return false;
    return true;
  }

  function is_public_ip(a) {
    if (!is_ip(a)) return false;
    var v6 = is_ipv6_addr(a);
    a = strip_brackets(a);
    if (v6) return !is_private_ipv6(a);
    return !is_private_ipv4(a);
  }


  function get_kind_from_sdp_by_mid(sdp, mid) {
    if (!sdp || !mid) return null;

    var lines = sdp.split(/\r?\n/);
    var inSection = false;
    var currentKind = null;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();

      if (line.startsWith('m=')) {
        // שורת m= מתחילה מקטע חדש, שומרים kind
        var parts = line.split(' ');
        currentKind = parts[0].substring(2); // "video" או "audio"
        inSection = false; // עדיין לא יודעים אם זה הסקשן שלנו
      }
      if (line.startsWith('a=mid:')) {
        var thisMid = line.substring(6);
        if (thisMid === mid) {
          // מצאנו סקשן של ה-mid המבוקש
          return currentKind;
        }
      }
    }
    return null;
  }


  function is_support_trickle_ice(sdp) {
    if (!sdp) return false;
    // תופס כל שורה של a=ice-options ומחלץ את הטקסט עד סוף השורה
    var m = sdp.match(/^a=ice-options:(.*)$/m);
    if (m && m[1].indexOf('trickle') >= 0) {
        return true;
    }
    return false;
  }

  function get_fingerprint_from_sdp(sdp_str){
    var fingerprint_bytes=null;
    var match = sdp_str.match(/a=fingerprint:(\S+)\s+([0-9A-Fa-f:]+)/);
    if(match && match.length>=2){
      var fingerprint_str=match[2];
      fingerprint_bytes=Uint8Array.from(fingerprint_str.trim().split(':').map(hex => parseInt(hex, 16)));

      var parts = fingerprint_str.trim().split(':');
      fingerprint_bytes = new Uint8Array(parts.length);
      
      for (var i = 0; i < parts.length; i++) {
        fingerprint_bytes[i] = parseInt(parts[i], 16);
      }
    }
    return fingerprint_bytes;
  }

  function get_ufrag_from_sdp(sdp){
    try {
      if(sdp){
        var s = typeof sdp=='object' && 'sdp' in sdp ? sdp.sdp : sdp;
        var m = s.match(/^a=ice-ufrag:(.+)$/m);
        return m ? m[1] : null;
      }else{
        return null;
      }
      
    } catch(e){
      return null; 
    }
  }

  
  function parse_candidate(candidateString) {
    if (!candidateString || typeof candidateString !== 'string') return null;

    var s = candidateString.trim();
    // guard: end-of-candidates / ריקים
    if (s === '' || /^\s*a=?end-of-candidates\s*$/i.test(s)) return null;

    // הסר קידומות שכיחות
    if (s.indexOf('a=') === 0) s = s.substring(2);
    if (s.indexOf('candidate:') === 0) s = s.substring(10);

    // חייבים לפחות עד "typ type"
    var parts = s.split(/\s+/);
    if (parts.length < 8) return null;

    // --- helpers ---
    function toInt(x){ var n = parseInt(x,10); return isNaN(n) ? null : (n|0); }
    function toU32(x){ var n = parseInt(x,10); return isNaN(n) ? 0 : (n>>>0); }
    function strip_brackets(a){
      if (!a) return a;
      if (a.charAt(0)==='[' && a.charAt(a.length-1)===']') return a.slice(1,-1);
      return a;
    }
    function strip_scope(a){
      if (!a) return a;
      var k = a.indexOf('%');        // IPv6 scope-id, e.g. fe80::1%eth0
      return (k>=0) ? a.slice(0,k) : a;
    }
    function isMdns(a){ return !!(a && /\.local$/i.test(a)); }

    // --- fixed layout: 6 טוקנים ראשונים + "typ type" ---
    var foundation   = parts[0];
    var component_id = toInt(parts[1]);
    var transport    = (parts[2]||'').toLowerCase();   // 'udp'/'tcp'/אחר
    var priority     = toU32(parts[3]);
    var address      = parts[4];
    var port         = toU32(parts[5]);

    if ((parts[6]||'').toLowerCase() !== 'typ') return null;
    var type         = (parts[7]||'').toLowerCase();

    // --- optionals as key/value (סדר גמיש) ---
    var relatedAddress=null, relatedPort=null, tcptype=null, generation=null;
    var ufrag=null, network_id=null, network_cost=null;

    var extras = {}; // לא נזרוק הרחבות לא מוכרות

    var i;
    for (i=8; i<parts.length; i++){
      var key = (parts[i]||'').toLowerCase();
      if (i+1 >= parts.length) break; // אין value אחריו

      if (key==='raddr'){ relatedAddress = parts[++i]; continue; }
      if (key==='rport'){ relatedPort    = toU32(parts[++i]); continue; }
      if (key==='tcptype'){ tcptype      = (parts[++i]||'').toLowerCase(); continue; }
      if (key==='generation'){ generation= toInt(parts[++i]); continue; }
      if (key==='ufrag'){ ufrag          = parts[++i]; continue; }
      if (key==='network-id'){ network_id= toInt(parts[++i]); continue; }
      if (key==='network-cost'){ network_cost = toU32(parts[++i]); continue; }
      if (key==='typ'){ // כבר טופל, אבל אם מופיע שוב — קרא ונמשיך
        type = (parts[++i]||'').toLowerCase();
        continue;
      }

      // לא מוכר? נקלוט ל-extras כזוג key/value
      var val = parts[i+1];
      if (val != null) { extras[key] = val; i++; }
    }

    // --- normalization: IPv6 brackets / scope-id; mDNS ---
    address = strip_brackets(address);
    if (relatedAddress) relatedAddress = strip_brackets(relatedAddress);
    address = strip_scope(address);
    if (relatedAddress) relatedAddress = strip_scope(relatedAddress);

    var addrIsMdns = isMdns(address);
    var relIsMdns  = relatedAddress ? isMdns(relatedAddress) : false;

    var ipFamily   = addrIsMdns ? 0 : (address && address.indexOf(':')>=0 ? 6 : 4);
    var relFamily  = (relatedAddress && !relIsMdns) ? (relatedAddress.indexOf(':')>=0 ? 6 : 4) : 0;

    // --- enums למסייע לקידוד בינארי ---
    var transportNum = (transport==='tcp') ? 1 : 0; // udp=0, tcp=1
    var candTypeNum  = (type==='host')?0 : (type==='srflx')?1 : (type==='prflx')?2 : 3; // relay=3
    var tcpTypeNum   = null;
    if (transportNum===1 && tcptype!=null){
      tcpTypeNum = (tcptype==='active')?0 : (tcptype==='passive')?1 : 2; // so=2
    }

    // raddr/rport “ריקים” → אין rel
    var hasRel = !!(relatedAddress && !relIsMdns && relatedAddress!=='0.0.0.0' && relatedPort && relatedPort!==0);

    // foundation numeric hint (לחיסכון בעת קידוד)
    var foundationIsNumeric = (/^\d+$/.test(foundation));
    var foundationU32 = foundationIsNumeric ? (parseInt(foundation,10)>>>0) : null;

    // בניית האובייקט הסופי
    var obj = {
      // בסיס
      foundation: foundation,
      foundationIsNumeric: foundationIsNumeric,
      foundationU32: foundationU32,

      component: (component_id==null?1:(component_id|0)),
      transport: transport,
      transportNum: transportNum,
      priority: priority>>>0,

      ip: address,
      ipFamily: ipFamily,      // 0=mdns/string, 4, 6
      isMdns: addrIsMdns,
      port: port>>>0,

      // סוג
      type: type,
      typeNum: candTypeNum,

      // related (raddr/rport)
      hasRel: hasRel,
      relIp: hasRel ? relatedAddress : null,
      relIpFamily: hasRel ? relFamily : 0,
      relIsMdns: hasRel ? relIsMdns : false,
      relPort: hasRel ? (relatedPort>>>0) : 0,

      // TCP
      hasTcpType: (tcpTypeNum!=null),
      tcpType: (tcpTypeNum==null?null:(tcpTypeNum|0)), // 0 active,1 passive,2 so
      tcpTypeStr: tcptype,

      // נוספים
      generation: (generation==null?null:(generation|0)),
      networkId: (network_id==null?null:(network_id|0)),
      networkCost: (network_cost==null?null:(network_cost>>>0)),
      ufrag: ufrag || null,

      // תאימות לשמות קודמים
      localIP: address,
      localPort: port>>>0,
      remoteIP: hasRel ? relatedAddress : null,
      remotePort: hasRel ? (relatedPort>>>0) : null,

      // הרחבות נוספות לא מוכרות (key->value)
      extras: extras
    };

    return obj;
  }


  function remove_all_ice_candidates(sdp) {
    // Split the SDP by line breaks
    var sdpLines = sdp.split('\r\n');
    var filteredSdpLines = sdpLines.filter(line => !line.startsWith('a=candidate'));
    var filteredSdp = filteredSdpLines.join('\r\n');
    return filteredSdp;
  }

  
  // מצבים: "idle" | "generating" | "ready" | "failed"
  var cert_wrtc_state = "idle";
  var cert_wrtc_obj = null;
  var cert_wrtc_waiters = [];   // מערך של callbacks (err, cert)
  var cert_wrtc_expires_at = 0; // millis (Date.now())

  function cert_wrtc_is_valid(){
    if (!cert_wrtc_obj) return false;
    var exp = (typeof cert_wrtc_obj.expires === "number") ? cert_wrtc_obj.expires : cert_wrtc_expires_at;
    if (!exp) return true; // אם אין לנו תאריך תפוגה — נתייחס כתקף
    var safetyMs = 60 * 1000; // שוליים של דקה
    return (Date.now() + safetyMs) < exp;
  }

  function cert_wrtc_flush_waiters(err, cert){
    for (var i=0;i<cert_wrtc_waiters.length;i++){
      try { cert_wrtc_waiters[i](err, cert); } catch (e) { /* לא עוצר אחרים */ }
    }
    cert_wrtc_waiters.length = 0;
  }

  function cert_wrtc_start_generate(){
    cert_wrtc_state = "generating";

    // ברירת מחדל מהירה ונפוצה
    var genParams = { name: "ECDSA", namedCurve: "P-256" };

    var p;
    try {
      p = RTCPeerConnection.generateCertificate(genParams);
    } catch (e){
      cert_wrtc_state = "failed";
      cert_wrtc_flush_waiters(e, null);
      return;
    }

    p.then(function(cert){
      cert_wrtc_obj = cert;
      // אם לדפדפן יש expires — נשתמש בו; אחרת נשאיר 0 (לא ידוע)
      cert_wrtc_expires_at = (typeof cert.expires === "number") ? (cert.expires|0) : 0;
      cert_wrtc_state = "ready";
      cert_wrtc_flush_waiters(null, cert);
    }, function(err){
      cert_wrtc_state = "failed";
      cert_wrtc_flush_waiters(err, null);
    });
  }

  // API ראשי: מחזיר תעודה משותפת (callback(err, cert))
  function cert_wrtc_acquire_shared_certificate(callback){
    if (!callback) callback = function(){};

    if (cert_wrtc_state === "ready" && cert_wrtc_is_valid()){
      callback(null, cert_wrtc_obj);
      return;
    }
    
    cert_wrtc_waiters.push(callback);

    if (cert_wrtc_state === "generating"){
      return;
    }

    cert_wrtc_start_generate();
  }



  function StableWebRTC(opts){
    if (!(this instanceof StableWebRTC)) return new StableWebRTC(opts);


    opts = opts || {};


    if (opts.wrtc && typeof opts.wrtc === 'object') {
      var wrtc = opts.wrtc;

      if (typeof wrtc.MediaStream !== 'undefined' && typeof global.MediaStream === 'undefined') {
        global.MediaStream = wrtc.MediaStream;
      }
      if (typeof wrtc.MediaStreamTrack !== 'undefined' && typeof global.MediaStreamTrack === 'undefined') {
        global.MediaStreamTrack = wrtc.MediaStreamTrack;
      }
      if (typeof wrtc.RTCDataChannel !== 'undefined' && typeof global.RTCDataChannel === 'undefined') {
        global.RTCDataChannel = wrtc.RTCDataChannel;
      }
      if (typeof wrtc.RTCDataChannelEvent !== 'undefined' && typeof global.RTCDataChannelEvent === 'undefined') {
        global.RTCDataChannelEvent = wrtc.RTCDataChannelEvent;
      }
      if (typeof wrtc.RTCDtlsTransport !== 'undefined' && typeof global.RTCDtlsTransport === 'undefined') {
        global.RTCDtlsTransport = wrtc.RTCDtlsTransport;
      }
      if (typeof wrtc.RTCIceCandidate !== 'undefined' && typeof global.RTCIceCandidate === 'undefined') {
        global.RTCIceCandidate = wrtc.RTCIceCandidate;
      }
      if (typeof wrtc.RTCIceTransport !== 'undefined' && typeof global.RTCIceTransport === 'undefined') {
        global.RTCIceTransport = wrtc.RTCIceTransport;
      }
      if (typeof wrtc.RTCPeerConnection !== 'undefined' && typeof global.RTCPeerConnection === 'undefined') {
        global.RTCPeerConnection = wrtc.RTCPeerConnection;
      }
      if (typeof wrtc.RTCPeerConnectionIceEvent !== 'undefined' && typeof global.RTCPeerConnectionIceEvent === 'undefined') {
        global.RTCPeerConnectionIceEvent = wrtc.RTCPeerConnectionIceEvent;
      }
      if (typeof wrtc.RTCRtpReceiver !== 'undefined' && typeof global.RTCRtpReceiver === 'undefined') {
        global.RTCRtpReceiver = wrtc.RTCRtpReceiver;
      }
      if (typeof wrtc.RTCRtpSender !== 'undefined' && typeof global.RTCRtpSender === 'undefined') {
        global.RTCRtpSender = wrtc.RTCRtpSender;
      }
      if (typeof wrtc.RTCRtpTransceiver !== 'undefined' && typeof global.RTCRtpTransceiver === 'undefined') {
        global.RTCRtpTransceiver = wrtc.RTCRtpTransceiver;
      }
      if (typeof wrtc.RTCSctpTransport !== 'undefined' && typeof global.RTCSctpTransport === 'undefined') {
        global.RTCSctpTransport = wrtc.RTCSctpTransport;
      }
      if (typeof wrtc.RTCSessionDescription !== 'undefined' && typeof global.RTCSessionDescription === 'undefined') {
        global.RTCSessionDescription = wrtc.RTCSessionDescription;
      }
    }

    


    var ev = Emitter();
    
    

    var connection={
      create_time: Date.now(),

      pc_config: {},
      pc: null,

      local_public_ipv4: [],
      local_public_ipv6: [],

      local_relay_ipv4: [],
      local_relay_ipv6: [],

      local_support_udp: null,
      local_support_tcp: null,

      local_nat_type: 'unknown',
      
      local_support_trickle_ice: null,
      remote_support_trickle_ice: null,


      current_local_protocol: null,
      current_remote_protocol: null,
      current_local_relay: null,
      current_remote_relay: null,
      current_local_ip: null,
      current_remote_ip: null,
      current_local_port: null,
      current_remote_port: null,
      current_rtt: null,

      signaling_state: 'new',
      
      signaling_channel_state: 'new',

      negotiation_state: 0,
      //0 — STABLE
      //1 — MAKING_LOCAL_OFFER
      //2 — WAITING_FOR_ANSWER
      //3 — APPLYING_REMOTE_ANSWER
      //4 — HANDLING_REMOTE_OFFER

      create_offer_timer: null,

      auth_verified: false,

      local_nonce: Math.floor(Math.random() * 0x10000),
      remote_nonce: 0,

      create_data_channel_timer: null,

      list_data_channels: [],

      list_remote_candidates: {},
      list_gathered_local_candidates: {},
      remote_fingerprint: null,
      local_fingerprint: null,
      
      getstats_running: false,
      getstats_timer: null,

      last_local_ufrag: null,
      last_remote_ufrag: null,

      need_ice_restart: false,
      wait_for_answer_timeout_timer: null,
      negotiation_done_timeout_timer: null,
      
      making_rollback: false,

      pending_remote_offer_sdp: null,
      sent_local_offer_sdp: null,
      sent_local_answer_sdp: null,

      base_offer_sdp: null,

      local_offer_history: [],
      seq_remote_offer: 0,

      seq_local_mediastream_map: 0,
      seq_remote_mediastream_map: 0,

      epoch_negotiation_success: 0,

      best_candidate_pair_priority: 0,
      
      data_channel_primary_index: null,
      data_channel_state: 'new',
      data_channel_connect_time: null,

      sctp_dtls_state: 'new',
      sctp_ice_state: 'new',
      sctp_state: 'new',
      sctp: null,

      remove_unused_tracks_timer: null,
      created_transceivers: [],
      list_sending_live_mediastream: {},
      list_receiving_live_mediastream: {},



      data_channel_sending_messages_queue: [],
      
      data_channel_sending_messages_paused: false,

      data_channel_min_buffered_amount: 64*1024,
      data_channel_max_buffered_amount: 1*1024*1024,

      data_channel_max_sending_messages_per_sec: 1000,
      data_channel_max_sending_bytes_per_sec: 64*1024,

      data_channel_pump_queue_timer: null,

      data_channel_sent_events: [],
      data_channel_recv_events: [],
    };

    

    function drain_pending_remote_candidates(){
      if (connection.pc && connection.pc.connectionState!=='closed' && connection.pc.remoteDescription && connection.pc.remoteDescription.type) {
        var current_remote_ufrag=get_ufrag_from_sdp(connection.pc.remoteDescription.sdp);
        if(current_remote_ufrag && current_remote_ufrag in connection.list_remote_candidates==true){


          if(connection.list_remote_candidates[current_remote_ufrag].pending.length>0){
            var candidate = connection.list_remote_candidates[current_remote_ufrag].pending.shift();
            connection.list_remote_candidates[current_remote_ufrag].drained++;
            
            
            connection.pc.addIceCandidate(candidate).then(function(){
              setTimeout(drain_pending_remote_candidates,0);
            }).catch(function(error){
              ev.emit('error', error);
              setTimeout(drain_pending_remote_candidates,0);
            });
            

          }else if(connection.list_remote_candidates[current_remote_ufrag].total>0 && connection.list_remote_candidates[current_remote_ufrag].drained==connection.list_remote_candidates[current_remote_ufrag].total){
            connection.pc.addIceCandidate(null);
          }
          

        }
      }
    }

    function add_remote_candidates(candidate){
      if(connection.remote_support_trickle_ice==null){
        connection.remote_support_trickle_ice=true;
      }

      var of_ufrag='default';

      if(candidate && 'usernameFragment' in candidate && candidate.usernameFragment.length>0){
        of_ufrag=candidate.usernameFragment;
      }else{
        var c=parse_candidate(candidate.candidate);
        if('ufrag' in c && c.ufrag.length>0){
          of_ufrag=c.ufrag;
        }
      }
      if(of_ufrag in connection.list_remote_candidates==false){
        connection.list_remote_candidates[of_ufrag]={
          total: 0,
          drained: 0,
          pending: [],
          all: [],
        };
      }

      if(connection.list_remote_candidates[of_ufrag].all.indexOf(candidate.candidate)<0){
        connection.list_remote_candidates[of_ufrag].all.push(candidate.candidate);

        connection.list_remote_candidates[of_ufrag].pending.push(candidate);

        if(connection.list_remote_candidates[of_ufrag].pending.length>=2){
          connection.list_remote_candidates[of_ufrag].pending.sort(function(a, b){
            var obj_a = parse_candidate(a.candidate);
            var obj_b = parse_candidate(b.candidate);

            var aPriority = obj_a.priority + (obj_a.type === 'tcp' ? 1 : 0);
            var bPriority = obj_b.priority + (obj_b.type === 'tcp' ? 1 : 0);
            if (aPriority === bPriority && 'foundation' in obj_a && 'foundation' in obj_b && obj_a.foundation!==null && obj_b.foundation!==null) {
            return obj_a.foundation.localeCompare(obj_b.foundation);
            } else {
            return bPriority - aPriority;
            }
          });
        }


        drain_pending_remote_candidates();
      }

      
    }

    function set_remote_total_candidates(total,ufrag){
      if(ufrag in connection.list_remote_candidates==false){
        connection.list_remote_candidates[ufrag]={
          total: 0,
          drained: 0,
          list: []
        };
      };

      connection.list_remote_candidates[ufrag].total=total;

      if(connection.list_remote_candidates[ufrag].total>0 && connection.list_remote_candidates[ufrag].total==connection.list_remote_candidates[ufrag].drained){
        drain_pending_remote_candidates();
      }
    }

    function adopt_primary_data_channel(){
      if(connection.pc && connection.pc.connectionState!=='closed'){

        var winner_index = null;
        var winner_id = null;

        // שלב 1: איתור מנצח — הערוץ הפתוח עם ה-ID (SID) הקטן ביותר
        for (var i = 0; i < connection.list_data_channels.length; i++) {
          var dc = connection.list_data_channels[i];
          if(dc && dc.readyState == 'open'){
            if (typeof dc.id == 'number'){
              if (winner_id === null || dc.id < winner_id) {
                winner_id = dc.id;
                winner_index = i;
              }
            }
          }
        }


        if (winner_index == null) {
          
          connection.data_channel_primary_index=null;
          set_connection_state({
            data_channel_state: 'close'
          });

        }else{
          connection.data_channel_primary_index = winner_index;

          set_connection_state({
            data_channel_state: String(connection.list_data_channels[connection.data_channel_primary_index].readyState)+""
          });

          for (var i = 0; i < connection.list_data_channels.length; i++) {
            var dc = connection.list_data_channels[i];
            if(dc && dc.readyState == 'open'){
              if (typeof dc.id == 'number' && connection.list_data_channels[connection.data_channel_primary_index].id!==dc.id){
                try { dc.close(); } catch (e) {}
              }
            }
          }

        }
        

      }
    }

    function is_negotiation_needed(){

      var for_datachannel=false;

      var count_dc_open=0;
      var count_dc_connecting=0;

      for (var i = 0; i < connection.list_data_channels.length; i++) {
        var dc = connection.list_data_channels[i];
        if(dc){
          if(dc.readyState !== 'close' && dc.readyState !== 'closing'){
            if(dc.readyState == 'open'){
              count_dc_open++;
            }else{
              count_dc_connecting++;
            }
          }
        }
      }

      if(count_dc_connecting>0){
        if(connection.pc && (!connection.pc.currentRemoteDescription || (connection.pc.currentRemoteDescription.sdp).indexOf('m=application')<0)){
          for_datachannel=true;
        }
      }


      var for_media=false;
      for(var i in connection.created_transceivers){
        if(connection.created_transceivers[i].tc && ((connection.created_transceivers[i].tc.stopped==false && connection.created_transceivers[i].tc.direction=='sendonly' && connection.created_transceivers[i].tc.mid==null) || (connection.created_transceivers[i].tc.stopped==true && connection.created_transceivers[i].tc.mid!==null))){
          for_media=true;
          break;
        }
      }

      if(for_datachannel==true || for_media==true || connection.need_ice_restart==true){
        return true;
      }else{
        return false;
      }
    }

    function create_offer_schedule(){
      clearTimeout(connection.create_offer_timer);
      connection.create_offer_timer=null;

      connection.create_offer_timer=setTimeout(function(){
        connection.create_offer_timer=null;

        if(connection.pc && (connection.negotiation_state==0)){// || connection.negotiation_state==2
          if(is_negotiation_needed()==true){
            create_offer();
          }
        }
      },(5 + Math.floor(Math.random() * 10)));
    }

    function set_connection_state(options){
      var has_changed=false;

      var fields=[
        'sctp_state',
        'sctp_ice_state',
        'sctp_dtls_state',
        'data_channel_state',
        'negotiation_state',
        'signaling_state',
        'current_remote_protocol',
        'current_local_protocol',
        'current_remote_relay',
        'current_local_relay',
        'current_local_ip',
        'current_remote_ip',
        'current_local_port',
        'current_remote_port',
        'current_rtt',
      ];

      var prev={};
      for(var i in fields){
        prev[fields[i]]=structuredClone(connection[fields[i]]);
      }
      
      if (options && typeof options === 'object'){

        for(var i in fields){
          if(fields[i] in options){
            if(connection[fields[i]]!==options[fields[i]]){
              connection[fields[i]]=options[fields[i]];
              has_changed=true;
            }
          }
        }
        
      }

      if(has_changed==true){

        if(connection['data_channel_state']=='open' && connection['data_channel_state']!==prev['data_channel_state']){
          if(connection.data_channel_connect_time==null || connection.data_channel_connect_time==0){
            connection.data_channel_connect_time=Date.now();
            ev.emit('connect');
          }

          connection_getstats();

          data_channel_schedule_pump();
        }

        if(connection.negotiation_state!==prev['negotiation_state']){

          //console.log(connection.local_nonce+' negotiation_state: '+connection.negotiation_state);

          if(connection.negotiation_state!==2){
            clearTimeout(connection.wait_for_answer_timeout_timer);
            connection.wait_for_answer_timeout_timer=null;
          }

          if(connection.negotiation_state==0){
            
            sctp_events();

            update_all_mediastream_senders();
            update_all_mediastream_receivers();

            if(connection.pending_remote_offer_sdp!==null){
              if(connection.pc && (connection.negotiation_state==0 || connection.negotiation_state==2 || connection.negotiation_state==5)){
                set_remote_offer();
              }
            }else if(connection.create_offer_timer==null){
              create_offer_schedule();
            }
          }


          if(connection.negotiation_state==5){
            clearTimeout(connection.negotiation_done_timeout_timer);
            connection.negotiation_done_timeout_timer=null;

            connection.negotiation_done_timeout_timer=setTimeout(function(){
              connection.negotiation_done_timeout_timer=null;
              if(connection.negotiation_state==5){
                //console.log('not get "nego done"...');
                set_connection_state({
                  negotiation_state: 0
                });
              }
            },7000);
            
          }else{
            if(connection.negotiation_done_timeout_timer!==null){
              clearTimeout(connection.negotiation_done_timeout_timer);
              connection.negotiation_done_timeout_timer=null;
            }
          }
          
          
        }

        if(connection.signaling_state!==prev['signaling_state']){
          //console.log('change in signaling_state...');

          if(connection.signaling_state=='stable' || connection.signaling_state=='have-remote-offer'){

            var emit_fingerprints_available=false;
            if(connection.pc.remoteDescription && connection.pc.remoteDescription.type && connection.remote_fingerprint==null){
              connection.remote_fingerprint=get_fingerprint_from_sdp(connection.pc.remoteDescription.sdp);
              if(connection.local_fingerprint!==null){
                emit_fingerprints_available=true;
              }
            }

            if(connection.pc.localDescription && connection.pc.localDescription.type && connection.local_fingerprint==null){
              connection.local_fingerprint=get_fingerprint_from_sdp(connection.pc.localDescription.sdp);
              if(connection.remote_fingerprint!==null){
                emit_fingerprints_available=true;
              }
            }

            if(emit_fingerprints_available){
              ev.emit('fingerprints',connection.local_fingerprint,connection.remote_fingerprint);
            }

            if (connection.signaling_state=='stable'){

              if(connection.pc.currentRemoteDescription && connection.pc.currentRemoteDescription.type && connection.pc.currentLocalDescription && connection.pc.currentLocalDescription.type){
                var current_remote_ufrag=get_ufrag_from_sdp(connection.pc.currentRemoteDescription.sdp);
                var current_local_ufrag=get_ufrag_from_sdp(connection.pc.currentLocalDescription.sdp);
                if(current_local_ufrag && current_remote_ufrag){

                  var local_ufrag_changed=false;
                  var remote_ufrag_changed=false;
                  if(connection.last_local_ufrag==null || connection.last_local_ufrag!==current_local_ufrag){
                    connection.last_local_ufrag=current_local_ufrag;
                    local_ufrag_changed=true;
                  }
                  if(connection.last_remote_ufrag==null || connection.last_remote_ufrag!==current_remote_ufrag){
                    connection.last_remote_ufrag=current_remote_ufrag;
                    remote_ufrag_changed=true;
                  }

                  if(local_ufrag_changed){
                    if(connection.need_ice_restart==true){
                      connection.need_ice_restart=false;
                    }
                  }
                }
                
              }

            }

          }

        }


        /*
        if (connection.pending_remote_offer_sdp!==null && connection.signaling_state=='stable' && connection.negotiation_state==0){
          set_remote_offer();
        }
        */


      }
    }

    function add_data_channel(dc){
      if(connection.pc && connection.pc.connectionState!=='closed'){
        
        var dc_index=connection.list_data_channels.push(dc);

        dc.binaryType = "arraybuffer";
        dc.bufferedAmountLowThreshold = connection.data_channel_min_buffered_amount;

        dc.onopen=function(event){
          adopt_primary_data_channel();
        };

        dc.onmessage=function(event){
          var now = Date.now();
          var bytes=event.data.length;
          connection.data_channel_recv_events.push([now,bytes]);
          while (connection.data_channel_recv_events.length && (now - connection.data_channel_recv_events[0][0]) > 1000){
            connection.data_channel_recv_events.shift();
          }

          var a=read_structure([8],event.data);

          if(a[0]==0){
            ev.emit('data', a[1]);
          }else{
            process_income_signal(a[0],a[1]);
          }
          
        };

        dc.onbufferedamountlow=function(){
          data_channel_schedule_pump();
        };

        dc.onclosing=function(event){
          adopt_primary_data_channel();
        };

        dc.onclose=function(event){
          adopt_primary_data_channel();

          if(connection.pc && connection.pc.connectionState!=='closed'){
            //connection.list_data_channels.splice(dc_index, 1);
          }
        };

        dc.onerror=function(error){
          adopt_primary_data_channel();

          if(connection.pc && connection.pc.connectionState!=='closed'){
            ev.emit('error', error);
          }
        };
      
      }
    }

    function create_data_channel(){
      if(connection.pc && connection.pc.connectionState!=='closed'){
        try{
          
          var dc=connection.pc.createDataChannel("dc", {
            reliable:false,
            maxRetransmits:0,
            //maxPacketLifeTime:0,
            ordered:false,
            //negotiated: true,
            //id: Number(0),
            maxMessageSize: 16*1024
          });

          add_data_channel(dc);

          create_offer_schedule();

        } catch (error) { 
          ev.emit('error', error);
        }
      }   
    }

    function connection_getstats(){
      if(connection.pc && connection.pc.signalingState!=='closed' && connection.pc.getStats){

        if(connection.getstats_running==false){
          connection.getstats_running=true;
          if(connection.getstats_timer!==null){
            clearTimeout(connection.getstats_timer);
            connection.getstats_timer=null;
          }

          connection.pc.getStats().then(function(stats) {
            try{
              connection.getstats_running=false;
  
              var obj_reports={};
  
              stats.forEach(function(report){
                if(report.type in obj_reports==false){
                    obj_reports[report.type]={};
                }
                obj_reports[report.type][report.id]=report;
                //Object.keys(report).forEach(function(statName){
                //    console.log(statName+': '+report[statName]);
                //});

              });


              //console.log(obj_reports);

              if('transport' in obj_reports){
                for(var i in obj_reports['transport']){
                  if('selectedCandidatePairId' in obj_reports['transport'][i]){
                    var selectedCandidatePairId=obj_reports['transport'][i].selectedCandidatePairId;

                    var local_candidate=null;
                    var remote_candidate=null;
                    var this_candidate_pair=null;


                    if('local-candidate' in obj_reports && 'candidate-pair' in obj_reports && selectedCandidatePairId in obj_reports['candidate-pair']){
                      local_candidate=obj_reports['local-candidate'][obj_reports['candidate-pair'][selectedCandidatePairId].localCandidateId];
                    }

                    if('remote-candidate' in obj_reports && 'candidate-pair' in obj_reports && selectedCandidatePairId in obj_reports['candidate-pair']){
                      remote_candidate=obj_reports['remote-candidate'][obj_reports['candidate-pair'][selectedCandidatePairId].remoteCandidateId];
                    }

                    if('candidate-pair' in obj_reports && selectedCandidatePairId in obj_reports['candidate-pair']){
                      this_candidate_pair=obj_reports['candidate-pair'][selectedCandidatePairId];
                    }
                    
                    if(local_candidate!==null && remote_candidate!==null && this_candidate_pair!==null){

                      var local_protocol=local_candidate.protocol;
                      var remote_protocol=remote_candidate.protocol;

                      var current_rtt=null;
                      
                      if('currentRoundTripTime' in this_candidate_pair){
                        current_rtt=Number(this_candidate_pair.currentRoundTripTime)*1000;
                      }
                      

                      var local_relay=false;
                      var remote_relay=false;
                      if(local_candidate.candidateType=='relay'){
                        local_relay=true;
                      }
                      if(remote_candidate.candidateType=='relay'){
                        remote_relay=true;
                      }

                      var this_candidate_priority=Number(this_candidate_pair.priority);
                      var this_candidate_state=this_candidate_pair.state;

                      
                      var local_ip=null;
                      var local_port=null;
                      var remote_ip=null;
                      var remote_port=null;

                      if(local_candidate.candidateType=='srflx'){
                        if('ip' in local_candidate){
                          local_ip=local_candidate.ip;
                        }
                        if('port' in local_candidate){
                          local_port=local_candidate.port;
                        }
                      }
                      if(remote_candidate.candidateType=='srflx'){
                        if('ip' in remote_candidate){
                          remote_ip=remote_candidate.ip;
                        }
                        if('port' in remote_candidate){
                          remote_port=remote_candidate.port;
                        }
                      }


                      /*
                      
                      console.log('local_candidate:');
                      console.log(local_candidate);

                      console.log('remote_candidate:');
                      console.log(remote_candidate);

                      console.log('this_candidate_pair:');
                      console.log(this_candidate_pair);
                      
                      */
                      
                      if(this_candidate_state=='succeeded'){
                        
                        set_connection_state({
                          current_local_protocol: local_protocol,
                          current_remote_protocol: remote_protocol,
                          current_local_relay: local_relay,
                          current_remote_relay: remote_relay,
                          current_local_ip: local_ip,
                          current_remote_ip: remote_ip,
                          current_local_port: local_port,
                          current_remote_port: remote_port,
                          current_rtt: current_rtt
                        });
                        
                        if(connection.best_candidate_pair_priority<this_candidate_priority){
                          connection.best_candidate_pair_priority=this_candidate_priority;

                          /*
                          console.log('ice candidate upgrated!');
                          console.log('state >> '+this_candidate_state);
                          console.log('priority >> '+this_candidate_priority);

                          console.log('local protocol >> '+local_protocol);
                          console.log('remote protocol >> '+remote_protocol);

                          console.log('local relay >> '+local_relay);
                          console.log('remote relay >> '+remote_relay);
                          */

                        }else if(connection.best_candidate_pair_priority>this_candidate_priority){

                          /*
                          console.log('ice candidate lower - try to send ice restart!');

                          console.log('state >> '+this_candidate_state);
                          console.log('priority >> '+this_candidate_priority);

                          console.log('local protocol >> '+local_protocol);
                          console.log('remote protocol >> '+remote_protocol);

                          console.log('local relay >> '+local_relay);
                          console.log('remote relay >> '+remote_relay);
                          
                          */
                          
                          //console.log(local_candidate);
                          //console.log(remote_candidate);

                          connection.best_candidate_pair_priority=this_candidate_priority;

                          //send_restartIce(wrtc_connection_id);
                          
                        }
                      }
                    }

                  }


                  if('iceState' in obj_reports['transport'][i]){
                    var iceState=obj_reports['transport'][i].iceState;

                    set_connection_state({
                      sctp_ice_state: iceState
                    });

                  }

                  if('dtlsState' in obj_reports['transport'][i]){
                    var dtlsState=obj_reports['transport'][i].dtlsState;

                    set_connection_state({
                      sctp_dtls_state: dtlsState
                    });

                  }
                }
              }

              if('data-channel' in obj_reports){
                for(var i in obj_reports['data-channel']){

                  

                }

                adopt_primary_data_channel();
              }

              if('candidate-pair' in obj_reports){
                for(var i in obj_reports['candidate-pair']){
                  //console.log('state: '+obj_reports['candidate-pair'][i].state);
                  //console.log('priority: '+obj_reports['candidate-pair'][i].priority);

                  //console.log('localCandidateId: '+obj_reports['candidate-pair'][i].localCandidateId);
                  //console.log('remoteCandidateId: '+obj_reports['candidate-pair'][i].remoteCandidateId);

                  //console.log('local protocol: '+obj_reports['local-candidate'][obj_reports['candidate-pair'][i].localCandidateId].protocol);

                  //console.log('remote protocol: '+obj_reports['remote-candidate'][obj_reports['candidate-pair'][i].remoteCandidateId].protocol);

                  /*
                  if(obj_reports['candidate-pair'][i].state=='succeeded'){
                      if(best_candidate_pair_priority<Number(obj_reports['candidate-pair'][i].priority)){
                          best_candidate_pair_priority=Number(obj_reports['candidate-pair'][i].priority);
                      }
                  }
                  */
                    
                }
              }

              if('outbound-rtp' in obj_reports){
                for(var i in obj_reports['outbound-rtp']){

                  var codec_mime_type=null;
                  
                  if('codec' in obj_reports){
                    if('codecId' in obj_reports['outbound-rtp'][i]){
                      if(obj_reports['outbound-rtp'][i].codecId in obj_reports['codec']){
                        if('mimeType' in obj_reports['codec'][obj_reports['outbound-rtp'][i].codecId]){
                            codec_mime_type=obj_reports['codec'][obj_reports['outbound-rtp'][i].codecId].mimeType;
                        }
                      }
                    }
                  }

                  if('mid' in obj_reports['outbound-rtp'][i]){

                    var sending_status=0;
                    if(obj_reports['outbound-rtp'][i].active==true){
                      sending_status=1;
                    }

                    for(var tag_id in connection.list_sending_live_mediastream){
                      if(Number(obj_reports['outbound-rtp'][i].mid)==connection.list_sending_live_mediastream[tag_id].video_mid){

                        if('frameHeight' in obj_reports['outbound-rtp'][i]){
                          connection.list_sending_live_mediastream[tag_id].current_video_frame_height=obj_reports['outbound-rtp'][i].frameHeight;
                        }
                        if('frameWidth' in obj_reports['outbound-rtp'][i]){
                          connection.list_sending_live_mediastream[tag_id].current_video_frame_width=obj_reports['outbound-rtp'][i].frameWidth;
                        }
                        if('framesPerSecond' in obj_reports['outbound-rtp'][i]){
                          connection.list_sending_live_mediastream[tag_id].current_video_fps=obj_reports['outbound-rtp'][i].framesPerSecond;
                        }
                        if(codec_mime_type!==null){
                          connection.list_sending_live_mediastream[tag_id].current_video_mime_type=codec_mime_type;
                        }

                      }else if(Number(obj_reports['outbound-rtp'][i].mid)==connection.list_sending_live_mediastream[tag_id].audio_mid){

                        if(codec_mime_type!==null){
                          connection.list_sending_live_mediastream[tag_id].audio_mime_type=codec_mime_type;
                        }

                        /*
                        g_events.emit(['set_wrtc_sending_live_mediastream_stream',wrtc_connection_id,tag_id,{
                            audio_sending_status: sending_status,
                            audio_mime_type: codec_mime_type
                        }],[],['self',target_to]);
                        */

                      }
                    }
                      
                  }
                }
              }



              if('inbound-rtp' in obj_reports){
                for(var i in obj_reports['inbound-rtp']){

                  var codec_mime_type=null;
                  
                  if('codec' in obj_reports){
                    if('codecId' in obj_reports['inbound-rtp'][i]){
                      if(obj_reports['inbound-rtp'][i].codecId in obj_reports['codec']){
                        if('mimeType' in obj_reports['codec'][obj_reports['inbound-rtp'][i].codecId]){
                          codec_mime_type=obj_reports['codec'][obj_reports['inbound-rtp'][i].codecId].mimeType;
                        }
                      }
                    }
                  }

                  if('mid' in obj_reports['inbound-rtp'][i]){

                    //console.log(obj_reports['inbound-rtp'][i]);
                    
                    for(var tag_id in connection.list_receiving_live_mediastream){
                      if(Number(obj_reports['inbound-rtp'][i].mid)==connection.list_receiving_live_mediastream[tag_id].video_mid){

                        if('frameHeight' in obj_reports['inbound-rtp'][i]){
                          connection.list_receiving_live_mediastream[tag_id].current_video_frame_height=obj_reports['inbound-rtp'][i].frameHeight;
                        }
                        if('frameWidth' in obj_reports['inbound-rtp'][i]){
                          connection.list_receiving_live_mediastream[tag_id].current_video_frame_width=obj_reports['inbound-rtp'][i].frameWidth;
                        }
                        if('framesPerSecond' in obj_reports['inbound-rtp'][i]){
                          connection.list_receiving_live_mediastream[tag_id].current_video_fps=obj_reports['inbound-rtp'][i].framesPerSecond;
                        }
                        if(codec_mime_type!==null){
                          connection.list_receiving_live_mediastream[tag_id].current_video_mime_type=codec_mime_type;
                        }

                      }else if(Number(obj_reports['inbound-rtp'][i].mid)==connection.list_receiving_live_mediastream[tag_id].audio_mid){

                        if(codec_mime_type!==null){
                          connection.list_receiving_live_mediastream[tag_id].current_audio_mime_type=codec_mime_type;
                        }

                      }
                    }
                      
                  }
                }
              }

              
              connection.getstats_timer=setTimeout(connection_getstats,1000);
              
            } catch (error) {
              ev.emit('error', error);
              connection.getstats_running=false;
            }
          }).catch(function(error){
            ev.emit('error', error);
            connection.getstats_running=false;
          });
                  
        }

      }
      
    }

    function sctp_events(){
      if(connection.pc && connection.pc.connectionState!=='closed'){
        if(connection.pc.sctp && connection.sctp==null){

          connection.sctp=connection.pc.sctp;

          adopt_primary_data_channel();

          try{
              
            if(connection.pc.sctp.transport && connection.pc.sctp.transport.iceTransport){

              set_connection_state({
                sctp_ice_state: String(connection.pc.sctp.transport.iceTransport.state)+""
              });

            }
          } catch (error) {
            ev.emit('error', error);
          }

          try{
            if(connection.pc.sctp.transport){

              set_connection_state({
                sctp_dtls_state: String(connection.pc.sctp.transport.state)+""
              });

            }
          } catch (error) {
            ev.emit('error', error);
          }

          try{

            set_connection_state({
              sctp_state: String(connection.pc.sctp.state)+""
            });

          } catch (error) {
            ev.emit('error', error);
          }

          try{
            if(connection.pc.sctp.transport && connection.pc.sctp.transport.iceTransport && 'onstatechange' in connection.pc.sctp.transport.iceTransport){
              connection.pc.sctp.transport.iceTransport.onstatechange=function(){
                if(connection.pc && connection.pc.connectionState!=='closed'){


                  set_connection_state({
                    sctp_ice_state: String(connection.pc.sctp.transport.iceTransport.state)+""
                  });

                  adopt_primary_data_channel();

                }
              };
            }
          } catch (error) {
            ev.emit('error', error);
          }

          try{
            if(connection.pc.sctp.transport && 'onstatechange' in connection.pc.sctp.transport){
              connection.pc.sctp.transport.onstatechange=function(){
                  
                if(connection.pc && connection.pc.connectionState!=='closed'){
                  
                  set_connection_state({
                    sctp_dtls_state: String(connection.pc.sctp.transport.state)+""
                  });
                  
                  adopt_primary_data_channel();
                }

                  
              };
            }
          } catch (error) {
            ev.emit('error', error);
          }

          try{
            if('onstatechange' in connection.pc.sctp){
              connection.pc.sctp.onstatechange=function(){
                if(connection.pc && connection.pc.connectionState!=='closed'){

                  set_connection_state({
                    sctp_state: String(connection.pc.sctp.state)+""
                  });

                  adopt_primary_data_channel();
                }
              };
            }
          } catch (error) {
            ev.emit('error', error);
          }
          
          try{
            if(connection.pc.sctp.transport && connection.pc.sctp.transport.iceTransport && 'onselectedcandidatepairchange' in connection.pc.sctp.transport.iceTransport){
              connection.pc.sctp.transport.iceTransport.onselectedcandidatepairchange=function(){
                selected_candidate_pair=connection.pc.sctp.transport.iceTransport.getSelectedCandidatePair();

                set_connection_state({
                  local_protocol: selected_candidate_pair.local.protocol,
                  remote_protocol: selected_candidate_pair.remote.protocol
                });

                /*
                console.log(selected_candidate_pair);
                console.log(connection.pc.sctp.transport.iceTransport);
                */

                connection_getstats();
              };
            }
          } catch (error) {
            ev.emit('error', error);
          }

            

        }
      }
    }


    function send_negotiation_done(seq){
      var uint8buffer=build_structure([16,16],[
        seq,
        connection.epoch_negotiation_success 
      ]);

      //negotiation_done
      send_signal(12,uint8buffer);
    }

    function process_income_answer(sdp,seq_offer) {
      //console.log('process_income_answer:');
      //console.log(sdp);

      if(connection.remote_support_trickle_ice==null){
        connection.remote_support_trickle_ice=is_support_trickle_ice(sdp);
      }

      if(connection.local_offer_history.length<=seq_offer){
        if(connection.local_offer_history[seq_offer-1][1]==0){
          connection.local_offer_history[seq_offer-1][1]=Date.now();
        }
      }

      if(connection.negotiation_state==2 && connection.pc.signalingState == 'have-local-offer'){
        if(seq_offer==connection.local_offer_history.length){
          set_connection_state({
            negotiation_state: 3
          });

          connection.pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: sdp })).then(function(){

            drain_pending_remote_candidates();

            if(connection.negotiation_state==3 && seq_offer==connection.local_offer_history.length){

              connection.base_offer_sdp=String(connection.sent_local_offer_sdp)+"";
              connection.epoch_negotiation_success++;

              if(connection.local_offer_history[seq_offer-1][2]==0){
                connection.local_offer_history[seq_offer-1][2]=Date.now();
              }

              //console.log('@@@@@@@@@@@@@@@@@');
              //console.log(connection.local_offer_history);

              send_negotiation_done(seq_offer);

              set_connection_state({
                negotiation_state: 0
              });

              //console.log('negotiation done!');

            }

          }).catch(function(error){

            if(connection.negotiation_state==3 && seq_offer==connection.local_offer_history.length){
              rollback_signaling_to_stable(function(){

                set_connection_state({
                  negotiation_state: 0
                });

              });
            }

            ev.emit('error', error);

          });
        }else{
          ev.emit('error', 'answer for old offer');
          //console.log('current local offer seq: '+connection.local_offer_history.length);
          //console.log('but get for: '+seq_offer);
        }
      }else{
        ev.emit('error', 'not have local offer');
      }
    }

    function set_negotiation_done(seq,epoch){
      if(connection.seq_remote_offer==seq){
        connection.epoch_negotiation_success=epoch;
        //console.log('negotiation done!');

        if(connection.negotiation_state==5){
          clearTimeout(connection.negotiation_done_timeout_timer);
          connection.negotiation_done_timeout_timer=null;

          set_connection_state({
            negotiation_state: 0
          });
        }

      }
    }

    function rollback_signaling_to_stable(callback){
      if(connection.pc){
        if(connection.pc.signalingState == 'stable'){
          if(typeof callback=='function'){
            callback(true);
          }
        }else{

          if(connection.making_rollback==false){
            connection.making_rollback=true;
            connection.pc.setLocalDescription({ type: 'rollback' }).then(function () {
              connection.making_rollback=false;

              if(typeof callback=='function'){
                callback(true);
              }
            }).catch(function (error) {
              connection.making_rollback=false;

              if(typeof callback=='function'){
                callback(false);
              }
              ev.emit('error', error);
            });
          }
        }
      }
      
    }


    

    function set_remote_offer(){

      if(connection.pending_remote_offer_sdp!==null){
          
        set_connection_state({
          negotiation_state: 4
        });


        function create_answer(){
          //console.log('create answer...');
          if(connection.negotiation_state==4 && connection.pc.signalingState == 'have-remote-offer'){

            var this_answer_for_seq=Number(connection.seq_remote_offer)+0;

            connection.pc.createAnswer().then(function (answer) {
              if(connection.negotiation_state==4 && connection.pc.signalingState == 'have-remote-offer' && this_answer_for_seq==connection.seq_remote_offer){

                if('toJSON' in answer && typeof answer.toJSON=='function'){
                  var answer_json=answer.toJSON();
                }else{
                  var answer_json=answer;
                }
                
                //var answer_modified=answer_json.sdp;

                var answer_modified=remove_all_ice_candidates(answer_json.sdp);

                //console.log('answer local...');
                //console.log(answer_modified);

                connection.pc.setLocalDescription(new RTCSessionDescription({ type: 'answer', sdp: answer_modified })).then(function () {

                  if(connection.local_support_trickle_ice==null){
                    connection.local_support_trickle_ice=is_support_trickle_ice(connection.pc.localDescription.sdp);
                  }

                  if(this_answer_for_seq==connection.seq_remote_offer){
                    
                    connection.sent_local_answer_sdp=answer_modified;

                    send_answer(this_answer_for_seq,connection.pending_remote_offer_sdp,answer_modified);

                    connection.base_offer_sdp=String(connection.pending_remote_offer_sdp)+"";
                    connection.pending_remote_offer_sdp=null;

                    set_connection_state({
                      negotiation_state: 5
                    });

                  }else{
                    //not relevant now...
                  }

                }).catch(function (error) {

                  if(this_answer_for_seq==connection.seq_remote_offer){
                    rollback_signaling_to_stable(function(){
                      set_connection_state({
                        negotiation_state: 0
                      });
                    });
                  }

                  ev.emit('error', error);
                });
              }else{
                //not relevant now...
              }

            }).catch(function (error) {
              //rollback?

              if(this_answer_for_seq==connection.seq_remote_offer){

                rollback_signaling_to_stable(function(){
                  set_connection_state({
                    negotiation_state: 0
                  });
                });

              }


              ev.emit('error', error);
            });
          }
        }


        

        rollback_signaling_to_stable(function(){
          var this_seq_remote_offer=Number(connection.seq_remote_offer)+0;

          connection.pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: connection.pending_remote_offer_sdp })).then(function(){

            drain_pending_remote_candidates();

            //console.log('offer setted!');
            if(this_seq_remote_offer==connection.seq_remote_offer){

              create_answer();
            }

          }).catch(function (error) {

            //console.log('error set remote offer...');
            //console.log(connection.pending_remote_offer_sdp);

            if(connection.negotiation_state==4 && this_seq_remote_offer==connection.seq_remote_offer){
              connection.pending_remote_offer_sdp=null;

              //rollback_signaling_to_stable(function(){
                set_connection_state({
                  negotiation_state: 0
                });
              //});

            }

            ev.emit('error', error);
          });
        });
      
      }
    }

    function process_income_offer(sdp,seq_offer) {

      //console.log('process_income_offer:');
      //console.log(sdp);

      if(connection.remote_support_trickle_ice==null){
        connection.remote_support_trickle_ice=is_support_trickle_ice(sdp);
      }

      if(seq_offer>connection.seq_remote_offer){
        connection.seq_remote_offer=seq_offer;
        connection.pending_remote_offer_sdp=null;

        var base_remote_polite = (connection.remote_nonce > connection.local_nonce);
        var even_epoch = (connection.epoch_negotiation_success % 2) === 0;
        var polite_now = even_epoch ? base_remote_polite : !base_remote_polite;

        if(connection.negotiation_state==0 || polite_now==true){
          connection.pending_remote_offer_sdp=sdp;
          if(connection.pc && (connection.negotiation_state==0 || connection.negotiation_state==2 || connection.negotiation_state==5)){
            set_remote_offer();
          }
        }else{
          //console.log('ignored_offer_due_to_glare');
        }

      }else{
        ev.emit('error', 'offer is old or already processed');
      }
      
    }


    

    function restartIce(){
      if(connection.need_ice_restart==false){
        connection.need_ice_restart=true;
        create_offer_schedule();
      }
    }

    function send_answer_raw(seq,raw_answer_sdp){
      var uint8buffer=build_structure([16],[
        seq,
        raw_answer_sdp,
      ]);

      send_signal(5,uint8buffer);
    }

    function send_answer(seq,base_sdp,raw_answer_sdp){

      var base_hash=null;
      var result_hash=null;

      var deflate_answer_sdp=null;
      var diff_answer_sdp=null;
      var diff_deflate_answer_sdp=null;

      var finish_count=1;

      
      function choose_best_payload(){

        var candidates=[];
        candidates.push([1,raw_answer_sdp.length]);
        
        if(deflate_answer_sdp!==null){
          candidates.push([2,deflate_answer_sdp.byteLength]);
        }
        if(diff_deflate_answer_sdp!==null){
          candidates.push([3,diff_deflate_answer_sdp.byteLength]);
        }
        if(diff_answer_sdp!==null){
          candidates.push([4,diff_answer_sdp.byteLength]);
        }
        

        candidates.sort(function(a, b){
          if (a[1] !== b[1]) {
            return a[1] - b[1]; // קודם לפי גודל קטן יותר
          }
          return a[0] - b[0];   // אם יש תיקו, לפי הקוד (עדיפות למספר נמוך יותר)
        });

        var best = candidates[0][0];

        if(best==1){
          
          var uint8buffer=build_structure([16],[
            seq,
            raw_answer_sdp,
          ]);

          send_signal(5,uint8buffer);

        }else if(best==2){

          var uint8buffer=build_structure([16],[
            seq,
            deflate_answer_sdp,
          ]);

          send_signal(6,uint8buffer);

        }else if(best==3){

          var uint8buffer=build_structure([16,32,32],[
            seq,
            base_hash,
            result_hash,
            diff_deflate_answer_sdp,
          ]);

          send_signal(7,uint8buffer);

        }else if(best==4){

          var uint8buffer=build_structure([16,32,32],[
            seq,
            base_hash,
            result_hash,
            diff_answer_sdp,
          ]);

          send_signal(8,uint8buffer);
          
        }

        

      }

      if(base_sdp!==null){

        base_hash=murmurhash3_str(base_sdp);
        result_hash=murmurhash3_str(raw_answer_sdp);
        diff_answer_sdp=compress_mp(base_sdp,raw_answer_sdp);

        finish_count++;

        compress_deflate(diff_answer_sdp,function(result){
        
          if(result!==null && result.byteLength<diff_answer_sdp.length){
            diff_deflate_answer_sdp=result;
          }

          finish_count++;
          if(finish_count==4){
            choose_best_payload();
          }

        });

      }else{
        finish_count++;
        finish_count++;
        if(finish_count==4){
          choose_best_payload();
        }
      }

      compress_deflate(raw_answer_sdp,function(result){
        
        if(result!==null && result.byteLength<raw_answer_sdp.length){
          deflate_answer_sdp=result;
        }

        finish_count++;
        if(finish_count==4){
          choose_best_payload();
        }

      });

    }






    function send_offer_raw(seq,raw_offer_sdp){
      var uint8buffer=build_structure([16],[
        seq,
        raw_offer_sdp,
      ]);

      send_signal(1,uint8buffer);
    }

    function send_offer(seq,base_sdp,raw_offer_sdp){

      var base_hash=null;
      var result_hash=null;

      var deflate_offer_sdp=null;
      var diff_offer_sdp=null;
      var diff_deflate_offer_sdp=null;

      var finish_count=1;

      
      function choose_best_payload(){

        var candidates=[];
        candidates.push([1,raw_offer_sdp.length]);
        
        if(deflate_offer_sdp!==null){
          candidates.push([2,deflate_offer_sdp.byteLength]);
        }
        if(diff_deflate_offer_sdp!==null){
          candidates.push([3,diff_deflate_offer_sdp.byteLength]);
        }
        if(diff_offer_sdp!==null){
          candidates.push([4,diff_offer_sdp.byteLength]);
        }
        

        candidates.sort(function(a, b){
          if (a[1] !== b[1]) {
            return a[1] - b[1]; // קודם לפי גודל קטן יותר
          }
          return a[0] - b[0];   // אם יש תיקו, לפי הקוד (עדיפות למספר נמוך יותר)
        });

        var best = candidates[0][0];

        if(best==1){
          
          var uint8buffer=build_structure([16],[
            seq,
            raw_offer_sdp,
          ]);

          send_signal(1,uint8buffer);

        }else if(best==2){

          var uint8buffer=build_structure([16],[
            seq,
            deflate_offer_sdp,
          ]);

          send_signal(2,uint8buffer);

        }else if(best==3){

          var uint8buffer=build_structure([16,32,32],[
            seq,
            base_hash,
            result_hash,
            diff_deflate_offer_sdp,
          ]);

          send_signal(3,uint8buffer);

        }else if(best==4){

          var uint8buffer=build_structure([16,32,32],[
            seq,
            base_hash,
            result_hash,
            diff_offer_sdp,
          ]);

          send_signal(4,uint8buffer);

        }

        

      }

      if(base_sdp!==null){

        base_hash=murmurhash3_str(base_sdp);
        result_hash=murmurhash3_str(raw_offer_sdp);
        diff_offer_sdp=compress_mp(base_sdp,raw_offer_sdp);

        finish_count++;

        compress_deflate(diff_offer_sdp,function(result){
        
          if(result!==null && result.byteLength<diff_offer_sdp.length){
            diff_deflate_offer_sdp=result;
          }

          finish_count++;
          if(finish_count==4){
            choose_best_payload();
          }

        });

      }else{
        finish_count++;
        finish_count++;
        if(finish_count==4){
          choose_best_payload();
        }
      }

      compress_deflate(raw_offer_sdp,function(result){
        
        if(result!==null && result.byteLength<raw_offer_sdp.length){
          deflate_offer_sdp=result;
        }

        finish_count++;
        if(finish_count==4){
          choose_best_payload();
        }

      });
      
    }

    function create_offer(){
      if(connection.pc && connection.pc.connectionState!=='closed'){
        
        if((connection.negotiation_state==0) && (connection.pc.signalingState !== 'have-remote-offer')){// || connection.negotiation_state==2
          
          set_connection_state({
            negotiation_state: 1
          });

          connection.local_offer_history.push([0,0,0]);//sent offer time,get answer time, nego done time

          var this_offer_for_seq=Number(connection.local_offer_history.length)+0;

          //console.log('create offer: '+this_offer_for_seq);

          var offer_options={};
          if(connection.need_ice_restart==true){
            offer_options.iceRestart=true;
          }

          connection.pc.createOffer(offer_options).then(function(offer){
            if(connection.negotiation_state==1 && connection.pc.signalingState !== 'have-remote-offer' && this_offer_for_seq==connection.local_offer_history.length){

              if('toJSON' in offer && typeof offer.toJSON=='function'){
                var offer_json=offer.toJSON();
              }else{
                var offer_json=offer;
              }

              //var offer_modified=offer_json.sdp;
              var offer_modified=remove_all_ice_candidates(offer_json.sdp);

              //console.log('my offer:');
              //console.log(offer_modified);

              connection.pc.setLocalDescription(new RTCSessionDescription({ type: 'offer', sdp: offer_modified })).then(function(){

                if(connection.local_support_trickle_ice==null){
                  connection.local_support_trickle_ice=is_support_trickle_ice(connection.pc.localDescription.sdp);
                }

                if(connection.negotiation_state==1 && connection.pc.localDescription && this_offer_for_seq==connection.local_offer_history.length){

                  connection.sent_local_offer_sdp=offer_modified;
                  
                  connection.local_offer_history[this_offer_for_seq-1][0]=Date.now();

                  send_offer(this_offer_for_seq,connection.base_offer_sdp,offer_modified);

                  clearTimeout(connection.wait_for_answer_timeout_timer);
                  connection.wait_for_answer_timeout_timer=null;

                  var max_wait_time=7000;

                  for(var i in connection.local_offer_history){
                    if(connection.local_offer_history[i][1]>0){
                      var time_to_get_answer=connection.local_offer_history[i][1]-connection.local_offer_history[i][0];
                      if(time_to_get_answer+2>max_wait_time){
                        max_wait_time=time_to_get_answer+2;
                      }
                    }
                  }

                  connection.wait_for_answer_timeout_timer=setTimeout(function(){
                    connection.wait_for_answer_timeout_timer=null;
                    
                    if(connection.negotiation_state==2){
                    //rollback_signaling_to_stable(function(){
                      set_connection_state({
                        negotiation_state: 0
                      });
                    //});
                    }

                  },max_wait_time);

                  set_connection_state({
                    negotiation_state: 2
                  });
                  

                }else{
                  //not relevant...
                }
              }).catch(function(error){

                //console.log('error set local offer:');
                //console.log(offer_json);

                if(connection.negotiation_state==1 && this_offer_for_seq==connection.local_offer_history.length){
                  //rollback_signaling_to_stable(function(){
                    set_connection_state({
                      negotiation_state: 0
                    });
                  //});
                }
                ev.emit('error', error);
              });
            }

          }).catch(function(error){

            //console.log('error with create offer himself...');

            if(connection.negotiation_state==1 && this_offer_for_seq==connection.local_offer_history.length){
              //rollback_signaling_to_stable(function(){
                set_connection_state({
                  negotiation_state: 0
                });
              //});
            }
            
            ev.emit('error', error);
          });

        }
        

      }
    }


    function send_faild_decompress(type,seq){
      var uint8buffer=build_structure([8,16],[
        type,
        seq
      ]);

      send_signal(3,uint8buffer)
    }



    function send_signal(type,data){

      var data_channel_open=(connection.data_channel_primary_index!==null && connection.list_data_channels[connection.data_channel_primary_index] && connection.list_data_channels[connection.data_channel_primary_index].readyState=='open' && connection.data_channel_state=='open');

      if(data_channel_open==true){

        var uint8buffer=build_structure([8],[
          type,
          data
        ]);
        
        data_channel_send(uint8buffer);

      }else{
        var data1=build_structure([16,16,8],[
          connection.local_nonce,
          connection.remote_nonce,
          type,
          data
        ]);

        var checksum_hash=murmurhash3_data(data1);

        var data2=build_structure([32],[
          checksum_hash,
          data1
        ]);

        ev.emit('signal',data2);
      }


      

    }

    function process_income_signal(type,data){
      
      if(type>=1 && type<=4){//offer

        if(type>=3){
          var b=read_structure([16,32,32],data);
          var seq=b[0];

          if(murmurhash3_str(connection.base_offer_sdp)==b[1]){
            if(type==3){

              decompress_deflate(b[3],function(result){
                if(result!==null){
                  
                  var sdp=decompress_mp(connection.base_offer_sdp, result);
                  if(murmurhash3_str(sdp)==b[2]){
                    process_income_offer(sdp,seq);
                  }else{
                    send_faild_decompress(type,seq);
                  }

                }else{
                  send_faild_decompress(type,seq);
                }
              });

            }else{

              var sdp=decompress_mp(connection.base_offer_sdp, new TextDecoder().decode(b[3]));
              if(murmurhash3_str(sdp)==b[2]){
                process_income_offer(sdp,seq);
              }else{
                send_faild_decompress(type,seq);
              }

            }
          }else{
            send_faild_decompress(type,seq);
          }

        }else{
          var b=read_structure([16],data);
          var seq=b[0];

          if(type==1){
            process_income_offer(new TextDecoder().decode(b[1]),seq);
          }else{
            decompress_deflate(b[1],function(result){

              if(result!==null){
                process_income_offer(result,seq);
              }else{
                send_faild_decompress(type,seq);
              }

            });
          }
        }

      }else if(type>=5 && type<=8){//answer

        if(type>=7){
          var b=read_structure([16,32,32],data);
          var seq=b[0];
          

          if(murmurhash3_str(connection.sent_local_offer_sdp)==b[1]){

            if(type==7){

              decompress_deflate(b[3],function(result){
                if(result!==null){
                  
                  var sdp=decompress_mp(connection.sent_local_offer_sdp, result);
                  if(murmurhash3_str(sdp)==b[2]){
                    process_income_answer(sdp,seq);
                  }else{
                    send_faild_decompress(type,seq);
                  }
                  
                }else{
                  send_faild_decompress(type,seq);
                }
              });

            }else{

              var sdp=decompress_mp(connection.sent_local_offer_sdp, new TextDecoder().decode(b[3]));
              if(murmurhash3_str(sdp)==b[2]){
                process_income_answer(sdp,seq);
              }else{
                send_faild_decompress(type,seq);
              }

            }

          }else{
            send_faild_decompress(type,seq);
          }


        }else{
          var b=read_structure([16],data);
          var seq=b[0];

          if(type==5){
            process_income_answer(new TextDecoder().decode(b[1]),seq);
          }else{
            decompress_deflate(b[1],function(result){
              if(result!==null){
                process_income_answer(result,seq);
              }else{
                send_faild_decompress(type,seq);
              }
            });
          }
        }

      }else if(type==9){//candidate raw

        try{
          var candidate_json=JSON.parse(new TextDecoder().decode(data));

          add_remote_candidates(candidate_json);

        }catch(error){
          ev.emit('error', error);
        }

      }else if(type==10){//candidate compressed

        try{
          
          var dec = decode_candidate_binary(data);
          var candidate_json=to_RTCIceCandidateInit_from_decoded(dec);

          add_remote_candidates(candidate_json);


        }catch(error){
          ev.emit('error', error);
        }

      }else if(type==11){//total_candidates

        var b=read_structure([16],data);
        set_remote_total_candidates(b[0],new TextDecoder().decode(b[1]));

      }else if(type==12){//negotiation_done
        
        var b=read_structure([16,16],data);
        set_negotiation_done(b[0],b[1]);

      }else if(type==13){//mediastream_map

        try{

          var b=read_structure([16],data);

          var map_obj=JSON.parse(new TextDecoder().decode(b[1]));

          set_remote_mediastream_map(map_obj,b[0]);

        }catch(error){
          ev.emit('error', error);
        }
        
      }else if(type==14){//faild_decompress

        var b=read_structure([8,16],data);
        var seq=b[1];

        if(b[0]>=1 && b[0]<=4){//send offer again...
          

          if(seq==connection.local_offer_history.length){
            send_offer_raw(seq,connection.sent_local_offer_sdp);
          }else{
            //too old... ignore...
          }

        }else if(b[0]>=5 && b[0]<=8){//send answer again...

          if(seq==connection.seq_remote_offer){
            if(connection.sent_local_offer_sdp!==null){
              send_answer_raw(seq,connection.sent_local_offer_sdp);
            }
          }else{
            //too old... ignore...
          }

        }


      }else if(type==15){//ping

      }
    }

    function on_signal_channel(data){

      //console.log('on_signal_channel...');

      var a=read_structure([32],data);
      if(a[0]==murmurhash3_data(a[1])){
        var b=read_structure([16,16,8],a[1]);

        if(connection.remote_nonce==0 && b[0]>0){
          connection.remote_nonce=b[0];
        }

        if(b[0]==connection.remote_nonce && ((b[1]==0 && (!connection.pc || (!connection.pc.sctp || !connection.pc.sctp.maxChannels || !connection.pc.sctp.maxMessageSize || !connection.pc.sctp.maxMessageSize==Infinity))) || b[1]==connection.local_nonce)){

          process_income_signal(b[2],b[3]);

        }else{
          //console.log('wrong...');
          //close?
        }
      }else{
        //console.log('wrong checksum 2 !!!!......');
      }
    }


    function update_all_mediastream_receivers(){

      if (connection.pc && typeof connection.pc.getTransceivers === 'function'){
        var ts = connection.pc.getTransceivers();

        for(var tag_id in connection.list_receiving_live_mediastream){
          
          var video_track=null;
          var audio_track=null;

          if(connection.list_receiving_live_mediastream[tag_id].video_mid!==null){
            for (var i=0;i<ts.length;i++){
              var tc = ts[i];
              if(tc && tc.receiver && tc.receiver.track && tc.receiver.track.readyState !== 'ended' && tc.receiver.track.kind === 'video'){
                if(String(connection.list_receiving_live_mediastream[tag_id].video_mid)==String(tc.mid)){
                  video_track=tc.receiver.track;
                }
              }
            }
          }

          if(connection.list_receiving_live_mediastream[tag_id].audio_mid!==null){
            for (var i=0;i<ts.length;i++){
              var tc = ts[i];
              if(tc && tc.receiver && tc.receiver.track && tc.receiver.track.readyState !== 'ended' && tc.receiver.track.kind === 'audio'){
                if(String(connection.list_receiving_live_mediastream[tag_id].audio_mid)==String(tc.mid)){
                  audio_track=tc.receiver.track;
                }
              }
            }
          }

          set_receiving_stream(tag_id, {
            video_track: video_track,
            audio_track: audio_track
          });


        }
      }


    }

    function set_receiving_stream(tag_id, options){
      if (tag_id in connection.list_receiving_live_mediastream == false){
        connection.list_receiving_live_mediastream[tag_id] = {
          video_track: null,
          audio_track: null,
          video_mid:   null,
          audio_mid:   null,

          mediastream: new MediaStream(),

          current_video_frame_height: 0,
          current_video_frame_width: 0,
          current_video_fps: 0,
          current_video_mime_type: null,

          current_audio_mime_type: null,
        };
      }

      var rec = connection.list_receiving_live_mediastream[tag_id];
      var need_update = false;

      var need_check_receivers = false;

      if (options && typeof options === 'object'){
        if ('video_mid' in options){
          var new_vmid = options.video_mid != null && String(options.video_mid).length ? String(options.video_mid) : null;
          if (rec.video_mid !== new_vmid){
            rec.video_mid = new_vmid;
            need_update = true;
            need_check_receivers=true;
            
            if (new_vmid == null && rec.video_track != null){
              rec.video_track = null;
              need_update = true;
            }
          }
        }
        if ('audio_mid' in options){
          var new_amid = options.audio_mid != null && String(options.audio_mid).length ? String(options.audio_mid) : null;
          if (rec.audio_mid !== new_amid){
            rec.audio_mid = new_amid;
            need_update = true;
            need_check_receivers=true;

            if (new_amid == null && rec.audio_track != null){
              rec.audio_track = null;
              need_update = true;
            }
          }
        }


        if ('video_track' in options){
          if((rec.video_track==null && options.video_track!==null) || (rec.video_track!==null && options.video_track==null) || isTrackEqual(rec.video_track, options.video_track)==false){

            var all_video_tracks = rec.mediastream.getVideoTracks();
            for(var i in all_video_tracks){
              rec.mediastream.removeTrack(all_video_tracks[i]);
            }

            if(options.video_track!==null){
              rec.mediastream.addTrack(options.video_track);
            }

            rec.video_track=options.video_track;
            need_update = true;
          }
        }

        if ('audio_track' in options){
          if((rec.audio_track==null && options.audio_track!==null) || (rec.audio_track!==null && options.audio_track==null) || isTrackEqual(rec.audio_track, options.audio_track)==false){

            var all_audio_tracks = rec.mediastream.getAudioTracks();
            for(var i in all_audio_tracks){
              rec.mediastream.removeTrack(all_audio_tracks[i]);
            }

            if(options.audio_track!==null){
              rec.mediastream.addTrack(options.audio_track);
            }

            rec.audio_track=options.audio_track;
            need_update = true;
          }
        }

      }



      if(need_check_receivers==true){
        update_all_mediastream_receivers();
      }
      

      if (need_update == true){
        
        ev.emit('stream', rec.mediastream, {
          tag_id: tag_id,
          video_track: rec.video_track,
          audio_track: rec.audio_track,
          video_mid: rec.video_mid,
          audio_mid: rec.audio_mid
        });

      }
    }

    function set_remote_mediastream_map(map_obj,seq){

      if(seq>connection.seq_remote_mediastream_map){
        connection.seq_remote_mediastream_map=seq;

        for (var tag_id in connection.list_receiving_live_mediastream){
          var need_remove=true;
          for(var tag_id2 in map_obj){
            if(String(tag_id2)==String(tag_id)){
              need_remove=false;
            }
          }

          if(need_remove==true){
            
            set_receiving_stream(tag_id,{
              video_mid: null,
              audio_mid: null
            });

          }
        }

        for(var tag_id in map_obj){
          set_receiving_stream(tag_id,{
            video_mid: map_obj[tag_id].video_mid,
            audio_mid: map_obj[tag_id].audio_mid
          });
        }

      }

    }


    function send_mediastream_map(){
      var out={};
      for (var tag_id5 in connection.list_sending_live_mediastream){
        out[tag_id5]={ 
          video_mid: connection.list_sending_live_mediastream[tag_id5].video_mid || null, 
          audio_mid: connection.list_sending_live_mediastream[tag_id5].audio_mid || null 
        };
      }

      connection.seq_local_mediastream_map++;

      var json_str=JSON.stringify(out);

      var uint8buffer=build_structure([16],[
        connection.seq_local_mediastream_map,
        json_str
      ]);

      send_signal(13,uint8buffer);
    }


    function remove_unused_tracks(){
      clearTimeout(connection.remove_unused_tracks_timer);
      connection.remove_unused_tracks_timer=null;

      // בנה סט של MIDs שבשימוש לוגי כרגע
      var used = Object.create(null), k, rec;
      for (k in connection.list_sending_live_mediastream){
        rec = connection.list_sending_live_mediastream[k];
        if (!rec) continue;
        if (rec.video_mid) used[rec.video_mid] = true;
        if (rec.audio_mid) used[rec.audio_mid] = true;
      }

      var ts = connection.pc.getTransceivers(); // קריאה אחת
      var removedAny = false;

      for (var i=0; i<ts.length; i++){
        var t = ts[i];
        if (!t || !t.sender) continue;

        // נטפל רק בטרנסיברים שאנחנו יצרנו
        var isOurs = false;
        for (var j=0; j<connection.created_transceivers.length; j++){
          if (connection.created_transceivers[j].tc === t){ isOurs = true; break; }
        }
        if (!isOurs) continue;

        var mid = (typeof t.mid === 'string' && t.mid.length) ? t.mid : null;
        if (!mid) continue;

        var noTrack = !(t.sender.track);
        var notUsedLogically = !used[mid];

        // מסירים רק אם אין track ולא בשימוש לוגי
        if (noTrack && notUsedLogically){
          try {
            t.stop(); 
          } catch(e){
            
          }
          // ננקה גם מכל רשומת tag שאולי עוד מצביעה על ה‑MID
          for (k in connection.list_sending_live_mediastream){
            rec = connection.list_sending_live_mediastream[k];
            if (!rec) continue;
            if (rec.video_mid === mid) rec.video_mid = null;
            if (rec.audio_mid === mid) rec.audio_mid = null;
          }
          removedAny = true;
        }
      }

      if (removedAny){
        //console.log('removedAny = yes');
        create_offer_schedule();
      }
    }


    function create_transceiver(kind,options){

      var tv = connection.pc.addTransceiver(kind, { direction:'sendonly' });
      connection.created_transceivers.push({ tc: tv, kind: kind });

      create_offer_schedule();

      return tv;
    }


    function update_all_mediastream_senders(){

      if (connection.pc && typeof connection.pc.getTransceivers === 'function'){
          
        // === Helpers קצרים ולוקאליים ===
        function tcIsSending(tc){
          var dir = (tc.currentDirection != null) ? tc.currentDirection : tc.direction;
          return (dir === 'sendonly' || dir === 'sendrecv');
        }
        function tcIsFree(tc){ return !(tc.sender && tc.sender.track); }
        function inferKind(tc){
          for (var i=0;i<connection.created_transceivers.length;i++){
            if (connection.created_transceivers[i].tc === tc) return connection.created_transceivers[i].kind;
          }
          return null;
        }
        function findTcByMid(mid, kind){
          if (!mid) return null;
          for (var i=0;i<ts.length;i++){
            var t = ts[i];
            if (t && t.mid === mid && t.sender && (!kind || (t.sender.track && t.sender.track.kind===kind))) return t;
          }
          return null;
        }
        function shallowEqualEnc(a,b){
          function pick(x){ return {
            active: x.active,
            maxBitrate: x.maxBitrate|0,
            maxFramerate: x.maxFramerate|0,
            scaleResolutionDownBy: (x.scaleResolutionDownBy==null?1:x.scaleResolutionDownBy)
          }; }
          if (!a && !b) return true;
          if (!a || !b) return false;
          if (a.length !== b.length) return false;
          for (var i=0;i<a.length;i++){
            var pa = pick(a[i]||{}), pb = pick(b[i]||{});
            if (pa.active!==pb.active || pa.maxBitrate!==pb.maxBitrate ||
                pa.maxFramerate!==pb.maxFramerate || pa.scaleResolutionDownBy!==pb.scaleResolutionDownBy) return false;
          }
          return true;
        }

        // === 1) מצב רצוי ===
        var neededVideo = 0, neededAudio = 0, tagList = [];
        for (var tag_id in connection.list_sending_live_mediastream){
          var rec0 = connection.list_sending_live_mediastream[tag_id];
          if (rec0.video_track) neededVideo++;
          if (rec0.audio_track) neededAudio++;
          tagList.push(tag_id);
        }

        // === 2) מצב בפועל — רק מה שאנחנו מנהלים ושולחים ===
        var sendV = [], sendA = [];
        var ts = connection.pc.getTransceivers();
        for (var i=0;i<ts.length;i++){
          var tc = ts[i];
          if (!tc || !tcIsSending(tc)) continue;
          var kind = inferKind(tc);
          if (kind === 'video') sendV.push(tc);
          else if (kind === 'audio') sendA.push(tc);
        }

        // === 3) איזון סלוטים ===
        var createdAny   = false; // צריך מו״מ אם true
        var removedAny   = false;
        var stateChanged = false; // דלתא של טרקים/שיוכים

        // VIDEO – להוסיף סלוטים חסרים
        if (neededVideo > sendV.length){
          var toAddV = neededVideo - sendV.length;
          for (var a=0; a<toAddV; a++){
            var tv = create_transceiver('video');
            sendV.push(tv);
            createdAny = true;
          }
        } else if (neededVideo < sendV.length){
          var toDisableV = sendV.length - neededVideo;
          for (var r=sendV.length-1; r>=0 && toDisableV>0; r--){
            var tRemV = sendV[r];
            if (tRemV && tRemV.sender){
              var hadTrackV = !!tRemV.sender.track;
              try { tRemV.sender.replaceTrack(null); } catch(e){}
              removedAny=true;
              if (hadTrackV) stateChanged = true;
              toDisableV--;
            }
          }
        }

        // AUDIO – להוסיף/לכבות
        if (neededAudio > sendA.length){
          var toAddA = neededAudio - sendA.length;
          for (var a2=0; a2<toAddA; a2++){
            var ta = create_transceiver('audio');
            sendA.push(ta);
            createdAny = true;
          }
        } else if (neededAudio < sendA.length){
          var toDisableA = sendA.length - neededAudio;
          for (var r2=sendA.length-1; r2>=0 && toDisableA>0; r2--){
            var tRemA = sendA[r2];
            if (tRemA && tRemA.sender){
              var hadTrackA = !!tRemA.sender.track;
              try { tRemA.sender.replaceTrack(null); } catch(e){}
              removedAny=true;
              if (hadTrackA) stateChanged = true;
              toDisableA--;
            }
          }
        }

        // === 4) DETACH לפי mid שכבר לא רלוונטי ===
        for (var tgi=0; tgi<tagList.length; tgi++){
          var id = tagList[tgi];
          var r  = connection.list_sending_live_mediastream[id];

          // VIDEO
          if (r.video_mid != null){
            var tcv = findTcByMid(r.video_mid,'video');
            var detachV = (!r.video_track) || (!tcv || !tcIsSending(tcv));
            if (detachV && tcv && tcv.sender){
              var hadV = !!tcv.sender.track;
              try { tcv.sender.replaceTrack(null); } catch(e){}
              removedAny=true;
              if (hadV) stateChanged = true;
            }
            if (detachV){
              r.video_mid = null;
              stateChanged = true;
            }
          }
          // AUDIO
          if (r.audio_mid != null){
            var tca = findTcByMid(r.audio_mid,'audio');
            var detachA = (!r.audio_track) || (!tca || !tcIsSending(tca));
            if (detachA && tca && tca.sender){
              var hadA = !!tca.sender.track;
              try { tca.sender.replaceTrack(null); } catch(e){}
              removedAny=true;
              if (hadA) stateChanged = true;
            }
            if (detachA){
              r.audio_mid = null;
              stateChanged = true;
            }
          }
        }

        // === 4.5) נסה להשלים mid לפי track שכבר משוייך ל-sender כלשהו ===
        for (var tag_id2 in connection.list_sending_live_mediastream){
          var rr = connection.list_sending_live_mediastream[tag_id2];
          if (!rr.video_mid && rr.video_track){
            for (var i2=0;i2<ts.length;i2++){
              var tc2 = ts[i2];
              if (tc2 && tc2.sender && tc2.sender.track === rr.video_track && inferKind(tc2)==='video'){
                if (typeof tc2.mid === 'string' && tc2.mid.length){
                  rr.video_mid = tc2.mid; stateChanged = true; break;
                }
              }
            }
          }
          if (!rr.audio_mid && rr.audio_track){
            for (var j2=0;j2<ts.length;j2++){
              var tc3 = ts[j2];
              if (tc3 && tc3.sender && tc3.sender.track === rr.audio_track && inferKind(tc3)==='audio'){
                if (typeof tc3.mid === 'string' && tc3.mid.length){
                  rr.audio_mid = tc3.mid; stateChanged = true; break;
                }
              }
            }
          }
        }

        // === 5) ATTACH — שייך טרקים לסלוטים פנויים ===
        function buildFree(list){
          var out = [];
          for (var i=0;i<list.length;i++){ if (tcIsFree(list[i])) out.push(list[i]); }
          return out;
        }
        var freeV = buildFree(sendV);
        var freeA = buildFree(sendA);

        for (var tgi2=0; tgi2<tagList.length; tgi2++){
          var id2 = tagList[tgi2];
          var r2  = connection.list_sending_live_mediastream[id2];

          if (r2.video_track && r2.video_mid == null && freeV.length){
            var tv2 = freeV.shift();
            var prevV = tv2 && tv2.sender ? tv2.sender.track : null;
            try { tv2.sender.replaceTrack(r2.video_track); } catch(e){}
            if (prevV !== r2.video_track) stateChanged = true;
            if (typeof tv2.mid === 'string' && tv2.mid.length && r2.video_mid !== tv2.mid){
              r2.video_mid = tv2.mid; stateChanged = true;
            }
          }
          if (r2.audio_track && r2.audio_mid == null && freeA.length){
            var ta2 = freeA.shift();
            var prevA = ta2 && ta2.sender ? ta2.sender.track : null;
            try { ta2.sender.replaceTrack(r2.audio_track); } catch(e){}
            if (prevA !== r2.audio_track) stateChanged = true;
            if (typeof ta2.mid === 'string' && ta2.mid.length && r2.audio_mid !== ta2.mid){
              r2.audio_mid = ta2.mid; stateChanged = true;
            }
          }
        }

        // === 5.9) יישום מגבלות שידור בפועל לפי ה-obj שלך (בלי פונקציות חיצוניות, בלי Promise) ===
        for (var tag_id4 in connection.list_sending_live_mediastream){
          if (!connection.list_sending_live_mediastream.hasOwnProperty(tag_id4)) continue;
          var rec4 = connection.list_sending_live_mediastream[tag_id4];

          // VIDEO
          if (rec4.video_mid && rec4.video_track){
            var tcv4 = findTcByMid(rec4.video_mid,'video');
            if (tcv4 && tcv4.sender && typeof tcv4.sender.getParameters=='function' && typeof window !== "undefined" && typeof window.document !== "undefined"){
              var s = tcv4.sender;
              var p = s.getParameters() || {};

              //console.log(p);
              if (!p.encodings || !p.encodings.length) p.encodings = [{}];

              var maxBR = (rec4.max_video_bitrate|0) > 0 ? (rec4.max_video_bitrate|0) : 0;
              var maxFPS = (rec4.max_video_fps|0) > 0 ? (rec4.max_video_fps|0) : 0;
              var scale  = (rec4.video_scale_down > 1) ? rec4.video_scale_down : 1;

              // בונים encodings יעד על בסיס הקיים
              var desired = [];
              for (var ei=0; ei<p.encodings.length; ei++){
                var enc = {};
                var cur = p.encodings[ei] || {};
                enc.active = (cur.active !== false);
                if (maxBR) enc.maxBitrate = maxBR;
                if (maxFPS) enc.maxFramerate = maxFPS;
                if (scale && scale !== 1) enc.scaleResolutionDownBy = scale;
                desired.push(enc);
              }

              var needSet = !shallowEqualEnc(p.encodings, desired) || (p.degradationPreference !== (rec4.degradation || 'balanced'));

              if (needSet && typeof s.setParameters=='function'){
                p.encodings = desired;
                p.degradationPreference = rec4.degradation || 'balanced';
                try { s.setParameters(p); } catch(e){ console.log(e); }
                try { if (typeof s.requestKeyFrame === 'function') s.requestKeyFrame(); } catch(e){}
              }
            }
          }

          // AUDIO – אין maxBitrate אמין ב-sender; אפשר רמזי ערוצים בלבד
          if (rec4.audio_mid && rec4.audio_track){
            var tca4 = findTcByMid(rec4.audio_mid,'audio');
            
          }
        }

        // === 6) עדכון לוגי החוצה ===
        if (stateChanged){

          send_mediastream_map();
        }


        if(removedAny){
          //console.log('removedAny.................................');
          if(connection.remove_unused_tracks_timer==null){
            connection.remove_unused_tracks_timer=setTimeout(remove_unused_tracks,5000);
          }
        }

        // === 7) מו״מ אם נוצרו סלוטים חדשים ===
        if (createdAny){
          // כאן אצלך: ליצור OFFER, setLocalDescription, לשדר לצד השני...
          // השארתי כ‑placeholder בדיוק כמו שהיה לך.
        }
      }
    }



    function set_sending_stream(tag_id, options){
      if (!(tag_id in connection.list_sending_live_mediastream)){
        connection.list_sending_live_mediastream[tag_id] = {
          video_track: null,
          audio_track: null,
          video_mid: null,  
          audio_mid: null,

          mediastream_id: null,

          current_video_frame_height: 0,
          current_video_frame_width: 0,
          current_video_fps: 0,
          current_video_mime_type: null,

          max_video_fps: 0,
          max_video_bitrate: 0,
          video_scale_down: 1,

          audio_channel: 1,
        };
      }

      var rec = connection.list_sending_live_mediastream[tag_id];
      var need_update = false;

      if (options && typeof options === 'object'){
        if ('video_track' in options){
          var prevV = rec.video_track, nextV = options.video_track;
          if ((prevV == null) !== (nextV == null)) need_update = true;
          else if (prevV && nextV && isTrackEqual(prevV, nextV)==false) need_update = true;
          rec.video_track = nextV;
          if (nextV == null && rec.video_mid != null){
            need_update = true;
          }
        }
        if ('audio_track' in options){
          var prevA = rec.audio_track, nextA = options.audio_track;
          if ((prevA == null) !== (nextA == null)) need_update = true;
          else if (prevA && nextA && isTrackEqual(prevA, nextA)==false) need_update = true;
          rec.audio_track = nextA;
          if (nextA == null && rec.audio_mid != null){
            need_update = true;
          }
        }

        if ('mediastream_id' in options){
          if(connection.list_sending_live_mediastream[tag_id].mediastream_id!==options.mediastream_id){
            connection.list_sending_live_mediastream[tag_id].mediastream_id=options.mediastream_id;
          }
        }

        if ('max_video_fps' in options){

        }
        if ('max_video_bitrate' in options){
          
        }
        if ('video_scale_down' in options){
          
        }
      }

      if (need_update==true){
        if(connection.pc){
          update_all_mediastream_senders();
        }
      }
    }

    function stream(tag_id, options){
      
      set_sending_stream(tag_id, options);

    }

    function addStream(stream, options){
      if (stream && isMediaStream(stream)) {
        
        var mediastream_id=null;
        if('id' in stream && stream.id.length>0){
          mediastream_id=stream.id;
        }

        var for_tag_id=mediastream_id;

        for(var tag_id in connection.list_sending_live_mediastream){
          if(connection.list_sending_live_mediastream[tag_id].mediastream_id!==null){
            if(connection.list_sending_live_mediastream[tag_id].mediastream_id==mediastream_id){
              for_tag_id=tag_id;
              break;
            }
          }
        }

        var video_track=null;
        var audio_track=null;

        var all_tracks = stream.getTracks();

        for(var i in all_tracks){
          if(video_track==null && all_tracks[i].kind=='video'){
            video_track=all_tracks[i];
          }
          if(audio_track==null && all_tracks[i].kind=='audio'){
            audio_track=all_tracks[i];
          }
        }

        set_sending_stream(for_tag_id, {
          video_track: video_track,
          audio_track: audio_track
        });

      }
    }

    function removeStream(stream){
      if (stream && isMediaStream(stream)) {

        var mediastream_id=null;
        if('id' in stream && stream.id.length>0){
          mediastream_id=stream.id;
        }

        for(var tag_id in connection.list_sending_live_mediastream){
          if(connection.list_sending_live_mediastream[tag_id].mediastream_id!==null){
            if(connection.list_sending_live_mediastream[tag_id].mediastream_id==mediastream_id){

              set_sending_stream(tag_id, {
                video_track: null,
                audio_track: null
              });

              break;
            }
          }
        }

      }
    }

    function addTrack(track, stream, options){

      if (stream && isMediaStream(stream)) {
        
        var mediastream_id=null;
        if('id' in stream && stream.id.length>0){
          mediastream_id=stream.id;
        }

        var for_tag_id=mediastream_id;

        for(var tag_id in connection.list_sending_live_mediastream){
          if(connection.list_sending_live_mediastream[tag_id].mediastream_id!==null){
            if(connection.list_sending_live_mediastream[tag_id].mediastream_id==mediastream_id){
              for_tag_id=tag_id;
              break;
            }
          }
        }


        if(track && isMediaStreamTrack(track)){
          if('kind' in track){
            if(track.kind=='audio'){
              set_sending_stream(for_tag_id, {
                audio_track: track,
              });
            }else if(track.kind=='video'){
              set_sending_stream(for_tag_id, {
                video_track: track,
              });
            }
          }
        }

      }

      
    }

    function removeTrack(track, stream){
      var mediastream_id=null;

      if (stream && isMediaStream(stream)) {
        if('id' in stream && stream.id.length>0){
          mediastream_id=stream.id;
        }
      }

      if(track && isMediaStreamTrack(track)){
        for(var tag_id in connection.list_sending_live_mediastream){
          if(mediastream_id!==null){
            if(connection.list_sending_live_mediastream[tag_id].mediastream_id!==null && connection.list_sending_live_mediastream[tag_id].mediastream_id==mediastream_id){

              if('kind' in track){
                if(track.kind=='audio'){
                  set_sending_stream(tag_id, {
                    audio_track: null,
                  });
                }else if(track.kind=='video'){
                  set_sending_stream(tag_id, {
                    video_track: null,
                  });
                }
              }

              break;
            
            }
          }else{
            if(list_sending_live_mediastream[tag_id].video_track!==null && isTrackEqual(track,list_sending_live_mediastream[tag_id].video_track)==true){
              set_sending_stream(tag_id, {
                video_track: null,
              });
            }
            if(list_sending_live_mediastream[tag_id].audio_track!==null && isTrackEqual(track,list_sending_live_mediastream[tag_id].audio_track)==true){
              set_sending_stream(tag_id, {
                audio_track: null,
              });
            }
          }
        }

        
      }
      
    }

    function send_total_candidates(){
      if(connection.pc.localDescription && connection.pc.localDescription.type){
        var current_local_ufrag=get_ufrag_from_sdp(connection.pc.localDescription.sdp);
        if(current_local_ufrag && current_local_ufrag in connection.list_gathered_local_candidates && connection.list_gathered_local_candidates[current_local_ufrag].length>0){

          var total=connection.list_gathered_local_candidates[current_local_ufrag].length;

          var uint8buffer=build_structure([16],[
            total,
            current_local_ufrag
          ]);

          send_signal(11,uint8buffer);
        }
      }
    }

    function analyze_local_candidates(){
      if(connection.pc.localDescription && connection.pc.localDescription.type){
        var current_local_ufrag=get_ufrag_from_sdp(connection.pc.localDescription.sdp);
        if(current_local_ufrag){

          var candidates=connection.list_gathered_local_candidates[current_local_ufrag];
          
          // --- איסוף ---
          var list_ipv6 = [];
          var list_ipv4 = [];
          var relay_ipv6 = [];
          var relay_ipv4 = [];

          var supports_udp = false;
          var supports_tcp = false;

          var seen_host = false;
          var seen_srflx = false;
          var seen_prflx = false;
          var seen_relay = false;

          var map_local_to_srflx = new Map();

          for (var i in candidates) {
            var candidate = candidates[i];
            if (!candidate) continue;

            var cand_str = candidate.candidate || '';
            var address = candidate.address || '';
            var port = (typeof candidate.port !== 'undefined' && candidate.port !== null) ? Number(candidate.port) : 0;
            var rel_addr = candidate.relatedAddress || '';
            var rel_port = (typeof candidate.relatedPort !== 'undefined' && candidate.relatedPort !== null) ? Number(candidate.relatedPort) : 0;
            var protocol = (candidate.protocol || '').toLowerCase();
            var ctype = candidate.type || ''; // host/srflx/prflx/relay

            // fallback מינימלי מתוך ה־candidate line אם חסר
            if (!address || !port) {
              try {
                var parts = cand_str.split(' ');
                if (parts.length > 6) {
                  if (!address) address = parts[4];
                  if (!port)    port    = Number(parts[5])|0;
                }
                for (var j = 0; j < parts.length - 1; j++) {
                  if (parts[j] === 'raddr' && !rel_addr) rel_addr = parts[j+1];
                  if (parts[j] === 'rport' && !rel_port) rel_port = Number(parts[j+1])|0;
                  if (parts[j] === 'typ'   && !ctype && (j+1)<parts.length) ctype = parts[j+1];
                }
              } catch(e){}
            }

            if (address)  address  = strip_brackets(address);
            if (rel_addr) rel_addr = strip_brackets(rel_addr);

            // flags פרוטוקול
            if (protocol === 'udp') supports_udp = true;
            if (protocol === 'tcp') supports_tcp = true;

            // סוגי קנדידטים
            if (ctype === 'host') seen_host = true;
            else if (ctype === 'srflx') seen_srflx = true;
            else if (ctype === 'prflx') seen_prflx = true;
            else if (ctype === 'relay') seen_relay = true;

            // --- הפרדה ברורה: שלי (host/srflx/prflx) מול מתווך (relay) ---

            // כתובת ה-candidate עצמו
            if (is_public_ip(address)) {
              if (ctype === 'relay') {
                if (is_ipv6_addr(address)) { if (relay_ipv6.indexOf(address) === -1) relay_ipv6.push(address); }
                else                       { if (relay_ipv4.indexOf(address) === -1) relay_ipv4.push(address); }
              } else {
                if (is_ipv6_addr(address)) { if (list_ipv6.indexOf(address) === -1) list_ipv6.push(address); }
                else                       { if (list_ipv4.indexOf(address) === -1) list_ipv4.push(address); }
              }
            }

            // relatedAddress (מקור מקומי/שרת STUN) – מכניסים ל"שלי" רק אם לא relay
            if (is_public_ip(rel_addr) && ctype !== 'relay') {
              if (is_ipv6_addr(rel_addr)) { if (list_ipv6.indexOf(rel_addr) === -1) list_ipv6.push(rel_addr); }
              else                        { if (list_ipv4.indexOf(rel_addr) === -1) list_ipv4.push(rel_addr); }
            }

            // מיפוי לזיהוי symmetric/cone
            if (ctype === 'srflx' || ctype === 'prflx') {
              var localKey = '';
              if (rel_addr && rel_port) localKey = rel_addr + '(' + rel_port + ')';
              else if (address && port) localKey = address + '(' + port + ')'; // fallback

              var mapped = '';
              if (address && port) mapped = address + '(' + port + ')';

              if (localKey && mapped) {
                if (!map_local_to_srflx.has(localKey)) map_local_to_srflx.set(localKey, new Set());
                map_local_to_srflx.get(localKey).add(mapped);
              }
            }
          }

          // --- סיווג NAT ---
          var nat_type = 'unknown'; // 0 unknown, 1 cone-like, 2 symmetric, 3 no-udp, 4 relay-only

          if (seen_relay && !seen_srflx && !seen_prflx && !seen_host) {
            nat_type = 'relay-only'; // relay-only
          }

          if (nat_type === 'unknown') {
            if (!supports_udp && supports_tcp) {
              nat_type = 'no-udp'; // no-udp
            }
          }

          var symmetric_detected = false;
          var cone_detected = false;
          var it = map_local_to_srflx.values();
          var itn = it.next ? it.next() : { done:true };
          while (!itn.done) {
            var s = itn.value;
            if (s && s.size > 1) symmetric_detected = true;
            if (s && s.size === 1) cone_detected = true;
            itn = it.next();
          }
          if (nat_type === 'unknown') {
            if (symmetric_detected) nat_type = 'symmetric';
            else if (cone_detected) nat_type = 'cone-like';
          }

          /*
          console.log('candidates:');
          console.log(candidates);
          console.log('map_local_to_srflx:');
          console.log(map_local_to_srflx);

          console.log('supports_udp:');
          console.log(supports_udp);

          console.log('supports_tcp:');
          console.log(supports_tcp);

          console.log('nat_type:');
          console.log(nat_type);
*/
          //results...

          connection.local_public_ipv4=list_ipv4;
          connection.local_public_ipv6=list_ipv6;

          connection.local_relay_ipv4=relay_ipv4;
          connection.local_relay_ipv6=relay_ipv6;

          connection.local_support_udp=supports_udp;
          connection.local_support_tcp=supports_tcp;

          connection.local_nat_type=nat_type;

          /*
          return {

            supports_udp: supports_udp,
            supports_tcp: supports_tcp,

            candidate_types: {
              host: !!seen_host,
              srflx: !!seen_srflx,
              prflx: !!seen_prflx,
              relay: !!seen_relay
            },

            nat_type: nat_type, // 0 unknown, 1 cone-like, 2 symmetric, 3 no-udp, 4 relay-only

            _maps: { local_to_srflx: map_local_to_srflx }
          };
          */
          
        }
      }
    }


    

    function data_channel_get_send_rate(){
      var now = Date.now();
      var cutoff = now - 1000;

      while (connection.data_channel_sent_events.length && connection.data_channel_sent_events[0][0] < cutoff){
        connection.data_channel_sent_events.shift();
      }

      // נחשב סיכומים
      var sent_count = connection.data_channel_sent_events.length;
      var sent_bytes = 0;
      for (var i=0; i<sent_count; i++){
        sent_bytes += connection.data_channel_sent_events[i][1];
      }

      return [sent_count,sent_bytes];
    }


    function data_channel_schedule_pump(){
      if(connection.data_channel_sending_messages_paused==false){

        if(connection.data_channel_pump_queue_timer==null){
          if(connection.data_channel_sending_messages_queue.length>0){
            
            var [sent_count,sent_bytes]=data_channel_get_send_rate();

            var wait_time=0;
            var now = Date.now();

            if(sent_count>=connection.data_channel_max_sending_messages_per_sec){

              var oldest_ts = connection.data_channel_sent_events[0][0];
              wait_time = Math.max(wait_time, 1000 - (now - oldest_ts));
            }

            if(sent_bytes>=connection.data_channel_max_sending_bytes_per_sec && sent_count > 0){
              // עכשיו total > lim_bytes; צריך שהאירוע בקדמת המערך יפוג עד שנרד מתחת
              // האירוע שעליו נמתין הוא connection.data_channel_sent_events[0] .. או יותר מאחד:
              // נחשב צבירה קדימה עד שיעבור הלימיט:
              var sumFwd = sent_bytes;
              var j = 0;
              while (j < sent_count && sumFwd > connection.data_channel_max_sending_bytes_per_sec){
                sumFwd -= connection.data_channel_sent_events[j][1];
                j++;
              }
              // האירוע שיפוג הוא זה שלפני j (כל j אירועים יפלו מהחלון)
              var ts_to_expire = connection.data_channel_sent_events[j-1 >= 0 ? (j-1) : 0][0];
              var w = 1000 - (now - ts_to_expire);
              if (w > wait_time){
                wait_time = w;
              }


            }

            if(wait_time<0){
              wait_time=0;
            }
            if(wait_time>60){
              wait_time=60;
            }

            if(wait_time<=0){
              var data_channel_open=(connection.data_channel_primary_index!==null && connection.list_data_channels[connection.data_channel_primary_index] && connection.list_data_channels[connection.data_channel_primary_index].readyState=='open' && connection.data_channel_state=='open');

              if(data_channel_open==true){

                if ((connection.list_data_channels[connection.data_channel_primary_index].bufferedAmount + connection.data_channel_sending_messages_queue[0].data.length) > connection.data_channel_min_buffered_amount){
                  wait_time=10;
                }

              }else{
                wait_time=20;
              }
            }

            connection.data_channel_pump_queue_timer=setTimeout(function(){
              connection.data_channel_pump_queue_timer=null;
              data_channel_pump_queue();
            }, wait_time);

          }
        }

      }
    }

    function data_channel_pump_queue(){
      
      var data_channel_open=(connection.data_channel_primary_index!==null && connection.list_data_channels[connection.data_channel_primary_index] && connection.list_data_channels[connection.data_channel_primary_index].readyState=='open' && connection.data_channel_state=='open');

      if(data_channel_open==true){

        if (connection.list_data_channels[connection.data_channel_primary_index].bufferedAmount < connection.data_channel_max_buffered_amount){

          var callbacks_sent_ok=[];

          while (connection.data_channel_sending_messages_queue.length){

            data_channel_open=(connection.data_channel_primary_index!==null && connection.list_data_channels[connection.data_channel_primary_index] && connection.list_data_channels[connection.data_channel_primary_index].readyState=='open' && connection.data_channel_state=='open');

            if(data_channel_open==true){
              var data_to_send=connection.data_channel_sending_messages_queue[0].data;

              if ((connection.list_data_channels[connection.data_channel_primary_index].bufferedAmount + data_to_send.length) > connection.data_channel_min_buffered_amount){
                break; // נחכה לאירוע onbufferedamountlow
              }

              var [sent_count,sent_bytes]=data_channel_get_send_rate();

              if(sent_count>connection.data_channel_max_sending_messages_per_sec || sent_bytes>connection.data_channel_max_sending_bytes_per_sec){
                break;
              }

              try{
                var now=Date.now();
                connection.list_data_channels[connection.data_channel_primary_index].send(data_to_send);
                connection.data_channel_sent_events.push([now,data_to_send.length]);

                if(connection.data_channel_sending_messages_queue[0].callback!==null){
                  callbacks_sent_ok.push(connection.data_channel_sending_messages_queue[0].callback);
                }

                connection.data_channel_sending_messages_queue.shift();

              } catch (error) {
                ev.emit('error', error);
              }

              if (connection.list_data_channels[connection.data_channel_primary_index].bufferedAmount >= connection.data_channel_max_buffered_amount){
                break;
              }

            }else{
              break;
            }
          }

          if(callbacks_sent_ok.length>0){
            for(var i in callbacks_sent_ok){
              callbacks_sent_ok[i](true);
            }
          }
        }
        
      }


      if(connection.data_channel_sending_messages_queue.length>0){
        data_channel_schedule_pump();
      }

    }

    function data_channel_send_data(data,callback){
      var uint8buffer=build_structure([8],[
        0,
        data
      ]);
      data_channel_send(uint8buffer,callback);
    }

    function data_channel_send(data,callback){

      if(typeof data=='string'){
        data=new TextEncoder().encode(data);
      }

      if(connection.pc && connection.pc.sctp){
        var max_message_size=900;
        if('maxMessageSize' in connection.pc.sctp && connection.pc.sctp.maxMessageSize>0){
          max_message_size=connection.pc.sctp.maxMessageSize;
        }

        if(max_message_size>=data.length){

          if(typeof callback=='function'){
            connection.data_channel_sending_messages_queue.push({
              data: data,
              callback: callback
            });
          }else{
            connection.data_channel_sending_messages_queue.push({
              data: data,
              callback: null
            });
          }
          
          data_channel_schedule_pump();

        }else{
          if(typeof callback=='function'){
            callback(false);
          }

          ev.emit('error', 'message must be less then '+max_message_size+' bytes');
        }

      }else{
        ev.emit('error', 'no sctp yet');
      }
      
    }


    function close_connection(){
      clearTimeout(connection.create_data_channel_timer);
      connection.create_data_channel_timer=null;

      clearTimeout(connection.create_offer_timer);
      connection.create_offer_timer=null;

      clearTimeout(connection.wait_for_answer_timeout_timer);
      connection.wait_for_answer_timeout_timer=null;

      clearTimeout(connection.negotiation_done_timeout_timer);
      connection.negotiation_done_timeout_timer=null;

      clearTimeout(connection.getstats_timer);
      connection.getstats_timer=null;

      clearTimeout(connection.data_channel_pump_queue_timer);
      connection.data_channel_pump_queue_timer=null;

      clearTimeout(connection.remove_unused_tracks_timer);
      connection.remove_unused_tracks_timer=null;



      if(connection.pc){
                        
        if(connection.pc.sctp){
          connection.pc.sctp.onstatechange=null;
          if(connection.pc.sctp.transport){
            connection.pc.sctp.transport.onstatechange=null;
            if(connection.pc.sctp.transport.iceTransport){
                connection.pc.sctp.transport.iceTransport.onstatechange=null;
            }
          }
        }

        for(var i in connection.list_data_channels){
          if(connection.list_data_channels[i] && connection.list_data_channels[i]!==null){
            
            connection.list_data_channels[i].onopen=null;
            connection.list_data_channels[i].onclosing=null;
            connection.list_data_channels[i].onclose=null;
            connection.list_data_channels[i].onbufferedamountlow=null;
            
            if(connection.list_data_channels[i].readyState=='open' || connection.list_data_channels[i].readyState!=='connected' || connection.list_data_channels[i].readyState!=='connecting'){
              try{
                if(typeof connection.list_data_channels[i].close=='function'){
                  connection.list_data_channels[i].close();
                }
              } catch (error) {
                
              }
            }
            
          }
        }
        
        
        connection.pc.ondatachannel=null;
        connection.pc.onicecandidate=null;
        connection.pc.onicecandidateerror=null;
        connection.pc.onconnectionstatechange=null;
        connection.pc.oniceconnectionstatechange=null;
        connection.pc.onicegatheringstatechange=null;
        connection.pc.onnegotiationneeded=null;
        connection.pc.onsignalingstatechange=null;
        connection.pc.ontrack=null;
        
        if(typeof connection.pc.close=='function' && connection.pc.connectionState!=='closed'){
          try{
            connection.pc.close();
          } catch (error) {
            ev.emit('error', error);
          }
        }
        
        connection.pc=null;
        ev.emit('close');
      }
    }
    
    function set_auth_verified(is_ok){
      if(is_ok==true){
        connection.auth_verified=true;
      }
    }
    
    function setConfiguration(opts2){
      
      if('iceServers' in opts2 && opts2.iceServers.length>0){
        connection.pc_config.iceServers=opts2.iceServers;
      }else{
        connection.pc_config.iceServers=[{ urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun.stunprotocol.org:3478',
        'stun:global.stun.twilio.com:3478'
        ] }];
      }

      if('certificates' in opts2){
        connection.pc_config.certificates=opts2.certificates;
      }

      if('iceCandidatePoolSize' in opts2){
        connection.pc_config.iceCandidatePoolSize=opts2.iceCandidatePoolSize;
      }else{
        connection.pc_config.iceCandidatePoolSize=1;
      }

      if('bundlePolicy' in opts2){
        connection.pc_config.bundlePolicy=opts2.bundlePolicy;
      }else{
        connection.pc_config.bundlePolicy='max-bundle';
      }

      if('rtcpMuxPolicy' in opts2){
        connection.pc_config.rtcpMuxPolicy=opts2.rtcpMuxPolicy;
      }else{
        connection.pc_config.rtcpMuxPolicy='require';
      }

      if('sdpSemantics' in opts2){
        connection.pc_config.sdpSemantics=opts2.sdpSemantics;
      }else{
        connection.pc_config.sdpSemantics='unified-plan';
      }

      if('portRange' in opts2){
        connection.pc_config.portRange=opts2.portRange;
      }

      

      if(connection.pc){
        connection.pc.setConfiguration(connection.pc_config);
      }
    }

    if(typeof opts=='object'){
      setConfiguration(opts);
    }
    
    function send_candidate(candidate_json){

      if(candidate_json.candidate && candidate_json.candidate.length>0){

        try{
          var p = parse_candidate(candidate_json.candidate);

          if(p.ufrag==null && 'usernameFragment' in candidate_json){
            p.ufrag=candidate_json.usernameFragment;
          }

          var uint8buffer = encode_candidate_binary(p, candidate_json.sdpMid, candidate_json.sdpMLineIndex, candidate_json.ufrag);

          send_signal(10,uint8buffer);

        }catch(error){

          var uint8buffer=new TextEncoder().encode(JSON.stringify(candidate_json));

          send_signal(9,uint8buffer);

        }

      }
      

      
    }

    cert_wrtc_acquire_shared_certificate(function(error, cert){

      if(!error && cert && 'certificates' in connection.pc_config==false){
        connection.pc_config.certificates=[cert];
      }

      try {

        connection.pc = new RTCPeerConnection(connection.pc_config);

        connection.pc.onicecandidate = function(event){
          if(connection.pc){

            if (event.candidate==null || (event.candidate && 'usernameFragment' in event.candidate && event.candidate.usernameFragment.length<=0)) {
              
              send_total_candidates();

            }else{

              if(connection.local_support_trickle_ice==null){
                connection.local_support_trickle_ice=true;
              }


              if('toJSON' in event.candidate && typeof event.candidate.toJSON=='function'){
                var candidate_json=event.candidate.toJSON();
              }else{
                var candidate_json=event.candidate;
              }

              if(event.candidate.type!=='host' || 1==2){
                send_candidate(candidate_json);
              }

              //list_gathered_local_candidates.push(event.candidate);
              //console.log(analyze_local_ice());

              var of_ufrag='default';
              if('usernameFragment' in candidate_json && candidate_json.usernameFragment.length>0){
                of_ufrag=candidate_json.usernameFragment;
              }else{
                var c=parse_candidate(candidate_json.candidate);
                if('ufrag' in c && c.ufrag.length>0){
                  of_ufrag=c.ufrag;
                }
              }
              if(of_ufrag in connection.list_gathered_local_candidates==false){
                connection.list_gathered_local_candidates[of_ufrag]=[];
              }
              connection.list_gathered_local_candidates[of_ufrag].push(event.candidate);

              analyze_local_candidates();

              
              
              

            }
          }
        };

        connection.pc.onicecandidateerror=function(event){
          //console.warn('ICE candidate error', event.url, event.errorCode, event.errorText);

          if (event.errorCode >= 300 && event.errorCode <= 699) {
            // Here this a standardized ICE error
            // Do something...
            //console.log(event);
            //send_restartIce(Number(wrtc_connection_id));

          } else if (event.errorCode >= 700 && event.errorCode <= 799) {
            // Here, the application perhaps didn't reach the server ?
            // Do something else...
            
          }else{

          }
        };

        connection.pc.oniceconnectionstatechange = function(){
          if(connection.pc && connection.pc.iceConnectionState=='closed'){
            close_connection();
          }
        };

        connection.pc.onconnectionstatechange = function(){
          if(connection.pc && connection.pc.connectionState=='closed'){
            close_connection();
          }
        };

        connection.pc.onicegatheringstatechange=function(event){
          if(connection.pc && connection.pc.connectionState!=='closed'){

            if(connection.pc.iceGatheringState && connection.pc.iceGatheringState!==null){
              
              if(connection.pc.iceGatheringState=='complete'){

                send_total_candidates();
                
              }
              //console.log(connection.list_gathered_local_candidates);
              

              //g_events.emit(['wrtc_ice_gathering_state',Number(wrtc_connection_id),pc.iceGatheringState]);
            }

          }
        };

        connection.pc.onnegotiationneeded = function(){
          
        };

        connection.pc.onsignalingstatechange = function(){

          set_connection_state({
            signaling_state: String(connection.pc.signalingState)+""
          });

        };

        connection.pc.ondatachannel = function(event){
          add_data_channel(event.channel);
        };

        connection.pc.ontrack = function(event){
          //console.log('ccccccccccccccccc');
          //console.log(event);
          /*
          var tr = e.transceiver;
          var mid = tr && tr.mid ? tr.mid : null;
          var logical_id = mid ? (logicalByMid[mid] || null) : null;
          var kind = (tr && tr.receiver && tr.receiver.track) ? tr.receiver.track.kind : null;
          try { ev.emit('newmediastream', e.streams[0], { logical_id: logical_id, mid: mid, kind: kind }); } catch(ex){}
          */
        };


        set_connection_state({
          signaling_state: String(connection.pc.signalingState)+""
        });

        if (connection.pending_remote_offer_sdp!==null && connection.signaling_state=='stable' && connection.negotiation_state==0){
          set_remote_offer();
        }else{
          var random_delay = 8 + Math.floor(Math.random() * 55); // 8–20ms
          connection.create_data_channel_timer=setTimeout(function(){
            connection.create_data_channel_timer=null;

            if(connection.pc && connection.pc.connectionState!=='closed'){
              if(connection.pc.sctp==null){
                create_data_channel();
              }
            }
          },random_delay);
        }

        

      } catch (error){
        ev.emit('error',error);
        ev.emit('close');
      }
    });

      var api = {
      connection: connection,
      on: function(name, fn){ ev.on(name, fn); },
      signal: on_signal_channel,
      stream: stream,
      addStream: addStream,
      removeStream: removeStream,
      addTrack: addTrack,
      removeTrack: removeTrack,
      send: data_channel_send_data,
      write: data_channel_send_data,
      set_auth_verified: set_auth_verified,
      setConfiguration: setConfiguration,
      restartIce: restartIce,
      close: close_connection,
      destroy: close_connection,
    };

    for (var k in api) { if (Object.prototype.hasOwnProperty.call(api,k)) this[k] = api[k]; }
    return this;
  }
  
  return StableWebRTC;
}));