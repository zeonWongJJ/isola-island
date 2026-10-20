// Shared anchors keep terrain, navigation, lights and water in the same world.
export const TERRACES=[
 [0,1,11.2,9.1,.48,-.9,0xeed8a0,.4],
 [-.6,-1,9.65,7.35,1.75,-.5,0x7c9d4b,1.7],
 [-4,-1,5.65,5.05,3.45,1.3,0x85a64f,3.3],
 [1.5,-3.2,5.35,4.9,4.9,1.3,0x6f9644,.8],
 [-.1,-4.7,3.45,3.4,8.25,4,0x809e4d,1.7],
 [6.35,-4.5,2.05,2.6,6.1,.4,0x6d9543,2.8],
 [-6.5,-3.6,2.45,2.7,4.7,.5,0x88a84f,.55],
 [-2.9,-5.5,1.8,2.3,6.25,3.0,0x769448,3.9],
 [7.6,-1.6,1.5,1.8,3.7,.4,0x82a054,4.6],
 [-.8,.65,.65,.6,4.9,3.25,0x7e9a4b,1.0],
 [2.85,1.0,.6,.65,4.9,2.6,0x7b9849,2.4],
 [3.55,1.3,.70,.72,4.9,2.6,0x7b9849,2.2],
 [4.5,-6.9,.50,.55,4.9,1.75,0x769448,1.2],
];

export const BRIDGES=[
 {a:[-1.15,8.25,-2.75],b:[2.05,8.25,-2.75],deckY:8.55,width:.56,sag:.08,waterY:8.38},
 {a:[-.75,4.9,.55],b:[2.75,4.9,1.0],deckY:5.26,width:.58,sag:.10,waterY:5.05},
];

export const SUMMIT_STAIR=Object.freeze({a:[-2.2,4.96,-.65],b:[-2.2,8.32,-4.1],width:1.02,count:24});
export const WALK_STAIRS=[
 {id:'beach',a:[-3.45,.60,7.05],b:[-3.45,1.81,5.1],width:1.65,count:13,rail:false},
 {id:'market-entry',a:[1.1,.60,8.35],b:[1.1,1.81,6.9],width:1.1,count:12},
 {id:'farm',a:[-3,1.81,4.9],b:[-3,3.51,3.2],width:1.12,count:13},
 {id:'village',a:[3.55,1.81,4.15],b:[3.55,4.96,1.65],width:.90,count:23},
 {id:'upland',a:[-3.45,3.51,.25],b:[-3.7,4.96,-1.65],width:.60,count:14},
 {id:'windmill',a:[-8.2,3.51,-1.05],b:[-7.85,4.76,-2.35],width:.60,count:11},
 {id:'ridge',a:[-5.65,4.76,-4.7],b:[-2.9,8.32,-5.2],width:.60,count:28},
 {id:'east-forest',a:[5.85,4.96,-1.25],b:[5.85,6.16,-3.4],width:.65,count:13},
 {id:'rear-cottage',a:[4.55,4.96,-7],b:[5.75,6.16,-6],width:.60,count:13},
 {id:'summit',...SUMMIT_STAIR},
];

// Position, expected terrace, scale, orientation, roof color.
export const HOUSES=[
 [-5.1,3.45,-.4,.64,-.52,0xc97830],
 [-7.0,3.45,.15,.53,.63,0xe1a03d],
 [-1.3,1.75,4.65,.64,Math.PI/2,0xce6b2d],
 [5.35,1.75,2.75,.68,0,0xdf8736],
 [6.2,1.75,1.15,.60,-.97,0x548a9c],
 [-2.2,3.45,1.8,.53,-.40,0x45849b],
 [3.95,4.9,-1.4,.57,-.38,0xdd8d37],
 [-4.7,4.7,-3.1,.50,.75,0xe4a351],
 [-6.8,.48,6.0,.48,.60,0xd89136],
 [-4,6.25,-6.2,.45,2.70,0x5296a2],
 [3.4,4.9,-6.5,.51,3.62,0xd58b3d],
];

export const GARDENS=[
 {x:-4.85,y:3.49,z:1.85,scale:1,width:2.25,depth:1.7,seed:3},
 {x:-7,y:3.49,z:1.8,scale:.85,width:1.6,depth:1.4,seed:8},
];

export const MARKET=Object.freeze({fountain:{x:1.1,z:4.95,scale:.55},stalls:[
 {x:-.4,z:6.15,scale:.58,rotation:Math.PI,color:0xd66d48},
 {x:3.05,z:5.7,scale:.54,rotation:-Math.PI/2,color:0xe3b242},
 {x:4.85,z:4.7,scale:.58,rotation:-Math.PI/2,color:0x569c9a},
]});

// Shared routes let ground dressing, planting and clearance checks agree.
export const MARKET_PATHS=[
 {id:'market-entry',width:.72,points:[[1.1,1.81,6.72],[1.1,1.81,6.1]]},
 {id:'fountain-loop',width:.42,points:[[1.1,1.81,6.1],[0,1.81,5.55],[-.05,1.81,4.95],[0,1.81,4.1],[.35,1.81,3.95],[1.9,1.81,3.95],[2.25,1.81,4.15],[2.3,1.81,4.95],[2.2,1.81,5.85],[1.1,1.81,6.1]]},
 {id:'west-entry',width:.34,points:[[-3.45,1.81,5.09],[-2.3,1.81,5.09],[-2.3,1.81,5.60],[-1.6,1.81,5.60],[0,1.81,5.55]]},
 {id:'west-door',width:.30,points:[[-.37,1.81,4.96],[-.05,1.81,4.96]]},
 {id:'east-door',width:.34,points:[[5.02,1.81,3.97],[4.3,1.81,3.97],[4.3,1.81,4.45],[3.55,1.81,4.45],[2.3,1.81,4.95]]},
 {id:'village-landing',width:.50,points:[[3.55,1.81,4.35],[3.55,1.81,4.45]]},
 {id:'east-stall',width:.34,points:[[3.55,1.81,4.45],[4.3,1.81,4.45],[4.3,1.81,4.7],[4.43,1.81,4.7]]},
];

export const PORT=Object.freeze({
 landing:{x:5.1,y:.67,z:7.1,length:5.8,width:1.08},
 quay:{x:2.9,y:.67,z:12.0,length:4.85,width:.95},
 ship:{x:8.8,y:.25,z:13.35,scale:.66,rotation:-.12},
 beachPier:{x:-5.1,y:.65,z:7.55,length:2.8,width:.92,rotation:-.24},
 umbrella:{x:-5.45,z:7.4},
});
export const REMOTE=Object.freeze({x:16.9,z:-4.4,rx:2.25,rz:1.95});

// Southwest anchorage: the broadside reads from the island overview while the
// complete hull and bowsprit stay clear of the beach, sea stacks and harbour.
export const PIRATE=Object.freeze({x:-12.8,y:.015,z:18.2,scale:.96,rotation:1.72,
 look:[-12.8,4.6,18.2],offset:[10,5.4,17],
 bounds:[[-19.3,-.9,12.9],[-4.0,11.2,22.6]],
});
