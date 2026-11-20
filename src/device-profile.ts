export type DeviceContact={name:string;phone:string}
const key='studio-device-contact'
export function readContact():DeviceContact|null{
  try{const item=JSON.parse(localStorage.getItem(key)||'null');return item&&typeof item.name==='string'&&typeof item.phone==='string'&&item.name.length>=3?{name:item.name,phone:item.phone}:null}catch{return null}
}
export function saveContact(contact:DeviceContact){try{localStorage.setItem(key,JSON.stringify(contact))}catch{/* O cadastro online continua disponível. */}}
export function clearContact(){localStorage.removeItem(key)}
export function readDeviceBookings<T>(owner:string):T[]{
  try{const data=JSON.parse(localStorage.getItem('studio-bookings-'+owner)||'[]');return Array.isArray(data)?data:[]}catch{return []}
}
export function saveDeviceBookings<T>(owner:string,items:T[]){try{localStorage.setItem('studio-bookings-'+owner,JSON.stringify(items))}catch{/* O histórico permanece no servidor. */}}
