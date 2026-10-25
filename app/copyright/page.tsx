import type {Metadata} from "next";
import Link from "next/link";
import LegalPageFrame, {type LegalSection} from "../../components/LegalPageFrame";
export const metadata:Metadata={
 title:"Copyright & Creative Rights",
 description:"FACKTS Music's approach to copyright, credits, splits, licensing and reporting infringing content.",
 alternates:{canonical:"/copyright"},
};
const sections:LegalSection[]=[
{id:"principle",label:"Creators keep their rights",content:<>
 <p>FACKTS Music supports the people who make music, not the appropriation of their work. Rights in a composition, lyrics, sound recording, beat, performance, photograph, artwork or music video can belong to different people or organisations.</p>
 <p>Uploading a work to FACKTS Music does not, by itself, assign its copyright to FACKTS Music or to the project lead. Other agreements, commissions, samples and licences can affect ownership, so do not assume every contributor owns the same rights.</p>
</>},
{id:"permissions",label:"Permission before publishing",content:<>
 <p>Before uploading or making a work public, ensure that you have lawful permission for the underlying composition, sound recording, featured performance, samples, images and video. Do not assume a credited producer, artist or photographer has cleared every necessary right.</p>
 <p>Private stems and rough mixes shared for authorised project work must not be redistributed, leaked, monetised or used to train outside tools without the permissions required by applicable agreements and law.</p>
</>},
{id:"credits-splits",label:"Credits, splits and contracts",content:<>
 <p>The platform may record who contributed to the music, proposed share percentages, review decisions and supporting documentation. These entries help collaboration; they do not automatically establish ownership, royalty entitlement, a binding contract or a legal assignment.</p>
 <p>Agreements about writers' shares, master ownership, licensing, revenue, distribution and visual rights should be confirmed by the relevant rights holders, preferably in suitable written contracts. A disagreement should be resolved before a disputed recording is commercially released.</p>
</>},
{id:"license",label:"Limited platform permission",content:<>
 <p>When an authorised person uploads content, they grant the limited non-exclusive permission necessary for the platform to store, secure, transcode, back up and show or play it to the audiences or collaborators they authorise. This permission does not authorise unrelated commercial exploitation, external DSP distribution, sale of masters or a transfer of moral rights.</p>
 <p>Content owners should retain copies of their original files and agreements. Removing or restricting access may be subject to lawful record-keeping and dispute requirements.</p>
</>},
{id:"notice",label:"Report suspected infringement",content:<>
 <p>If you believe music, photographs, video or another protected work is being used without permission, write to <a href="mailto:info@facktsafrica.co.ke?subject=FACKTS%20Music%20-%20Copyright%20Claim">info@facktsafrica.co.ke</a> with the subject <strong>FACKTS Music – Copyright Claim</strong>.</p>
 <p>Please include:</p>
 <ul><li>Your name and reliable contact details, and whether you act for the rights holder.</li>
 <li>A description of the copyrighted work and the rights concerned.</li>
 <li>The exact FACKTS Music URL, project or file details where the material appears.</li>
 <li>Evidence of ownership or authority, and the reasons you believe the use is unauthorised.</li>
 <li>A clear statement that the information supplied is accurate to the best of your knowledge.</li></ul>
 <p>A copyright complaint is different from a privacy request. For misuse of someone's personal image or information, also see our <Link href="/privacy">Privacy Notice</Link>.</p>
</>},
{id:"response",label:"Review, takedown and reply",content:<>
 <p>We will assess sufficiently detailed reports, seek clarification where appropriate and take proportionate action consistent with applicable law. Possible steps include restricting access while a claim is assessed, notifying the affected account, restoring content where a complaint is not substantiated, or referring a dispute to the relevant authorities.</p>
 <p>A person whose work was restricted may reply with their identity, the affected URL, evidence of permission or ownership, and an explanation for reconsideration. Do not submit a deliberately false or abusive notice. Review does not determine a final court ruling about ownership.</p>
</>},
{id:"performers-minors",label:"Performers, images and young creators",content:<>
 <p>Copyright permission is not necessarily the same as consent to publish someone's photograph, voice, personal details or performance. Obtain relevant releases, privacy permissions and, where necessary, valid parental or guardian involvement before publishing recorded material featuring children.</p>
</>},
{id:"resources",label:"Legal framework and guidance",content:<>
 <p>Kenyan copyright is governed by the <a href="https://new.kenyalaw.org/akn/ke/act/2001/12/eng%402022-04-22/source" target="_blank" rel="noopener noreferrer">Copyright Act (Cap. 130)</a>. The <a href="https://copyright.go.ke/" target="_blank" rel="noopener noreferrer">Kenya Copyright Board (KECOBO)</a> provides guidance and rights-related information. These public resources do not replace advice on a specific contract or infringement dispute.</p>
</>},
];
export default function CopyrightPage(){
return <LegalPageFrame eyebrow="RESPECT THE WORK · CREDIT THE PEOPLE" title="The rights behind every sound matter."
 lead="A transparent process for ownership, credits, licensing and copyright concerns across the FACKTS Music ecosystem." sections={sections}/>;
}
