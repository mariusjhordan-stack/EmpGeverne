"""Make the Cronos Story watch look more real (Blender 5.3).

What it changes, on the scene "Cronos Story":
  * Steel: real 316L reflectance instead of chalk white, fine brushing along the
    bracelet, polished bevels, light smudges so the metal is not perfectly clean.
  * Light: a dark studio with a bright top, so steel shows gradients and dark
    reflections the way it does in product photographs.
  * Logo: a crown and the ROLEX wordmark on the clasp cover, and a crown on the
    winding crown. The old clasp crown was buried inside the clasp and never showed.
  * Render: more glossy bounces (steel reflects steel), AgX colour.

Run it either way:
  * In Blender: Scripting tab > Open > enhance_story.py > Run Script.
  * Headless:  blender -b cronos_story.blend --python enhance_story.py -- --save cronos_story_pro.blend

It can be run again: whatever it added before is removed and rebuilt.
Everything it adds is named "CR · ...". All dimensions are millimetres.
"""

import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

PREFIX = "CR · "
SCENE = "Cronos Story"
FONT_CANDIDATES = (
    "/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf",
    "/System/Library/Fonts/Supplemental/Georgia Bold.ttf",
    "/Library/Fonts/Times New Roman Bold.ttf",
)


# ---------------------------------------------------------------- helpers

def node(nt, kind, loc=(0, 0), **inputs):
    n = nt.nodes.new(kind)
    n.location = loc
    for key, value in inputs.items():
        n.inputs[key].default_value = value
    return n


def clean_previous():
    for obj in list(bpy.data.objects):
        if obj.name.startswith(PREFIX):
            bpy.data.objects.remove(obj, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.curves):
        for data in list(coll):
            if data.name.startswith(PREFIX) and data.users == 0:
                coll.remove(data)


# ---------------------------------------------------------------- materials

def steel(mat, base, roughness, anisotropic, brushed, smudge=0.05):
    """Rebuild a steel material: real reflectance, brushing and smudges."""
    nt = mat.node_tree
    nt.nodes.clear()
    out = node(nt, "ShaderNodeOutputMaterial", (900, 0))
    bsdf = node(nt, "ShaderNodeBsdfPrincipled", (600, 0))
    bsdf.inputs["Base Color"].default_value = (*base, 1)
    bsdf.inputs["Metallic"].default_value = 1.0
    # Blender 5 metals: a slightly warm F82 tint reads as stainless steel.
    if "Specular Tint" in bsdf.inputs:
        bsdf.inputs["Specular Tint"].default_value = (0.96, 0.95, 0.93, 1)
    nt.links.new(bsdf.outputs[0], out.inputs["Surface"])

    coords = node(nt, "ShaderNodeTexCoord", (-900, 0))

    # Brushing: fine lines across X (the bracelet's width), long along the loop.
    brush_map = node(nt, "ShaderNodeMapping", (-700, 150))
    brush_map.inputs["Scale"].default_value = (55.0, 0.35, 0.35)
    nt.links.new(coords.outputs["Object"], brush_map.inputs["Vector"])
    brush = node(nt, "ShaderNodeTexNoise", (-500, 150), Scale=3.0, Detail=12.0, Roughness=0.62)
    nt.links.new(brush_map.outputs[0], brush.inputs["Vector"])

    # Smudges: broad, soft patches where the metal has been handled.
    smudges = node(nt, "ShaderNodeTexNoise", (-500, -150), Scale=0.22, Detail=4.0, Roughness=0.5)
    nt.links.new(coords.outputs["Object"], smudges.inputs["Vector"])
    smudge_ramp = nt.nodes.new("ShaderNodeValToRGB")
    smudge_ramp.location = (-300, -150)
    smudge_ramp.color_ramp.elements[0].position = 0.45
    smudge_ramp.color_ramp.elements[1].position = 0.75
    nt.links.new(smudges.outputs["Fac"], smudge_ramp.inputs["Fac"])

    # Roughness = base + brushing variation + smudges.
    rough_brush = node(nt, "ShaderNodeMapRange", (-250, 150))
    rough_brush.inputs["To Min"].default_value = roughness * (0.75 if brushed else 0.92)
    rough_brush.inputs["To Max"].default_value = roughness * (1.3 if brushed else 1.08)
    nt.links.new(brush.outputs["Fac"], rough_brush.inputs["Value"])
    add = node(nt, "ShaderNodeMath", (0, 50))
    add.operation = "MULTIPLY_ADD"
    add.inputs[1].default_value = smudge
    nt.links.new(smudge_ramp.outputs["Color"], add.inputs[0])
    nt.links.new(rough_brush.outputs["Result"], add.inputs[2])
    nt.links.new(add.outputs[0], bsdf.inputs["Roughness"])

    if brushed:
        bsdf.inputs["Anisotropic"].default_value = anisotropic
        # Radial around X = along the bracelet loop, so highlights stretch along the links.
        tangent = nt.nodes.new("ShaderNodeTangent")
        tangent.location = (300, -250)
        tangent.direction_type = "RADIAL"
        tangent.axis = "X"
        nt.links.new(tangent.outputs[0], bsdf.inputs["Tangent"])
        bump = node(nt, "ShaderNodeBump", (300, 200), Strength=0.08, Distance=0.002)
        nt.links.new(brush.outputs["Fac"], bump.inputs["Height"])
        nt.links.new(bump.outputs[0], bsdf.inputs["Normal"])
    mat.diffuse_color = (*base, 1)


