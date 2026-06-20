import{u as j,j as n,t}from"./iframe-BgMSA5VR.js";import{R}from"./Icons-Bjt1Rt10.js";import"./preload-helper-Dp1pzeXC.js";function i({children:c,variant:b="solid",onClick:d,disabled:e,title:s,style:u,...p}){const a=j(),l={font:"inherit",cursor:e?"default":"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:t.space.sm,fontWeight:t.font.weight.semi,borderRadius:t.radius.md,opacity:e?.45:1,transition:"background 0.12s, opacity 0.12s"};return b==="ghost"?n.jsx("button",{...p,onClick:d,disabled:e,title:s,"aria-label":s,style:{...l,width:32,height:32,border:"none",background:"transparent",color:a.iconColor,...u},children:c}):n.jsx("button",{...p,onClick:d,disabled:e,title:s,style:{...l,padding:"9px 16px",border:"none",background:a.accent,color:a.accentText,fontSize:t.font.size.base,...u},children:c})}i.__docgenInfo={description:"",methods:[],displayName:"Button",props:{variant:{defaultValue:{value:'"solid"',computed:!1},required:!1}}};const _={title:"Primitives/Button",component:i},o={args:{children:"Save",variant:"solid"}},r={render:()=>n.jsx(i,{variant:"ghost",title:"Refresh",children:n.jsx(R,{})})};var m,f,h;o.parameters={...o.parameters,docs:{...(m=o.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args: {
    children: "Save",
    variant: "solid"
  }
}`,...(h=(f=o.parameters)==null?void 0:f.docs)==null?void 0:h.source}}};var g,x,v;r.parameters={...r.parameters,docs:{...(g=r.parameters)==null?void 0:g.docs,source:{originalSource:`{
  render: () => <Button variant="ghost" title="Refresh">
      <RefreshIcon />
    </Button>
}`,...(v=(x=r.parameters)==null?void 0:x.docs)==null?void 0:v.source}}};const I=["Solid","Ghost"];export{r as Ghost,o as Solid,I as __namedExportsOrder,_ as default};
