components {
  id: "shadowfactory"
  component: "/main/shadow.factory"
  position { x: 0.0 y: 0.0 z: 0.0 }
  rotation { x: 0.0 y: 0.0 z: 0.0 w: 1.0 }
}
components {
  id: "redfactory"
  component: "/main/red.factory"
  position { x: 0.0 y: 0.0 z: 0.0 }
  rotation { x: 0.0 y: 0.0 z: 0.0 w: 1.0 }
}
components {
  id: "orangefactory"
  component: "/main/orange.factory"
  position { x: 0.0 y: 0.0 z: 0.0 }
  rotation { x: 0.0 y: 0.0 z: 0.0 w: 1.0 }
}
components {
  id: "yellowfactory"
  component: "/main/yellow.factory"
  position { x: 0.0 y: 0.0 z: 0.0 }
  rotation { x: 0.0 y: 0.0 z: 0.0 w: 1.0 }
}
components {
  id: "greenfactory"
  component: "/main/green.factory"
  position { x: 0.0 y: 0.0 z: 0.0 }
  rotation { x: 0.0 y: 0.0 z: 0.0 w: 1.0 }
}
components {
  id: "bluefactory"
  component: "/main/blue.factory"
  position { x: 0.0 y: 0.0 z: 0.0 }
  rotation { x: 0.0 y: 0.0 z: 0.0 w: 1.0 }
}
components {
  id: "purplefactory"
  component: "/main/purple.factory"
  position { x: 0.0 y: 0.0 z: 0.0 }
  rotation { x: 0.0 y: 0.0 z: 0.0 w: 1.0 }
}
components {
  id: "cyanfactory"
  component: "/main/cyan.factory"
  position { x: 0.0 y: 0.0 z: 0.0 }
  rotation { x: 0.0 y: 0.0 z: 0.0 w: 1.0 }
}
components {
  id: "whitefactory"
  component: "/main/white.factory"
  position { x: 0.0 y: 0.0 z: 0.0 }
  rotation { x: 0.0 y: 0.0 z: 0.0 w: 1.0 }
}
components {
  id: "slatefactory"
  component: "/main/slate.factory"
  position { x: 0.0 y: 0.0 z: 0.0 }
  rotation { x: 0.0 y: 0.0 z: 0.0 w: 1.0 }
}
components {
  id: "script"
  component: "/main/main.script"
  position { x: 0.0 y: 0.0 z: 0.0 }
  rotation { x: 0.0 y: 0.0 z: 0.0 w: 1.0 }
}
embedded_components {
  id: "bounce"
  type: "sound"
  data: "sound: \"/main/tone.wav\"\n"
  "looping: 0\n"
  "group: \"master\"\n"
  "gain: 0.4\n"
  "pan: 0.0\n"
  "speed: 1.0\n"
  ""
  position { x: 0.0 y: 0.0 z: 0.0 }
  rotation { x: 0.0 y: 0.0 z: 0.0 w: 1.0 }
}
embedded_components {
  id: "brick"
  type: "sound"
  data: "sound: \"/main/tone.wav\"\n"
  "looping: 0\n"
  "group: \"master\"\n"
  "gain: 0.7\n"
  "pan: 0.0\n"
  "speed: 1.7\n"
  ""
  position { x: 0.0 y: 0.0 z: 0.0 }
  rotation { x: 0.0 y: 0.0 z: 0.0 w: 1.0 }
}
embedded_components {
  id: "lose"
  type: "sound"
  data: "sound: \"/main/tone.wav\"\n"
  "looping: 0\n"
  "group: \"master\"\n"
  "gain: 0.8\n"
  "pan: 0.0\n"
  "speed: 0.45\n"
  ""
  position { x: 0.0 y: 0.0 z: 0.0 }
  rotation { x: 0.0 y: 0.0 z: 0.0 w: 1.0 }
}
