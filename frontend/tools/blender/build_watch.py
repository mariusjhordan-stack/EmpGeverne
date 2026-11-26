"""Photorealistic dive-watch turntable for Blender 5.3.

Headless example:
  blender --background --factory-startup --python build_watch.py -- \
      --save /tmp/watch.blend --frame 1 --out /tmp/watch.png

The script also runs directly from Blender's Text Editor. It only replaces the
scene named "Cronos Watch"; every other scene and its objects are left alone.
All dimensions below are millimetres. The dial faces -Y and 12 o'clock is +Z.
"""

import argparse
import math
import sys
import time
from pathlib import Path

import bpy
from mathutils import Vector


PROJECT = Path("/Users/yefersonquispe/Downloads/CronosEmp")
DIAL_IMAGE = PROJECT / "frontend/tools/dial.png"
TAU = math.tau
PREFIX = "CW · "


def arguments():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--save", type=Path)
    p.add_argument("--frame", type=int)
    p.add_argument("--out", type=Path)
    p.add_argument("--animation", type=Path)
    p.add_argument("--size", type=int, default=1000)
    p.add_argument("--samples", type=int, default=64)
    p.add_argument("--device", choices=("auto", "cpu", "metal"), default="auto")
    return p.parse_args(argv)


def fresh_scene():
    old = bpy.data.scenes.get("Cronos Watch")
    if old and not old.get("cronos_watch_generated"):
        raise RuntimeError("A user scene already uses the name 'Cronos Watch'; it was left untouched")
    scene = bpy.data.scenes.new("Cronos Watch (building)")
    if bpy.context.window:
        bpy.context.window.scene = scene
    if old:
        objects = list(old.objects)
        bpy.data.scenes.remove(old)
        for obj in objects:
            if obj.users == 0:
                bpy.data.objects.remove(obj)
        # Only orphaned datablocks made by this script are removed. Shared data
        # and anything in another scene are never touched.
        for group in (bpy.data.meshes, bpy.data.curves, bpy.data.materials,
                      bpy.data.cameras, bpy.data.lights, bpy.data.images,
                      bpy.data.actions):
            for block in list(group):
                if block.name.startswith(PREFIX) and block.users == 0:
                    group.remove(block)
    scene.name = "Cronos Watch"
    scene["cronos_watch_generated"] = True
    return scene


def link_object(scene, name, data, parent=None):
    obj = bpy.data.objects.new(PREFIX + name, data)
    scene.collection.objects.link(obj)
    if parent:
        obj.parent = parent
    return obj


def mesh_object(scene, name, vertices, faces, material, parent=None, uvs=None):
    mesh = bpy.data.meshes.new(PREFIX + name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    if uvs is not None:
        layer = mesh.uv_layers.new(name="Photo UV")
        for polygon in mesh.polygons:
            for loop_index in polygon.loop_indices:
                vertex_index = mesh.loops[loop_index].vertex_index
                layer.data[loop_index].uv = uvs[vertex_index]
    obj = link_object(scene, name, mesh, parent)
    obj.data.materials.append(material)
    for poly in mesh.polygons:
        poly.use_smooth = True
    return obj


def bevel(obj, width=0.2, segments=3):
    mod = obj.modifiers.new("Soft machined edges", "BEVEL")
    mod.width = width
    mod.segments = segments
    mod.limit_method = "ANGLE"
    mod.angle_limit = math.radians(28)
    mod = obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    mod.keep_sharp = True


def material(name, color, metallic=0.0, roughness=0.3):
    mat = bpy.data.materials.new(PREFIX + name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    return mat, bsdf


def noise_bump(mat, scale, strength, distance):
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = scale
    noise.inputs["Detail"].default_value = 2
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = strength
    bump.inputs["Distance"].default_value = distance
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], nodes.get("Principled BSDF").inputs["Normal"])


def brushed_steel(name, color, roughness):
    mat,bsdf=material(name,color,1,roughness)
    bsdf.inputs["Anisotropic"].default_value=0.48
    wave=mat.node_tree.nodes.new("ShaderNodeTexWave")
    wave.wave_type="BANDS"
    wave.bands_direction="X"
    wave.inputs["Scale"].default_value=180
    wave.inputs["Distortion"].default_value=0.025
    bump=mat.node_tree.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value=0.035
    bump.inputs["Distance"].default_value=0.003
    mat.node_tree.links.new(wave.outputs["Fac"],bump.inputs["Height"])
    mat.node_tree.links.new(bump.outputs["Normal"],bsdf.inputs["Normal"])
    return mat


