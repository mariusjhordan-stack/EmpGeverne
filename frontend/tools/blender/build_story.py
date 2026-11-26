"""240-frame Cronos watch story for Blender 5.3.

Examples:
  blender --background --factory-startup --python build_story.py -- --save /tmp/story.blend
  blender --background --factory-startup --python build_story.py -- --frame 145 --out /tmp/story.png
  blender --background --factory-startup --python build_story.py -- --animation /tmp/story_frames

The watch geometry, photographed dial, materials, lighting, and render setup
come from build_watch.py. The dial faces -Y and 12 o'clock is +Z. All dimensions
are millimetres. An existing scene named Cronos Story is never replaced.
"""

import argparse
import importlib.util
import math
import sys
import time
from pathlib import Path

import bpy
from mathutils import Quaternion, Vector

_watch_path = Path(__file__).with_name("build_watch.py")
_watch_spec = importlib.util.spec_from_file_location("cronos_build_watch", _watch_path)
watch = importlib.util.module_from_spec(_watch_spec)
_old_no_bytecode = sys.dont_write_bytecode
sys.dont_write_bytecode = True
try:
    _watch_spec.loader.exec_module(watch)
finally:
    sys.dont_write_bytecode = _old_no_bytecode


PREFIX = "CS · "
TAU = math.tau


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
    p.add_argument("--frames", help="Comma-separated frame numbers to render to --animation")
    return p.parse_args(argv)


def new_scene():
    if bpy.data.scenes.get("Cronos Story"):
        raise RuntimeError("A scene named 'Cronos Story' already exists; it was left untouched")
    scene = bpy.data.scenes.new("Cronos Story")
    scene["cronos_story_generated"] = True
    if bpy.context.window:
        bpy.context.window.scene = scene
    return scene


def group(scene, name, parent=None):
    obj = bpy.data.objects.new(PREFIX + name, None)
    scene.collection.objects.link(obj)
    obj.empty_display_type = "CIRCLE"
    obj.empty_display_size = 16 if name == "Watch" else 4
    if parent:
        obj.parent = parent
    return obj


def box(scene, name, center, size, mat, parent, bevel_width=0.1):
    a, b, c = (v / 2 for v in size)
    verts = [(dx*a, dy*b, dz*c)
             for dx, dy, dz in ((-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),
                                (-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1))]
    faces = [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),
             (2,3,7,6),(3,0,4,7)]
    obj = watch.mesh_object(scene, name, verts, faces, mat, parent)
    obj.location = center
    if bevel_width:
        watch.bevel(obj, bevel_width, 3)
    return obj


def disk(scene, name, x, z, radius, y_front, y_back, mat, parent, n=64):
    obj = watch.lathe(scene, name,
                      [(0,y_front),(radius,y_front),(radius,y_back),(0,y_back)],
                      mat, parent, n)
    obj.location.x = x
    obj.location.z = z
    return obj


def ring(scene, name, x, z, r_outer, r_inner, y_front, y_back, mat, parent):
    obj = watch.lathe(scene, name,
                      [(r_inner,y_front),(r_outer,y_front),
                       (r_outer,y_back),(r_inner,y_back)], mat, parent, 96)
    obj.location.x = x
    obj.location.z = z
    return obj


def gear(scene, name, x, z, radius, teeth, y, mat, parent):
    """Extruded annular gear with actual involute-like stepped tooth tips."""
    n = teeth * 4
    inner = radius * 0.28
    vertices = []
    for yy in (y-0.28, y+0.28):
        for r_group in (inner, 1):
            for i in range(n):
                a = TAU*i/n
                r = r_group if r_group != 1 else radius * (1.13 if i % 4 in (1,2) else 0.91)
                vertices.append((x+r*math.cos(a), yy, z+r*math.sin(a)))
    faces = []
    for i in range(n):
        j = (i+1) % n
        faces.extend(((i,j,n+j,n+i),
                      (2*n+n+i,2*n+n+j,2*n+j,2*n+i),
                      (n+i,n+j,3*n+j,3*n+i),
                      (2*n+i,2*n+j,j,i)))
    obj = watch.mesh_object(scene, name, vertices, faces, mat, parent)
    ring(scene, name + " raised hub", x, z, radius*0.24, radius*0.12,
         y-0.4, y-0.6, mat, parent)
    return obj


