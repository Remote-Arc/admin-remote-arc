import { assertRequiredReviewers } from "./approval-policy.mjs";
let body="";for await(const part of process.stdin)body+=part;
try{assertRequiredReviewers(JSON.parse(body));console.log("Verified required production reviewers.");}
catch(error){console.error(error.message);process.exitCode=1;}
