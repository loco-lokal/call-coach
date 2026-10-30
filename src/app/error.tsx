"use client";
import {Button} from "../components/ui";
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="app-main"><h1>We couldn’t open this page.</h1><p>Call Coach may be temporarily unavailable. Your pending work stays on this device when recovery storage is available.</p><Button onClick={reset}>Try again</Button><a href="/login">Sign in</a></main>}
