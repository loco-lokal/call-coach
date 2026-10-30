export const dynamic="force-dynamic";
export async function GET(){try{const r=await fetch(`${process.env.INTERNAL_API_URL||"http://api:8080"}/readyz`,{cache:"no-store",signal:AbortSignal.timeout(3000)});return Response.json({status:r.ok?"ready":"unavailable"},{status:r.ok?200:503})}catch{return Response.json({status:"unavailable"},{status:503})}}
