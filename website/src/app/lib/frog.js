#!/usr/bin/env node
// if the first argument is -e, encode the second argument
// if the first argument is -d, decode the second argument
m=process.argv[2]
s=process.argv.slice(3).join(' ')
e=t=>t.split('').map(c=>c.charCodeAt().toString(2).padStart(8,'0').replace(/0/g,'rib').replace(/1/g,'bit')).join(' ')
d=t=>t.split(' ').map(s=>String.fromCharCode(parseInt(s.match(/.{1,3}/g).map(x=>x=='rib'?'0':'1').join(''),2))).join('')
console.log(m=='-e'?e(s):d(s))