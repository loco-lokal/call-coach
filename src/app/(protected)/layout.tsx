import {requireSession} from "../../lib/auth";
export const dynamic="force-dynamic";
export default async function Protected({children}:{children:React.ReactNode}){await requireSession();return children}
