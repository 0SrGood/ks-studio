type InstallEvent = Event & {prompt:()=>Promise<unknown>;userChoice:Promise<{outcome:string}>}
let pending: InstallEvent | null=null
window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault()
  pending=event as InstallEvent
})
window.addEventListener('appinstalled',()=>{pending=null})
export async function requestInstallation() {
  if(!pending)return false
  const request=pending
  pending=null
  await request.prompt()
  await request.userChoice
  return true
}