def upgrade_materials():
    m = bpy.data.materials
    polished = m.get("CW · Polished 316L steel")
    satin = m.get("CW · Satin brushed steel")
    clasp = m.get("CW · Clasp satin steel")
    if polished:
        steel(polished, (0.66, 0.66, 0.67), 0.05, 0.0, brushed=False, smudge=0.03)
    if satin:
        steel(satin, (0.62, 0.62, 0.63), 0.2, 0.75, brushed=True)
    if clasp:
        steel(clasp, (0.62, 0.62, 0.63), 0.22, 0.7, brushed=True)
    return polished


# ---------------------------------------------------------------- light

def studio_world(scene):
    """Dark below, bright above: steel shows a gradient instead of flat grey."""
    world = scene.world
    world.use_nodes = True
    nt = world.node_tree
    nt.nodes.clear()
    out = node(nt, "ShaderNodeOutputWorld", (700, 0))
    bg = node(nt, "ShaderNodeBackground", (500, 0), Strength=1.0)
    coords = node(nt, "ShaderNodeTexCoord", (-500, 0))
    sep = node(nt, "ShaderNodeSeparateXYZ", (-300, 0))
    nt.links.new(coords.outputs["Generated"], sep.inputs[0])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.location = (0, 0)
    els = ramp.color_ramp.elements
    els[0].position, els[0].color = 0.0, (0.012, 0.012, 0.013, 1)
    els[1].position, els[1].color = 1.0, (0.62, 0.62, 0.63, 1)
    mid = els.new(0.47)
    mid.color = (0.03, 0.03, 0.032, 1)
    horizon = els.new(0.56)
    horizon.color = (0.2, 0.2, 0.205, 1)
    to01 = node(nt, "ShaderNodeMapRange", (-150, 0))
    to01.inputs["From Min"].default_value = -1.0
    nt.links.new(sep.outputs["Z"], to01.inputs["Value"])
    nt.links.new(to01.outputs["Result"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bg.inputs["Color"])
    nt.links.new(bg.outputs[0], out.inputs["Surface"])


def render_settings(scene):
    c = scene.cycles
    c.max_bounces = 10
    c.glossy_bounces = 6
    c.diffuse_bounces = 3
    c.transparent_max_bounces = 8
    c.samples = max(c.samples, 96)
    c.use_adaptive_sampling = True
    c.use_denoising = True
    vs = scene.view_settings
    try:
        vs.view_transform = "AgX"
        for look in ("AgX - Medium High Contrast", "Medium High Contrast", "AgX - Punchy", "Punchy"):
            try:
                vs.look = look
                break
            except TypeError:
                continue
    except TypeError:
        pass
    vs.exposure = 0.6


# ---------------------------------------------------------------- logo

def surface_point(target, u, v, plane):
    """Point on `target`'s surface (its mesh space) under (u, v) in `plane`."""
    origin, direction, place = plane
    o = place(u, v, origin)
    hit, loc, normal, _ = target.ray_cast(o, direction)
    return (loc, normal) if hit else (None, None)


# A simple five-point coronet, drawn for this scene (u right, v up, about 2 units wide).
CROWN_BAND = [(-0.86, 0.02), (-0.45, -0.06), (0.0, -0.08), (0.45, -0.06), (0.86, 0.02)]
CROWN_FOOT = [(-0.62, -0.32), (0.0, -0.38), (0.62, -0.32)]
CROWN_TINES = [((-0.74, 0.04), (-1.0, 0.72)), ((-0.36, 0.0), (-0.5, 0.92)), ((0.0, 0.0), (0.0, 1.04)),
               ((0.36, 0.0), (0.5, 0.92)), ((0.74, 0.04), (1.0, 0.72))]


def stroke(name, points, radius, parent, mat):
    data = bpy.data.curves.new(PREFIX + name, "CURVE")
    data.dimensions = "3D"
    data.bevel_depth = radius
    data.bevel_resolution = 3
    data.use_fill_caps = True
    spline = data.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for p, co in zip(spline.points, points):
        p.co = (*co, 1)
    obj = bpy.data.objects.new(PREFIX + name, data)
    obj.parent = parent
    data.materials.append(mat)
    return obj


def ball(name, at, radius, parent, mat):
    mesh = bpy.data.meshes.new(PREFIX + name)
    import bmesh
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=radius)
    bm.to_mesh(mesh)
    bm.free()
    for poly in mesh.polygons:
        poly.use_smooth = True
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(PREFIX + name, mesh)
    obj.location = at
    obj.parent = parent
    return obj


