'use client';
import Link from 'next/link';
import {useTransition, type ComponentProps, type MouseEvent} from 'react';
import {selectProject} from '../app/projects/actions';

// Keep links accessible and preserve the mounted player. The existing project
// action checks membership, updates the cookie and invalidates stale RSC data.
export default function ProjectNavigationLink({onClick,prefetch,...props}:ComponentProps<typeof Link>){
 const [,startTransition]=useTransition();
 const entry=typeof props.href==='string' && props.href.startsWith('/project-entry?') ? new URL(props.href,'https://fackts.invalid') : null;
 function navigate(event:MouseEvent<HTMLAnchorElement>){
  onClick?.(event);
  if(!entry || event.defaultPrevented || event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || (props.target && props.target!=='_self'))return;
  event.preventDefault();
  const form=new FormData();
  form.set('project_id',entry.searchParams.get('project_id')||'');
  form.set('next',entry.searchParams.get('next')||'/member-dashboard');
  startTransition(async()=>{await selectProject(form);});
 }
 return <Link {...props} prefetch={entry?false:prefetch} onClick={navigate}/>;
}
