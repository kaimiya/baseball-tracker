import{r as x,j as o}from"./iframe-BgMSA5VR.js";import"./preload-helper-Dp1pzeXC.js";function u({logo:t,color:g,size:s=20}){const[f,h]=x.useState(!1),a={width:s,height:s,flexShrink:0,display:"inline-flex",alignItems:"center",justifyContent:"center"};if(t&&!f)return o.jsx("img",{src:t,alt:"",onError:()=>h(!0),style:{...a,borderRadius:"50%",objectFit:"cover",background:"#fff"}});const n=Math.round(s*.5);return o.jsx("span",{style:a,children:o.jsx("span",{style:{width:n,height:n,borderRadius:"50%",background:g}})})}u.__docgenInfo={description:"",methods:[],displayName:"TeamMark",props:{size:{defaultValue:{value:"20",computed:!1},required:!1}}};const j={title:"Primitives/TeamMark",component:u},e={args:{logo:"https://i.etsystatic.com/13887308/r/il/b64461/1252235423/il_794xN.1252235423_3wlk.jpg",color:"#f97316",size:40}},r={args:{logo:null,color:"#8b5cf6",size:40}};var i,c,l;e.parameters={...e.parameters,docs:{...(i=e.parameters)==null?void 0:i.docs,source:{originalSource:`{
  args: {
    logo: "https://i.etsystatic.com/13887308/r/il/b64461/1252235423/il_794xN.1252235423_3wlk.jpg",
    color: "#f97316",
    size: 40
  }
}`,...(l=(c=e.parameters)==null?void 0:c.docs)==null?void 0:l.source}}};var d,p,m;r.parameters={...r.parameters,docs:{...(d=r.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    logo: null,
    color: "#8b5cf6",
    size: 40
  }
}`,...(m=(p=r.parameters)==null?void 0:p.docs)==null?void 0:m.source}}};const _=["WithLogo","Fallback"];export{r as Fallback,e as WithLogo,_ as __namedExportsOrder,j as default};
