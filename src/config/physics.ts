export type PhysicsConfig = {
  cell: number;
  playerHalf: number;
  fixedStep: number;
  gravity: number;
  maxFallSpeed: number;
  maxRunSpeed: number;
  groundAcceleration: number;
  airAcceleration: number;
  groundFriction: number;
  jumpVelocity: number;
  coyoteTime: number;
  jumpBuffer: number;
  hookRange: number;
  minRopeLength: number;
  reelSpeed: number;
  swingPumpAcceleration: number;
  hookAimCone: number;
  hookAimWeight: number;
  hookDistanceWeight: number;
  hookAttachImpulse: number;
  hookAutoReelSpeed: number;
  ropeIterations: number;
  ropeCornerOffset: number;
  bubbleHorizontalImpulse: number;
  bubbleVerticalImpulse: number;
  bubbleCooldown: number;
  cameraLag: number;
  highSpeedTrail: number;
};

export const PHYSICS: PhysicsConfig = {
  cell: 18,
  playerHalf: 6,
  fixedStep: 1 / 120,
  gravity: 1240,
  maxFallSpeed: 840,
  maxRunSpeed: 270,
  groundAcceleration: 1950,
  airAcceleration: 920,
  groundFriction: 2250,
  jumpVelocity: 438,
  coyoteTime: 0.105,
  jumpBuffer: 0.105,
  hookRange: 438,
  minRopeLength: 42,
  reelSpeed: 155,
  swingPumpAcceleration: 235,
  hookAimCone: 0.20,
  hookAimWeight: 0.88,
  hookDistanceWeight: 0.12,
  hookAttachImpulse: 135,
  hookAutoReelSpeed: 72,
  ropeIterations: 3,
  ropeCornerOffset: 2.2,
  bubbleHorizontalImpulse: 205,
  bubbleVerticalImpulse: 365,
  bubbleCooldown: 0.38,
  cameraLag: 10,
  highSpeedTrail: 330,
};
