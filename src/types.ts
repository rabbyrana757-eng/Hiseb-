export type BuildingKind='house'|'shop'|'office'|'park'|'power'|'water'|'hospital'|'school';
export type ToolKind='select'|'road'|'bulldoze'|BuildingKind;
export interface Building{id:string;kind:BuildingKind;x:number;y:number;level:number}
export interface GameState{version:number;mapWidth:number;mapHeight:number;money:number;day:number;hour:number;buildings:Building[];roads:string[];speed:number;happiness:number}
