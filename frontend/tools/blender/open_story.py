import bpy
def setup():
    for w in bpy.context.window_manager.windows:
        s = bpy.data.scenes.get("Cronos Story") or bpy.data.scenes.get("Cronos Watch")
        if s: w.scene = s
        for a in w.screen.areas:
            if a.type == "VIEW_3D":
                a.spaces.active.region_3d.view_perspective = "CAMERA"
                a.spaces.active.shading.type = "MATERIAL"
                a.spaces.active.overlay.show_overlays = False
    return None
bpy.app.timers.register(setup, first_interval=1.5)
