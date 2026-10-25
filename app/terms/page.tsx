import type {Metadata} from "next";
import Link from "next/link";
import LegalPageFrame, {type LegalSection} from "../../components/LegalPageFrame";
export const metadata:Metadata={
 title:"Terms of Use",
 description:"Terms for using FACKTS Music as a listener, creator, collaborator or platform administrator.",
 alternates:{canonical:"/terms"},
};
const sections:LegalSection[]=[
{id:"agreement",label:"The agreement",content:<>
 <p>These terms govern access to the FACKTS Music website, community, listening experience and available professional workspaces. FACKTS Music operates as part of FACKTS Africa. By creating or using an account, you agree to these terms; our <Link href="/privacy">Privacy Notice</Link> explains personal-data handling separately.</p>
 <p>If you are using the platform on behalf of a studio, group or company, you must have authority to represent it. Access to a particular music project may be governed by a separate invitation, collaboration agreement or contract.</p>
</>},
{id:"accounts",label:"Accounts, security and eligibility",content:<>
 <p>Give accurate account details, safeguard your credentials and do not impersonate another person. You are responsible for activities performed using your account except where the law provides otherwise. Report unauthorised access promptly.</p>
 <p>Young users may require a parent or guardian's participation and legally appropriate consent before an account or creative profile can be used. FACKTS Music may restrict unsafe or unlawful use while such arrangements are verified.</p>
</>},
{id:"roles",label:"Creative identities and permissions",content:<>
 <p>You may identify as an artist, producer, engineer, songwriter, manager, A&R professional, visual creator or another creative role. Choosing a category does not verify your profession or grant access to someone else's project.</p>
 <p>Professional verification, project invitations, assigned tasks and administrator authority are separate decisions. Project leads and administrators may only exercise permissions formally granted to them.</p>
</>},
{id:"content",label:"Your uploads and intellectual property",content:<>
 <p>You keep any rights you lawfully own in your original compositions, sound recordings, artwork, videos, images and other uploaded work. Uploading alone does <strong>not</strong> transfer copyright or prove that the uploader owns every underlying right.</p>
 <p>You must hold the necessary rights or permission to upload and share each file. This includes samples, instrumentals, beats, cover recordings, images, features and third-party performances. You give FACKTS Music only the limited non-exclusive technical permission needed to host, back up, process and display or stream your materials according to the settings and services you choose, and to provide access to authorised collaborators. Wider distribution, merchandising, royalty exploitation or transfer of ownership requires separate lawful authorisation.</p>
 <p>Credits and proposed splits in the platform are collaboration records; they are not automatically a signed contract, copyright assignment, or guarantee of payment. See the <Link href="/copyright">Copyright & Creative Rights Policy</Link>.</p>
</>},
{id:"conduct",label:"Community standards",content:<>
 <p>Respect people, privacy and creative work. Do not harass, threaten, defraud, impersonate others, upload unlawful or infringing material, expose private stems or messages without permission, attempt to defeat access controls, scrape protected data, or interfere with playback, accounts or the service.</p>
 <p>Only use project files for purposes authorised by that project. We may investigate credible reports and restrict content or account access when proportionate and legally appropriate, including to protect minors and intellectual property.</p>
</>},
{id:"collaboration",label:"Projects, splits and releases",content:<>
 <p>Project records can show collaborators, versions, stems, tasks, feedback, credits, split proposals and approvals. Each party remains responsible for checking and documenting what they are agreeing to. A project record must not be mistaken for an automatic assignment of another person's copyright.</p>
 <p>Payment processing, collective management, external music distribution and formal rights transfer are not promised unless an applicable service and separate agreement expressly provides them.</p>
</>},
{id:"service",label:"Availability and responsible use",content:<>
 <p>Features may change, be interrupted or have eligibility requirements. Do not rely on this platform as your only archive of irreplaceable master recordings or legal contracts. Where practicable, we will communicate material changes affecting active creators and their work.</p>
 <p>We aim to correct mistakes and keep records trustworthy, but uploaded information and claims made by users can be incomplete or disputed. Nothing here removes rights or remedies that cannot lawfully be excluded under Kenyan law.</p>
</>},
{id:"disputes",label:"Reports, law and contact",content:<>
 <p>Report a breach, disputed credit or access issue to <a href="mailto:info@facktsafrica.co.ke?subject=FACKTS%20Music%20-%20Terms%20or%20Dispute">info@facktsafrica.co.ke</a>. Copyright complaints follow our <Link href="/copyright">copyright reporting process</Link>; personal-data complaints follow our <Link href="/privacy">privacy process</Link>.</p>
 <p>These terms are intended to operate in accordance with Kenyan law, including applicable consumer, data-protection and copyright law. Any dispute-resolution arrangement in a separately signed project agreement must be evaluated on its own terms.</p>
</>},
{id:"updates",label:"Changes to terms",content:<>
 <p>We may update these terms to reflect platform changes or legal requirements. We should provide appropriate notice of material changes. Continued use cannot replace consent or acceptance where the law requires an affirmative choice.</p>
</>},
];
export default function TermsPage(){
return <LegalPageFrame eyebrow="FAIR RULES FOR THE WHOLE ROOM" title="Good music needs good agreements."
 lead="Simple, accountable terms for listeners, creators, collaborators and the people running the platform." sections={sections}/>;
}
