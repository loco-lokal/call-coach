import {WorkflowEditor} from "../../../../components/app/workflow-editor";
export default async function Page({params}:{params:Promise<{id:string}>}){const{id}=await params;return <WorkflowEditor id={id}/>}
