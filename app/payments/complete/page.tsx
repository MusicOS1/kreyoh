import PaymentReturn from "../PaymentReturn";
import styles from "../payments.module.css";

export default async function PaymentComplete({searchParams}:{searchParams:Promise<{reference?:string}>}){
  const {reference}=await searchParams;
  return <main className={styles.checkoutRoot}><section className={styles.checkoutCard}>
    <div className={styles.brand}>FACKTS <span>MUSIC</span></div>
    <h1>Payment verification</h1>
    <PaymentReturn reference={reference||""}/>
  </section></main>;
}
