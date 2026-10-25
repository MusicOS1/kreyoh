import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(name)=>readFileSync(new URL("../"+name,import.meta.url),"utf8");
test("applicant and reviewer actions show inline feedback with independent permissions",()=>{
 const applicant=read("components/ProfessionalApplicationForm.tsx");
 const reviewer=read("components/ProfessionalReviewForm.tsx");
 const applicantAction=read("app/professional-onboarding/actions.ts");
 const reviewerAction=read("app/admin/(control)/professional-applications/actions.ts");
 assert.match(applicant,/useActionState\(saveProfessionalApplication/);
 assert.match(reviewer,/useActionState\(reviewProfessionalApplication/);
 assert.match(applicant,/role="alert"/);
 assert.match(reviewer,/role="alert"/);
 assert.match(applicantAction,/user_id:user.id/);
 assert.match(reviewerAction,/requireControlRoomPermission\("people"\)/);
 assert.match(reviewerAction,/app.user_id===reviewer.id/);
 assert.match(reviewerAction,/\.eq\("status",app.status\)/);
});
test("profession switching does not submit a different role in the same POST",()=>{
 const page=read("app/professional-onboarding/page.tsx");
 const form=read("components/ProfessionalApplicationForm.tsx");
 assert.match(page,/method="get" action="\/professional-onboarding"/);
 assert.match(form,/type="hidden" name="profession" value=\{profession\}/);
 assert.doesNotMatch(form,/<select name="profession"/);
});
test("applicant and Control Room review status history use one audit table",()=>{
 assert.match(read("app/professional-onboarding/page.tsx"),/from\("professional_application_events"\)/);
 assert.match(read("app/admin\/(control)\/professional-applications/page.tsx"),/from\("professional_application_events"\)/);
});
test("workspace CSS constrains desktop width and onboarding stays reachable",()=>{
 assert.match(read("components/ecosystem/EcosystemFrame.module.css"),/overflow-x: clip/);
 assert.match(read("components/ecosystem/EcosystemFrame.tsx"),/href="\/professional-onboarding"/);
});
