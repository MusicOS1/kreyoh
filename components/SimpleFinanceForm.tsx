'use client';
import {useActionState} from 'react';
import {recordSimpleTransaction} from '../app/finance/actions';
import styles from './SimpleFinance.module.css';
export default function SimpleFinanceForm({tracks,members}:{tracks:{id:string;name:string}[];members:{id:string;name:string}[]}){
 const [state,action,pending]=useActionState(recordSimpleTransaction,{message:''});
 return <form action={action} className={styles.form} aria-label="Record project transaction"><label>Type<select aria-label="Type" name="kind"><option value="income">Income</option><option value="expense">Expense</option></select></label><label>Amount (KES)<input name="amount" type="number" required min="0.01" step="0.01"/></label><label>Date<input name="date" type="date" required defaultValue={new Date().toISOString().slice(0,10)}/></label><label>Description<input name="description" required maxLength={500}/></label><label>Category<input name="category" required maxLength={100} placeholder="Recording, transport, sales…"/></label><label>Track (optional)<select name="track_id"><option value="">Project-wide</option>{tracks.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><label>Member (optional)<select name="member_user_id"><option value="">None</option>{members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label><button disabled={pending}>{pending?'Saving…':'Save transaction'}</button>{state.message&&<p role="status">{state.message}</p>}</form>;
}
