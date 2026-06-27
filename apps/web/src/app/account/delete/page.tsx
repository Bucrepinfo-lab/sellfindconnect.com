"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
type Step = "CONFIRM"|"REASON"|"SCHEDULED"|"CANCELLED";
const REASONS = ["I no longer need SellFindConnect","I have privacy concerns","The service did not meet my needs","I am switching to another platform","Other"];
export default function AccountDeletionPage() {
  const router = useRouter();
  const [step,setStep] = useState<Step>("CONFIRM");
  const [reason,setReason] = useState("");
  const [date,setDate] = useState("");
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const getDate=()=>{const d=new Date();d.setDate(d.getDate()+30);return d.toLocaleDateString("en-KE",{year:"numeric",month:"long",day:"numeric"});};
  const handleRequest=async()=>{setLoading(true);setError("");try{const r=await fetch("/api/v1/privacy/deletion",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reason})});if(!r.ok)throw new Error((await r.json()).message??"failed");setDate(getDate());setStep("SCHEDULED");}catch(e:any){setError(e.message);}finally{setLoading(false);}};
  const handleCancel=async()=>{setLoading(true);setError("");try{const r=await fetch("/api/v1/privacy/deletion",{method:"DELETE"});if(!r.ok)throw new Error((await r.json()).message??"failed");setStep("CANCELLED");}catch(e:any){setError(e.message);}finally{setLoading(false);}};
  return (
    <div className="sfc-delete"><div className="sfc-delete__card">
      {step==="CONFIRM"&&<><span className="sfc-delete__icon sfc-delete__icon--warn">&#9888;</span><h1 className="sfc-delete__title">Delete your account?</h1><p className="sfc-delete__body">This permanently deletes your profile, adverts, conversations, and media after a 30-day grace period.</p><ul className="sfc-delete__list"><li>Profile and adverts unpublished immediately</li><li>Data erased after <strong>30-day grace period</strong></li><li>Cancel any time before grace period ends</li><li>Active subscriptions not refunded</li></ul>{error&&<p className="sfc-delete__error" role="alert">{error}</p>}<div className="sfc-delete__actions"><button className="sfc-delete__btn sfc-delete__btn--ghost" onClick={()=>router.back()}>Keep my account</button><button className="sfc-delete__btn sfc-delete__btn--danger" onClick={()=>setStep("REASON")}>Continue</button></div></>}
      {step==="REASON"&&<><h1 className="sfc-delete__title">Why are you leaving?</h1><p className="sfc-delete__body">Optional — helps us improve.</p><div className="sfc-delete__reasons" role="radiogroup">{REASONS.map(r=><label key={r} className={"sfc-delete__reason"+(reason===r?" sfc-delete__reason--selected":"")}><input type="radio" name="reason" value={r} checked={reason===r} onChange={()=>setReason(r)}/>{r}</label>)}</div>{error&&<p className="sfc-delete__error" role="alert">{error}</p>}<div className="sfc-delete__actions"><button className="sfc-delete__btn sfc-delete__btn--ghost" onClick={()=>setStep("CONFIRM")}>Back</button><button className="sfc-delete__btn sfc-delete__btn--danger" onClick={handleRequest} disabled={loading}>{loading?"Scheduling...":"Schedule deletion"}</button></div></>}
      {step==="SCHEDULED"&&<><span className="sfc-delete__icon sfc-delete__icon--ok">&#10003;</span><h1 className="sfc-delete__title">Deletion scheduled</h1><p className="sfc-delete__body">Account will be permanently deleted on <strong>{date}</strong>. You can cancel before that date.</p>{error&&<p className="sfc-delete__error" role="alert">{error}</p>}<div className="sfc-delete__actions"><button className="sfc-delete__btn sfc-delete__btn--ghost" onClick={handleCancel} disabled={loading}>{loading?"Cancelling...":"Cancel deletion"}</button><button className="sfc-delete__btn sfc-delete__btn--primary" onClick={()=>router.push("/dashboard")}>Go to dashboard</button></div></>}
      {step==="CANCELLED"&&<><span className="sfc-delete__icon sfc-delete__icon--ok">&#10003;</span><h1 className="sfc-delete__title">Deletion cancelled</h1><p className="sfc-delete__body">Your deletion has been cancelled. Everything is back to normal.</p><div className="sfc-delete__actions"><button className="sfc-delete__btn sfc-delete__btn--primary" onClick={()=>router.push("/dashboard")}>Go to dashboard</button></div></>}
    </div></div>
  );
}
