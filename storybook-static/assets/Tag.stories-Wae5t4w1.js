import{u as y,j as S,t as s}from"./iframe-BgMSA5VR.js";import"./preload-helper-Dp1pzeXC.js";function f({children:T,tone:n="accent"}){const e=y(),h=n==="accent"?e.accent:e.youTagText,x=n==="accent"?`${e.accent}1f`:e.youTagBg;return S.jsx("span",{style:{fontSize:9.5,fontWeight:s.font.weight.bold,letterSpacing:"0.5px",textTransform:"uppercase",color:h,background:x,padding:"2px 6px",borderRadius:s.radius.sm,whiteSpace:"nowrap"},children:T})}f.__docgenInfo={description:"",methods:[],displayName:"Tag",props:{tone:{defaultValue:{value:'"accent"',computed:!1},required:!1}}};const b={title:"Primitives/Tag",component:f},t={args:{children:"Current",tone:"accent"}},r={args:{children:"3-way tie",tone:"accent"}},a={args:{children:"You",tone:"muted"}};var c,o,i;t.parameters={...t.parameters,docs:{...(c=t.parameters)==null?void 0:c.docs,source:{originalSource:`{
  args: {
    children: "Current",
    tone: "accent"
  }
}`,...(i=(o=t.parameters)==null?void 0:o.docs)==null?void 0:i.source}}};var d,u,p;r.parameters={...r.parameters,docs:{...(d=r.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    children: "3-way tie",
    tone: "accent"
  }
}`,...(p=(u=r.parameters)==null?void 0:u.docs)==null?void 0:p.source}}};var m,g,l;a.parameters={...a.parameters,docs:{...(m=a.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args: {
    children: "You",
    tone: "muted"
  }
}`,...(l=(g=a.parameters)==null?void 0:g.docs)==null?void 0:l.source}}};const j=["Accent","Tie","Muted"];export{t as Accent,a as Muted,r as Tie,j as __namedExportsOrder,b as default};
