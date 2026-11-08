import PublicMusicPage from '../../components/ecosystem/PublicMusicPage';
export const dynamic='force-dynamic';
export const metadata={title:'Discover music | FACKTS Music',description:'Listen to independent releases and discover the FACKTS creative community.'};
export default async function Listen({searchParams}:{searchParams:Promise<{tab?:string}>}){
 const tab=(await searchParams).tab;
 const initialTab=['For You','Artists','Albums & EPs','Shows','Billboard'].includes(tab||'')?tab:'For You';
 return <PublicMusicPage initialTab={initialTab}/>;
}
