"use client";
import { AppShell } from "@/components/layout/AppShell";
import { RecordWorkspace } from "@/components/records/RecordWorkspace";
import { FilesWorkspace } from "@/components/records/FileWorkspaces";
import { ActivityWorkspace, ReportsWorkspace } from "@/components/records/OperationsViews";
import { useParams } from "next/navigation";
const labels:Record<string,string>={consultations:'Consultations',assessments:'Assessments',procedures:'Procedures',photos:'Photos',followups:'Follow-ups',payments:'Payments',documents:'Documents',reports:'Reports',activity:'Activity Logs'};
export default function ModulePage(){const {module}=useParams<{module:string}>();if(['consultations','assessments','procedures','followups','payments'].includes(module))return <RecordWorkspace module={module}/>;if(module==='photos'||module==='documents')return <FilesWorkspace kind={module}/>;if(module==='activity')return <ActivityWorkspace/>;if(module==='reports')return <ReportsWorkspace/>;const title=labels[module]||'Module';return <AppShell title={title}><div className="page-title"><div><h2>{title}</h2><p className="subtle">This workspace is configured through the authorized clinic backend.</p></div></div><section className="panel"><h3>Configuration required</h3><p className="subtle">Deploy the Apps Script service, configure the clinic account, then use the patient profile to attach secure files and clinical history.</p></section></AppShell>}
