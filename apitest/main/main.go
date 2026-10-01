components {
  id: "script"
  component: "/main/main.script"
  position { x: 0.0 y: 0.0 z: 0.0 }
  rotation { x: 0.0 y: 0.0 z: 0.0 w: 1.0 }
}
components {
  id: "hudscene"
  component: "/main/hud.gui"
  position { x: 0.0 y: 0.0 z: 0.0 }
  rotation { x: 0.0 y: 0.0 z: 0.0 w: 1.0 }
}
components {
  id: "ballfactory"
  component: "/main/ballfactory.factory"
  position { x: 0.0 y: 0.0 z: 0.0 }
  rotation { x: 0.0 y: 0.0 z: 0.0 w: 1.0 }
}
components {
  id: "wallfactory"
  component: "/main/wallfactory.factory"
  position { x: 0.0 y: 0.0 z: 0.0 }
  rotation { x: 0.0 y: 0.0 z: 0.0 w: 1.0 }
}
components {
  id: "label"
  component: "/main/title.label"
  position { x: 480.0 y: 30.0 z: 0.0 }
  rotation { x: 0.0 y: 0.0 z: 0.0 w: 1.0 }
}
embedded_components {
  id: "blip"
  type: "sound"
  data: "sound: \"/main/tone.wav\"\n"
  "looping: 0\n"
  "group: \"master\"\n"
  "gain: 0.35\n"
  "pan: 0.0\n"
  "speed: 1.4\n"
  ""
  position { x: 0.0 y: 0.0 z: 0.0 }
  rotation { x: 0.0 y: 0.0 z: 0.0 w: 1.0 }
}