def coronet(label, target, plane, scale, centre, tube, mat, scene, lift):
    """Lay the coronet on `target`'s surface; returns the created objects."""
    parent = target.parent
    made = []

    def on(u, v):
        loc, normal = surface_point(target, centre[0] + u * scale, centre[1] + v * scale, plane)
        return None if loc is None else loc + normal * lift

    def line(name, uv, steps=6):
        pts = []
        for (u0, v0), (u1, v1) in zip(uv, uv[1:]):
            for i in range(steps):
                t = i / steps
                p = on(u0 + (u1 - u0) * t, v0 + (v1 - v0) * t)
                if p is not None:
                    pts.append(p)
        p = on(*uv[-1])
        if p is not None:
            pts.append(p)
        if len(pts) >= 2:
            made.append(stroke(f"{label} {name}", pts, tube, parent, mat))

    line("band", CROWN_BAND)
    line("foot", CROWN_FOOT)
    line("left post", [CROWN_FOOT[0], CROWN_BAND[0]])
    line("right post", [CROWN_FOOT[-1], CROWN_BAND[-1]])
    for i, (a, b) in enumerate(CROWN_TINES):
        line(f"tine {i}", [a, b])
        tip = on(*b)
        if tip is not None:
            made.append(ball(f"{label} pearl {i}", tip, tube * 1.9, parent, mat))
    for obj in made:
        scene.collection.objects.link(obj)
    return made