def curved_bar(scene, name, points, width, y_front, y_back, mat, parent):
    """A sequence of machined bridge segments in the XZ plane."""
    for i, (a, b) in enumerate(zip(points, points[1:])):
        dx, dz = b[0]-a[0], b[1]-a[1]
        length = math.hypot(dx, dz)
        obj = box(scene, name + " %02d" % i,
                  ((a[0]+b[0])/2, (y_front+y_back)/2, (a[1]+b[1])/2),
                  (length+width*0.25, y_back-y_front, width), mat, parent, 0.22)
        obj.rotation_euler.y = -math.atan2(dz, dx)


def rotor(scene, parent, mat, accent):
    # A weighted half-moon, set toward the visible front of the movement.
    n = 72
    verts = []
    for y in (3.85, 4.25):
        for r in (5.3, 12.5):
            for i in range(n+1):
                a = math.radians(-33 + 205*i/n)
                verts.append((r*math.cos(a), y, r*math.sin(a)))
    stride = n+1
    faces = []
    for i in range(n):
        faces += [(i,i+1,stride+i+1,stride+i),
                  (2*stride+i,3*stride+i,3*stride+i+1,2*stride+i+1),
                  (stride+i,stride+i+1,3*stride+i+1,3*stride+i),
                  (i,2*stride+i,2*stride+i+1,i+1)]
    faces += [(0,stride,3*stride,2*stride),
              (n,2*stride+n,3*stride+n,stride+n)]
    obj = watch.mesh_object(scene, "Skeleton winding rotor", verts, faces, mat, parent)
    watch.bevel(obj, 0.2, 3)
    disk(scene, "Rotor bearing", 0, 0, 1.15, 3.72, 4.32, accent, parent)


