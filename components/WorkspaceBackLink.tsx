'use client';
import Link from 'next/link';
import {usePathname, useSearchParams} from 'next/navigation';
import styles from './WorkspaceBackLink.module.css';

/* Contextual, explicit destinations avoid browser-back loops through sign-in or other apps. */
export default function WorkspaceBackLink(){
 const path=usePathname(),params=useSearchParams();
 let destination:{href:string;label:string}|null=null;
 if(path==='/projects')destination={href:'/home',label:'Back to my workspace'};
 else if(path==='/production'||path==='/workspace'||path==='/member-dashboard')destination={href:'/projects',label:'Back to projects'};
 else if(path==='/tracks'||path==='/studio-sessions'||path==='/professional-record')destination={href:'/home',label:'Back to my workspace'};
 else if(path==='/track-records'||path.startsWith('/track-records/'))destination={href:'/tracks',label:'Back to music'};
 else if(path==='/splits'&&!params.has('track'))destination={href:'/home',label:'Back to my workspace'};
 else if(path==='/people'||path==='/beats'||path==='/tasks'||path==='/documents')destination={href:'/projects',label:'Back to projects'};
 // The split detail already has an "All songs" back link in its own header.
 if(!destination)return null;
 return <nav className={styles.back} aria-label="Back navigation"><Link href={destination.href}><span aria-hidden="true">←</span>{destination.label}</Link></nav>;
}
