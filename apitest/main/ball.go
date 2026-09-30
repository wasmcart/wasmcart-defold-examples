components {
  id: "script"
  component: "/main/ball.script"
  position { x: 0.0 y: 0.0 z: 0.0 }
  rotation { x: 0.0 y: 0.0 z: 0.0 w: 1.0 }
}
components {
  id: "sprite"
  component: "/main/ball.sprite"
  position { x: 0.0 y: 0.0 z: 0.0 }
  rotation { x: 0.0 y: 0.0 z: 0.0 w: 1.0 }
}
embedded_components {
  id: "collision"
  type: "collisionobject"
  data: "type: COLLISION_OBJECT_TYPE_DYNAMIC\n"
  "mass: 1.0\n"
  "friction: 0.3\n"
  "restitution: 0.7\n"
  "group: \"ball\"\n"
  "mask: \"wall\"\n"
  "mask: \"ball\"\n"
  "embedded_collision_shape {\n"
  "  shapes {\n"
  "    shape_type: TYPE_SPHERE\n"
  "    position { x: 0.0 y: 0.0 z: 0.0 }\n"
  "    rotation { x: 0.0 y: 0.0 z: 0.0 w: 1.0 }\n"
  "    index: 0\n"
  "    count: 1\n"
  "  }\n"
  "  data: 12.0\n"
  "}\n"
  ""
  position { x: 0.0 y: 0.0 z: 0.0 }
  rotation { x: 0.0 y: 0.0 z: 0.0 w: 1.0 }
}
