import {LeadCapture} from "../../../../../components/app/lead-capture";
export default async function Page({params}:{params:Promise<{id:string}>}){const{id}=await params;return <LeadCapture id={id}/>}
