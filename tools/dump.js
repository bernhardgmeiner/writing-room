// node dump.js pack.json [--paths N] : prints task, all options per step (resolved per branch), and N random full paths per length (default 6)
const fs=require("fs"); const f=process.argv[2]; const P=JSON.parse(fs.readFileSync(f,"utf8"));
const ni=process.argv.indexOf("--paths"); const N=ni>0?+process.argv[ni+1]:6;
const gd={}; (P.gaps||[]).forEach(g=>gd[g.id]=g);
const strip=t=>t.replace(/\{\{|\}\}|\[\[|\]\]/g,"").replace(/\{([A-Z][A-Z0-9_]*)\}/g,(m,k)=>gd[k]?String(gd[k].default):m);
const show=t=>t; // keep markers
console.log(`# ${P.id} – ${P.title} (grade ${P.grade}, ${P.level}, ${P.textType}, ${P.theme})`);
console.log(`Modes: ${P.modes} | Lengths: ${JSON.stringify(P.lengths)} | Focus: ${P.focus.label} ${JSON.stringify(P.focus.min)} ${P.focus.note||""}`);
console.log(`TASK: ${P.task.situation}\n${P.task.instruction}\n- ${(P.task.points||[]).join("\n- ")}\n${JSON.stringify(P.task.words)}\nDE: ${P.task.de}`);
console.log(`META: ${JSON.stringify(P.meta||{})}\nGAPS: ${JSON.stringify(P.gaps||[])}\nORDER: ${P.order.join(", ")}`);
for(const st of P.steps){
  console.log(`\n## STEP ${st.id} [${st.part}] slot=${st.slot||"-"}\nQ: ${st.q}\nDE: ${st.de}${st.own?`\nOWN: ${st.own} / ${st.ownDe}`:""}${st.ownLong?`\nOWN (long): ${st.ownLong} / ${st.ownLongDe}`:""}`);
  for(const o of st.options){
    console.log(`  ${o.l}) ${o.id} – ${o.label}${o.trap?` [TRAP ${o.crit}] REJECT: ${o.reject} / ${o.rejectDe}`:` WHY: ${o.why||o.teaser||""}`}`);
    const t=o.text; if(t==null) continue;
    if(typeof t==="string") console.log(`     ${show(t)}`); else for(const [k,v] of Object.entries(t.map)) console.log(`     [${t.by}=${k}] ${show(v)}`);
    const tl=o.textLong; if(tl!=null){ if(typeof tl==="string") console.log(`     LONG: ${show(tl)}`); else for(const [k,v] of Object.entries(tl.map)) console.log(`     LONG [${tl.by}=${k}] ${show(v)}`); }
  }
}
console.log(`\nCHECKS: ${P.checks.map(c=>c.en).join(" | ")}\nTEACHER: ${JSON.stringify(P.teacher,null,1)}`);
function rnd(L){ const act=P.steps; const pk={}; for(const s of act){ const v=s.options.filter(o=>!o.trap); pk[s.id]=v[Math.floor(Math.random()*v.length)].id; }
  const out=[]; for(const slot of P.order){ const s=act.find(x=>x.slot===slot); if(!s) continue; const o=s.options.find(x=>x.id===pk[s.id]); let t=L==="long"&&o.textLong!=null?o.textLong:o.text; if(typeof t!=="string") t=t.map[pk[t.by]]; out.push(`[${s.part}] ${strip(t)}`); }
  const w=out.join(" ").replace(/\[[^\]]*\]/g," ").split(/\s+/).filter(x=>/[A-Za-z0-9]/.test(x)).length; return `PICKS ${JSON.stringify(pk)} (~${w} words)\n`+out.join("\n"); }
for(const L of Object.keys(P.lengths)) for(let i=0;i<N;i++) console.log(`\n=== RANDOM PATH ${L} #${i+1}\n${rnd(L)}`);
