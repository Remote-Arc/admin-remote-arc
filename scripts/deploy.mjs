import { execFileSync } from "node:child_process";
import { assertProductionContext } from "./deploy-policy.mjs";
import { assertRequiredReviewers } from "./approval-policy.mjs";
try {
  assertProductionContext(process.env);
  const protection=JSON.parse(execFileSync("gh",["api","/repos/"+process.env.GITHUB_REPOSITORY+"/environments/production"],{encoding:"utf8"}));
  assertRequiredReviewers(protection);
  const sha=process.env.GITHUB_SHA;
  const current=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
  const latest=execFileSync("git",["ls-remote","origin","refs/heads/master"],{encoding:"utf8"}).trim().split(/\s+/)[0];
  if(current!==sha||latest!==sha)throw Error("The approved candidate is not the latest master SHA.");
  execFileSync("pnpm",["exec","wrangler","deploy","--tag","gha-"+sha.slice(0,12)],{stdio:"inherit"});
} catch(error) { console.error(error.message); process.exitCode=2; }
