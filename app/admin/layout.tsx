import type {Metadata} from "next";
import "./control-room.css";

export const metadata:Metadata={title:{default:"FACKTS Music Control Room",template:"%s | FACKTS Music Control Room"},description:"Private FACKTS Music management environment.",manifest:"/admin-manifest.webmanifest",robots:{index:false,follow:false,nocache:true,googleBot:{index:false,follow:false,noimageindex:true}}};

export default function AdminRootLayout({children}:{children:React.ReactNode}){return children}
