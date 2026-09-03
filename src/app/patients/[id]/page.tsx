"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api/client";
import { sessionStore } from "@/lib/auth/session";
type Result={patient:Record<string,string>;activity:Record<string,string>[]};
export default function PatientProfile(){const {id}=useParams<{id:string}>(),[data,setData]=useState<Result|null>(null),[error,setError]=useState('');useEffect(()=>{const s=sessionStore.get();if(s)api<Result>('patients.get',{patientId:id},s.token).then(setData).catch(e=>setError(e.message))},[id]);return <AppShell title="Patient profile"><div className="page-title"><div><div className="eyebrow">{data?.patient.PatientID||id}</div><h2>{data?.patient.FullName||'Loading patient…'}</h2><p className="subtle">{data?.patient.ContactNumber||'—'} · {data?.patient.Email||'No email'} · {data?.patient.Status||'—'}</p></div></div>{error&&<div className="form-error">{error}</div>}<section className="panel"><h3>Patient activity timeline</h3><div className="table-wrap"><table className="table"><thead><tr><th>Date/time</th><th>Action</th><th>Entity</th><th>Description</th></tr></thead><tbody>{data?.activity.length?data.activity.map(x=><tr key={x.ActivityID}><td>{x.CreatedAt}</td><td>{x.Action}</td><td>{x.Entity}</td><td>{x.Description}</td></tr>):<tr><td colSpan={4} className="empty">No activity recorded.</td></tr>}</tbody></table></div></section></AppShell>}
