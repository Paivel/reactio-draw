# Rebuilds rsrc_windows_{amd64,arm64}.syso: icons + manifest (as before) + a VERSIONINFO block, so Windows shows
# product, description, version and copyright in the file's Properties.
import struct,sys
import os,re
APP=sys.argv[1]
# the version comes from the page (const RD_VERSION = '1.3' in index.html, next to the app or in the repository root)
_pg=next(p for p in (os.path.join(APP,'index.html'),os.path.join(APP,'..','index.html')) if os.path.exists(p))
_v=[int(x) for x in re.search(r"const RD_VERSION\s*=\s*'([0-9.]+)[^']*'",open(_pg,encoding='utf-8').read()).group(1).split('.')]+[0,0,0]
VER=(_v[0],_v[1],_v[2],int(sys.argv[2]) if len(sys.argv)>2 else 0)
ico=open(APP+'/reactiodraw.ico','rb').read();_,_,n=struct.unpack('<HHH',ico[:6]);blobs=[]
for i in range(n):
    w,h,c,r,pl,bpp,sz,off=struct.unpack('<BBBBHHII',ico[6+16*i:22+16*i]);blobs.append((w or 256,ico[off:off+sz]))
manifest=open(APP+'/reactiodraw.manifest','rb').read()
def pad(b):return b+b'\0'*((4-len(b)%4)%4)
def node(key,val=b'',vtype=1,children=(),vlen=None):
    k=(key+'\0').encode('utf-16le');h=pad(struct.pack('<HHH',0,0,vtype)+k)+val
    body=h
    for ch in children: body=pad(body)+ch
    if vlen is None: vlen=len(val)//2 if vtype==1 else len(val)
    return struct.pack('<HH',len(body),vlen)+body[4:]
def s(k,v):return node(k,(v+'\0').encode('utf-16le'),1)
def verinfo(exe):
    vs='%d.%d.%d.%d'%VER
    fixed=struct.pack('<13I',0xFEEF04BD,0x00010000,(VER[0]<<16)|VER[1],(VER[2]<<16)|VER[3],(VER[0]<<16)|VER[1],(VER[2]<<16)|VER[3],0x3F,0,0x40004,1,0,0,0)
    st=node('040904B0',children=[s('CompanyName','Reactio Draw project'),s('FileDescription','Reactio Draw - chemical structure editor'),s('FileVersion',vs),
        s('InternalName','ReactioDraw'),s('LegalCopyright','Free software, GNU AGPL v3 or later'),s('OriginalFilename',exe),s('ProductName','Reactio Draw'),s('ProductVersion',vs)])
    sfi=node('StringFileInfo',children=[st])
    vfi=node('VarFileInfo',children=[node('Translation',struct.pack('<HH',0x0409,1200),0)])
    return node('VS_VERSION_INFO',fixed,0,[sfi,vfi])
def build(machine,reltype,exe):
    LANG=1033
    res={3:{3+i:bl for i,(sz,bl) in enumerate(blobs)},14:{},16:{1:verinfo(exe)},24:{1:manifest}}
    grp=struct.pack('<HHH',0,1,len(blobs))
    for i,(sz,bl) in enumerate(blobs): grp+=struct.pack('<BBBBHHIH',sz%256,sz%256,0,0,1,32,len(bl),3+i)
    res[14][2]=grp;types=sorted(res)
    def dirsize(n):return 16+8*n
    off=dirsize(len(types));tdir={}
    for t in types:tdir[t]=off;off+=dirsize(len(res[t]))
    ndir={}
    for t in types:
        for nid in sorted(res[t]):ndir[(t,nid)]=off;off+=dirsize(1)
    dent={}
    for t in types:
        for nid in sorted(res[t]):dent[(t,nid)]=off;off+=16
    off=(off+7)&~7;data={}
    for t in types:
        for nid in sorted(res[t]):data[(t,nid)]=off;off+=len(res[t][nid]);off=(off+7)&~7
    raw=bytearray(off);rel=[]
    def wdir(o,entries):
        struct.pack_into('<IIHHHH',raw,o,0,0,0,0,0,len(entries))
        for k,(nm,tgt,isdir) in enumerate(entries):struct.pack_into('<II',raw,o+16+8*k,nm,tgt|(0x80000000 if isdir else 0))
    wdir(0,[(t,tdir[t],True) for t in types])
    for t in types:
        wdir(tdir[t],[(nid,ndir[(t,nid)],True) for nid in sorted(res[t])])
        for nid in sorted(res[t]):
            wdir(ndir[(t,nid)],[(LANG,dent[(t,nid)],False)])
            struct.pack_into('<IIII',raw,dent[(t,nid)],data[(t,nid)],len(res[t][nid]),0,0);rel.append(dent[(t,nid)])
            raw[data[(t,nid)]:data[(t,nid)]+len(res[t][nid])]=res[t][nid]
    praw=20+40;prel=praw+len(raw);psym=prel+10*len(rel)
    hdr=struct.pack('<HHIIIHH',machine,1,0,psym,1,0,0)
    sec=struct.pack('<8sIIIIIIHHI',b'.rsrc',0,0,len(raw),praw,prel,0,len(rel),0,0x40000040)
    rels=b''.join(struct.pack('<IIH',v,0,reltype) for v in rel)
    sym=b'.rsrc\0\0\0'+struct.pack('<IhHBB',0,1,0,3,0)
    return hdr+sec+bytes(raw)+rels+sym+struct.pack('<I',4)
open(APP+'/rsrc_windows_amd64.syso','wb').write(build(0x8664,3,'ReactioDraw.exe'))
open(APP+'/rsrc_windows_arm64.syso','wb').write(build(0xAA64,2,'ReactioDraw-ARM.exe'))
print('ok',len(blobs),'icons')
