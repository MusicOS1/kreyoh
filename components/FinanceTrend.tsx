import {fmtKES} from "../lib/financeOfficeData";
import styles from "../app/finance-office/financeUi.module.css";
export default function FinanceTrend({data}:{data:{key:string;label:string;income:number;expense:number}[]}){
 const max=Math.max(1,...data.map(x=>Math.max(x.income,x.expense)));
 return <div className={styles.chart} aria-label="Recorded income and paid expenses by month">
  <div className={styles.chartLegend}><span><i className={styles.inDot}/> Money in</span><span><i className={styles.outDot}/> Money out</span></div>
  <div className={styles.chartBars}>{data.map(d=>
   <div className={styles.chartGroup} key={d.key} title={d.label+": "+fmtKES(d.income)+" in; "+fmtKES(d.expense)+" out"}>
    <div className={styles.barPair}>
      <span className={styles.inBar} style={{height:(d.income?Math.max(4,d.income/max*100):0)+"%"}}/>
      <span className={styles.outBar} style={{height:(d.expense?Math.max(4,d.expense/max*100):0)+"%"}}/>
    </div>
    <small>{d.label}</small>
   </div>)}</div>
 </div>;
}