def add_movement(scene, parent):
    brass, _ = watch.material("Movement warm brass", (0.48,0.35,0.13), 1, 0.26)
    plate, _ = watch.material("Movement rhodium plate", (0.42,0.46,0.49), 1, 0.28)
    bridge, _ = watch.material("Movement polished bridges", (0.72,0.74,0.73), 1, 0.17)
    stripe, _ = watch.material("Geneva stripes", (0.28,0.32,0.35), 1, 0.34)
    ruby, _ = watch.material("Synthetic ruby jewels", (0.48,0.008,0.032), 0.15, 0.13)
    dark, _ = watch.material("Movement dark steel", (0.08,0.10,0.11), 1, 0.24)
    # Every surface lies between the photo dial at -3.93 and the caseback at 6.1.
    ring(scene, "Perlage mainplate", 0, 0, 14.35, 5.1, 4.55, 5.3, plate, parent)
    ring(scene, "Mainplate inner chamfer", 0, 0, 5.4, 4.85, 4.42, 4.65, bridge, parent)
    for i, (x,z,r,t) in enumerate(((-7.1,6.3,3.2,20),(-0.8,6.8,2.35,16),
                                   (5.3,4.0,3.2,20),(7.5,-3.6,2.7,18),
                                   (0.2,-6.9,3.5,22),(-6.4,-5.0,2.6,18))):
        gear(scene, "Cut-tooth gear %02d" % i, x,z,r,t,3.47,brass,parent)
        disk(scene, "Gear arbor %02d" % i,x,z,0.52,2.84,3.24,bridge,parent,32)
    curved_bar(scene,"Three-quarter bridge",
               [(-11,1),(-8.5,10),(-1,11.3),(3.4,8.4)],2.45,2.67,3.14,bridge,parent)
    curved_bar(scene,"Lower gear bridge",
               [(-10,-8),(-4,-11),(4,-10),(10,-6)],2.0,2.61,3.1,bridge,parent)
    curved_bar(scene,"Center bridge",[(-3,2),(2,2.1),(7,0.8)],1.55,2.55,3.05,bridge,parent)
    # Fine parallel Geneva stripes on the two larger bridge spans.
    for i in range(7):
        x = -9.7 + 1.65*i
        box(scene,"Bridge stripe %02d" % i,(x,2.625,10.35-0.18*i),
            (0.12,0.025,1.3),stripe,parent,0)
    for i in range(6):
        x = -7.4 + 2.45*i
        box(scene,"Lower bridge stripe %02d" % i,(x,2.56,-10.05),
            (0.12,0.025,1.1),stripe,parent,0)
    for i,(x,z) in enumerate(((-7.3,6.1),(-0.8,6.8),(5.2,4.0),(7.5,-3.6),
                              (0.2,-6.9),(-6.3,-5.0),(-8.9,9.6),(9.2,-6.0))):
        ring(scene,"Ruby chaton %02d" % i,x,z,0.67,0.42,2.43,2.65,brass,parent)
        disk(scene,"Ruby jewel %02d" % i,x,z,0.43,2.39,2.5,ruby,parent,32)
    ring(scene,"Balance wheel rim",-7.1,-0.1,3.5,3.1,2.18,2.54,brass,parent)
    for a in range(4):
        angle = TAU*a/4
        x,z = -7.1+1.65*math.cos(angle),-0.1+1.65*math.sin(angle)
        obj=box(scene,"Balance spoke %02d" % a,(x,2.33,z),
                (3.2,0.2,0.3),brass,parent,0.07)
        obj.rotation_euler.y=-angle
    disk(scene,"Balance pivot",-7.1,-0.1,0.55,2.08,2.58,dark,parent,32)
    rotor(scene,parent,brass,bridge)
    for i,(x,z) in enumerate(((-11.5,3),(-10.3,-8.2),(0,11.9),(11.6,3.5),
                              (10.7,-8.3),(0,-11.7),(-2.7,2.4))):
        disk(scene,"Blued bridge screw %02d" % i,x,z,0.54,2.32,2.66,dark,parent,24)
        box(scene,"Screw slot %02d" % i,(x,2.315,z),
            (0.68,0.02,0.10),bridge,parent,0)


def make_watch(scene):
    root = group(scene,"Watch")
    groups = {name: group(scene,name,root) for name in
              ("Upper bracelet", "Lower bracelet", "Case and crown", "Bezel",
               "Crystal", "Dial and hands", "Movement", "Caseback")}
    steel,_=watch.material("Polished 316L steel",(0.94,0.94,0.94),1,0.10)
    satin=watch.brushed_steel("Satin brushed steel",(0.89,0.89,0.89),0.24)
    clasp_satin=watch.brushed_steel("Clasp satin steel",(0.90,0.90,0.90),0.25)
    black,_=watch.material("Blackened rehaut and engraving",(0.012,0.014,0.016),0.25,0.47)
    glass=watch.transparent_glass("Clear low-glare sapphire",0.025)
    lens=watch.transparent_glass("Magnifier polished sapphire",0.10)
    image=bpy.data.images.load(str(watch.DIAL_IMAGE),check_existing=True)
    image.pack()
    dial_mat=watch.photo_material("Photographed black dial",image)
    insert_mat=watch.photo_material("Photographed black ceramic bezel",image,True)
    watch.case_middle(scene,groups["Case and crown"],satin,steel)
    watch.crown(scene,groups["Case and crown"],steel,black)
    # The original engraved crown cap is dark. A small polished centre gives
    # its side profile a machined face in the deliberate crown macro.
    cap_verts=[]
    for x in (24.12,24.17):
        for i in range(48):
            a=TAU*i/48
            cap_verts.append((x,-0.15+1.47*math.cos(a),1.47*math.sin(a)))
    cap_faces=[tuple(range(48)),tuple(range(48,96))]
    cap_faces += [(i,(i+1)%48,48+(i+1)%48,48+i) for i in range(48)]
    watch.mesh_object(scene,"Inset polished crown face",cap_verts,cap_faces,
                      steel,groups["Case and crown"])
    temp=group(scene,"Assembly staging",root)
    before=set(scene.objects)
    watch.back_and_bezel(scene,temp,steel,satin,black,dial_mat,insert_mat,glass)
    watch.cyclops(scene,temp,lens)
    back_finish,_=watch.material("Bead-blasted caseback",(0.40,0.40,0.40),0.85,0.43)
    for obj in set(scene.objects)-before:
        name=obj.name
        if any(s in name for s in ("Caseback", "caseback", "Back inscription", "Screw-down caseback")):
            obj.parent=groups["Caseback"]
            if "Screw-down caseback" in name:
                obj.data.materials[0]=back_finish
        elif any(s in name for s in ("Bezel", "bezel", "Coin edge", "Ceramic photo", "outer bezel")):
            obj.parent=groups["Bezel"]
        elif any(s in name for s in ("sapphire", "Sapphire", "magnifier", "Magnifier")):
            obj.parent=groups["Crystal"]
        else:
            obj.parent=groups["Dial and hands"]
    bpy.data.objects.remove(temp)
    watch.build_bracelet(scene,groups["Upper bracelet"],groups["Lower bracelet"],
                         satin,steel,clasp_satin)
    add_movement(scene,groups["Movement"])
    return root,groups


