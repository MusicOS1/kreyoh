"use client";

import {useMemo,useState} from 'react';

export type CreditDirectoryPerson={id:string;name:string;roles:string[]};
type CreditEntry={key:string;role:string;name:string;profileId:string|null};

const CREDIT_ROLES=[
 'Featured artist','Additional artist','Producer','Co-producer','Beatmaker',
 'Songwriter','Composer','Lyricist','Vocalist','Recording engineer',
 'Mixing engineer','Mastering engineer','Arranger','Instrumentalist',
 'Executive producer','A&R','Artwork designer','Photographer',
 'Videographer','Publisher','Label','Other',
] as const;

export default function ReleaseCreditsEditor({
 people,artistName,
}:{people:CreditDirectoryPerson[];artistName:string}){
 const [role,setRole]=useState<string>('Featured artist');
 const [customRole,setCustomRole]=useState('');
 const [source,setSource]=useState<'registered'|'external'>('registered');
 const [search,setSearch]=useState('');
 const [selectedId,setSelectedId]=useState('');
 const [externalName,setExternalName]=useState('');
 const [entries,setEntries]=useState<CreditEntry[]>([]);
 const [feedback,setFeedback]=useState('');

 const results=useMemo(()=>{
  const term=search.trim().toLocaleLowerCase();
  return people.filter(person=>!term||person.name.toLocaleLowerCase().includes(term)).slice(0,60);
 },[people,search]);
 const creditLines=[
  ...(artistName.trim()?[`Primary artist: ${artistName.trim()}`]:[]),
  ...entries.map(person=>`${person.role}: ${person.name}`),
 ];
 const credits=creditLines.join('\n');
 const effectiveRole=role==='Other'?customRole.trim():role;
 const selectedPerson=people.find(person=>person.id===selectedId);
 const effectiveName=source==='registered'?selectedPerson?.name||'':externalName.trim();
 const canAdd=Boolean(effectiveRole&&effectiveName);
 const addEntry=()=>{
  if(!canAdd){setFeedback('Select a registered creative or type the external collaborator’s name.');return;}
  if(effectiveRole.length>55||effectiveName.length>100){setFeedback('Keep role and credit names short.');return;}
  const normalized=`${effectiveRole.toLocaleLowerCase()}|${effectiveName.toLocaleLowerCase()}`;
  if(entries.some(entry=>`${entry.role.toLocaleLowerCase()}|${entry.name.toLocaleLowerCase()}`===normalized)){
   setFeedback('This contributor is already credited in that role.');return;
  }
  const next=[...entries,{key:crypto.randomUUID(),role:effectiveRole,name:effectiveName,profileId:source==='registered'?selectedId:null}];
  const nextCredits=[...(artistName.trim()?[`Primary artist: ${artistName.trim()}`]:[]),...next.map(p=>`${p.role}: ${p.name}`)].join('\n');
  if(nextCredits.length>2000){setFeedback('The credits exceed 2,000 characters. Remove or shorten an entry.');return;}
  setEntries(next);setFeedback('');setSelectedId('');setSearch('');setExternalName('');setCustomRole('');
 };
 return <section className="fm-credits-editor" aria-label="Song credits">
  <h3>Credits & collaborators</h3>
  <p>Add each contributor by role. Choose someone already on FACKTS Music or type the name of a collaborator who isn't registered.</p>
  <div className="fm-credits-primary"><strong>Primary artist</strong><span>{artistName.trim()||'Enter the artist / act name above'}</span></div>
  <div className="fm-credits-fields">
   <label>Contribution role
    <select value={role} onChange={event=>{setRole(event.target.value);setFeedback('');}}>
     {CREDIT_ROLES.map(item=><option value={item} key={item}>{item}</option>)}
    </select>
   </label>
   {role==='Other'&&<label>Custom credit role<input value={customRole} maxLength={55} onChange={event=>setCustomRole(event.target.value)} placeholder="e.g. Choir director"/></label>}
   <label>Contributor
    <select value={source} onChange={event=>{setSource(event.target.value as 'registered'|'external');setSelectedId('');setFeedback('');}}>
     <option value="registered">FACKTS Music creative</option>
     <option value="external">Not on FACKTS — enter name</option>
    </select>
   </label>
   {source==='registered'?<>
    <label>Find a FACKTS creative<input type="search" value={search} onChange={event=>{setSearch(event.target.value);setSelectedId('');}} placeholder="Search by artist or stage name" autoComplete="off"/></label>
    <label>Choose account
     <select value={selectedId} onChange={event=>setSelectedId(event.target.value)}>
      <option value="">Select a creative</option>
      {results.map(person=><option key={person.id} value={person.id}>{person.name}{person.roles.length?' · '+person.roles.slice(0,2).join(', '):''}</option>)}
     </select>
    </label>
    {!results.length&&<p className="fm-credits-hint">No public creative matches. Choose “Not on FACKTS” above to enter their name.</p>}
   </>:<label>Contributor’s credited name
    <input value={externalName} onChange={event=>setExternalName(event.target.value)} maxLength={100} placeholder="Name as it should appear on the release" autoComplete="off"/>
   </label>}
  </div>
  <button type="button" className="fm-credits-add" onClick={addEntry} disabled={!canAdd}>+ Add credit</button>
  {feedback&&<p role="status" className="fm-credits-hint">{feedback}</p>}
  {entries.length>0&&<div className="fm-credits-added">
   <h4>Added credits ({entries.length})</h4>
   <ul>{entries.map(entry=><li key={entry.key}>
    <span><strong>{entry.role}</strong><span>{entry.name}</span>{entry.profileId&&<small>FACKTS Music account</small>}</span>
    <button type="button" aria-label={`Remove ${entry.name} as ${entry.role}`} title="Remove credit" onClick={()=>setEntries(current=>current.filter(item=>item.key!==entry.key))}>×</button>
   </li>)}</ul>
  </div>}
  <input type="hidden" name="credits" value={credits}/>
  <p className="fm-credits-hint">Credits are acknowledgements of contribution, not agreements on royalties or ownership. Confirm all names and permissions before submitting.</p>
  {credits.length>2000&&<p role="alert">Credits are too long ({credits.length}/2000 characters). Remove a credit before submitting.</p>}
 </section>;
}
