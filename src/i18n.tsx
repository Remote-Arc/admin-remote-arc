import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
type Locale = "en" | "zh";
const Context = createContext<{locale:Locale;setLocale:(value:Locale)=>void;tr:(en:string,zh:string)=>string}|null>(null);
export function I18nProvider({children}:{children:React.ReactNode}) {
  const [locale,setLocale]=useState<Locale>(()=>{try{return localStorage.getItem("remote-arc-locale")==="zh"?"zh":"en";}catch{return "en";}});
  useEffect(()=>{document.documentElement.lang=locale;try{localStorage.setItem("remote-arc-locale",locale);}catch{}},[locale]);
  const value=useMemo(()=>({locale,setLocale,tr:(en:string,zh:string)=>locale==="zh"?zh:en}),[locale]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useI18n(){const value=useContext(Context);if(!value)throw Error("I18nProvider required");return value;}