def photo_material(name, image, ceramic=False):
    mat, bsdf = material(name, (0.08, 0.08, 0.08), 0, 0.22 if ceramic else 0.42)
    tex = mat.node_tree.nodes.new("ShaderNodeTexImage")
    tex.image = image
    tex.interpolation = "Cubic"
    mat.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Coat Weight"].default_value = 0.26 if ceramic else 0.1
    bsdf.inputs["Coat Roughness"].default_value = 0.11
    return mat


def transparent_glass(name, gloss_fraction):
    mat = bpy.data.materials.new(PREFIX + name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    transparent = nodes.new("ShaderNodeBsdfTransparent")
    glossy = nodes.new("ShaderNodeBsdfGlossy")
    glossy.inputs["Roughness"].default_value = 0.035
    mix = nodes.new("ShaderNodeMixShader")
    mix.inputs[0].default_value = gloss_fraction
    links = mat.node_tree.links
    links.new(transparent.outputs[0], mix.inputs[1])
    links.new(glossy.outputs[0], mix.inputs[2])
    links.new(mix.outputs[0], output.inputs["Surface"])
    return mat


def lathe(scene, name, rings, material, parent, segments=192, capped=False):
    """Revolve (radius, Y) pairs about the Y axis."""
    vertices = []
    for r, y in rings:
        for i in range(segments):
            a = TAU * i / segments
            vertices.append((r * math.cos(a), y, r * math.sin(a)))
    faces = []
    for j in range(len(rings) - 1):
        for i in range(segments):
            q = (i + 1) % segments
            faces.append((j*segments+i, j*segments+q,
                          (j+1)*segments+q, (j+1)*segments+i))
    if capped:
        faces.append(tuple(reversed(range(segments))))
        faces.append(tuple((len(rings)-1)*segments+i for i in range(segments)))
    return mesh_object(scene, name, vertices, faces, material, parent)


def photo_disk(scene, name, radius, y, material, parent, tex_radius, inner=0):
    vertices = []
    uvs = []
    faces = []
    n = 256
    if inner:
        for r in (inner, radius):
            for i in range(n):
                a = TAU*i/n
                x, z = r*math.sin(a), r*math.cos(a)
                vertices.append((x,y,z))
                uvs.append((0.5+x/(2*tex_radius), 0.5+z/(2*tex_radius)))
        for i in range(n):
            q = (i+1)%n
            faces.append((i, q, n+q, n+i))
    else:
        vertices.append((0,y,0))
        uvs.append((0.5,0.5))
        for i in range(n):
            a = TAU*i/n
            x,z = radius*math.sin(a),radius*math.cos(a)
            vertices.append((x,y,z))
            uvs.append((0.5+x/(2*tex_radius),0.5+z/(2*tex_radius)))
        for i in range(n):
            faces.append((0,i+1,(i+1)%n+1))
    return mesh_object(scene,name,vertices,faces,material,parent,uvs)


def cubic(a,b,c,d,n=12):
    out=[]
    for i in range(n):
        t=i/n
        u=1-t
        out.append((u*u*u*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t*t*t*d[0],
                    u*u*u*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t*t*t*d[1]))
    return out


def case_outline():
    """An Oyster style perimeter in X,Z, including the two crown guards."""
    p=[]
    def line(x,z): p.append((x,z))
    def curve(a,b,c,d,n=12): p.extend(cubic(a,b,c,d,n))
    line(10.0,19.25); line(10.0,22.55)
    curve((10,22.55),(10,22.85),(10.2,23),(10.5,23),5)
    line(12.55,23.0)
    curve((12.55,23),(13.7,16.4),(16.4,14.5),(17.3,9.2))
    curve((17.3,9.2),(18.5,6.4),(19.0,6.3),(21.0,5.6))
    curve((21.0,5.6),(22.1,5.2),(22.4,3.3),(21.2,3.0))
    curve((21.2,3.0),(20.0,2.8),(19.3,2.3),(19.1,0))
    curve((19.1,0),(19.3,-2.3),(20.0,-2.8),(21.2,-3.0))
    curve((21.2,-3.0),(22.4,-3.3),(22.1,-5.2),(21.0,-5.6))
    curve((21.0,-5.6),(19.0,-6.3),(18.5,-6.4),(17.3,-9.2))
    curve((17.3,-9.2),(16.4,-14.5),(13.7,-16.4),(12.55,-23))
    line(10.5,-23)
    curve((10.5,-23),(10.2,-23),(10,-22.85),(10,-22.55),5)
    line(10.0,-19.25)
    curve((10,-19.25),(4,-18.25),(-4,-18.25),(-10,-19.25))
    line(-10,-22.55)
    curve((-10,-22.55),(-10,-22.85),(-10.2,-23),(-10.5,-23),5)
    line(-12.55,-23)
    curve((-12.55,-23),(-13.7,-16.4),(-16.4,-14.5),(-17.3,-9.2))
    curve((-17.3,-9.2),(-20.9,-3.2),(-20.9,3.2),(-17.3,9.2),24)
    curve((-17.3,9.2),(-16.4,14.5),(-13.7,16.4),(-12.55,23))
    line(-10.5,23)
    curve((-10.5,23),(-10.2,23),(-10,22.85),(-10,22.55),5)
    line(-10,19.25)
    curve((-10,19.25),(-4,18.25),(4,18.25),(10,19.25))
    return p


def case_middle(scene, parent, satin, polished):
    curve_data = bpy.data.curves.new(PREFIX+"One-piece case profile", "CURVE")
    curve_data.dimensions = "2D"
    curve_data.fill_mode = "BOTH"
    curve_data.extrude = 3.25
    curve_data.bevel_depth = 0.46
    curve_data.bevel_resolution = 3
    for points in (case_outline(),
                   [(15.52*math.cos(-TAU*i/192),15.52*math.sin(-TAU*i/192))
                    for i in range(192)]):
        spline=curve_data.splines.new("POLY")
        spline.points.add(len(points)-1)
        for point,(x,z) in zip(spline.points,points):
            point.co=(x,z,0,1)
        spline.use_cyclic_u=True
    obj=link_object(scene,"Integrated case and guards",curve_data,parent)
    obj.rotation_euler[0]=math.pi/2
    obj.location.y=0.45
    obj.data.materials.append(satin)
    # The curvature at the lug tips is formed in the mesh, including the bevel.
    bpy.context.view_layer.objects.active=obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj.select_set(False)
    # The former tip-only displacement made a triangular crease on each lug.
    for face in obj.data.polygons:
        face.use_smooth=True
    # Add a separate narrow polished chamfer around the case opening.
    lathe(scene,"Polished case lip",[(15.3,-3.0),(15.7,-3.32),(16.2,-3.38)],polished,parent)
    return obj


def crown(scene,parent,steel,engraved):
    # The tube intersects both guards; the scallops are part of the crown mesh.
    rings=[(19.2,1.8),(20.0,2.15),(20.25,2.9),(20.65,3.12),
           (23.45,3.12),(23.8,2.95),(24.1,2.58)]
    n=144
    vertices=[]
    for x,r in rings:
        for i in range(n):
            a=TAU*i/n
            flute=0.11*math.cos(48*a) if 20.5<x<23.6 else 0
            rr=r+flute
            vertices.append((x, -0.15+rr*math.sin(a), rr*math.cos(a)))
    faces=[]
    for j in range(len(rings)-1):
        for i in range(n):
            q=(i+1)%n
            faces.append((j*n+i,j*n+q,(j+1)*n+q,(j+1)*n+i))
    faces.append(tuple((len(rings)-1)*n+i for i in range(n)))
    obj=mesh_object(scene,"Screw-down fluted crown",vertices,faces,steel,parent)
    bevel(obj,0.12,3)
    # A recessed cap gives the front face a defined edge without an unsupported logo.
    cap=lathe(scene,"Crown cap accent",[(0,24.11),(2.2,24.11)],engraved,parent,96)
    # lathe revolves about Y, so orient its axis to X and position at crown centre.
    cap.rotation_euler[2]=-math.pi/2
    cap.location=(0,-0.15,0)
    return obj


def strap_path():
    # The photographed bracelet stands high above/below the case and then
    # sweeps back into a long wrist oval. Keep the first tangent flush with
    # the case's end-link opening instead of jumping to an ellipse.
    curves=(
        ((-0.65,18.35),(-2.8,25.5),(1.0,31.5),(15.0,33.0)),
        ((15.0,33.0),(29.0,35.0),(34.5,21.0),(35.0,0.0)),
        ((35.0,0.0),(34.5,-21.0),(29.0,-35.0),(15.0,-33.0)),
        ((15.0,-33.0),(1.0,-31.5),(-2.8,-25.5),(-0.65,-18.35)),
    )
    points=[]
    for a,b,c,d in curves:
        for i in range(126):
            t=i/125
            u=1-t
            y=u**3*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t**3*d[0]
            z=u**3*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t**3*d[1]
            points.append(Vector((0,y,z)))
    lengths=[0.0]
    for i in range(1,len(points)):
        lengths.append(lengths[-1]+(points[i]-points[i-1]).length)
    return points,lengths


def path_frame(points,lengths,s):
    import bisect
    s=max(0,min(s,lengths[-1]))
    i=max(1,min(len(points)-1,bisect.bisect_left(lengths,s)))
    t=(s-lengths[i-1])/(lengths[i]-lengths[i-1])
    p=points[i-1].lerp(points[i],t)
    lo=max(0,i-3)
    hi=min(len(points)-1,i+2)
    tangent=(points[hi]-points[lo]).normalized()
    out=p-Vector((0,17.0,0))
    out.x=0
    out=(out-tangent*out.dot(tangent)).normalized()
    return p,out


def bracelet_piece(scene, name, points, lengths, s0, s1, x0, x1,
                   satin, polished, parent, crown_end=0, h0=0.0,
                   height=4.0, dome=0.30):
    """One closed machined part: flat inner face, rounded ends, domed top."""
    length=s1-s0
    offsets=(0,0.09,0.30,length/2,length-0.30,length-0.09,length)
    vertices=[]
    faces=[]
    face_material=[]
    count=13
    for k,d in enumerate(offsets):
        u=d/length
        edge_roll=0.15*(1-min(d,length-d)/0.30) if d<0.30 or length-d<0.30 else 0
        end_shrink=0.11*(1-min(d,length-d)/0.30) if d<0.30 or length-d<0.30 else 0
        lo=x0+end_shrink
        hi=x1-end_shrink
        center=(lo+hi)/2
        top=[(hi-0.18-(hi-lo-0.36)*j/6,
              height-edge_roll+dome*(1-(2*j/6-1)**2)) for j in range(7)]
        profile=[(lo+0.20,h0),(hi-0.20,h0),(hi,h0+0.18),
                 (hi,height-0.28-edge_roll)]
        profile += top
        profile += [(lo,height-0.28-edge_roll),(lo,h0+0.18)]
        # First and last solid end links follow the case opening in X/Z.
        for x,h in profile:
            ss=s0+d
            if crown_end and (k==0 if crown_end==1 else k==len(offsets)-1):
                ss += crown_end*0.92*(x/10.0)**2
            p,out=path_frame(points,lengths,ss)
            vertices.append(tuple(p+Vector((x,0,0))+out*(h-1.50)))
    for k in range(len(offsets)-1):
        for j in range(count):
            q=(j+1)%count
            faces.append((k*count+j,(k+1)*count+j,(k+1)*count+q,k*count+q))
            face_material.append(0 if 3<=j<=10 else 1)
    faces.append(tuple(reversed(range(count))))
    faces.append(tuple((len(offsets)-1)*count+j for j in range(count)))
    face_material.extend((1,1))
    obj=mesh_object(scene,name,vertices,faces,satin,parent)
    obj.data.materials.append(polished)
    for poly,index in zip(obj.data.polygons,face_material):
        poly.material_index=index
    bevel(obj,0.11,3)
    return obj


def build_bracelet(scene, upper, lower, satin, polished, clasp_satin):
    points,lengths=strap_path()
    total=lengths[-1]
    mid=total/2
    clasp_start=mid-11.8
    clasp_end=mid+11.8
    pitch=3.9

    def width_at(s):
        return 20.0-4.0*min(1.0,min(s,total-s)/clasp_start)

    def half_links(a,b,parent,reverse=False):
        # The end link is shaped to the curved case opening. Subsequent
        # transverse joints are 0.15 mm apart; outer joints are staggered.
        base=a
        def emit(start,end,lane,index,end_link=False):
            s0,s1=(start,end) if not reverse else (total-end,total-start)
            center=(s0+s1)/2
            width=width_at(center)
            c=4.02*(width/20)
            gap=0.11
            x0,x1=((-width/2,-c-gap) if lane==0 else
                   (-c,c) if lane==1 else (c+gap,width/2))
            bracelet_piece(scene,
                           ("Solid end link" if end_link else "Oyster link")+
                           " %02d %s"%(index,("left","centre","right")[lane]),
                           points,lengths,s0,s1,x0,x1,satin,polished,parent,
                           crown_end=(-1 if reverse else 1) if end_link else 0,
                           dome=0.38 if lane==1 else 0.26)
            if lane!=1 and not end_link and index%3==0:
                # A recessed polished pin head, seated in the flank.
                ss=(s0+s1)/2
                p,out=path_frame(points,lengths,ss)
                x=x0-0.015 if lane==0 else x1+0.015
                pin=lathe(scene,"Link pin %02d %s"%(index,"L" if lane==0 else "R"),
                          [(0,-0.025),(0.29,-0.025),(0.29,0.025),(0,0.025)],
                          polished,parent,24)
                pin.location=p+Vector((x,0,0))+out*0.03
                pin.rotation_euler=(Vector((1,0,0)) if lane==0 else
                                    Vector((-1,0,0))).to_track_quat("Y","Z").to_euler()
        # Build each lane independently so the centre and outers interlock.
        for lane in range(3):
            first_end=4.55+(0.34 if lane!=1 else 0)
            pos=base
            end=min(base+first_end,b)
            emit(pos,end,lane,0,True)
            pos=end+0.15
            index=1
            while pos<b-0.5:
                end=min(pos+pitch-0.15,b)
                emit(pos,end,lane,index)
                pos=end+0.15
                index+=1

    half_links(0,clasp_start-0.15,upper)
    half_links(0,clasp_start-0.15,lower,True)

    # Two hinged clasp leaves meet at the back equator. Their outer shells
    # follow the oval, with no unsupported plate bridging the animated split.
    bracelet_piece(scene,"Upper folding clasp",points,lengths,
                   clasp_start,mid-0.12,-8,8,clasp_satin,polished,upper,
                   height=4.0,dome=0.13)
    bracelet_piece(scene,"Lower folding clasp",points,lengths,
                   mid+0.12,clasp_end,-8,8,clasp_satin,polished,lower,
                   height=4.0,dome=0.13)
    bracelet_piece(scene,"Safety flap",points,lengths,
                   mid-8.2,mid-1.0,-7.35,7.35,clasp_satin,polished,upper,
                   h0=3.90,height=4.43,dome=0.12)
    # Low raised crown-like clasp mark: five tines meet a short bar.
    emblem_s=mid-4.6
    p,out=path_frame(points,lengths,emblem_s)
    # Rounded raised strokes intersect the flap, avoiding a floating emblem.
    def crest_stroke(name,coords):
        data=bpy.data.curves.new(PREFIX+name,"CURVE")
        data.dimensions="3D"
        data.bevel_depth=0.085
        data.bevel_resolution=2
        data.use_fill_caps=True
        spline=data.splines.new("POLY")
        spline.points.add(len(coords)-1)
        for q,(x,ds) in zip(spline.points,coords):
            pp,oo=path_frame(points,lengths,emblem_s+ds)
            v=pp+Vector((x,0,0))+oo*2.10
            q.co=(*v,1)
        obj=link_object(scene,name,data,upper)
        data.materials.append(polished)
        return obj
    crest_stroke("Clasp crown base",[(-1.55,-0.78),(1.55,-0.78)])
    for i,x in enumerate((-1.28,-0.64,0,0.64,1.28)):
        height=(0.52,0.85,1.08,0.85,0.52)[i]
        crest_stroke("Clasp crown tine %d"%i,
                     [(x,-0.73),(x*0.78,0.05),(x,height)])


def back_and_bezel(scene,parent,steel,satin,black,dial_mat,insert_mat,glass):
    # Screw back, back engraving ring, and 120 recessed scallops.
    lathe(scene,"Screw-down caseback",[(0,6.1),(11,6.1),(14.2,6.08),
          (16.1,5.78),(17.5,5.10),(17.85,4.30),
          (17.85,3.48),(17.45,3.30)],satin,parent)
    lathe(scene,"Caseback engraved ring",[(12.0,6.12),(15.8,5.91)],steel,parent)
    for i in range(96):
        ang=TAU*i/96
        r=16.8
        # Fine caseback scallops; blended by actual overlap with the back rim.
        vertices=[]
        for y,rr in ((4.49,0.27),(5.42,0.27)):
            for k in range(8):
                a=TAU*k/8
                vertices.append((r*math.cos(ang)+rr*math.cos(a),
                                 y,r*math.sin(ang)+rr*math.sin(a)))
        faces=[(k,(k+1)%8,8+(k+1)%8,8+k) for k in range(8)]
        mesh_object(scene,"Caseback flute %03d"%i,vertices,faces,steel,parent)
    # Circular inscription: text sits within the engraved ring and follows its arc.
    legend="CRONOS  •  STAINLESS STEEL  •  300 m  •  AUTOMATIC  •  "
    for i,ch in enumerate(legend):
        if ch==" ": continue
        a=TAU*i/len(legend)
        data=bpy.data.curves.new(PREFIX+"Back inscription", "FONT")
        data.body=ch
        data.size=0.72
        data.extrude=0.006
        data.align_x="CENTER"
        obj=link_object(scene,"Back inscription",data,parent)
        obj.location=(13.9*math.sin(a),6.13,13.9*math.cos(a))
        obj.rotation_euler=(-math.pi/2,0,-a)
        obj.data.materials.append(black)

    lathe(scene,"Bezel steel base",[(15.0,-3.18),(19.25,-3.2),
          (19.75,-3.52),(20.05,-4.13),(20.03,-4.9),
          (19.55,-5.48),(18.95,-5.54),(15.0,-5.54)],steel,parent)
    # Continuous scalloped annulus: the lobes are broad, rounded cuts in
    # silhouette, rather than separate bright pins on a smooth cylinder.
    n=120*8
    verts=[]
    for y,scale in ((-3.72,0.65),(-4.05,1.0),(-4.95,1.0),(-5.30,0.65)):
        for i in range(n):
            a=TAU*i/n
            scallop=(0.5+0.5*math.cos(120*a))**2
            r=19.91+0.37*scale*scallop
            verts.append((r*math.cos(a),y,r*math.sin(a)))
    faces=[]
    for j in range(3):
        for i in range(n):
            q=(i+1)%n
            faces.append((j*n+i,j*n+q,(j+1)*n+q,(j+1)*n+i))
    mesh_object(scene,"Scalloped coin edge",verts,faces,steel,parent)
    tex_radius=19/0.97
    insert_in=19*0.77/0.97
    photo_disk(scene,"Ceramic photo insert",19.0,-5.575,insert_mat,parent,tex_radius,insert_in)
    lathe(scene,"Polished outer bezel lip",[(19.0,-5.60),(19.18,-5.59),
          (19.36,-5.42)],steel,parent)
    dial_r=19*0.69/0.97
    photo_disk(scene,"Recessed photo dial",dial_r,-3.93,dial_mat,parent,tex_radius)
    lathe(scene,"Dark sloped rehaut",[(dial_r-0.1,-3.91),
          (14.05,-4.15),(insert_in-0.03,-5.55)],black,parent)
    lathe(scene,"Fine inner rehaut rim",[(13.5,-4.02),(13.76,-4.06)],steel,parent)
    # A low dome: the main surface uses a mostly transparent shader so the
    # photographed black dial retains its contrast through the crystal.
    dome=[]
    for j in range(33):
        r=14.05*j/32
        y=-5.98+0.52*(r/14.05)**2
        dome.append((r,y))
    lathe(scene,"Domed sapphire crystal",dome,glass,parent,192)
    lathe(scene,"Sapphire gasket",[(14.05,-5.45),(14.23,-5.47)],black,parent)


def cyclops(scene,parent,glass):
    # Oval lenticular raised lens, aligned with the photo's 3 o'clock date.
    x0=0.445*(19/0.97)
    n=48
    rings=[]
    for r,y in ((0,-6.62),(0.38,-6.58),(0.75,-6.36),(1,-6.12),
                (1,-5.92)):
        rings.append((r,y))
    vertices=[];faces=[]
    for f,y in rings:
        for i in range(n):
            a=TAU*i/n
            vertices.append((x0+3.05*f*math.cos(a),y,2.55*f*math.sin(a)))
    for j in range(len(rings)-1):
        for i in range(n):
            q=(i+1)%n
            faces.append((j*n+i,j*n+q,(j+1)*n+q,(j+1)*n+i))
    mesh_object(scene,"Date magnifier",vertices,faces,glass,parent)


def lighting_and_camera(scene):
    world=bpy.data.worlds.new(PREFIX+"Dark reflection studio")
    scene.world=world
    world.use_nodes=True
    background=world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value=(0.58,0.58,0.58,1)
    background.inputs["Strength"].default_value=0.8

    def area(name,location,power,color,size,size_y,target=(0,0,0)):
        data=bpy.data.lights.new(PREFIX+name,"AREA")
        data.energy=power*12
        data.color=color
        data.shape="RECTANGLE"
        data.size=size
        data.size_y=size_y
        obj=link_object(scene,name,data)
        obj.location=location
        obj.rotation_euler=(Vector(target)-obj.location).to_track_quat("-Z","Y").to_euler()
        return obj
    area("Large left softbox",(-65,-55,55),1450,(1,1,1),55,105)
    area("Tall right strip",(62,-35,12),1150,(1,1,1),24,92)
    area("Overhead silk",(-2,-10,85),980,(1,1,1),100,42)
    area("Rear edge light",(20,68,40),1350,(1,1,1),56,82)
    area("Lower white card",(5,-37,-72),750,(1,1,1),85,36)
    area("Low dial fill",(-15,-63,-38),320,(1,1,1),64,12).visible_glossy = False  # no hard reflection across the dial

    # Matte black flags interrupt the light panels in steel reflections.
    flag_mat,_=material("Black reflection flag",(0.002,0.002,0.002),0,1)
    for name,loc,scale in (("Left dark flag",(-48,-34,12),(0.4,3.5,45)),
                           ("Right dark flag",(48,-22,10),(0.4,3.5,48))):
        verts=[(-1,-1,0),(1,-1,0),(1,1,0),(-1,1,0)]
        obj=mesh_object(scene,name,verts,[(0,1,2,3)],flag_mat)
        obj.location=loc
        obj.scale=scale
        obj.rotation_euler[1]=math.pi/2
        obj.visible_camera=False

    data=bpy.data.cameras.new(PREFIX+"Long-lens camera")
    cam=link_object(scene,"Long-lens camera",data)
    cam.location=(0,-310,17)
    target=Vector((0,5.0,0))
    cam.rotation_euler=(target-cam.location).to_track_quat("-Z","Y").to_euler()
    data.type="PERSP"
    data.lens=120
    data.sensor_width=36
    scene.camera=cam


def configure_render(scene,args):
    scene.render.engine="CYCLES"
    scene.cycles.samples=max(1,args.samples)
    scene.cycles.use_denoising=True
    scene.render.use_persistent_data=True
    scene.cycles.max_bounces=4
    scene.cycles.diffuse_bounces=2
    scene.cycles.glossy_bounces=2
    scene.cycles.transparent_max_bounces=4
    scene.render.resolution_x=max(64,args.size)
    scene.render.resolution_y=max(64,args.size)
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG"
    scene.render.image_settings.color_mode="RGBA"
    scene.render.film_transparent=True
    scene.view_settings.view_transform="Standard"
    scene.view_settings.look="Medium High Contrast"
    scene.view_settings.exposure=-0.55
    scene.view_settings.gamma=1
    # Blender 5.3's new compositor group requires a GPU context even when
    # Cycles itself renders on CPU. Composite the RGBA PNG in render_one() so
    # this script also works in headless machines without a Metal device.
    scene.use_nodes=False
    scene.frame_start=1
    scene.frame_end=120
    scene.render.fps=30
    # Use a Metal compute device when Blender exposes one, including in
    # background mode; otherwise Cycles stays on the CPU.
    if args.device=="cpu":
        scene.cycles.device="CPU"
        print("Cronos Watch: CPU selected",flush=True)
    else:
        try:
            prefs=bpy.context.preferences.addons["cycles"].preferences
            prefs.compute_device_type="METAL"
            prefs.get_devices()
            if any(d.type=="METAL" for d in prefs.devices):
                for d in prefs.devices:
                    d.use=(d.type=="METAL")
                scene.cycles.device="GPU"
                print("Cronos Watch: Metal GPU enabled",flush=True)
            elif args.device=="metal":
                raise RuntimeError("Metal device requested but unavailable")
            else:
                scene.cycles.device="CPU"
        except Exception as exc:
            if args.device=="metal":
                raise
            scene.cycles.device="CPU"
            print("Cronos Watch: using CPU (",exc,")",flush=True)


def build(args):
    if not DIAL_IMAGE.is_file():
        raise FileNotFoundError("Dial texture missing: "+str(DIAL_IMAGE))
    scene=fresh_scene()
    root=link_object(scene,"Turntable",None)
    root.empty_display_type="CIRCLE"
    root.empty_display_size=27

    steel,_=material("Polished 316L steel",(0.94,0.94,0.94),1,0.10)
    satin=brushed_steel("Satin brushed steel",(0.89,0.89,0.89),0.24)
    clasp_satin=brushed_steel("Clasp satin steel",(0.90,0.90,0.90),0.25)
    black,_=material("Blackened rehaut and engraving",(0.012,0.014,0.016),0.25,0.47)
    glass=transparent_glass("Clear low-glare sapphire",0.025)
    lens=transparent_glass("Magnifier polished sapphire",0.10)
    image=bpy.data.images.load(str(DIAL_IMAGE),check_existing=True)
    image.pack()
    dial_mat=photo_material("Photographed black dial",image)
    insert_mat=photo_material("Photographed black ceramic bezel",image,True)

    case_middle(scene,root,satin,steel)
    back_and_bezel(scene,root,steel,satin,black,dial_mat,insert_mat,glass)
    crown(scene,root,steel,black)
    cyclops(scene,root,lens)
    build_bracelet(scene,root,root,satin,steel,clasp_satin)
    lighting_and_camera(scene)
    configure_render(scene,args)

    print("Cronos Watch: scene geometry built",flush=True)
    root.rotation_mode="XYZ"
    for frame,angle in ((1,0),(121,TAU)):
        root.rotation_euler.z=angle
        root.keyframe_insert(data_path="rotation_euler",index=2,frame=frame)
    if root.animation_data and root.animation_data.action:
        action=root.animation_data.action
        if hasattr(action,"fcurves"):
            curves=action.fcurves
        else:
            curves=action.layers[0].strips[0].channelbag(
                root.animation_data.action_slot).fcurves
        for fc in curves:
            for kp in fc.keyframe_points:
                kp.interpolation="LINEAR"
    print("Cronos Watch: keyframes built",flush=True)
    scene.frame_set(1)
    print("Cronos Watch: frame evaluated",flush=True)
    return scene


def render_one(scene,frame,path):
    if not 1<=frame<=121:
        raise ValueError("Frame must be 1..121")
    path=Path(path).expanduser().resolve()
    path.parent.mkdir(parents=True,exist_ok=True)
    scene.frame_set(frame)
    scene.render.filepath=str(path)
    print("Cronos Watch: starting render",frame,flush=True)
    started=time.perf_counter()
    bpy.ops.render.render(write_still=True,scene=scene.name)
    print("Cronos Watch: Cycles seconds %.2f"%(time.perf_counter()-started),flush=True)
    # The film is transparent in Cycles. Blend its straight alpha onto pure
    # white, then overwrite the PNG with an opaque result.
    import numpy as np
    image=bpy.data.images.load(str(path),check_existing=False)
    pixels=np.empty(len(image.pixels),dtype=np.float32)
    image.pixels.foreach_get(pixels)
    rgba=pixels.reshape((-1,4))
    alpha=rgba[:,3:4]
    rgba[:,:3]=rgba[:,:3]*alpha+(1.0-alpha)
    rgba[:,3]=1.0
    image.pixels.foreach_set(pixels)
    image.filepath_raw=str(path)
    image.file_format="PNG"
    image.save()
    bpy.data.images.remove(image)
    print("Cronos Watch: rendered",path)


def main():
    args=arguments()
    scene=build(args)
    if args.save:
        path=args.save.expanduser().resolve()
        path.parent.mkdir(parents=True,exist_ok=True)
        filepaths=bpy.context.preferences.filepaths
        old_preview=filepaths.file_preview_type
        old_versions=filepaths.save_version
        try:
            # Suppress Blender's separate thumbnail in ~/.thumbnails and
            # automatic .blend1 backups. Both are outside the requested file.
            filepaths.file_preview_type="NONE"
            filepaths.save_version=0
            bpy.ops.wm.save_as_mainfile(filepath=str(path))
        finally:
            filepaths.file_preview_type=old_preview
            filepaths.save_version=old_versions
        print("Cronos Watch: saved",path)
    if args.out:
        render_one(scene,args.frame or 1,args.out)
    if args.animation:
        directory=args.animation.expanduser().resolve()
        directory.mkdir(parents=True,exist_ok=True)
        for i in range(120):
            render_one(scene,i+1,directory/("watch_%03d.png"%i))
    return scene


if __name__=="__main__":
    main()
