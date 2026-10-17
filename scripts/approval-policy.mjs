export function assertRequiredReviewers(environment) {
  const rules=environment?.protection_rules;
  const rule=Array.isArray(rules)?rules.find(item=>item.type==="required_reviewers"):null;
  if(!rule || !Array.isArray(rule.reviewers) || !rule.reviewers.some(item=>["User","Team"].includes(item.type)&&Number.isInteger(item.reviewer?.id))) {
    throw Error("Production is closed: a real required-reviewer environment protection rule must exist.");
  }
}
