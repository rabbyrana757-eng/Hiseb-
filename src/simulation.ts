import type {GameState,Building} from './types';
export interface CityMetrics {population:number;happiness:number;income:number;expenses:number;powerSupply:number;powerNeed:number;waterSupply:number;waterNeed:number;jobs:number;jobNeed:number}
const configs:Record<string,{power:number;water:number;pop:number;jobs:number;income:number;expense:number}> = {
 house:{power:2,water:2,pop:12,jobs:0,income:120,expense:25},
 shop:{power:5,water:2,pop:0,jobs:8,income:450,expense:100},
 office:{power:8,water:3,pop:0,jobs:20,income:900,expense:180},
 park:{power:0,water:1,pop:0,jobs:2,income:0,expense:80},
 power:{power:-100,water:2,pop:0,jobs:5,income:0,expense:450},
 water:{power:5,water:-100,pop:0,jobs:3,income:0,expense:300},
 hospital:{power:12,water:8,pop:0,jobs:15,income:0,expense:250},
 school:{power:8,water:4,pop:0,jobs:12,income:0,expense:180}
};
export function calculateMetrics(buildings:Building[]):CityMetrics{
 let m:CityMetrics={population:100,happiness:75,income:0,expenses:0,powerSupply:0,powerNeed:0,waterSupply:0,waterNeed:0,jobs:0,jobNeed:0};
 for(const b of buildings){const c=configs[b.kind];const l=b.level;
  if(c.power<0)m.powerSupply+=Math.abs(c.power)*l;else m.powerNeed+=c.power*l;
  if(c.water<0)m.waterSupply+=Math.abs(c.water)*l;else m.waterNeed+=c.water*l;
  m.population+=c.pop*l;m.jobs+=c.jobs*l;m.income+=c.income*l;m.expenses+=c.expense*l;
 }
 const powerRatio=m.powerNeed?Math.min(1,m.powerSupply/m.powerNeed):1;
 const waterRatio=m.waterNeed?Math.min(1,m.waterSupply/m.waterNeed):1;
 const serviceCount=buildings.filter(b=>['hospital','school','park'].includes(b.kind)).length;
 m.happiness=Math.max(15,Math.min(100,Math.round(55+serviceCount*5+(powerRatio+waterRatio-2)*18)));
 m.income=Math.round(m.income+(m.population*2));
 m.expenses=Math.round(m.expenses+m.population*.45);
 return m;
}
export function advanceDay(state:GameState):GameState{
 const m=calculateMetrics(state.buildings);
 const powerRatio=m.powerNeed?Math.min(1,m.powerSupply/m.powerNeed):1;
 const waterRatio=m.waterNeed?Math.min(1,m.waterSupply/m.waterNeed):1;
 const net=Math.round(m.income-m.expenses);
 return {...state,day:state.day+1,money:Math.max(0,state.money+net),happiness:Math.max(15,Math.min(100,Math.round(m.happiness+(powerRatio<.5||waterRatio<.5?-3:1))))};
}
export function getBuildingInfo(kind:string):{name:string;cost:number;description:string}{
 const map:Record<string,{name:string;cost:number;description:string}>={
 house:{name:'আবাসিক বাড়ি',cost:8000,description:'১২ জন বাসিন্দার আবাসন; প্রতিদিন কর আয় করে।'},
 shop:{name:'দোকান',cost:18000,description:'৮টি চাকরি তৈরি করে এবং বাণিজ্যিক আয় দেয়।'},
 office:{name:'অফিস',cost:35000,description:'২০টি চাকরি ও বেশি বাণিজ্যিক আয়।'},
 park:{name:'পার্ক',cost:12000,description:'সন্তুষ্টি বাড়ায়, সামান্য পানি লাগে।'},
 power:{name:'বিদ্যুৎকেন্দ্র',cost:60000,description:'শহরে ১০০ ইউনিট বিদ্যুৎ সরবরাহ করে।'},
 water:{name:'পানির ট্যাংক',cost:40000,description:'শহরে ১০০ ইউনিট পানি সরবরাহ করে।'},
 hospital:{name:'হাসপাতাল',cost:70000,description:'স্বাস্থ্যসেবা ও নাগরিক সন্তুষ্টি বাড়ায়।'},
 school:{name:'স্কুল',cost:50000,description:'শিক্ষা ও নাগরিক সন্তুষ্টি বাড়ায়।'}
 };return map[kind]??{name:'রাস্তা',cost:500,description:'যাতায়াতের জন্য রাস্তা।'};
}
