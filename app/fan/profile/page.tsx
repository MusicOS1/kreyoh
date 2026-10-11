import Link from "next/link";
import {getWorkspace} from "../../../lib/workspace";
import FanShell from "../../../components/FanShell";
import ProfilePhotoUpload from "../../../components/ProfilePhotoUpload";
import {saveFanProfile} from "./actions";

export const metadata={title:"Your fan profile | FACKTS Music"};
export default async function FanProfilePage({
  searchParams
}:{searchParams:Promise<{saved?:string;error?:string}>}){
  const params=await searchParams;
  const {user,profile}=await getWorkspace();
  const displayName=profile?.nickname||profile?.full_name||"Listener";
  const initial=displayName.trim()[0]?.toUpperCase()||"F";
  return <FanShell name={displayName} activeTab="Profile" avatarUrl={profile?.avatar_url} creatorMode={Boolean(profile?.creator_types?.some((type:string)=>type!=="Fan"))}>
    <main className="fan-profile-page">
      <div className="fan-profile-heading">
        <Link className="fan-back-link" href="/fan">← Back to your music</Link>
        <span className="fan-eyebrow">YOUR CORNER OF FACKTS</span>
        <h1>Make this space yours.</h1>
        <p>Your music, your people, your identity. Change your photo, the name fans see and the sounds that describe you.</p>
      </div>
      <div className="fan-profile-layout">
        <aside className="fan-profile-preview">
          <div className="fan-profile-preview-art"><span>FACKTS / COMMUNITY</span></div>
          <div className="fan-profile-preview-avatar">{profile?.avatar_url?<img src={profile.avatar_url} alt="Your profile photo"/>:initial}</div>
          <h2>{displayName}</h2>
          <p>{profile?.bio||"Your music story starts here."}</p>
          {profile?.location&&<span className="fan-profile-location">⌖ {profile.location}</span>}
          <span className="fan-profile-type">FACKTS Listener</span>
          <small>Profile preview · Changes appear after saving</small>
        </aside>
        <div className="fan-profile-form-area">
          {params.saved==="1"&&<div role="status" className="fan-profile-success">Your profile is updated. Welcome back.</div>}
          {params.error&&<div role="alert" className="fan-profile-error">{params.error}</div>}
          <section className="fan-profile-panel">
            <div className="fan-profile-section-head"><span>01 / YOUR IDENTITY</span><h2>Put a face to the music.</h2></div>
            <ProfilePhotoUpload userId={user.id} currentAvatarUrl={profile?.avatar_url} fallbackText={initial} helperText="Let other fans recognise you around FACKTS."/>
          </section>
          <form action={saveFanProfile} className="fan-profile-panel fan-profile-form">
            <div className="fan-profile-section-head"><span>02 / ABOUT YOU</span><h2>Tell the community who you are.</h2></div>
            <div className="fan-profile-fields">
              <label>Full name <input name="full_name" type="text" required minLength={2} maxLength={90} autoComplete="name" defaultValue={profile?.full_name||""} placeholder="Your full name"/></label>
              <label>Display name <input name="nickname" maxLength={40} defaultValue={profile?.nickname||""} placeholder="What should other fans call you?"/></label>
              <label className="fan-profile-wide">Your story <textarea name="bio" maxLength={280} rows={4} defaultValue={profile?.bio||""} placeholder="The sounds you love, your favourite artists, your city…"/></label>
              <label>Location <input name="location" maxLength={80} defaultValue={profile?.location||""} placeholder="Nairobi, Kenya"/></label>
              <label>Music interests <input name="music_tastes" defaultValue={(profile?.skills_genres||[]).join(", ")} placeholder="Afrobeats, gengetone, soul"/></label>
              <label className="fan-profile-wide">Social profile (optional) <input name="social_url" type="url" defaultValue={profile?.social_links?.primary||""} placeholder="https://instagram.com/yourname"/></label>
              <label className="fan-profile-wide">Who can see your profile?
                <select name="visibility" defaultValue={profile?.profile_visibility==="public"?"public":"project"}>
                  <option value="project">Members only</option>
                  <option value="public">Public and discoverable</option>
                </select>
              </label>
            </div>
            <p className="fan-profile-privacy">Your email ({user.email}) is private. Fans cannot edit their account roles or access anyone else’s profile.</p>
            <div className="fan-profile-form-actions"><Link href="/fan">Cancel</Link><button type="submit">Save changes <span aria-hidden="true">↗</span></button></div>
          </form>
        </div>
      </div>
    </main>
  </FanShell>;
}
