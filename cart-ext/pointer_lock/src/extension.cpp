// pointer_lock for a wasmcart cart: the same Lua module (pointer_lock_ext) as
// indiesoftby/defold-pointer-lock, which this replaces in the cart engine.
//
// The original locks the cursor through GLFW on desktop and the browser's
// Pointer Lock API on HTML5. A cart has neither: the host owns the window and
// reports the pointer's position, and Defold turns its movement into the
// action.dx/dy the camera reads. So locking is bookkeeping only. The library's
// own Lua (pointer.lua, pointer_lock.script) decides when the game is
// "locked", exactly as on desktop, where the engine has no `html5` module.
#include <dmsdk/sdk.h>

static bool g_Locked = false;

static int MouseLock(lua_State* L)
{
    g_Locked = true;
    return 0;
}

static int MouseUnlock(lua_State* L)
{
    g_Locked = false;
    return 0;
}

static int PointerLocked(lua_State* L)
{
    lua_pushboolean(L, g_Locked);
    return 1;
}

static int OnClick(lua_State* L)
{
    // Only the HTML5 path registers a click callback; a cart never takes it.
    return 0;
}

static const luaL_reg Module_methods[] = {
    { "glfw_mouse_lock", MouseLock },
    { "glfw_mouse_unlock", MouseUnlock },
    { "html5_request_pointer_lock", MouseLock },
    { "html5_exit_pointer_lock", MouseUnlock },
    { "html5_pointer_locked", PointerLocked },
    { "html5_on_click", OnClick },
    { NULL, NULL }
};

static dmExtension::Result InitializeExt(dmExtension::Params* params)
{
    luaL_register(params->m_L, "pointer_lock_ext", Module_methods);
    lua_pop(params->m_L, 1);
    return dmExtension::RESULT_OK;
}

static dmExtension::Result FinalizeExt(dmExtension::Params* params)
{
    return dmExtension::RESULT_OK;
}

DM_DECLARE_EXTENSION(pointer_lock, "pointer_lock", 0, 0, InitializeExt, 0, 0, FinalizeExt)
