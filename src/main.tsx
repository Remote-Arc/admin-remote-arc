import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { AdminConsole } from "./admin/admin-console.js";
import { I18nProvider, useI18n } from "./i18n.js";
import { ThemeProvider, useTheme } from "./theme.js";
import "./base.css";
function App() {
  const {tr,locale,setLocale}=useI18n();const {resolvedTheme,setTheme}=useTheme();
  const preview=import.meta.env.VITE_ADMIN_PREVIEW==="1";
  const [state,setState]=useState<"loading"|"allowed"|"denied"|"unavailable">(preview?"allowed":"loading");
  useEffect(()=>{if(preview)return;const controller=new AbortController();void fetch("/api/me",{credentials:"same-origin",signal:controller.signal}).then(async response=>{if(!response.ok){setState(response.status===401||response.status===403?"denied":"unavailable");return;}const data=await response.json() as {user?:{isAdmin?:boolean}};setState(data.user?.isAdmin===true?"allowed":"denied");}).catch(()=>{if(!controller.signal.aborted)setState("unavailable");});return()=>controller.abort();},[preview]);
  if(state!=="allowed")return <main className="adminGate"><h1>{state==="loading"?tr("Checking admin access…","正在验证管理权限…"):state==="denied"?tr("Administrator access required","需要管理员权限"):tr("Admin service unavailable","管理服务暂不可用")}</h1><a href="https://mcp.remotearc.app/overview">{tr("Open your account","打开账户控制台")}</a></main>;
  return <><div className="adminUtilityBar"><span>{preview?tr("Preview · no private accounts connected","预览 · 未连接真实账户"):tr("Private administration","私有管理工作区")}</span><label><span className="srOnly">{tr("Language","语言")}</span><select value={locale} onChange={event=>setLocale(event.target.value as "en"|"zh")}><option value="en">English</option><option value="zh">中文</option></select></label><button onClick={()=>setTheme(resolvedTheme==="dark"?"light":"dark")}>{resolvedTheme==="dark"?tr("Light theme","浅色主题"):tr("Dark theme","深色主题")}</button></div><AdminConsole preview={preview}/></>;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><ThemeProvider><I18nProvider><App/></I18nProvider></ThemeProvider></React.StrictMode>);
