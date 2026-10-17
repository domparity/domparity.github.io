# Trace a Gemini logo image into a flat, transparent SVG: classify each pixel to the
# nearest reference color, potrace each color layer, fill with the exact brand color.
import subprocess, sys, re, os
from PIL import Image
def dist(a,b): return sum((x-y)**2 for x,y in zip(a,b))
def trace(src, refs, bg, out, scale=1):
    im=Image.open(src).convert('RGB')
    if scale!=1: im=im.resize((im.width*scale, im.height*scale), Image.LANCZOS)
    W,H=im.size; px=im.load()
    layers={name:Image.new('1',(W,H),1) for name in refs}
    lp={n:l.load() for n,l in layers.items()}
    allref=dict(refs); allref['__bg']=bg
    bbox=[W,H,0,0]
    for y in range(H):
        for x in range(W):
            p=px[x,y]; n=min(allref,key=lambda k:dist(p,allref[k][0] if k!='__bg' else bg))
            if n!='__bg':
                lp[n][x,y]=0
                if x<bbox[0]:bbox[0]=x
                if y<bbox[1]:bbox[1]=y
                if x>bbox[2]:bbox[2]=x
                if y>bbox[3]:bbox[3]=y
    paths=[]
    for n,(sample,fill) in refs.items():
        layers[n].save('/tmp/dp-layer.pbm')
        svg=subprocess.run(['potrace','-s','--flat','-t','8','-a','1.0','-O','0.4','-o','-','/tmp/dp-layer.pbm'],capture_output=True,text=True,check=True).stdout
        tr=re.search(r'<g transform="([^"]+)"',svg); body=re.findall(r'<path d="[^"]+"/?>',svg)
        g=f'<g transform="{tr.group(1)}" fill="{fill}" stroke="none">'+''.join(body)+'</g>' if tr else ''
        paths.append(g)
    pad=int(0.04*max(bbox[2]-bbox[0],bbox[3]-bbox[1]))
    x0,y0,x1,y1=bbox[0]-pad,bbox[1]-pad,bbox[2]+pad,bbox[3]+pad
    w,h=x1-x0,y1-y0
    open(out,'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0} {y0} {w} {h}" width="{w}" height="{h}">'+''.join(paths)+'</svg>\n')
    os.remove('/tmp/dp-layer.pbm'); print(out, w, h)
L={'indigo':((0x48,0x44,0xc8),'#4F46E5'),'teal':((0x20,0xa8,0xa0),'#14B8A6'),'navy':((0x1c,0x1a,0x48),'#1E1B4B')}
D={'indigo':((0x78,0x84,0xf0),'#818CF8'),'teal':((0x20,0xc4,0xb0),'#2DD4BF'),'white':((0xf2,0xf4,0xf8),'#F8FAFC')}
S={'indigo':((0x48,0x44,0xd0),'#4F46E5'),'teal':((0x18,0xb0,0xa0),'#14B8A6')}
trace('source/final-1.jpeg',L,(0xfa,0xfa,0xfa),'domparity-logo-light.svg')
trace('source/final-3.jpeg',D,(0x12,0x18,0x2a),'domparity-logo-dark.svg')
trace('source/final-2.jpeg',S,(0xfa,0xfa,0xfa),'domparity-symbol.svg')
trace('source/final-4.jpeg',S,(0xfa,0xfa,0xfa),'favicon-source.svg')
