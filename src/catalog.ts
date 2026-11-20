import { media, type Service } from './data'

const options = [
  [
    "b4309d26-50b9-443e-9be7-69ae14727b01",
    "Flow Design",
    "Sobrancelhas",
    "Design de sobrancelhas com atenção ao formato do rosto e ao acabamento dos fios.",
    "flow-design"
  ],
  [
    "b4309d26-50b9-443e-9be7-69ae14727b02",
    "Henna para sobrancelhas",
    "Sobrancelhas",
    "Aplicação de henna para realçar o desenho das sobrancelhas.",
    "henna"
  ],
  [
    "b4309d26-50b9-443e-9be7-69ae14727b03",
    "Flow Brows",
    "Sobrancelhas",
    "Técnica do Studio para valorizar o desenho e a expressão das sobrancelhas.",
    "flow-brows"
  ],
  [
    "b4309d26-50b9-443e-9be7-69ae14727b04",
    "Sobrancelhas sombreadas",
    "Micropigmentação",
    "Técnica de micropigmentação com efeito sombreado nas sobrancelhas.",
    "sombreada"
  ],
  [
    "b4309d26-50b9-443e-9be7-69ae14727b05",
    "Micropigmentação fio a fio",
    "Micropigmentação",
    "Técnica que desenha fios para preencher visualmente as sobrancelhas.",
    "fio-a-fio"
  ],
  [
    "b4309d26-50b9-443e-9be7-69ae14727b06",
    "Micropigmentação labial",
    "Micropigmentação",
    "Procedimento de pigmentação para realçar a cor dos lábios.",
    "labial"
  ]
] as const
export const catalog:Service[]=options.map(([id,name,category,description],index)=>({
  id,name,category,description,price_cents:null,duration:null,buffer:0,photo:null,active:true,booking_enabled:false,position:index+1,
  pix:false,onsite:true,preparation:'',aftercare:'',restrictions:'',return_days:null,return_rules:'',payment_conditions:'',
}))

export function serviceArtwork(service:Service) {
  const artwork=options.find(([id,name])=>id===service.id||name===service.name)?.[4]
  return service.photo || (artwork ? media('catalog/'+artwork+'.webp') : media('ambient.webp'))
}

