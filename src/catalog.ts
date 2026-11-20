import {media,type Service} from './data'
const entries=[["b01","Design","Sobrancelhas",4000,20,"flow-design"],["b02","Design com henna","Sobrancelhas",5000,30,"henna"],["b03","Flow Brows","Sobrancelhas",null,null,"flow-brows"],["b04","Shadow","Micropigmentação",50000,60,"sombreada"],["b05","Fio a fio","Micropigmentação",40000,60,"fio-a-fio"],["b06","Micro labial","Micropigmentação",50000,120,"labial"],["b07","Design com buço","Sobrancelhas",5000,30,"flow-design"],["b08","Retoque de fio a fio","Micropigmentação",5000,30,"fio-a-fio"],["b09","Retoque de shadow depois de um ano","Micropigmentação",40000,50,"sombreada"]] as const
export const catalog:Service[]=entries.map(([suffix,name,category,price,duration],index)=>({
  id:'b4309d26-50b9-443e-9be7-69ae14727'+suffix,name,category,description:'',price_cents:price,duration,buffer:0,photo:null,
  active:true,booking_enabled:price!==null,position:index+1,pix:false,onsite:true,preparation:'',aftercare:'',restrictions:'',return_days:null,return_rules:'',payment_conditions:'',
}))
export function serviceArtwork(service:Service){
  const entry=entries.find(([suffix,name])=>service.id==='b4309d26-50b9-443e-9be7-69ae14727'+suffix||service.name===name)
  return service.photo||media('catalog/'+(entry?.[5]||'flow-design')+'.webp')
}