def ease(t):
    t=max(0.0,min(1.0,t))
    return t*t*(3-2*t)


def blend(a,b,t):
    return a+(b-a)*ease(t)


def vecblend(a,b,t):
    return Vector(a).lerp(Vector(b),ease(t))


def span(frame,start,end):
    return (frame-start)/(end-start)


def camera_pose(frame):
    start=((0,-310,17),(0,5,0),120)
    dial=((11,-84,7),(5,-4,0),105)
    crown=((68,-55,8),(22,0,0),100)
    exploded=((320,-160,90),(0,-8,0),90)
    beauty=((105,-270,36),(1,4,1),145)
    if frame<=79: return start
    if frame<=109: a,b,t=start,dial,span(frame,79,109)
    elif frame<=129: a,b,t=dial,crown,span(frame,109,129)
    elif frame<=154: a,b,t=crown,exploded,span(frame,129,154)
    elif frame<=189: return exploded
    else: a,b,t=exploded,beauty,span(frame,189,239)
    return (vecblend(a[0],b[0],t),vecblend(a[1],b[1],t),blend(a[2],b[2],t))


def explosion_fill(scene):
    data=bpy.data.lights.new(PREFIX+"Exploded stack fill", "AREA")
    data.shape="DISK"
    data.size=75
    data.energy=0
    obj=bpy.data.objects.new(PREFIX+"Exploded stack fill",data)
    scene.collection.objects.link(obj)
    obj.location=(75,-30,70)
    obj.rotation_euler=(Vector((0,38,0))-obj.location).to_track_quat("-Z","Y").to_euler()
    return data


