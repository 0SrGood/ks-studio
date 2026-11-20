import { releasePush } from './push'
import { database } from './studio'
import {clearContact} from './device-profile'

export async function signOutAccount(customer?:string) {
  if(customer)await releasePush(customer)
  const {error}=await database().auth.signOut()
  if(error)throw error
  clearContact()
}
