components {
  id: "script"
  component: "/main/main.script"
  position { x: 0.0 y: 0.0 z: 0.0 }
  rotation { x: 0.0 y: 0.0 z: 0.0 w: 1.0 }
}
components {
  id: "status"
  component: "/main/status.label"
  position { x: 480.0 y: 440.0 z: 0.0 }
  rotation { x: 0.0 y: 0.0 z: 0.0 w: 1.0 }
}
embedded_components {
  id: "levelproxy"
  type: "collectionproxy"
  data: "collection: \"/main/level.collection\"\n"
  "exclude: false\n"
  ""
  position { x: 0.0 y: 0.0 z: 0.0 }
  rotation { x: 0.0 y: 0.0 z: 0.0 w: 1.0 }
}
