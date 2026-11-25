// Finance request catalog: recording a payment request never activates checkout.
// Only separately approved provider integrations may charge the payer.
export const FINANCE_REQUEST_TYPES=[
 {code:"platform_access",name:"Platform access / service fee",group:"platform",defaultAccount:"fackts_music" as const},
 {code:"artist_onboarding",name:"Artist onboarding / membership fee",group:"artist",defaultAccount:"fackts_music" as const},
 {code:"artist_service",name:"Artist services",group:"artist",defaultAccount:"fackts_music" as const},
 {code:"production_service",name:"Production or recording service",group:"service",defaultAccount:"fackts_music" as const},
 {code:"mix_mastering",name:"Mixing / mastering (partner service)",group:"service",defaultAccount:"fackts_music" as const},
 {code:"fan_membership",name:"Fan subscription / membership",group:"fan",defaultAccount:"fackts_music" as const},
 {code:"artist_support",name:"Fan support for an artist",group:"fan",defaultAccount:"project" as const},
 {code:"release_support",name:"Support a release",group:"fan",defaultAccount:"project" as const},
 {code:"sponsorship",name:"Sponsorship / partnership payment",group:"commercial",defaultAccount:"fackts_music" as const},
 {code:"commercial_opportunity",name:"Contracted opportunity / service payment",group:"commercial",defaultAccount:"fackts_music" as const},
 {code:"licensing",name:"Licensing / distribution service fee",group:"commercial",defaultAccount:"fackts_music" as const},
 {code:"other_approved",name:"Other approved platform service",group:"platform",defaultAccount:"fackts_music" as const},
] as const;
export type RequestCategory=typeof FINANCE_REQUEST_TYPES[number]["code"];
export const requestCategory=(code:string)=>FINANCE_REQUEST_TYPES.find(x=>x.code===code);
export function supportsRecurring(code:string){
 return code==="fan_membership"||code==="platform_access";
}
export function validateFinanceRequest(input:{
 category:string; account:string; projectId:string; recurrence:string;
 description:string;amount:number;email:string;expiry:string;
}){
 const category=requestCategory(input.category);
 if(!category)return "Select an approved reason for requesting payment.";
 if(input.account!=="fackts_music"&&input.account!=="project")return "Choose a receiving account.";
 if(input.account==="project"&&!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(input.projectId))
  return "Choose the artist or project that should receive this payment.";
 if(input.account==="fackts_music"&&input.projectId)return "Platform receipts must not be attached to a project-owned ledger.";
 if((input.category==="artist_support"||input.category==="release_support")&&input.account!=="project")
  return "Artist and release support must be linked to the correct project before any payment is offered.";
 if(!["one_time","monthly","yearly"].includes(input.recurrence))return "Choose a payment frequency.";
 if(input.recurrence!=="one_time"&&!supportsRecurring(input.category))
  return "Recurring charges are only a planned option for an approved platform or fan membership.";
 if(!Number.isInteger(input.amount)||input.amount<3||input.amount>1000000)
  return "Enter a fixed KES amount between 3 and 1,000,000.";
 if(input.description.length<5||input.description.length>400)
  return "Explain clearly what the payment is for.";
 if(input.email&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)||input.email.length>254))
  return "Enter a valid payer email.";
 if(input.expiry&&(!/^\d{4}-\d{2}-\d{2}$/.test(input.expiry)||Number.isNaN(Date.parse(input.expiry))))
  return "Choose a valid expiry date.";
 return null;
}
export function canOfferCheckout(status:string,purpose:string){
 // This request module records finance intent only. No category opens Paystack
 // without a separately approved payment provider / recurring plan integration.
 void status;void purpose;return false;
}
