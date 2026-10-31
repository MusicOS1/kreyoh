"use client";
import {useEffect} from "react";
import {reportClientDiagnostic} from "../components/ClientDiagnosticReporter";
export default function AppError({error,reset}:{error:Error & {digest?:string};reset:()=>void}) {
  useEffect(()=>{reportClientDiagnostic("render_error",error?.name);},[error]);
  return <main className="content" role="alert"><h1>We couldn’t load this page.</h1><p>Check your connection and try again. A connection problem does not mean you signed out.</p><button className="login-submit-btn" onClick={reset}>Try again</button></main>;
}