def animate(scene,root,groups):
    camera=scene.camera
    fill=explosion_fill(scene)
    offsets={"Upper bracelet":(0,8,12), "Lower bracelet":(0,8,-12),
             "Case and crown":(0,0,0), "Bezel":(0,-32,0),
             "Crystal":(0,-55,0), "Dial and hands":(0,-16,0),
             "Movement":(0,22,0), "Caseback":(0,55,0)}
    for f in range(240):
        scene.frame_set(f)
        root.rotation_euler.z=TAU*ease(span(f,0,79)) if f<=79 else TAU
        root.keyframe_insert(data_path="rotation_euler",index=2,frame=f)
        if f<=129: amount=0
        elif f<=154: amount=ease(span(f,129,154))
        elif f<=170: amount=1
        elif f<=189: amount=1-ease(span(f,170,189))
        else: amount=0
        fill.energy=55000*amount
        fill.keyframe_insert(data_path="energy",frame=f)
        for name,g in groups.items():
            g.location=Vector(offsets[name])*amount
            g.keyframe_insert(data_path="location",frame=f)
            g.rotation_euler.z=(math.radians(50)*amount if name=="Movement" else
                                math.radians(-75)*amount if name=="Caseback" else 0)
            g.keyframe_insert(data_path="rotation_euler",index=2,frame=f)
        loc,target,lens=camera_pose(f)
        camera.location=loc
        orientation=(Vector(target)-Vector(loc)).to_track_quat("-Z","Y")
        roll=math.radians(4.0)*ease(span(f,189,220)) if f>=189 else 0.0
        camera.rotation_euler=(orientation @ Quaternion((0,0,1),roll)).to_euler()
        camera.data.lens=lens
        camera.keyframe_insert(data_path="location",frame=f)
        camera.keyframe_insert(data_path="rotation_euler",frame=f)
        camera.data.keyframe_insert(data_path="lens",frame=f)
    # Dense samples bake the smooth path; linear F-curves avoid Bezier overshoot.
    for obj in (root,camera,*groups.values()):
        action=obj.animation_data.action if obj.animation_data else None
        if not action: continue
        curves=action.fcurves if hasattr(action,"fcurves") else action.layers[0].strips[0].channelbag(obj.animation_data.action_slot).fcurves
        for curve in curves:
            for key in curve.keyframe_points: key.interpolation="LINEAR"
    action=camera.data.animation_data.action
    curves=action.fcurves if hasattr(action,"fcurves") else action.layers[0].strips[0].channelbag(camera.data.animation_data.action_slot).fcurves
    for curve in curves:
        for key in curve.keyframe_points: key.interpolation="LINEAR"
    action=fill.animation_data.action
    curves=action.fcurves if hasattr(action,"fcurves") else action.layers[0].strips[0].channelbag(fill.animation_data.action_slot).fcurves
    for curve in curves:
        for key in curve.keyframe_points: key.interpolation="LINEAR"
    scene.frame_set(0)


def build(args):
    if not watch.DIAL_IMAGE.is_file():
        raise FileNotFoundError("Dial texture missing: " + str(watch.DIAL_IMAGE))
    scene=new_scene()
    root,groups=make_watch(scene)
    watch.lighting_and_camera(scene)
    watch.configure_render(scene,args)
    scene.frame_start=0
    scene.frame_end=239
    scene.render.fps=30
    animate(scene,root,groups)
    print("Cronos Story: built and animated 240 frames",flush=True)
    return scene


def render_one(scene,frame,path):
    if not 0<=frame<=239:
        raise ValueError("Frame must be 0..239")
    path=Path(path).expanduser().resolve()
    path.parent.mkdir(parents=True,exist_ok=True)
    scene.frame_set(frame)
    scene.render.filepath=str(path)
    print("Cronos Story: rendering",frame,flush=True)
    started=time.perf_counter()
    bpy.ops.render.render(write_still=True,scene=scene.name)
    print("Cronos Story: Cycles seconds %.2f"%(time.perf_counter()-started),flush=True)
    # Match build_watch's transparent Cycles film over literal opaque white.
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
    print("Cronos Story: rendered",path,flush=True)


def main():
    args=arguments()
    scene=build(args)
    if args.save:
        path=args.save.expanduser().resolve()
        path.parent.mkdir(parents=True,exist_ok=True)
        prefs=bpy.context.preferences.filepaths
        old_preview,old_versions=prefs.file_preview_type,prefs.save_version
        try:
            prefs.file_preview_type="NONE"
            prefs.save_version=0
            bpy.ops.wm.save_as_mainfile(filepath=str(path))
        finally:
            prefs.file_preview_type,prefs.save_version=old_preview,old_versions
        print("Cronos Story: saved",path,flush=True)
    if args.out:
        render_one(scene,args.frame if args.frame is not None else 0,args.out)
    if args.animation:
        directory=args.animation.expanduser().resolve()
        directory.mkdir(parents=True,exist_ok=True)
        frames=(range(240) if not args.frames else
                [int(f.strip()) for f in args.frames.split(",")])
        for frame in frames:
            render_one(scene,frame,directory/("story_%03d.png" % frame))
    return scene


if __name__=="__main__":
    main()
