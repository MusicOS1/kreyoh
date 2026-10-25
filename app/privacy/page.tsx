import type {Metadata} from "next";
import Link from "next/link";
import LegalPageFrame, {type LegalSection} from "../../components/LegalPageFrame";
export const metadata:Metadata={
  title:"Privacy Notice & Data Rights",
  description:"How FACKTS Music uses personal information, protects privacy, and handles requests under Kenyan data-protection law.",
  alternates:{canonical:"/privacy"},
};
const mail="mailto:info@facktsafrica.co.ke?subject=FACKTS%20Music%20-%20Data%20Rights%20Request";
const sections:LegalSection[]=[
 {id:"who-we-are",label:"Who is responsible",content:<>
   <p>FACKTS Music is a music community and creative-project platform operated within FACKTS Africa, based in Nairobi, Kenya. For enquiries about how your information is processed, contact <a href={mail}>info@facktsafrica.co.ke</a>.</p>
   <p>This notice describes the platform's intended and observed data practices. The formal legal identity of the responsible controller, any appointed Data Protection Officer, and ODPC registration details must be confirmed as part of the platform's compliance review.</p>
 </>},
 {id:"what-we-collect",label:"Information we handle",content:<>
   <p>Depending on how you use FACKTS Music, records may include:</p>
   <ul>
    <li><strong>Account and identity:</strong> name, email, selected creative disciplines, account identifiers and authentication/session information.</li>
    <li><strong>Professional and project records:</strong> stage name, biography, location where provided, portfolio, skills, project memberships, invitations, tasks, production sessions, approvals, credits and proposed revenue splits.</li>
    <li><strong>Creative materials:</strong> uploaded audio, music artwork, stems, video, photos, comments, revision notes and other files shared in a project or with the community.</li>
    <li><strong>Communications and preferences:</strong> messages, follows, listening/library actions, moderation reports and contact or partnership enquiries.</li>
    <li><strong>Technical information:</strong> information needed for sign-in, service security, error investigation and the operation of the website.</li>
   </ul>
   <p>Password authentication is provided using our account infrastructure; do not send passwords to FACKTS staff. Public-facing creator profiles can include information you choose to publish. Private project materials are not automatically public simply because they are uploaded.</p>
 </>},
 {id:"why",label:"Why and how we use it",content:<>
   <p>We process information to create and protect accounts, provide music discovery, show your chosen public profile, operate invited project workspaces, communicate about projects and requests, attribute creative contributions, handle disputes and maintain security. We also use details submitted through public forms to answer enquiries and coordinate partnerships.</p>
   <p>Depending on the activity, processing may rely on providing a requested service or performing an agreement, complying with the law, legitimate interests balanced against your rights, or your consent when consent is legally required. Publicity, optional marketing and other consent-based uses require their own appropriate choice; accepting platform terms is not a blanket consent to every future use of your data.</p>
 </>},
 {id:"sharing",label:"Who sees or receives information",content:<>
   <p>Your information may be visible to other members when you publish it, and to project collaborators and administrators when required by their authorised roles. We also rely on service providers for account authentication, hosting, file storage, communications and connected enquiry/CRM handling. Access should be limited to the work those providers are authorised to do.</p>
   <p>Some providers or infrastructure may process data outside Kenya. Transfers must be assessed for applicable safeguards and data-protection requirements before we represent them as compliant. We do not claim that all processing takes place inside Kenya.</p>
 </>},
 {id:"cookies",label:"Cookies and local storage",content:<>
   <p>Authentication and session technology is needed to keep you signed in, secure your account, remember permitted workspace choices and maintain listening continuity. Where optional measurement, personalisation or non-essential tracking technologies are introduced, they must be assessed and, where necessary, subject to appropriate notice and consent controls.</p>
   <p>Browser settings may let you remove stored data, but disabling essential session storage can interrupt sign-in or playback. This notice is not evidence that an optional-cookie consent system already exists.</p>
 </>},
 {id:"rights",label:"Your data rights",content:<>
   <p>Kenyan data-protection law gives individuals rights that include being informed, accessing their personal data, objecting to processing, and requesting correction or deletion where the legal conditions apply.</p>
   <p>To make a request, email <a href={mail}>info@facktsafrica.co.ke</a> with the subject <strong>FACKTS Music – Data Rights Request</strong>. Identify your account and describe what you need. We may take reasonable steps to confirm you control the account before sharing or altering personal data; please do not send sensitive documents unless requested through a secure channel.</p>
   <p>Requests to delete an account or data will be assessed alongside applicable legal retention duties and other people's rights, including legitimate copyright, project and audit records. You may also <a href="https://www.odpc.go.ke/file-a-complaint/" target="_blank" rel="noopener noreferrer">raise a concern with Kenya's ODPC</a>.</p>
 </>},
 {id:"retention-security",label:"Retention and safeguards",content:<>
   <p>Information should be kept only as long as needed for the purpose collected or for applicable legal, security, accounting or dispute obligations. The detailed retention schedule, backups, cross-border transfer inventory and deletion procedures require operational approval before specific periods can be promised.</p>
   <p>Our intended safeguards include account-based access, separated professional permissions, project membership controls and audit records. No online service can guarantee absolute security. If you suspect an account compromise or a privacy incident, contact us promptly.</p>
 </>},
 {id:"children-updates",label:"Young creators and changes",content:<>
   <p>Young people may need a parent or guardian's involvement before personal information or images are submitted. We must establish appropriate age-assurance and parental-consent procedures before supporting children's profiles, recordings or marketing materials at scale.</p>
   <p>We may update this notice as services or legal obligations change. Material changes should be communicated appropriately, not silently converted into new permissions.</p>
 </>},
];
export default function PrivacyPage(){
 return <LegalPageFrame eyebrow="YOUR RIGHTS · YOUR DATA" title="Privacy should be built in, not buried."
 lead="We believe the people behind the music deserve clarity and control over their information." sections={sections}/>;
}