def wordmark(text, target, plane, centre, size, lift, thickness, mat, scene, basis):
    """Raised letters that follow the curved surface of `target`."""
    font = None
    for path in FONT_CANDIDATES:
        if Path(path).is_file():
            font = bpy.data.fonts.load(path, check_existing=True)
            break
    data = bpy.data.curves.new(PREFIX + "tmp wordmark", "FONT")
    data.body = text
    data.size = size
    data.align_x = "CENTER"
    data.align_y = "CENTER"
    data.space_character = 1.12
    if font:
        data.font = font
    tmp = bpy.data.objects.new(PREFIX + "tmp wordmark", data)
    scene.collection.objects.link(tmp)
    bpy.context.view_layer.update()
    mesh = bpy.data.meshes.new_from_object(tmp.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    bpy.data.objects.remove(tmp, do_unlink=True)
    bpy.data.curves.remove(data)
    mesh.name = PREFIX + "ROLEX wordmark"

    # Flat letters (u, v) -> surface of the clasp, lifted slightly above it.
    for v in mesh.vertices:
        u, w = v.co.x, v.co.y
        loc, normal = surface_point(target, centre[0] + u, centre[1] + w, plane)
        if loc is None:
            loc, normal = basis(centre[0] + u, centre[1] + w), plane[1] * -1
        v.co = loc + normal * lift
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(PREFIX + "ROLEX wordmark", mesh)
    obj.parent = target.parent
    solid = obj.modifiers.new("Raised", "SOLIDIFY")
    solid.thickness = thickness
    solid.offset = 1.0
    solid.use_even_offset = True
    bev = obj.modifiers.new("Soft edge", "BEVEL")
    bev.width = thickness * 0.3
    bev.segments = 2
    bev.limit_method = "ANGLE"
    scene.collection.objects.link(obj)
    if obj.data.polygons and obj.data.polygons[0].normal.dot(-plane[1]) < 0:
        obj.data.flip_normals()
    return obj


def add_logos(scene, polished):
    flap = bpy.data.objects.get("CW · Safety flap")
    face = bpy.data.objects.get("CW · Inset polished crown face")
    made = []
    # Hide the old clasp crown: it sits inside the flap and only adds noise to the mesh.
    for obj in bpy.data.objects:
        if obj.name.startswith("CW · Clasp crown"):
            obj.hide_render = True
            obj.hide_viewport = True

    if flap:
        # The flap faces +Y. Seen from outside, right is -X and up is +Z.
        def place_clasp(u, v, _origin):
            return Vector((-u, 60.0, v))
        clasp_plane = (None, Vector((0, -1, 0)), place_clasp)
        made += coronet("Clasp crown", flap, clasp_plane, 1.55, (0.0, 5.85), 0.1, polished, scene, 0.03)
        made.append(wordmark("ROLEX", flap, clasp_plane, (0.0, 2.8), 2.1, 0.02, 0.13, polished, scene,
                             lambda u, v: Vector((-u, 38.0, v))))

    if face:
        # The winding crown faces +X. Seen from outside, right is +Y and up is +Z.
        bb = [Vector(c) for c in face.bound_box]
        cy = (min(p.y for p in bb) + max(p.y for p in bb)) / 2
        cz = (min(p.z for p in bb) + max(p.z for p in bb)) / 2

        def place_crown(u, v, _origin):
            return Vector((40.0, u, v))
        crown_plane = (None, Vector((-1, 0, 0)), place_crown)
        made += coronet("Winding crown", face, crown_plane, 0.62, (cy, cz - 0.12), 0.055, polished, scene, 0.02)
    return made


# ---------------------------------------------------------------- main

def enhance():
    scene = bpy.data.scenes.get(SCENE)
    if scene is None:
        raise RuntimeError(f"Scene '{SCENE}' not found")
    clean_previous()
    frame = scene.frame_current
    scene.frame_set(0)
    bpy.context.view_layer.update()
    polished = upgrade_materials()
    studio_world(scene)
    render_settings(scene)
    made = add_logos(scene, polished)
    scene.frame_set(frame)
    print(f"Cronos: enhanced scene, {len(made)} logo parts added", flush=True)
    return made


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    enhance()
    if "--save" in argv:
        path = Path(argv[argv.index("--save") + 1]).expanduser().resolve()
        prefs = bpy.context.preferences.filepaths
        old = prefs.save_version
        prefs.save_version = 0
        try:
            bpy.ops.wm.save_as_mainfile(filepath=str(path))
        finally:
            prefs.save_version = old
        print("Cronos: saved", path, flush=True)


if __name__ == "__main__":
    main()
