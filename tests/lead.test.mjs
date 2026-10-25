// Testes do endpoint /api/diagnostico-lead com fetch simulado. Rodar: node tests/lead.test.mjs
import fs from 'fs'; import os from 'os'; import path from 'path'; import { fileURLToPath, pathToFileURL } from 'url'
const here = path.dirname(fileURLToPath(import.meta.url))
const tmp = path.join(os.tmpdir(), `nx-lead-${process.pid}.mjs`)
fs.copyFileSync(path.join(here, '..', 'api', 'diagnostico-lead.js'), tmp)
const { default: handler } = await import(pathToFileURL(tmp).href)
const calls=[]
globalThis.fetch=async (u,o)=>{calls.push([u, o && JSON.parse(o.body||'{}')]); return {ok:true,status:200,json:async()=>({contact:{id:'C1'},id:'E1'})}}
const mk=(body,origin='https://neuralops.com.br',ip='1.1.1.1')=>{const r={code:0,body:null,h:{}};return [{method:'POST',headers:{origin,'x-forwarded-for':ip},body},{setHeader:(k,v)=>r.h[k]=v,status(c){r.code=c;return this},json(b){r.body=b;return r},end(){return r}},r]}
const good={quizType:'saude',quizVersion:'saude-1.0',diagnosticId:'DABC123',answerCode:'0322_000000000',contact:{name:'Maria Silva',company:'Clínica X',role:'dono',email:'maria@clinica.com.br',whatsapp:'11999998888'},consents:{privacy:{accepted:true,purpose:'p',at:'2026-10-25'},marketing:{accepted:false}},answers:[{id:'S01',question:'Tipo',answer:'Popular'}],scores:[{id:'velocidade',label:'Velocidade',score:67}],topDimension:'Velocidade e cobertura',commercial:{total:9,tier:'alta',points:{faturamento:3,urgencia:3,complexidade:2,papel:1}},utm:{utm_source:'meta',utm_campaign:'Clinicas Nov'},formMs:9000,summary:{title:'t',recommendations:['a','b']}}
const run=async(label,args,env={})=>{Object.assign(process.env,env);const [q,s,r]=args;await handler(q,s);console.log(label, r.code, JSON.stringify(r.body))}
delete process.env.GHL_API_KEY
await run('sem destino ->', mk(good))
process.env.GHL_API_KEY='x'; process.env.RESEND_API_KEY='y'
await run('ok ->', mk(good,undefined,'2.2.2.2'))
console.log('  ghl tags:', calls.find(c=>c[0].includes('upsert'))[1].tags.join(','))
console.log('  phone:', calls.find(c=>c[0].includes('upsert'))[1].phone, ' note has url:', calls.find(c=>c[0].includes('notes'))[1].body.includes('#r=0322_000000000'))
await run('email ruim ->', mk({...good,contact:{...good.contact,email:'x@'}},undefined,'3.3.3.3'))
await run('sem aceite ->', mk({...good,consents:{privacy:{accepted:false}}},undefined,'4.4.4.4'))
await run('robo hp ->', mk({...good,hp:'spam'},undefined,'5.5.5.5'))
await run('robo rapido ->', mk({...good,formMs:300},undefined,'6.6.6.6'))
await run('origem ruim ->', mk(good,'https://evil.com','7.7.7.7'))
await run('codigo ruim ->', mk({...good,answerCode:'<script>'},undefined,'8.8.8.8'))
for(let i=0;i<7;i++){const [q,s,r]=mk({...good,contact:{...good.contact,email:'a@b.co'}},undefined,'9.9.9.9');await handler(q,s); if(i==6) console.log('rate limit 7a ->', r.code)}
fs.unlinkSync(tmp)
